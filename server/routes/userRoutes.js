import express from "express";
import { isAdminRoute, protectRoute } from "../middlewares/authMiddlewave.js";
import {
  activateUserProfile,
  changeUserPassword,
  deleteUserProfile,
  getNotificationsList,
  getPendingUsers,
  getTeamList,
  loginUser,
  logoutUser,
  markNotificationRead,
  registerUser,
  updateUserApproval,
  updateUserProfile,
} from "../controllers/userController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/create", protectRoute, isAdminRoute, registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/google", async (req, res) => {
  try {
    const { email, name, role = "Member", title = "Team Member", password, googleAuth } = req.body;

    if (!email || !name) {
      return res.status(400).json({ status: false, message: "Email and name are required." });
    }

    const normalizedEmail = email.toLowerCase();
    let user = await import("../models/user.js").then((m) => m.default.findOne({ email: normalizedEmail }));

    if (user) {
      if (user.status === "pending") {
        return res.status(403).json({ status: false, message: "Your account is pending admin approval." });
      }

      if (user.status === "rejected") {
        return res.status(403).json({ status: false, message: "Your account has been rejected. Contact the administrator." });
      }

      if (!user.isActive) {
        return res.status(403).json({ status: false, message: "Your account is inactive. Contact the administrator." });
      }

      const { createJWT } = await import("../utils/index.js");
      createJWT(res, user._id);
      user.password = undefined;
      return res.status(200).json({ ...user.toObject(), password: undefined });
    }

    const newUser = await import("../models/user.js").then((m) =>
      m.default.create({
        name,
        email: normalizedEmail,
        password: password || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        role,
        title,
        googleAuth: Boolean(googleAuth),
        status: "pending",
        isActive: false,
      })
    );

    newUser.password = undefined;
    return res.status(201).json({
      status: true,
      message: "Google sign-in submitted. Please wait for admin approval.",
      user: newUser,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
});

router.get("/get-team", protectRoute, getTeamList);
router.get("/pending-users", protectRoute, isAdminRoute, getPendingUsers);
router.get("/notifications", protectRoute, getNotificationsList);

router.put("/profile", protectRoute, updateUserProfile);
router.put("/read-noti", protectRoute, markNotificationRead);
router.put("/change-password", protectRoute, changeUserPassword);
router.put("/approve/:id", protectRoute, isAdminRoute, updateUserApproval);

// //   FOR ADMIN ONLY - ADMIN ROUTES
router
  .route("/:id")
  .put(protectRoute, isAdminRoute, activateUserProfile)
  .delete(protectRoute, isAdminRoute, deleteUserProfile);

export default router;
