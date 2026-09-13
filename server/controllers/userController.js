import { response } from "express";
import User from "../models/user.js";
import Team from "../models/team.js";
import { createJWT } from "../utils/index.js";
import Notice from "../models/notification.js";
import { ROLE_VALUES, ROLES, normalizeRole } from "../utils/roles.js";

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, title } = req.body;
    const normalizedRole = normalizeRole(role);
    const isAdminCreated = req.user?.isAdmin === true;

    if (!name || !email || !password || !normalizedRole || !title) {
      return res.status(400).json({
        status: false,
        message: "Name, email, password, role and title are required.",
      });
    }

    if (
      !ROLE_VALUES.includes(normalizedRole) ||
      (!isAdminCreated && normalizedRole === "ADMIN")
    ) {
      return res.status(400).json({ status: false, message: "Invalid role." });
    }

    const userExist = await User.findOne({ email: email.toLowerCase() });

    if (userExist) {
      return res.status(400).json({
        status: false,
        message: "User already exists",
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: normalizedRole,
      title,
      status: isAdminCreated ? "approved" : "pending",
      isActive: isAdminCreated,
    });

    if (user) {
      user.password = undefined;

      res.status(201).json({
        status: true,
        message: isAdminCreated
          ? "User created successfully."
          : "Registration submitted. Please wait for admin approval.",
        user,
      });
    } else {
      return res
        .status(400)
        .json({ status: false, message: "Invalid user data" });
    }
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res
        .status(401)
        .json({ status: false, message: "Invalid email or password." });
    }

    if (!user.isAdmin && user.status === "pending") {
      return res.status(403).json({
        status: false,
        message: "Your account is pending admin approval.",
      });
    }

    if (!user.isAdmin && user.status === "rejected") {
      return res.status(403).json({
        status: false,
        message: "Your account has been rejected. Contact the administrator.",
      });
    }

    if (!user.isAdmin && !user?.isActive) {
      return res.status(401).json({
        status: false,
        message: "User account has been deactivated, contact the administrator",
      });
    }

    if (!user.password) {
      return res.status(401).json({
        status: false,
        message:
          "This account uses Google sign-in. Please continue with Google.",
      });
    }

    const isMatch = await user.matchPassword(password);

    if (user && isMatch) {
      createJWT(res, user._id);

      user.password = undefined;

      res.status(200).json({
        ...user.toObject(),
        password: undefined,
      });
    } else {
      return res
        .status(401)
        .json({ status: false, message: "Invalid email or password" });
    }
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const logoutUser = async (req, res) => {
  try {
    res.clearCookie("token");

    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const getTeamList = async (req, res) => {
  try {
    const requester = await User.findById(req.user.userId).select(
      "isAdmin role team",
    );
    let query = { status: "approved" };

    if (!requester?.isAdmin) {
      if (!requester?.team) {
        return res.status(200).json([]);
      }

      const teamQuery =
        normalizeRole(requester.role) === ROLES.TEAM_LEADER
          ? { _id: requester.team, leader: requester._id }
          : { _id: requester.team, members: requester._id };
      const validTeam = await Team.exists(teamQuery);

      if (!validTeam) {
        return res.status(200).json([]);
      }

      query.team = validTeam._id;
    }

    const users = await User.find(query)
      .select("name title role email team isActive status isAdmin createdAt")
      .sort({ createdAt: -1 });

    res.status(200).json(users);
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({ status: { $in: ["pending", "rejected"] } })
      .select("name title role email isActive status isAdmin createdAt")
      .sort({ createdAt: -1 });

    res.status(200).json(users);
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const getNotificationsList = async (req, res) => {
  try {
    const { userId } = req.user;

    const notice = await Notice.find({
      team: userId,
      isRead: { $nin: [userId] },
    }).populate("task", "title");

    res.status(201).json(notice);
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { userId, isAdmin } = req.user;
    const { _id, id } = req.body;

    const targetUserId = _id || id || userId;

    const resolvedId = isAdmin && targetUserId ? targetUserId : userId;

    const user = await User.findById(resolvedId);

    if (user) {
      user.name = req.body.name || user.name;
      user.title = req.body.title || user.title;
      if (isAdmin && req.body.role) {
        const normalizedRole = normalizeRole(req.body.role);
        if (!ROLE_VALUES.includes(normalizedRole)) {
          return res
            .status(400)
            .json({ status: false, message: "Invalid role." });
        }
        user.role = normalizedRole;
      }

      const updatedUser = await user.save();

      user.password = undefined;

      res.status(201).json({
        status: true,
        message: "Profile Updated Successfully.",
        user: updatedUser,
      });
    } else {
      res.status(404).json({ status: false, message: "User not found" });
    }
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { userId } = req.user;

    const { isReadType, id } = req.query;

    if (isReadType === "all") {
      await Notice.updateMany(
        { team: userId, isRead: { $nin: [userId] } },
        { $push: { isRead: userId } },
        { new: true },
      );
    } else {
      await Notice.findOneAndUpdate(
        { _id: id, isRead: { $nin: [userId] } },
        { $push: { isRead: userId } },
        { new: true },
      );
    }

    res.status(201).json({ status: true, message: "Done" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const changeUserPassword = async (req, res) => {
  try {
    const { userId } = req.user;

    const user = await User.findById(userId);

    if (user) {
      user.password = req.body.password;

      await user.save();

      user.password = undefined;

      res.status(201).json({
        status: true,
        message: `Password chnaged successfully.`,
      });
    } else {
      res.status(404).json({ status: false, message: "User not found" });
    }
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const activateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const nextIsActive = req.body.isActive ?? req.body.isAction;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    const requester = await User.findById(req.user.userId).select(
      "isAdmin role team",
    );
    const requesterRole = normalizeRole(requester?.role);
    const isTeamLeader = requesterRole === ROLES.TEAM_LEADER;

    if (
      !requester?.isAdmin &&
      (!isTeamLeader ||
        !requester.team ||
        String(user.team) !== String(requester.team) ||
        String(user._id) === String(requester._id) ||
        normalizeRole(user.role) === ROLES.TEAM_LEADER)
    ) {
      return res.status(403).json({
        status: false,
        message: "You are not allowed to change this user's status.",
      });
    }

    user.isActive = Boolean(nextIsActive);

    if (user.isActive && user.status === "pending") {
      user.status = "approved";
    }

    await user.save();

    res.status(201).json({
      status: true,
      message: `User account has been ${
        user?.isActive ? "activated" : "disabled"
      }`,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const updateUserApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({
        status: false,
        message: "Approval status must be approved, rejected or pending.",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    user.status = status;
    user.isActive = status === "approved";

    await user.save();

    if (status === "rejected" && String(user._id) === String(req.user.userId)) {
      res.clearCookie("token");
    }

    res.status(200).json({
      status: true,
      message: `User status updated to ${status}.`,
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const deleteUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    await User.findByIdAndDelete(id);

    res
      .status(200)
      .json({ status: true, message: "User deleted successfully" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};
