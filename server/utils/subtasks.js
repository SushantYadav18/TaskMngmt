export const normalizeSubtaskTitle = (value) => String(value ?? "").trim();

export const validateSubtaskTitle = (value) => {
  const title = normalizeSubtaskTitle(value);

  if (!title) return "Subtask text is required.";
  if (title.length > 200)
    return "Subtask text must be 200 characters or fewer.";

  return null;
};
