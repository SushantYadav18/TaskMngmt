import { ROLES, ROLE_VALUES, normalizeRole } from "./roles.js";
import { TASK_KEYWORD_DEFINITIONS } from "./taskAccess.js";

export const normalizeString = (value) =>
  typeof value === "string" ? value.trim() : "";

export const validateRequiredText = (
  value,
  { fieldName = "Field", minLength = 1, maxLength = 500 } = {},
) => {
  const trimmed = normalizeString(value);

  if (!trimmed) {
    return {
      valid: false,
      message: `${fieldName} is required.`,
      value: "",
    };
  }

  if (trimmed.length < minLength) {
    return {
      valid: false,
      message: `${fieldName} must be at least ${minLength} characters.`,
      value: trimmed,
    };
  }

  if (trimmed.length > maxLength) {
    return {
      valid: false,
      message: `${fieldName} must be at most ${maxLength} characters.`,
      value: trimmed,
    };
  }

  return { valid: true, value: trimmed, message: `${fieldName} is valid.` };
};

export const validateName = (value, options = {}) => {
  const result = validateRequiredText(value, {
    fieldName: "Name",
    minLength: 2,
    maxLength: 80,
    ...options,
  });

  if (!result.valid) {
    return result;
  }

  const trimmed = result.value;

  if (/[0-9]/.test(trimmed)) {
    return {
      valid: false,
      message: "Name must not contain numbers.",
      value: trimmed,
    };
  }

  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' .-]+$/.test(trimmed)) {
    return {
      valid: false,
      message:
        "Name can only contain letters, spaces, hyphens, apostrophes, and periods.",
      value: trimmed,
    };
  }

  if (trimmed.replace(/[\s.'-]/g, "") === "") {
    return {
      valid: false,
      message: "Name must include at least one letter.",
      value: trimmed,
    };
  }

  return { valid: true, value: trimmed, message: "Name is valid." };
};

export const validateEmail = (value) => {
  const result = validateRequiredText(value, {
    fieldName: "Email",
    minLength: 5,
    maxLength: 254,
  });

  if (!result.valid) {
    return result;
  }

  const normalized = result.value.toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return {
      valid: false,
      message: "Please enter a valid email address.",
      value: normalized,
    };
  }

  return { valid: true, value: normalized, message: "Email is valid." };
};

export const validatePhone = (value) => {
  const stringValue = normalizeString(value);

  if (!stringValue) {
    return {
      valid: false,
      message: "Phone number is required.",
      value: "",
    };
  }

  if (!/^\d{10}$/.test(stringValue)) {
    return {
      valid: false,
      message: "Phone number must contain exactly 10 digits.",
      value: stringValue,
    };
  }

  return { valid: true, value: stringValue, message: "Phone number is valid." };
};

export const validateTaskKeywordList = (keywords = []) => {
  if (!Array.isArray(keywords) || keywords.length === 0) {
    return {
      valid: false,
      message: "Select at least one task keyword.",
      value: [],
    };
  }

  const normalizedKeywords = [
    ...new Set(
      keywords
        .map((keyword) => normalizeString(keyword).toLowerCase())
        .filter(Boolean),
    ),
  ];

  if (!normalizedKeywords.length) {
    return {
      valid: false,
      message: "Select at least one task keyword.",
      value: [],
    };
  }

  const invalidKeyword = normalizedKeywords.find(
    (keyword) => !TASK_KEYWORD_DEFINITIONS[keyword],
  );

  if (invalidKeyword) {
    return {
      valid: false,
      message: `Keyword "${invalidKeyword}" is not valid.`,
      value: normalizedKeywords,
    };
  }

  const inactiveKeyword = normalizedKeywords.find(
    (keyword) => TASK_KEYWORD_DEFINITIONS[keyword]?.active === false,
  );

  if (inactiveKeyword) {
    return {
      valid: false,
      message: `Keyword "${inactiveKeyword}" is not active.`,
      value: normalizedKeywords,
    };
  }

  return {
    valid: true,
    value: normalizedKeywords,
    message: "Task keywords are valid.",
  };
};

export const validateAssignmentTarget = ({
  role,
  isActive = true,
  status = "approved",
  allowAdmin = false,
}) => {
  const normalizedRole = normalizeRole(role);

  if (!ROLE_VALUES.includes(normalizedRole)) {
    return {
      allowed: false,
      reason: "invalid_role",
      message: "Invalid role.",
    };
  }

  if (!allowAdmin && normalizedRole === ROLES.ADMIN) {
    return {
      allowed: false,
      reason: "admin_assignment_rejected",
      message: "Admin users cannot be assigned tasks.",
    };
  }

  if (isActive === false) {
    return {
      allowed: false,
      reason: "inactive_member",
      message: "The target user is not active and cannot be assigned tasks.",
    };
  }

  if (status && String(status).toLowerCase() !== "approved") {
    return {
      allowed: false,
      reason: "unapproved_member",
      message: "Only approved users can be assigned tasks.",
    };
  }

  return {
    allowed: true,
    role: normalizedRole,
    reason: "valid",
    message: "Assignment is valid.",
  };
};
