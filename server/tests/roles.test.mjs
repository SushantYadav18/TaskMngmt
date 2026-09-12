import assert from "node:assert/strict";
import test from "node:test";
import { canDelegateTo, ROLES } from "../utils/roles.js";

const user = (role, team = null, isAdmin = false) => ({ role, team, isAdmin });

const cases = [
  ["ADMIN", ROLES.ADMIN, ROLES.TEAM_LEADER, "A", "A", true],
  ["ADMIN to Associate", ROLES.ADMIN, ROLES.ASSOCIATE, "A", "A", false],
  [
    "Leader same team to Associate",
    ROLES.TEAM_LEADER,
    ROLES.ASSOCIATE,
    "A",
    "A",
    true,
  ],
  [
    "Leader cross team to Associate",
    ROLES.TEAM_LEADER,
    ROLES.ASSOCIATE,
    "A",
    "B",
    false,
  ],
  [
    "Leader same team to Leader",
    ROLES.TEAM_LEADER,
    ROLES.TEAM_LEADER,
    "A",
    "A",
    false,
  ],
  ["Associate to Junior", ROLES.ASSOCIATE, ROLES.JUNIOR, "A", "A", true],
  ["Associate to Associate", ROLES.ASSOCIATE, ROLES.ASSOCIATE, "A", "A", false],
  [
    "Associate cross team to Junior",
    ROLES.ASSOCIATE,
    ROLES.JUNIOR,
    "A",
    "B",
    false,
  ],
  ["Junior to Intern", ROLES.JUNIOR, ROLES.INTERN, "A", "A", true],
  ["Junior to Junior", ROLES.JUNIOR, ROLES.JUNIOR, "A", "A", false],
  ["Junior cross team to Intern", ROLES.JUNIOR, ROLES.INTERN, "A", "B", false],
  ["Intern to anyone", ROLES.INTERN, ROLES.INTERN, "A", "A", false],
];

for (const [
  name,
  sourceRole,
  targetRole,
  sourceTeam,
  targetTeam,
  expected,
] of cases) {
  test(name, () => {
    assert.equal(
      canDelegateTo(user(sourceRole, sourceTeam), user(targetRole, targetTeam)),
      expected,
    );
  });
}
