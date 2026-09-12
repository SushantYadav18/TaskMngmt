import Notice from "../models/notification.js";
import Task from "../models/task.js";
import TaskDependency from "../models/taskDependency.js";
import User from "../models/user.js";
import Project from "../models/project.js";
import { canDelegateTo } from "../utils/roles.js";
import {
  canDelegateProjectTask,
  canWorkOnProjectTask,
} from "../utils/projectAccess.js";
import { validateTaskSchedule } from "../utils/scheduling.js";
import {
  validateTaskDependency,
  validateTaskStatusTransition,
} from "../utils/taskDependencies.js";

export const createTask = async (req, res) => {
  try {
    const { userId } = req.user;

    const {
      title,
      assignee,
      project: projectId,
      stage,
      date,
      priority,
      assets,
      plannedStartDate,
      dueDate,
      estimatedDuration,
    } = req.body;
    const creator = await User.findById(userId);
    const target = await User.findById(assignee);
    const scheduleError = validateTaskSchedule({
      plannedStartDate,
      dueDate,
      estimatedDuration,
    });
    if (scheduleError) {
      return res.status(400).json({ status: false, message: scheduleError });
    }

    if (!creator || !target) {
      return res.status(403).json({
        status: false,
        message: "A valid task creator and assignee are required.",
      });
    }

    let project = null;
    if (projectId) {
      project = await Project.findById(projectId)
        .populate("projectLeader", "role team isAdmin")
        .populate("members", "role team isAdmin");
      if (!project) {
        return res
          .status(400)
          .json({ status: false, message: "Project not found." });
      }
      const isProjectLeader =
        String(project.projectLeader?._id) === String(creator._id);
      const isAllowedProjectAssignment = creator.isAdmin
        ? String(project.projectLeader?._id) === String(target._id)
        : isProjectLeader && canDelegateProjectTask(creator, target, project);

      if (
        !isAllowedProjectAssignment ||
        !canWorkOnProjectTask(project, target)
      ) {
        return res.status(403).json({
          status: false,
          message: "The task assignee must participate in this project.",
        });
      }
    } else if (!creator.isAdmin || !canDelegateTo(creator, target)) {
      return res.status(403).json({
        status: false,
        message: "Tasks can only be created through the existing hierarchy.",
      });
    }

    let text = "New task has been assigned to you";
    text =
      text +
      ` The task priority is set a ${priority} priority, so check and act accordingly. The task date is ${new Date(
        date,
      ).toDateString()}. Thank you!!!`;

    const activity = {
      type: "assigned",
      activity: text,
      by: userId,
    };

    const task = await Task.create({
      title,
      createdBy: userId,
      assignee,
      project: project?._id || null,
      plannedStartDate: plannedStartDate || null,
      dueDate: dueDate || null,
      estimatedDuration: estimatedDuration || null,
      stage: stage.toLowerCase(),
      date,
      priority: priority.toLowerCase(),
      assets,
      activities: activity,
    });

    await Notice.create({
      team: [assignee],
      text,
      task: task._id,
    });

    res
      .status(200)
      .json({ status: true, task, message: "Task created successfully." });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const duplicateTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);

    const newTask = await Task.create({
      title: task.title + " - Duplicate",
      createdBy: req.user.userId,
      assignee: task.assignee,
      project: task.project || null,
      parentTask: task._id,
      subTasks: task.subTasks,
      assets: task.assets,
      priority: task.priority,
      stage: task.stage,
      date: task.date,
      plannedStartDate: task.plannedStartDate,
      dueDate: task.dueDate,
      estimatedDuration: task.estimatedDuration,
    });

    //alert users of the task
    let text = "New task has been assigned to you";
    text =
      text +
      ` The task priority is set a ${
        task.priority
      } priority, so check and act accordingly. The task date is ${task.date.toDateString()}. Thank you!!!`;

    await Notice.create({
      team: [task.assignee],
      text,
      task: newTask._id,
    });

    res
      .status(200)
      .json({ status: true, message: "Task duplicated successfully." });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

const getTaskPredecessors = async (taskId) => {
  const dependencyRecords = await TaskDependency.find({
    successorTask: taskId,
  })
    .populate("predecessorTask", "title stage project")
    .lean();

  return dependencyRecords
    .map((dependency) => dependency.predecessorTask)
    .filter(Boolean);
};

const addAutomaticTaskActivity = ({ task, type, activity, by }) => {
  if (!task.activities) task.activities = [];
  task.activities.push({
    type,
    activity,
    by,
    date: new Date(),
  });
};

const applyTaskStatusTransition = async ({ task, nextStage, by, message }) => {
  const currentStage = String(task.stage || "todo").toLowerCase();
  const targetStage = String(nextStage || currentStage).toLowerCase();
  const predecessorTasks = await getTaskPredecessors(task._id);
  const { valid, error } = validateTaskStatusTransition({
    currentStage,
    nextStage: targetStage,
    predecessorTasks,
  });

  if (!valid) {
    throw new Error(error);
  }

  const previousStage = task.stage;
  task.stage = targetStage;

  if (targetStage === "in progress" && !task.actualStartDate) {
    task.actualStartDate = new Date();
  }

  if (targetStage === "completed" && !task.actualCompletionDate) {
    task.actualCompletionDate = new Date();
  }

  if (targetStage === "in progress" && previousStage !== "in progress") {
    addAutomaticTaskActivity({
      task,
      type: "started",
      activity: message || "Task started.",
      by,
    });
  }

  if (targetStage === "completed" && previousStage !== "completed") {
    addAutomaticTaskActivity({
      task,
      type: "completed",
      activity: message || "Task completed.",
      by,
    });
  }

  await task.save();

  if (task.project) {
    const project = await Project.findById(task.project);
    if (project) {
      if (task.actualStartDate && !project.actualStart) {
        project.actualStart = task.actualStartDate;
      }

      if (targetStage === "completed" && !project.actualCompletion) {
        const projectTasks = await Task.find({
          project: project._id,
          isTrashed: false,
        }).select("stage");
        if (
          projectTasks.length > 0 &&
          projectTasks.every((projectTask) => projectTask.stage === "completed")
        ) {
          project.actualCompletion = task.actualCompletionDate || new Date();
        }
      }

      await project.save();
    }
  }

  return task;
};

export const postTaskActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { type, activity } = req.body;
    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        status: false,
        message: "Task not found.",
      });
    }

    const normalizedType = String(type || "").toLowerCase();
    const trimmedText = String(activity || "").trim();

    if (
      ["started", "in progress", "bug", "completed"].includes(normalizedType)
    ) {
      const nextStage =
        normalizedType === "completed" ? "completed" : "in progress";
      const message =
        normalizedType === "completed"
          ? trimmedText || "Task completed."
          : trimmedText || "Task started.";
      await applyTaskStatusTransition({
        task,
        nextStage,
        by: userId,
        message,
      });

      return res.status(200).json({
        status: true,
        message: "Task status updated successfully.",
      });
    }

    if (normalizedType === "assigned") {
      task.stage = "todo";
      addAutomaticTaskActivity({
        task,
        type: "assigned",
        activity: trimmedText || "Task assigned.",
        by: userId,
      });
      await task.save();
      return res.status(200).json({
        status: true,
        message: "Task assigned successfully.",
      });
    }

    if (!trimmedText) {
      return res.status(400).json({
        status: false,
        message: "Activity text is required.",
      });
    }

    addAutomaticTaskActivity({
      task,
      type: "commented",
      activity: trimmedText,
      by: userId,
    });
    await task.save();

    res.status(200).json({
      status: true,
      message: "Activity posted successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const dashboardStatistics = async (req, res) => {
  try {
    const { userId, isAdmin } = req.user;

    const projectLeaderProjects = !isAdmin
      ? await Project.find({ projectLeader: userId }).select("_id")
      : [];
    const projectLeaderProjectIds = projectLeaderProjects.map(
      (project) => project._id,
    );

    const allTasks = isAdmin
      ? await Task.find({
          isTrashed: false,
        })
          .populate(
            "assignee createdBy project",
            "name role title email name status",
          )
          .sort({ _id: -1 })
      : await Task.find({
          isTrashed: false,
          $or: [
            { assignee: userId },
            ...(projectLeaderProjectIds.length
              ? [{ project: { $in: projectLeaderProjectIds } }]
              : []),
          ],
        })
          .populate(
            "assignee createdBy project",
            "name role title email name status",
          )
          .sort({ _id: -1 });

    const users = await User.find({ status: "approved", isActive: true })
      .select("name title role isAdmin isActive createdAt")
      .limit(10)
      .sort({ _id: -1 });

    //   group task by stage and calculate counts
    const groupTaskks = allTasks.reduce((result, task) => {
      const stage = task.stage;

      if (!result[stage]) {
        result[stage] = 1;
      } else {
        result[stage] += 1;
      }

      return result;
    }, {});

    // Group tasks by priority
    const groupData = Object.entries(
      allTasks.reduce((result, task) => {
        const { priority } = task;

        result[priority] = (result[priority] || 0) + 1;
        return result;
      }, {}),
    ).map(([name, total]) => ({ name, total }));

    // calculate total tasks
    const totalTasks = allTasks?.length;
    const last10Task = allTasks?.slice(0, 10);

    const summary = {
      totalTasks,
      last10Task,
      users: isAdmin ? users : [],
      tasks: groupTaskks,
      graphData: groupData,
    };

    res.status(200).json({
      status: true,
      message: "Successfully",
      ...summary,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const getTasks = async (req, res) => {
  try {
    const { stage } = req.query;
    const rawIsTrashed = req.query.isTrashed;
    const isTrashed =
      rawIsTrashed === true ||
      rawIsTrashed === "true" ||
      rawIsTrashed === "1" ||
      rawIsTrashed === 1;

    let query = { isTrashed: Boolean(isTrashed) };

    if (!req.user.isAdmin) {
      const projectLeaderProjects = await Project.find({
        projectLeader: req.user.userId,
      }).select("_id");
      query.$or = [
        { assignee: req.user.userId },
        ...(projectLeaderProjects.length
          ? [
              {
                project: {
                  $in: projectLeaderProjects.map((project) => project._id),
                },
              },
            ]
          : []),
      ];
    }

    if (stage) {
      query.stage = stage;
    }

    let queryResult = Task.find(query)
      .populate("assignee createdBy", "name role title email name status")
      .populate("project", "name projectLeader")
      .sort({ _id: -1 });

    const tasks = await queryResult;

    res.status(200).json({
      status: true,
      tasks,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const getTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id)
      .populate("assignee createdBy", "name title role email name")
      .populate("project", "name projectLeader")
      .populate({
        path: "activities.by",
        select: "name",
      });

    const dependencySummary = await getTaskDependencySummary(id);

    res.status(200).json({
      status: true,
      task: { ...task.toObject(), dependencies: dependencySummary },
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

const getTaskDependencySummary = async (taskId) => {
  const [dependsOnRecords, blocksRecords] = await Promise.all([
    TaskDependency.find({ successorTask: taskId })
      .populate("predecessorTask", "title project")
      .populate("successorTask", "title project")
      .lean(),
    TaskDependency.find({ predecessorTask: taskId })
      .populate("predecessorTask", "title project")
      .populate("successorTask", "title project")
      .lean(),
  ]);

  return {
    dependsOn: dependsOnRecords.map((record) => ({
      _id: record._id,
      dependencyType: record.dependencyType,
      task: record.predecessorTask,
    })),
    blocks: blocksRecords.map((record) => ({
      _id: record._id,
      dependencyType: record.dependencyType,
      task: record.successorTask,
    })),
  };
};

export const getTaskDependencies = async (req, res) => {
  try {
    const { id } = req.params;
    const summary = await getTaskDependencySummary(id);
    res.status(200).json({
      status: true,
      dependencies: summary,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const addTaskDependency = async (req, res) => {
  try {
    const { id } = req.params;
    const { predecessorTask, dependencyType = "FS" } = req.body;
    const successorTaskId = id;
    const predecessorTaskId = predecessorTask || null;

    if (!predecessorTaskId) {
      return res.status(400).json({
        status: false,
        message: "A predecessor task is required.",
      });
    }

    if (String(predecessorTaskId) === String(successorTaskId)) {
      return res.status(400).json({
        status: false,
        message: "A task cannot depend on itself.",
      });
    }

    const [predecessorTaskDoc, successorTaskDoc] = await Promise.all([
      Task.findById(predecessorTaskId),
      Task.findById(successorTaskId),
    ]);

    if (!predecessorTaskDoc || !successorTaskDoc) {
      return res.status(404).json({
        status: false,
        message: "Both tasks must exist before creating a dependency.",
      });
    }

    if (
      String(predecessorTaskDoc.project) !== String(successorTaskDoc.project)
    ) {
      return res.status(400).json({
        status: false,
        message: "Dependency tasks must belong to the same project.",
      });
    }

    const projectTaskIds = await Task.find({
      project: predecessorTaskDoc.project,
      isTrashed: false,
    }).select("_id");
    const projectTaskMap = Object.fromEntries(
      projectTaskIds.map((task) => [
        String(task._id),
        { _id: task._id, project: task.project },
      ]),
    );
    const existingDependencies = await TaskDependency.find({
      $or: [
        { predecessorTask: { $in: projectTaskIds.map((task) => task._id) } },
        { successorTask: { $in: projectTaskIds.map((task) => task._id) } },
      ],
    }).lean();

    const validation = validateTaskDependency({
      predecessorTaskId: predecessorTaskId,
      successorTaskId: successorTaskId,
      dependencyType,
      taskMap: projectTaskMap,
      existingDependencies,
    });

    if (!validation.valid) {
      return res.status(400).json({
        status: false,
        message: validation.error,
      });
    }

    const dependency = await TaskDependency.create({
      predecessorTask: predecessorTaskId,
      successorTask: successorTaskId,
      dependencyType: dependencyType || "FS",
    });

    res.status(201).json({
      status: true,
      dependency,
      message: "Dependency added successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const removeTaskDependency = async (req, res) => {
  try {
    const { id, dependencyId } = req.params;
    const dependency = await TaskDependency.findById(dependencyId);

    if (!dependency) {
      return res.status(404).json({
        status: false,
        message: "Dependency not found.",
      });
    }

    const currentTask = await Task.findById(id);
    if (!currentTask) {
      return res.status(404).json({
        status: false,
        message: "Task not found.",
      });
    }

    if (
      String(dependency.predecessorTask) !== String(id) &&
      String(dependency.successorTask) !== String(id)
    ) {
      return res.status(400).json({
        status: false,
        message: "That dependency does not belong to this task.",
      });
    }

    await dependency.deleteOne();

    res.status(200).json({
      status: true,
      message: "Dependency removed successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const createSubTask = async (req, res) => {
  try {
    const { title, tag, date } = req.body;

    const { id } = req.params;

    const newSubTask = {
      title,
      date,
      tag,
    };

    const task = await Task.findById(id);

    task.subTasks.push(newSubTask);

    await task.save();

    res
      .status(200)
      .json({ status: true, message: "SubTask added successfully." });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      date,
      stage,
      priority,
      assets,
      plannedStartDate,
      dueDate,
      estimatedDuration,
      actualStartDate,
      actualCompletionDate,
    } = req.body;

    const scheduleError = validateTaskSchedule({
      plannedStartDate,
      dueDate,
      estimatedDuration,
    });
    if (scheduleError) {
      return res.status(400).json({ status: false, message: scheduleError });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        status: false,
        message: "Task not found.",
      });
    }

    const currentStage = task.stage;
    const nextStage = stage ? String(stage).toLowerCase() : currentStage;

    if (nextStage !== currentStage) {
      const predecessorTasks = await getTaskPredecessors(task._id);
      const statusValidation = validateTaskStatusTransition({
        currentStage,
        nextStage,
        predecessorTasks,
      });

      if (!statusValidation.valid) {
        return res.status(400).json({
          status: false,
          message: statusValidation.error,
        });
      }

      if (nextStage === "in progress" && !task.actualStartDate) {
        task.actualStartDate = new Date();
      }
      if (nextStage === "completed" && !task.actualCompletionDate) {
        task.actualCompletionDate = new Date();
      }

      task.stage = nextStage;
      addAutomaticTaskActivity({
        task,
        type: nextStage === "in progress" ? "started" : "completed",
        activity:
          nextStage === "in progress" ? "Task started." : "Task completed.",
        by: req.user.userId,
      });
    }

    task.title = title;
    task.date = date;
    task.priority = priority.toLowerCase();
    task.assets = assets;
    task.plannedStartDate = plannedStartDate || null;
    task.dueDate = dueDate || null;
    task.estimatedDuration = estimatedDuration || null;
    task.actualStartDate = actualStartDate || task.actualStartDate || null;
    task.actualCompletionDate =
      actualCompletionDate || task.actualCompletionDate || null;
    await task.save();

    res.status(200).json({
      status: true,
      message: "Task updated successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const delegateTask = async (req, res) => {
  try {
    const target = await User.findById(req.body.assignee);
    const source = await User.findById(req.user.userId);

    let allowed = false;
    if (req.task.project) {
      const project = await Project.findById(req.task.project)
        .populate("projectLeader", "role team isAdmin")
        .populate("members", "role team isAdmin");
      if (project) {
        allowed = source.isAdmin
          ? String(project.projectLeader?._id) === String(target._id)
          : canDelegateProjectTask(source, target, project);
      }
    } else {
      allowed = canDelegateTo(source, target);
    }

    if (!target || !source || !allowed) {
      return res.status(403).json({
        status: false,
        message: "You cannot delegate this task to that user.",
      });
    }

    req.task.assignee = target._id;
    req.task.parentTask = req.task.parentTask || req.task._id;
    req.task.activities.push({
      type: "assigned",
      activity: `Task delegated to ${target.name}.`,
      by: req.user.userId,
    });
    await req.task.save();

    await Notice.create({
      team: [target._id],
      text: "A task has been delegated to you.",
      task: req.task._id,
    });

    res.status(200).json({
      status: true,
      task: req.task,
      message: "Task delegated successfully.",
    });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
};

export const trashTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);

    task.isTrashed = true;

    await task.save();

    res.status(200).json({
      status: true,
      message: `Task trashed successfully.`,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const deleteRestoreTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { actionType } = req.query;

    if (actionType === "delete") {
      await TaskDependency.deleteMany({
        $or: [{ predecessorTask: id }, { successorTask: id }],
      });
      await Notice.deleteMany({ task: id });
      await Task.updateMany({ parentTask: id }, { $set: { parentTask: null } });
      await User.updateMany({ tasks: id }, { $pull: { tasks: id } });
      await Task.findByIdAndDelete(id);
    } else if (actionType === "deleteAll") {
      const trashedTasks = await Task.find({ isTrashed: true }).select("_id");
      const trashedTaskIds = trashedTasks.map((task) => task._id);
      await Task.updateMany(
        { parentTask: { $in: trashedTaskIds } },
        { $set: { parentTask: null } },
      );
      await TaskDependency.deleteMany({
        $or: [
          { predecessorTask: { $in: trashedTaskIds } },
          { successorTask: { $in: trashedTaskIds } },
        ],
      });
      await Notice.deleteMany({ task: { $in: trashedTaskIds } });
      await User.updateMany(
        { tasks: { $in: trashedTaskIds } },
        { $pull: { tasks: { $in: trashedTaskIds } } },
      );
      await Task.deleteMany({ isTrashed: true });
    } else if (actionType === "restore") {
      const resp = await Task.findById(id);

      if (!resp) {
        return res
          .status(404)
          .json({ status: false, message: "Task not found." });
      }

      resp.isTrashed = false;
      await resp.save();
    } else if (actionType === "restoreAll") {
      await Task.updateMany(
        { isTrashed: true },
        { $set: { isTrashed: false } },
      );
    }

    res.status(200).json({
      status: true,
      message: `Operation performed successfully.`,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};
