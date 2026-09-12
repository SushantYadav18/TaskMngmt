import Notice from "../models/notification.js";
import Task from "../models/task.js";
import User from "../models/user.js";
import { canDelegateTo } from "../utils/roles.js";

export const createTask = async (req, res) => {
  try {
    const { userId } = req.user;

    const { title, assignee, stage, date, priority, assets } = req.body;
    const creator = await User.findById(userId);
    const target = await User.findById(assignee);

    if (!creator || !target || !canDelegateTo(creator, target)) {
      return res.status(403).json({
        status: false,
        message: "Tasks can only be created for a Team Leader.",
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
      parentTask: task._id,
      subTasks: task.subTasks,
      assets: task.assets,
      priority: task.priority,
      stage: task.stage,
      date: task.date,
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

export const postTaskActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { type, activity } = req.body;

    const task = await Task.findById(id);
    const normalizedType = String(type || "").toLowerCase();

    if (normalizedType === "completed") {
      task.stage = "completed";
    } else if (normalizedType === "in progress") {
      task.stage = "in progress";
    } else if (normalizedType === "started" || normalizedType === "bug") {
      task.stage = "in progress";
    } else if (normalizedType === "assigned") {
      task.stage = "todo";
    }

    const data = {
      type: normalizedType,
      activity,
      by: userId,
    };

    task.activities.push(data);

    await task.save();

    res
      .status(200)
      .json({ status: true, message: "Activity posted successfully." });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const dashboardStatistics = async (req, res) => {
  try {
    const { userId, isAdmin } = req.user;

    const allTasks = isAdmin
      ? await Task.find({
          isTrashed: false,
        })
          .populate("assignee createdBy", "name role title email")
          .sort({ _id: -1 })
      : await Task.find({
          isTrashed: false,
          assignee: userId,
        })
          .populate("assignee createdBy", "name role title email")
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
      query.assignee = req.user.userId;
    }

    if (stage) {
      query.stage = stage;
    }

    let queryResult = Task.find(query)
      .populate("assignee createdBy", "name role title email")
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
      .populate("assignee createdBy", "name title role email")
      .populate({
        path: "activities.by",
        select: "name",
      });

    res.status(200).json({
      status: true,
      task,
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
    const { title, date, stage, priority, assets } = req.body;

    const task = await Task.findById(id);

    task.title = title;
    task.date = date;
    task.priority = priority.toLowerCase();
    task.assets = assets;
    task.stage = stage.toLowerCase();
    await task.save();

    res
      .status(200)
      .json({ status: true, message: "Task duplicated successfully." });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const delegateTask = async (req, res) => {
  try {
    const target = await User.findById(req.body.assignee);
    const source = await User.findById(req.user.userId);

    if (!target || !source || !canDelegateTo(source, target)) {
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
      await Task.findByIdAndDelete(id);
    } else if (actionType === "deleteAll") {
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
