export const validateTaskSchedule = ({
  plannedStartDate,
  dueDate,
  estimatedDuration,
}) => {
  if (
    plannedStartDate &&
    dueDate &&
    new Date(plannedStartDate) > new Date(dueDate)
  ) {
    return "Planned start date must be on or before the due date.";
  }

  if (
    estimatedDuration !== undefined &&
    estimatedDuration !== null &&
    (Number.isNaN(Number(estimatedDuration)) || Number(estimatedDuration) <= 0)
  ) {
    return "Estimated duration must be a positive number of working days.";
  }

  return null;
};

export const calculateProjectProgress = (tasks = []) => {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.stage === "completed").length;
  const inProgress = tasks.filter(
    (task) => task.stage === "in progress",
  ).length;
  const todo = tasks.filter((task) => task.stage === "todo").length;

  return {
    total,
    completed,
    inProgress,
    todo,
    percent: total ? Math.round((completed / total) * 100) : 0,
  };
};

export const isTaskOverdue = (task, now = new Date()) =>
  Boolean(
    task.dueDate &&
    task.stage !== "completed" &&
    new Date(now) > new Date(task.dueDate),
  );
