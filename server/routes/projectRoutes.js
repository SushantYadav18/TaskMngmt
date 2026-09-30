import express from "express";
import { isAdminRoute, protectRoute } from "../middlewares/authMiddlewave.js";
import {
  archiveProject,
  createProject,
  getAdminProjectWorkloadOverview,
  getProject,
  getProjectCpm,
  getProjectDependencyOrder,
  getProjectWorkload,
  getProjects,
  updateProject,
} from "../controllers/projectController.js";

const router = express.Router();

router.get("/", protectRoute, getProjects);
router.get(
  "/workload-overview",
  protectRoute,
  isAdminRoute,
  getAdminProjectWorkloadOverview,
);
router.post("/", protectRoute, isAdminRoute, createProject);
router.get("/:id/workload", protectRoute, getProjectWorkload);
router.get("/:id/dependency-order", protectRoute, getProjectDependencyOrder);
router.get("/:id/cpm", protectRoute, getProjectCpm);
router.get("/:id", protectRoute, getProject);
router.put("/:id", protectRoute, updateProject);
router.delete("/:id", protectRoute, isAdminRoute, archiveProject);

export default router;
