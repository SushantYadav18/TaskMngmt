import { response } from "express";
import User from "../models/user.js";
import { createJWT } from "../utils/index.js";
import Notice from "../models/notification.js";

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, title } = req.body;
    const isAdminCreated = req.user?.isAdmin === true;

    if (!name || !email || !password || !role || !title) {
      return res.status(400).json({
        status: false,
        message: "Name, email, password, role and title are required.",
      });
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
      role,
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
        message: "This account uses Google sign-in. Please continue with Google.",
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
    const users = await User.find({ status: "approved" })
      .select("name title role email isActive status isAdmin createdAt")
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

    const resolvedId =
      isAdmin && targetUserId ? targetUserId : userId;

    const user = await User.findById(resolvedId);

    if (user) {
      user.name = req.body.name || user.name;
      user.title = req.body.title || user.title;
      user.role = req.body.role || user.role;

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
        { new: true }
      );
    } else {
      await Notice.findOneAndUpdate(
        { _id: id, isRead: { $nin: [userId] } },
        { $push: { isRead: userId } },
        { new: true }
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

    if (user) {
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
    } else {
      res.status(404).json({ status: false, message: "User not found" });
    }
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
