const getLocalDateInputValue = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getTodayInputValue = () => getLocalDateInputValue(new Date());

export const isPastDate = (value) => {
  const inputDate = getLocalDateInputValue(value);
  const today = getTodayInputValue();

  if (!inputDate || !today) return false;
  return inputDate < today;
};

export const validateTaskDateNotInPast = (value, label = "Date") => {
  if (value && isPastDate(value)) {
    return `${label} cannot be in the past. Please select today or a future date.`;
  }

  return null;
};

export const validateTaskSchedule = ({
  plannedStartDate,
  dueDate,
  estimatedDuration,
}) => {
  if (plannedStartDate && isPastDate(plannedStartDate)) {
    return "Planned start date cannot be in the past. Please select today or a future date.";
  }

  if (dueDate && isPastDate(dueDate)) {
    return "Due date cannot be in the past. Please select today or a future date.";
  }

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
