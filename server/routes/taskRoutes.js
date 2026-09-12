import express from "express";
import {
  addTaskDependency,
  createSubTask,
  createTask,
  delegateTask,
  dashboardStatistics,
  deleteRestoreTask,
  duplicateTask,
  getTask,
  getTaskDependencies,
  getTasks,
  postTaskActivity,
  removeTaskDependency,
  trashTask,
  updateTask,
} from "../controllers/taskController.js";
import {
  canAccessTask,
  canDeleteRestoreAction,
  canDeleteTask,
  isAdminRoute,
  protectRoute,
} from "../middlewares/authMiddlewave.js";

const router = express.Router();

router.post("/create", protectRoute, createTask);
router.post("/delegate/:id", protectRoute, canAccessTask, delegateTask);
router.post("/duplicate/:id", protectRoute, isAdminRoute, duplicateTask);
router.post("/activity/:id", protectRoute, canAccessTask, postTaskActivity);
router.post(
  "/:id/dependencies",
  protectRoute,
  canAccessTask,
  addTaskDependency,
);

router.get("/dashboard", protectRoute, dashboardStatistics);
router.get("/", protectRoute, getTasks);
router.get(
  "/:id/dependencies",
  protectRoute,
  canAccessTask,
  getTaskDependencies,
);
router.get("/:id", protectRoute, canAccessTask, getTask);

router.put("/create-subtask/:id", protectRoute, canAccessTask, createSubTask);
router.put("/update/:id", protectRoute, canAccessTask, updateTask);
router.put("/:id", protectRoute, canDeleteTask, trashTask);

router.delete(
  "/:id/dependencies/:dependencyId",
  protectRoute,
  canAccessTask,
  removeTaskDependency,
);
router.delete(
  "/delete-restore/:id?",
  protectRoute,
  canDeleteRestoreAction,
  deleteRestoreTask,
);

export default router;
