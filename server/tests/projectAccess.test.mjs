import assert from "node:assert/strict";
import test from "node:test";
import {
  canManageProject,
  canDelegateProjectTask,
  canViewProject,
  canWorkOnProjectTask,
  canDeleteProject,
  canDeleteProjectTask,
} from "../utils/projectAccess.js";

const project = {
  owner: "owner",
  projectLeader: "leader",
  members: ["leader", "member", "cross-team-junior", "cross-team-intern"],
  teams: [
    { _id: "team-a", members: ["member"] },
    { _id: "team-b", members: ["cross-team-junior"] },
  ],
};

test("administrators can view and manage every project", () => {
  const admin = { userId: "admin", isAdmin: true };
  assert.equal(canViewProject(project, admin), true);
  assert.equal(canManageProject(project, admin), true);
});

test("owners and project participants can view projects", () => {
  assert.equal(canViewProject(project, { userId: "owner" }), true);
  assert.equal(canViewProject(project, { userId: "member" }), true);
  assert.equal(canViewProject(project, { userId: "leader" }), true);
  assert.equal(
    canViewProject(project, { userId: "outsider", team: "team-a" }),
    true,
  );
  assert.equal(
    canViewProject(project, { userId: "outsider", team: "team-b" }),
    true,
  );
  assert.equal(
    canWorkOnProjectTask(project, { _id: "team-b-outsider" }),
    false,
  );
});

test("only the owner or administrator can manage a project", () => {
  assert.equal(canManageProject(project, { userId: "owner" }), true);
  assert.equal(canManageProject(project, { userId: "member" }), false);
  assert.equal(
    canManageProject(project, { userId: "admin", isAdmin: true }),
    true,
  );
  assert.equal(canManageProject(project, { userId: "leader" }), true);
});

test("only administrators can delete projects", () => {
  assert.equal(
    canDeleteProject(project, { userId: "admin", isAdmin: true }),
    true,
  );
  assert.equal(canDeleteProject(project, { userId: "owner" }), false);
  assert.equal(canDeleteProject(project, { userId: "leader" }), false);
  assert.equal(canDeleteProject(project, {}), false);
});

test("task deletion is project-leader or administrator only", () => {
  assert.equal(
    canDeleteProjectTask(project, { userId: "admin", isAdmin: true }),
    true,
  );
  assert.equal(canDeleteProjectTask(project, { userId: "leader" }), true);
  assert.equal(canDeleteProjectTask(project, { userId: "member" }), false);
  assert.equal(canDeleteProjectTask(project, { userId: "assignee" }), false);
  assert.equal(canDeleteProjectTask(project, { userId: "owner" }), false);
  assert.equal(
    canDeleteProjectTask(project, {
      userId: "team-leader",
      role: "TEAM_LEADER",
    }),
    false,
  );
  assert.equal(canDeleteProjectTask(null, { userId: "leader" }), false);
});

test("project task work is limited to explicit project members", () => {
  assert.equal(canWorkOnProjectTask(project, { _id: "member" }), true);
  assert.equal(
    canWorkOnProjectTask(project, { _id: "cross-team-junior" }),
    true,
  );
  assert.equal(canWorkOnProjectTask(project, { _id: "assignee" }), false);
  assert.equal(canWorkOnProjectTask(project, { _id: "outsider" }), false);
  assert.equal(canWorkOnProjectTask(null, { _id: "assignee" }), false);
});

test("project delegation uses project membership, not team membership", () => {
  assert.equal(
    canDelegateProjectTask(
      { _id: "leader", role: "ASSOCIATE", team: "team-a" },
      { _id: "leader", role: "ASSOCIATE", team: "team-a" },
      project,
    ),
    true,
  );
  assert.equal(
    canDelegateProjectTask(
      { _id: "leader", role: "TEAM_LEADER", team: "team-a" },
      { _id: "cross-team-junior", role: "JUNIOR", team: "team-b" },
      project,
    ),
    true,
  );
  assert.equal(
    canDelegateProjectTask(
      { _id: "associate-leader", role: "ASSOCIATE", team: "team-a" },
      { _id: "team-leader", role: "TEAM_LEADER", team: "team-b" },
      {
        ...project,
        projectLeader: "associate-leader",
        members: [...project.members, "associate-leader", "team-leader"],
      },
    ),
    true,
  );
  assert.equal(
    canDelegateProjectTask(
      { _id: "member", role: "ASSOCIATE", team: "team-a" },
      { _id: "cross-team-junior", role: "JUNIOR", team: "team-b" },
      project,
    ),
    true,
  );
  assert.equal(
    canDelegateProjectTask(
      { _id: "member", role: "ASSOCIATE", team: "team-a" },
      { _id: "cross-team-intern", role: "INTERN", team: "team-c" },
      { ...project, members: [...project.members, "cross-team-intern"] },
    ),
    true,
  );
  assert.equal(
    canDelegateProjectTask(
      { _id: "cross-team-junior", role: "JUNIOR", team: "team-b" },
      { _id: "cross-team-intern", role: "INTERN", team: "team-c" },
      { ...project, members: [...project.members, "cross-team-intern"] },
    ),
    true,
  );
  assert.equal(
    canDelegateProjectTask(
      { _id: "cross-team-intern", role: "INTERN", team: "team-c" },
      { _id: "member", role: "ASSOCIATE", team: "team-a" },
      project,
    ),
    false,
  );
});
