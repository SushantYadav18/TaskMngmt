import Project from "../models/project.js";
import Team from "../models/team.js";
import User from "../models/user.js";
import { ROLES, normalizeRole } from "./roles.js";

const approvedUsers = async (ids) => {
  const uniqueIds = [...new Set(ids.map(String))];
  if (!uniqueIds.length) return [];
  return User.find({
    _id: { $in: uniqueIds },
    status: "approved",
    isActive: true,
  });
};

export const canViewProject = (project, user) => {
  if (user?.isAdmin) return true;
  if (
    String(project.projectLeader?._id || project.projectLeader) ===
    String(user.userId)
  ) {
    return true;
  }
  if (String(project.owner?._id || project.owner) === String(user.userId)) {
    return true;
  }
  if (
    project.members?.some(
      (member) => String(member._id || member) === String(user.userId),
    )
  ) {
    return true;
  }
  return project.teams?.some(
    (team) => String(team._id || team) === String(user.team),
  );
};

export const validateProjectParticipants = async ({
  ownerId,
  projectLeaderId,
  requireProjectLeader = true,
  teamIds,
  memberIds,
}) => {
  const owner = await User.findOne({
    _id: ownerId,
    status: "approved",
    isActive: true,
  });
  if (!owner) {
    return { error: "Project owner must be an approved, active user." };
  }

  const teams = teamIds?.length
    ? await Team.find({ _id: { $in: teamIds } })
    : [];
  if (teams.length !== new Set(teamIds?.map(String) || []).size) {
    return { error: "Every project team must exist." };
  }

  const users = await approvedUsers(memberIds || []);
  if (users.length !== new Set(memberIds?.map(String) || []).size) {
    return { error: "Every project member must be an approved, active user." };
  }

  let projectLeader = null;
  if (projectLeaderId || requireProjectLeader) {
    projectLeader = await User.findOne({
      _id: projectLeaderId,
      status: "approved",
      isActive: true,
    });
    if (!projectLeader) {
      return { error: "Project Leader must be an approved, active user." };
    }
    if (!memberIds.map(String).includes(String(projectLeader._id))) {
      return { error: "Project Leader must also be a project member." };
    }
  }

  const participatingUserIds = new Set(
    teams.flatMap((team) => team.members.map(String)),
  );
  const invalidMember = users.find(
    (member) =>
      !participatingUserIds.has(String(member._id)) &&
      String(member._id) !== String(owner._id),
  );
  if (invalidMember) {
    return {
      error:
        "Project members must belong to one of the participating teams or be the owner.",
    };
  }

  return { owner, projectLeader, teams, members: users };
};

export const canManageProject = (project, user) =>
  Boolean(
    user?.isAdmin ||
    String(project.owner?._id || project.owner) === String(user?.userId) ||
    String(project.projectLeader?._id || project.projectLeader) ===
      String(user?.userId),
  );

export const canDeleteProject = (project, user) => Boolean(user?.isAdmin);

export const canDeleteProjectTask = (project, user) =>
  Boolean(
    user?.isAdmin ||
    (project &&
      String(project.projectLeader?._id || project.projectLeader) ===
        String(user?.userId)),
  );

export const canWorkOnProjectTask = (project, assignee) => {
  if (!project) return false;
  if (
    project.members?.some(
      (member) => String(member._id || member) === String(assignee._id),
    )
  ) {
    return true;
  }
  return false;
};

export const canDelegateProjectTask = (source, target, project) => {
  const sourceId = String(source._id || source.userId);
  const targetId = String(target._id || target.userId);
  const projectLeaderId = String(
    project.projectLeader?._id || project.projectLeader,
  );
  const memberIds = new Set(
    (project.members || []).map((member) => String(member._id || member)),
  );

  if (!memberIds.has(sourceId) || !memberIds.has(targetId)) return false;
  if (sourceId === targetId) return sourceId === projectLeaderId;

  const sourceRole = normalizeRole(source.role);
  const targetRole = normalizeRole(target.role);
  if (sourceId === projectLeaderId) {
    return targetRole !== ROLES.ADMIN;
  }
  if (sourceRole === ROLES.ASSOCIATE) {
    return [ROLES.JUNIOR, ROLES.INTERN].includes(targetRole);
  }
  if (sourceRole === ROLES.JUNIOR) return targetRole === ROLES.INTERN;
  return false;
};

export const isProjectManagerRole = (role) =>
  [ROLES.ADMIN, ROLES.TEAM_LEADER].includes(normalizeRole(role));
