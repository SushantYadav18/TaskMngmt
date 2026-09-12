import express from "express";
import { isAdminRoute, protectRoute } from "../middlewares/authMiddlewave.js";
import {
  createTeam,
  getTeams,
  moveTeamMember,
  updateTeamMembers,
} from "../controllers/teamController.js";

const router = express.Router();

router.get("/", protectRoute, getTeams);
router.post("/", protectRoute, isAdminRoute, createTeam);
router.put("/:id/members", protectRoute, isAdminRoute, updateTeamMembers);
router.put("/move-member", protectRoute, isAdminRoute, moveTeamMember);

export default router;
