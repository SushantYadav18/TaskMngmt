import express from "express";
import {
  createSubTask,
  createTask,
  dashboardStatistics,
  deleteRestoreTask,
  duplicateTask,
  getTask,
  getTasks,
  postTaskActivity,
  trashTask,
  updateTask,
} from "../controllers/taskController.js";
import {
  canAccessTask,
  isAdminRoute,
  protectRoute,
} from "../middlewares/authMiddlewave.js";

const router = express.Router();

router.post("/create", protectRoute, isAdminRoute, createTask);
router.post("/duplicate/:id", protectRoute, isAdminRoute, duplicateTask);
router.post("/activity/:id", protectRoute, canAccessTask, postTaskActivity);

router.get("/dashboard", protectRoute, dashboardStatistics);
router.get("/", protectRoute, getTasks);
router.get("/:id", protectRoute, canAccessTask, getTask);

router.put("/create-subtask/:id", protectRoute, canAccessTask, createSubTask);
router.put("/update/:id", protectRoute, canAccessTask, updateTask);
router.put("/:id", protectRoute, canAccessTask, trashTask);

router.delete(
  "/delete-restore/:id?",
  protectRoute,
  canAccessTask,
  deleteRestoreTask
);

export default router;
