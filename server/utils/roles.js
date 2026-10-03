export const ROLES = Object.freeze({
  ADMIN: "ADMIN",
  TEAM_LEADER: "TEAM_LEADER",
  ASSOCIATE: "ASSOCIATE",
  JUNIOR: "JUNIOR",
  INTERN: "INTERN",
});

export const ROLE_VALUES = Object.values(ROLES);

export const DELEGATION_LEVEL = Object.freeze({
  [ROLES.ADMIN]: 0,
  [ROLES.TEAM_LEADER]: 1,
  [ROLES.ASSOCIATE]: 2,
  [ROLES.JUNIOR]: 3,
  [ROLES.INTERN]: 4,
});

export const normalizeRole = (role) =>
  String(role || "")
    .trim()
    .toUpperCase();

export const canDelegateTo = (source, target) => {
  const sourceRole = normalizeRole(source.role);
  const targetRole = normalizeRole(target.role);

  if (sourceRole === ROLES.ADMIN || source.isAdmin) {
    return targetRole === ROLES.TEAM_LEADER && Boolean(target.team);
  }

  if (
    !source.team ||
    !target.team ||
    String(source.team) !== String(target.team)
  ) {
    return false;
  }

  return DELEGATION_LEVEL[targetRole] > DELEGATION_LEVEL[sourceRole];
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
