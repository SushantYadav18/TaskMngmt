export const normalizeTaskStage = (value) =>
  String(value ?? "todo")
    .trim()
    .toLowerCase();

export const buildDependencyGraph = (dependencies = []) => {
  const graph = new Map();

  for (const dependency of dependencies) {
    const predecessorId = String(dependency.predecessorTask);
    const successorId = String(dependency.successorTask);

    if (!graph.has(predecessorId)) graph.set(predecessorId, new Set());
    if (!graph.has(successorId)) graph.set(successorId, new Set());

    graph.get(predecessorId).add(successorId);
  }

  return graph;
};

export const topologicalSortTasks = ({ tasks = [], dependencies = [] }) => {
  const taskMap = new Map(tasks.map((task) => [String(task._id), task]));
  const adjacency = new Map(
    [...taskMap.keys()].map((taskId) => [taskId, new Set()]),
  );
  const indegree = new Map([...taskMap.keys()].map((taskId) => [taskId, 0]));

  for (const dependency of dependencies) {
    const predecessorId = String(dependency.predecessorTask);
    const successorId = String(dependency.successorTask);

    if (!taskMap.has(predecessorId) || !taskMap.has(successorId)) continue;
    if (adjacency.get(predecessorId).has(successorId)) continue;

    adjacency.get(predecessorId).add(successorId);
    indegree.set(successorId, indegree.get(successorId) + 1);
  }

  const queue = tasks
    .map((task) => String(task._id))
    .filter((taskId) => indegree.get(taskId) === 0);
  const orderedTaskIds = [];

  while (queue.length) {
    const taskId = queue.shift();
    orderedTaskIds.push(taskId);

    for (const successorId of adjacency.get(taskId)) {
      const nextIndegree = indegree.get(successorId) - 1;
      indegree.set(successorId, nextIndegree);
      if (nextIndegree === 0) queue.push(successorId);
    }
  }

  if (orderedTaskIds.length !== tasks.length) {
    throw new Error(
      "Cannot calculate dependency order because the project dependency graph contains a cycle.",
    );
  }

  return orderedTaskIds.map((taskId) => taskMap.get(taskId));
};

const hasPath = (graph, startNode, targetNode) => {
  const queue = [String(startNode)];
  const visited = new Set();

  while (queue.length) {
    const current = queue.shift();
    if (current === String(targetNode)) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const neighbors = graph.get(current) || new Set();
    for (const nextNode of neighbors) {
      if (!visited.has(String(nextNode))) {
        queue.push(String(nextNode));
      }
    }
  }

  return false;
};

export const wouldCreateDependencyCycle = (
  graph,
  predecessorTaskId,
  successorTaskId,
) => {
  const predecessorId = String(predecessorTaskId);
  const successorId = String(successorTaskId);

  if (!predecessorId || !successorId) return false;
  if (predecessorId === successorId) return true;

  const nextGraph = new Map(graph);
  if (!nextGraph.has(predecessorId)) nextGraph.set(predecessorId, new Set());
  if (!nextGraph.has(successorId)) nextGraph.set(successorId, new Set());
  nextGraph.get(predecessorId).add(successorId);

  return hasPath(nextGraph, successorId, predecessorId);
};

export const getBlockingPredecessors = ({ predecessorTasks = [] }) =>
  predecessorTasks.filter(
    (task) => normalizeTaskStage(task?.stage) !== "completed",
  );

export const validateTaskStatusTransition = ({
  currentStage,
  nextStage,
  predecessorTasks = [],
}) => {
  const current = normalizeTaskStage(currentStage);
  const next = normalizeTaskStage(nextStage);

  if (!current || !next) {
    return {
      valid: false,
      error: "A valid task status is required.",
    };
  }

  if (current === next) {
    return { valid: true, error: null };
  }

  const blockers = getBlockingPredecessors({ predecessorTasks });

  if (current === "todo" && next === "in progress") {
    if (blockers.length) {
      return {
        valid: false,
        error:
          "This task cannot be started because one or more prerequisite tasks are not completed.",
      };
    }
    return { valid: true, error: null };
  }

  if (current === "in progress" && next === "completed") {
    if (blockers.length) {
      return {
        valid: false,
        error:
          "This task cannot be completed because one or more prerequisite tasks are not completed.",
      };
    }
    return { valid: true, error: null };
  }

  if (current === "todo" && next === "completed") {
    return {
      valid: false,
      error: "Task must be started before it can be completed.",
    };
  }

  if (current === "completed") {
    return {
      valid: false,
      error: "Completed tasks cannot be reopened.",
    };
  }

  return {
    valid: false,
    error: `Invalid task status transition from ${current} to ${next}.`,
  };
};

export const validateTaskDependency = ({
  predecessorTaskId,
  successorTaskId,
  dependencyType,
  taskMap,
  existingDependencies = [],
}) => {
  const predecessorId = String(predecessorTaskId || "");
  const successorId = String(successorTaskId || "");

  if (!predecessorId || !successorId) {
    return {
      valid: false,
      error: "Both predecessor and successor tasks are required.",
    };
  }

  if (predecessorId === successorId) {
    return {
      valid: false,
      error: "A task cannot depend on itself.",
    };
  }

  const predecessorTask = taskMap?.[predecessorId];
  const successorTask = taskMap?.[successorId];

  if (!predecessorTask || !successorTask) {
    return {
      valid: false,
      error: "Both tasks must exist in the current project context.",
    };
  }

  if (String(predecessorTask.project) !== String(successorTask.project)) {
    return {
      valid: false,
      error: "Dependency tasks must belong to the same project.",
    };
  }

  const dependencyExists = existingDependencies.some(
    (dependency) =>
      String(dependency.predecessorTask) === predecessorId &&
      String(dependency.successorTask) === successorId,
  );

  if (dependencyExists) {
    return {
      valid: false,
      error: "This dependency already exists.",
    };
  }

  const normalizedType = String(dependencyType || "FS").toUpperCase();
  if (normalizedType !== "FS") {
    return {
      valid: false,
      error:
        "Only Finish-to-Start (FS) dependencies are supported in this session.",
    };
  }

  const graph = buildDependencyGraph(existingDependencies);
  if (wouldCreateDependencyCycle(graph, predecessorId, successorId)) {
    return {
      valid: false,
      error: "This dependency would create a circular task dependency.",
    };
  }

  return { valid: true, error: null };
};
