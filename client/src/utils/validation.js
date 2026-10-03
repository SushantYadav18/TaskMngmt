export const normalizeString = (value) =>
  typeof value === "string" ? value.trim() : "";

export const validateName = (value, options = {}) => {
  const trimmed = normalizeString(value);
  const minLength = options.minLength ?? 2;
  const maxLength = options.maxLength ?? 80;

  if (!trimmed) {
    return { valid: false, message: "Name is required." };
  }

  if (trimmed.length < minLength) {
    return {
      valid: false,
      message: `Name must be at least ${minLength} characters.`,
    };
  }

  if (trimmed.length > maxLength) {
    return {
      valid: false,
      message: `Name must be at most ${maxLength} characters.`,
    };
  }

  if (/[0-9]/.test(trimmed)) {
    return { valid: false, message: "Name must not contain numbers." };
  }

  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' .-]+$/.test(trimmed)) {
    return {
      valid: false,
      message:
        "Name can only contain letters, spaces, hyphens, apostrophes, and periods.",
    };
  }

  if (trimmed.replace(/[\s.'-]/g, "") === "") {
    return { valid: false, message: "Name must include at least one letter." };
  }

  return { valid: true, message: "Name is valid." };
};

export const validateEmail = (value) => {
  const trimmed = normalizeString(value);

  if (!trimmed) {
    return { valid: false, message: "Email is required." };
  }

  if (trimmed.length > 254) {
    return { valid: false, message: "Email must be at most 254 characters." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed.toLowerCase())) {
    return { valid: false, message: "Please enter a valid email address." };
  }

  return { valid: true, message: "Email is valid." };
};

export const validateTaskTitle = (value) => {
  const trimmed = normalizeString(value);

  if (!trimmed) {
    return { valid: false, message: "Task title is required." };
  }

  if (trimmed.length < 3) {
    return {
      valid: false,
      message: "Task title must be at least 3 characters.",
    };
  }

  if (trimmed.length > 120) {
    return {
      valid: false,
      message: "Task title must be at most 120 characters.",
    };
  }

  return { valid: true, message: "Task title is valid." };
};
