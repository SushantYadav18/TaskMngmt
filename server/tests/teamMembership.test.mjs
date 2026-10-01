import assert from "node:assert/strict";
import test from "node:test";
import User from "../models/user.js";

test("approved users default to an unassigned team state", () => {
  assert.equal(User.schema.path("team").defaultValue, null);
  assert.equal(User.schema.path("status").defaultValue, "pending");
  assert.equal(User.schema.path("isActive").defaultValue, false);
});

test("an approved active user with no team matches the unassigned member criteria", () => {
  const approvedUnassigned = {
    status: "approved",
    isActive: true,
    team: null,
  };
  const approvedAssigned = { ...approvedUnassigned, team: "team-a" };
  const pendingUnassigned = { ...approvedUnassigned, status: "pending" };
  const inactiveUnassigned = { ...approvedUnassigned, isActive: false };

  const isUnassigned = (user) =>
    user.status === "approved" && user.isActive === true && !user.team;

  assert.equal(isUnassigned(approvedUnassigned), true);
  assert.equal(isUnassigned(approvedAssigned), false);
  assert.equal(isUnassigned(pendingUnassigned), false);
  assert.equal(isUnassigned(inactiveUnassigned), false);
});

test("admin users are not listed as unassigned team members but ordinary users still are", () => {
  const isEligibleForUnassignedTeamList = (user) =>
    user.status === "approved" &&
    user.isActive === true &&
    !user.team &&
    !user.isAdmin &&
    String(user.role || "").toUpperCase() !== "ADMIN";

  const adminUser = {
    name: "Admin User",
    role: "ADMIN",
    isAdmin: true,
    status: "approved",
    isActive: true,
    team: null,
  };
  const normalUser = {
    name: "Normal User",
    role: "ASSOCIATE",
    isAdmin: false,
    status: "approved",
    isActive: true,
    team: null,
  };
  const assignedUser = {
    name: "Assigned User",
    role: "JUNIOR",
    isAdmin: false,
    status: "approved",
    isActive: true,
    team: "team-a",
  };

  assert.equal(isEligibleForUnassignedTeamList(adminUser), false);
  assert.equal(isEligibleForUnassignedTeamList(normalUser), true);
  assert.equal(isEligibleForUnassignedTeamList(assignedUser), false);
});
