import jwt from "jsonwebtoken";
import Task from "../models/task.js";
import User from "../models/user.js";

const protectRoute = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    if (token) {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

      const resp = await User.findById(decodedToken.userId).select(
        "isAdmin email"
      );

      req.user = {
        email: resp.email,
        isAdmin: resp.isAdmin,
        userId: decodedToken.userId,
      };

      next();
    } else {
      return res
        .status(401)
        .json({ status: false, message: "Not authorized. Try login again." });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(401)
      .json({ status: false, message: "Not authorized. Try login again." });
  }
};

const isAdminRoute = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    return res.status(401).json({
      status: false,
      message: "Not authorized as admin. Try login as admin.",
    });
  }
};

const canAccessTask = async (req, res, next) => {
  try {
    if (!req.params.id) {
      if (req.user?.isAdmin) {
        return next();
      }

      return res.status(403).json({
        status: false,
        message: "Only administrators can perform bulk task actions.",
      });
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ status: false, message: "Task not found." });
    }

    const isAssigned = task.team.some(
      (memberId) => String(memberId) === String(req.user.userId)
    );

    if (!req.user?.isAdmin && !isAssigned) {
      return res.status(403).json({
        status: false,
        message: "You are not assigned to this task.",
      });
    }

    req.task = task;
    next();
  } catch (error) {
    console.error(error);
    return res.status(400).json({ status: false, message: "Invalid task." });
  }
};

export { canAccessTask, isAdminRoute, protectRoute };
