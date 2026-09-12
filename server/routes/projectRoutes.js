import express from "express";
import { isAdminRoute, protectRoute } from "../middlewares/authMiddlewave.js";
import {
  archiveProject,
  createProject,
  getProject,
  getProjectCpm,
  getProjectDependencyOrder,
  getProjects,
  updateProject,
} from "../controllers/projectController.js";

const router = express.Router();

router.get("/", protectRoute, getProjects);
router.post("/", protectRoute, isAdminRoute, createProject);
router.get("/:id/dependency-order", protectRoute, getProjectDependencyOrder);
router.get("/:id/cpm", protectRoute, getProjectCpm);
router.get("/:id", protectRoute, getProject);
router.put("/:id", protectRoute, updateProject);
router.delete("/:id", protectRoute, archiveProject);

export default router;
