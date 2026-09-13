import { topologicalSortTasks } from "./taskDependencies.js";

const EPSILON = Number.EPSILON * 100;
const taskId = (task) => String(task._id);

const getDuration = (task) => {
  if (
    task.estimatedDuration === null ||
    task.estimatedDuration === undefined ||
    task.estimatedDuration === ""
  ) {
    throw new Error(
      `Task ${taskId(task)} must have a valid estimated duration before CPM can be calculated.`,
    );
  }
  const duration = Number(task.estimatedDuration);
  if (!Number.isFinite(duration) || duration < 0) {
    throw new Error(
      `Task ${taskId(task)} must have a valid estimated duration before CPM can be calculated.`,
    );
  }
  return duration;
};

export const calculateCriticalPath = ({ tasks = [], dependencies = [] }) => {
  const orderedTasks = topologicalSortTasks({ tasks, dependencies });
  const taskMap = new Map(tasks.map((task) => [taskId(task), task]));
  const predecessorMap = new Map(
    tasks.map((task) => [taskId(task), new Set()]),
  );
  const successorMap = new Map(tasks.map((task) => [taskId(task), new Set()]));

  for (const dependency of dependencies) {
    const predecessorId = String(dependency.predecessorTask);
    const successorId = String(dependency.successorTask);
    if (!taskMap.has(predecessorId) || !taskMap.has(successorId)) continue;

    predecessorMap.get(successorId).add(predecessorId);
    successorMap.get(predecessorId).add(successorId);
  }

  const schedule = new Map();
  for (const task of orderedTasks) {
    const id = taskId(task);
    const duration = getDuration(task);
    const earliestStart = Math.max(
      0,
      ...[...predecessorMap.get(id)].map(
        (predecessorId) => schedule.get(predecessorId).earliestFinish,
      ),
    );
    schedule.set(id, {
      task,
      taskId: id,
      duration,
      earliestStart,
      earliestFinish: earliestStart + duration,
    });
  }

  const projectDuration = Math.max(
    0,
    ...[...schedule.values()].map((item) => item.earliestFinish),
  );

  for (const task of [...orderedTasks].reverse()) {
    const id = taskId(task);
    const current = schedule.get(id);
    const successors = [...successorMap.get(id)];
    const latestFinish = successors.length
      ? Math.min(
          ...successors.map(
            (successorId) => schedule.get(successorId).latestStart,
          ),
        )
      : projectDuration;
    const latestStart = latestFinish - current.duration;
    schedule.set(id, {
      ...current,
      latestStart,
      latestFinish,
      slack: latestStart - current.earliestStart,
      isCritical: Math.abs(latestStart - current.earliestStart) < EPSILON,
    });
  }

  const orderedSchedule = orderedTasks.map((task) =>
    schedule.get(taskId(task)),
  );
  const criticalTaskIds = new Set(
    orderedSchedule
      .filter((item) => item.isCritical)
      .map((item) => item.taskId),
  );
  const criticalStarts = orderedSchedule.filter(
    (item) =>
      item.isCritical &&
      ![...predecessorMap.get(item.taskId)].some((id) =>
        criticalTaskIds.has(id),
      ),
  );
  const criticalPaths = [];

  const collectCriticalPaths = (currentPath, currentId) => {
    const criticalSuccessors = [...successorMap.get(currentId)].filter(
      (successorId) =>
        criticalTaskIds.has(successorId) &&
        Math.abs(
          schedule.get(currentId).earliestFinish -
            schedule.get(successorId).earliestStart,
        ) < EPSILON,
    );
    if (!criticalSuccessors.length) {
      criticalPaths.push(currentPath);
      return;
    }
    for (const successorId of criticalSuccessors) {
      collectCriticalPaths([...currentPath, successorId], successorId);
    }
  };

  for (const start of criticalStarts) {
    collectCriticalPaths([start.taskId], start.taskId);
  }

  return {
    projectDuration,
    tasks: orderedSchedule,
    criticalTasks: orderedSchedule
      .filter((item) => item.isCritical)
      .map((item) => item.taskId),
    criticalPath: criticalPaths[0] || [],
    criticalPaths,
  };
};
