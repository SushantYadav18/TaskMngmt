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
