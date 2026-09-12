import express from "express";
import { isAdminRoute, protectRoute } from "../middlewares/authMiddlewave.js";
import {
  archiveProject,
  createProject,
  getProject,
  getProjects,
  updateProject,
} from "../controllers/projectController.js";

const router = express.Router();

router.get("/", protectRoute, getProjects);
router.post("/", protectRoute, isAdminRoute, createProject);
router.get("/:id", protectRoute, getProject);
router.put("/:id", protectRoute, updateProject);
router.delete("/:id", protectRoute, archiveProject);

export default router;
