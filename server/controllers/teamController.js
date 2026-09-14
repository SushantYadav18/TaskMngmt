import Team from "../models/team.js";
import User from "../models/user.js";
import Project from "../models/project.js";
import { ROLES, ROLE_VALUES, normalizeRole } from "../utils/roles.js";

const getTeamUsers = (memberIds = []) =>
  User.find({ _id: { $in: memberIds }, status: "approved" });

export const getTeams = async (req, res) => {
  try {
    const requester = await User.findById(req.user.userId).select(
      "isAdmin role team",
    );
    let teamQuery = {};
    let unassignedMembers = [];

    if (!requester?.isAdmin) {
      if (normalizeRole(requester?.role) === ROLES.TEAM_LEADER) {
        if (!requester?.team) {
          return res.status(200).json({ status: true, teams: [] });
        }
        teamQuery = { _id: requester.team, leader: requester._id };
      } else if (requester?.team) {
        teamQuery = { _id: requester.team, members: requester._id };
      } else {
        return res.status(200).json({ status: true, teams: [] });
      }
    } else {
      unassignedMembers = await User.find({
        status: "approved",
        isActive: true,
        team: null,
      })
        .select("name email role team isActive status")
        .sort({ name: 1 });
    }

    const teams = await Team.find(teamQuery)
      .populate("leader", "name email role team isActive status")
      .populate("members", "name email role team status isActive")
      .sort({ name: 1 });
    res.status(200).json({ status: true, teams, unassignedMembers });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
};

export const createTeam = async (req, res) => {
  try {
    const { name, leaderId } = req.body;
    const leader = await User.findById(leaderId);

    if (!name || !leader) {
      return res
        .status(400)
        .json({ status: false, message: "Team name and leader are required." });
    }

    if (
      normalizeRole(leader.role) !== ROLES.TEAM_LEADER ||
      leader.status !== "approved" ||
      !leader.isActive
    ) {
      return res.status(400).json({
        status: false,
        message:
          "A team leader must be approved, active, and have the TEAM_LEADER role.",
      });
    }
    if (leader.team) {
      return res.status(400).json({
        status: false,
        message: "This user already belongs to a team.",
      });
    }

    const team = await Team.create({
      name,
      leader: leader._id,
      members: [leader._id],
    });
    leader.team = team._id;
    await leader.save();

    res
      .status(201)
      .json({ status: true, team, message: "Team created successfully." });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
};

export const updateTeamMembers = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res
        .status(404)
        .json({ status: false, message: "Team not found." });
    }

    const memberIds = [
      ...new Set(
        [team.leader.toString(), ...(req.body.memberIds || [])].filter(Boolean),
      ),
    ];

    const users = await getTeamUsers(memberIds);
    if (users.length !== memberIds.length) {
      return res.status(400).json({
        status: false,
        message: "All team members must be approved and active.",
      });
    }

    const invalidUser = users.find((user) => {
      const role = normalizeRole(user.role);
      return !ROLE_VALUES.includes(role) || role === ROLES.ADMIN;
    });
    if (invalidUser) {
      return res.status(400).json({
        status: false,
        message: "Only non-admin organizational roles can join a team.",
      });
    }

    const extraLeader = users.find(
      (user) =>
        normalizeRole(user.role) === ROLES.TEAM_LEADER &&
        String(user._id) !== String(team.leader),
    );
    if (extraLeader) {
      return res.status(400).json({
        status: false,
        message: "A team can have exactly one Team Leader.",
      });
    }

    const movableUsers = users.filter(
      (user) => normalizeRole(user.role) !== ROLES.TEAM_LEADER,
    );

    await Promise.all(
      movableUsers.map(async (user) => {
        if (user.team && String(user.team) !== String(team._id)) {
          await Team.updateOne(
            { _id: user.team },
            { $pull: { members: user._id } },
          );
        }
      }),
    );

    await User.updateMany(
      { team: team._id, _id: { $nin: memberIds } },
      { $set: { team: null } },
    );
    await User.updateMany(
      { _id: { $in: memberIds } },
      { $set: { team: team._id } },
    );
    team.members = memberIds;
    await team.save();

    res.status(200).json({
      status: true,
      team,
      message: "Team members updated successfully.",
    });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
};

export const moveTeamMember = async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        status: false,
        message: "Only administrators can move team members.",
      });
    }

    const { userId, destinationTeamId } = req.body;
    const [member, destinationTeam] = await Promise.all([
      User.findById(userId),
      Team.findById(destinationTeamId),
    ]);

    if (!member) {
      return res
        .status(404)
        .json({ status: false, message: "User not found." });
    }

    if (!destinationTeam) {
      return res
        .status(404)
        .json({ status: false, message: "Destination team not found." });
    }

    const memberRole = normalizeRole(member.role);
    if (![ROLES.ASSOCIATE, ROLES.JUNIOR, ROLES.INTERN].includes(memberRole)) {
      return res.status(403).json({
        status: false,
        message: "Team Leaders and administrators cannot be moved.",
      });
    }

    if (String(member.team) === String(destinationTeam._id)) {
      return res.status(400).json({
        status: false,
        message: "The user already belongs to this team.",
      });
    }

    const oldTeam = member.team ? await Team.findById(member.team) : null;

    member.team = destinationTeam._id;
    await member.save();

    if (oldTeam) {
      oldTeam.members = oldTeam.members.filter(
        (memberId) => String(memberId) !== String(member._id),
      );
      await oldTeam.save();
    }

    destinationTeam.members.addToSet(member._id);
    await destinationTeam.save();

    res.status(200).json({
      status: true,
      message: "Team member moved successfully.",
      user: member,
      destinationTeam,
    });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
};

export const deleteTeam = async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        status: false,
        message: "Only administrators can delete teams.",
      });
    }

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res
        .status(404)
        .json({ status: false, message: "Team not found." });
    }

    const [members, projectCount] = await Promise.all([
      User.find({ team: team._id }).select("_id name role"),
      Project.countDocuments({ teams: team._id }),
    ]);
    const teamMemberIds = new Set(team.members.map(String));
    const nonLeaderMembers = members.filter(
      (member) => String(member._id) !== String(team.leader),
    );
    const referencedNonLeaders = [...teamMemberIds].filter(
      (memberId) => memberId !== String(team.leader),
    );

    if (projectCount > 0) {
      return res.status(409).json({
        status: false,
        message:
          "This team cannot be deleted while it is assigned to an active project.",
      });
    }

    if (nonLeaderMembers.length > 0 || referencedNonLeaders.length > 0) {
      return res.status(409).json({
        status: false,
        message:
          "Remove all Associates, Juniors, and Interns from this team before deleting it.",
      });
    }

    await User.updateOne(
      { _id: team.leader, team: team._id },
      { $set: { team: null } },
    );
    await Team.deleteOne({ _id: team._id });

    res.status(200).json({
      status: true,
      message: "Team deleted successfully.",
    });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
};
