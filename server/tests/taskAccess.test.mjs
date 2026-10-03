import assert from "node:assert/strict";
import test from "node:test";
import {
  TASK_KEYWORD_DEFINITIONS,
  getEligibleProjectMembers,
  getTaskRequiredTechnicalRoles,
  satisfiesTaskLevel,
  validateTaskAssignment,
} from "../utils/taskAccess.js";

test("task keyword metadata remains centralized and mapped to technical roles", () => {
  assert.ok(TASK_KEYWORD_DEFINITIONS.graphics);
  assert.ok(TASK_KEYWORD_DEFINITIONS.frontend);
  assert.deepEqual(TASK_KEYWORD_DEFINITIONS.graphics.technicalRoles, [
    "GRAPHIC_DESIGNER",
  ]);
  assert.deepEqual(TASK_KEYWORD_DEFINITIONS.frontend.technicalRoles, [
    "FRONTEND_DEVELOPER",
  ]);
});

test("task level matching respects organizational seniority and optional exact mode", () => {
  assert.equal(satisfiesTaskLevel("INTERN", "INTERN"), true);
  assert.equal(satisfiesTaskLevel("JUNIOR", "INTERN"), true);
  assert.equal(satisfiesTaskLevel("INTERN", "JUNIOR"), false);
  assert.equal(satisfiesTaskLevel("ASSOCIATE", "INTERN", true), false);
  assert.equal(satisfiesTaskLevel("INTERN", "INTERN", true), true);
});

test("multiple keyword tasks derive required technical roles from the centralized mapping", () => {
  const roles = getTaskRequiredTechnicalRoles(["graphics", "frontend"], {
    roleMatchMode: "ANY",
  });

  assert.deepEqual(roles, ["GRAPHIC_DESIGNER", "FRONTEND_DEVELOPER"]);
});

test("eligible project members are filtered by technical role and task level", () => {
  const project = {
    _id: "project-1",
    members: [
      {
        _id: "john",
        name: "John",
        role: "ASSOCIATE",
        technicalRoles: ["BACKEND_DEVELOPER"],
        isActive: true,
      },
      {
        _id: "ram",
        name: "Ram",
        role: "INTERN",
        technicalRoles: ["GRAPHIC_DESIGNER"],
        isActive: true,
      },
      {
        _id: "sita",
        name: "Sita",
        role: "JUNIOR",
        technicalRoles: ["QA_ENGINEER"],
        isActive: true,
      },
    ],
  };

  const eligible = getEligibleProjectMembers({
    project,
    task: {
      keywords: ["graphics"],
      requiredLevel: "INTERN",
      exactLevelOnly: false,
      roleMatchMode: "ANY",
    },
  });

  assert.deepEqual(
    eligible.map((member) => member._id),
    ["ram"],
  );
});

test("backend validation blocks assignments that fail technical-role or level checks", () => {
  const project = {
    _id: "project-1",
    members: [
      {
        _id: "john",
        name: "John",
        role: "ASSOCIATE",
        technicalRoles: ["BACKEND_DEVELOPER"],
        isActive: true,
      },
      {
        _id: "ram",
        name: "Ram",
        role: "INTERN",
        technicalRoles: ["GRAPHIC_DESIGNER"],
        isActive: true,
      },
    ],
  };

  const invalid = validateTaskAssignment({
    project,
    task: {
      keywords: ["graphics"],
      requiredLevel: "INTERN",
      exactLevelOnly: false,
      roleMatchMode: "ANY",
      priority: "medium",
    },
    targetUser: {
      _id: "john",
      role: "ASSOCIATE",
      technicalRoles: ["BACKEND_DEVELOPER"],
      isActive: true,
      isAdmin: false,
      team: "team-1",
    },
    projectTasks: [],
    creatorUser: {
      _id: "leader",
      role: "TEAM_LEADER",
      isAdmin: false,
      team: "team-1",
    },
  });

  assert.equal(invalid.allowed, false);
  assert.match(invalid.message, /technical role|required technical role/i);

  const valid = validateTaskAssignment({
    project,
    task: {
      keywords: ["graphics"],
      requiredLevel: "INTERN",
      exactLevelOnly: false,
      roleMatchMode: "ANY",
      priority: "medium",
    },
    targetUser: {
      _id: "ram",
      role: "INTERN",
      technicalRoles: ["GRAPHIC_DESIGNER"],
      isActive: true,
      isAdmin: false,
      team: "team-1",
    },
    projectTasks: [],
    creatorUser: {
      _id: "leader",
      role: "TEAM_LEADER",
      isAdmin: false,
      team: "team-1",
    },
  });

  assert.equal(valid.allowed, true);
});
