import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_WORKLOAD_CONFIG,
  getWorkloadWeight,
  getProjectMemberWorkload,
  validateProjectTaskAssignment,
  getProjectWorkloadOverview,
} from "../utils/workload.js";

const now = new Date("2026-09-30T12:00:00.000Z");

const makeTask = ({
  id,
  assignee,
  project,
  priority,
  date,
  isTrashed = false,
  stage = "todo",
}) => ({
  _id: id,
  assignee,
  project,
  priority,
  date,
  stage,
  isTrashed,
  activities: [{ type: "assigned", date }],
});

test("priority weights, hard limits, and capacity are centralized and configurable", () => {
  assert.equal(getWorkloadWeight("HIGH", DEFAULT_WORKLOAD_CONFIG), 5);
  assert.equal(getWorkloadWeight("medium", DEFAULT_WORKLOAD_CONFIG), 3);
  assert.equal(getWorkloadWeight("normal", DEFAULT_WORKLOAD_CONFIG), 2);
  assert.equal(getWorkloadWeight("low", DEFAULT_WORKLOAD_CONFIG), 1);
  assert.equal(DEFAULT_WORKLOAD_CONFIG.allocationPeriodDays, 15);
  assert.equal(DEFAULT_WORKLOAD_CONFIG.maxWorkload, 20);
  assert.deepEqual(DEFAULT_WORKLOAD_CONFIG.hardLimits, { high: 1, medium: 3 });
});

test("member workload ignores tasks outside the 15-day window and trashed tasks", () => {
  const tasks = [
    makeTask({
      id: "old-high",
      assignee: "member-1",
      project: "project-1",
      priority: "high",
      date: new Date("2026-09-01T08:00:00.000Z"),
    }),
    makeTask({
      id: "recent-medium",
      assignee: "member-1",
      project: "project-1",
      priority: "medium",
      date: new Date("2026-09-18T08:00:00.000Z"),
    }),
    makeTask({
      id: "trashed-low",
      assignee: "member-1",
      project: "project-1",
      priority: "low",
      date: new Date("2026-09-22T08:00:00.000Z"),
      isTrashed: true,
    }),
    makeTask({
      id: "other-project",
      assignee: "member-1",
      project: "project-2",
      priority: "high",
      date: new Date("2026-09-25T08:00:00.000Z"),
    }),
  ];

  const summary = getProjectMemberWorkload({
    projectId: "project-1",
    memberId: "member-1",
    tasks,
    now,
    config: DEFAULT_WORKLOAD_CONFIG,
  });

  assert.equal(summary.totalWorkload, 3);
  assert.deepEqual(summary.byPriority, {
    high: 0,
    medium: 1,
    normal: 0,
    low: 0,
  });
  assert.equal(summary.remaining, 17);
  assert.equal(summary.status, "AVAILABLE");
});

test("assignment validation applies hard count limits and workload-point capacity", () => {
  const currentTasks = [
    makeTask({
      id: "high-1",
      assignee: "member-1",
      project: "project-1",
      priority: "high",
      date: new Date("2026-09-25T08:00:00.000Z"),
    }),
    makeTask({
      id: "medium-1",
      assignee: "member-1",
      project: "project-1",
      priority: "medium",
      date: new Date("2026-09-26T08:00:00.000Z"),
    }),
    makeTask({
      id: "medium-2",
      assignee: "member-1",
      project: "project-1",
      priority: "medium",
      date: new Date("2026-09-27T08:00:00.000Z"),
    }),
    makeTask({
      id: "normal-1",
      assignee: "member-1",
      project: "project-1",
      priority: "normal",
      date: new Date("2026-09-28T08:00:00.000Z"),
    }),
    makeTask({
      id: "normal-2",
      assignee: "member-1",
      project: "project-1",
      priority: "normal",
      date: new Date("2026-09-29T08:00:00.000Z"),
    }),
  ];

  const highLimitBlocked = validateProjectTaskAssignment({
    projectId: "project-1",
    memberId: "member-1",
    tasks: currentTasks,
    newPriority: "high",
    now,
    config: DEFAULT_WORKLOAD_CONFIG,
  });

  assert.equal(highLimitBlocked.allowed, false);
  assert.match(highLimitBlocked.message, /maximum of 1 HIGH/i);

  const mediumAllowed = validateProjectTaskAssignment({
    projectId: "project-1",
    memberId: "member-1",
    tasks: currentTasks,
    newPriority: "medium",
    now,
    config: DEFAULT_WORKLOAD_CONFIG,
  });

  assert.equal(mediumAllowed.allowed, true);
  assert.equal(mediumAllowed.afterWorkload, 18);

  const pointCapBlocked = validateProjectTaskAssignment({
    projectId: "project-1",
    memberId: "member-1",
    tasks: [
      ...currentTasks,
      makeTask({
        id: "normal-3",
        assignee: "member-1",
        project: "project-1",
        priority: "normal",
        date: new Date("2026-09-30T08:00:00.000Z"),
      }),
      makeTask({
        id: "normal-4",
        assignee: "member-1",
        project: "project-1",
        priority: "normal",
        date: new Date("2026-09-30T09:00:00.000Z"),
      }),
      makeTask({
        id: "normal-5",
        assignee: "member-1",
        project: "project-1",
        priority: "normal",
        date: new Date("2026-09-30T10:00:00.000Z"),
      }),
      makeTask({
        id: "low-2",
        assignee: "member-1",
        project: "project-1",
        priority: "low",
        date: new Date("2026-09-30T11:00:00.000Z"),
      }),
      makeTask({
        id: "low-3",
        assignee: "member-1",
        project: "project-1",
        priority: "low",
        date: new Date("2026-09-30T12:00:00.000Z"),
      }),
    ],
    newPriority: "low",
    now,
    config: DEFAULT_WORKLOAD_CONFIG,
  });

  assert.equal(pointCapBlocked.allowed, false);
  assert.match(pointCapBlocked.message, /workload capacity/i);

  const noFixedNormalLimit = validateProjectTaskAssignment({
    projectId: "project-1",
    memberId: "member-1",
    tasks: currentTasks,
    newPriority: "normal",
    now,
    config: DEFAULT_WORKLOAD_CONFIG,
  });

  assert.equal(noFixedNormalLimit.allowed, true);
  assert.equal(noFixedNormalLimit.afterWorkload, 17);
});

test("admin overview aggregates project members across all projects", () => {
  const projects = [
    {
      _id: "project-1",
      name: "Project One",
      projectLeader: { _id: "leader-1", name: "Leader One" },
      members: [
        {
          _id: "member-1",
          name: "Member One",
          team: { _id: "team-a", name: "Team A" },
        },
      ],
    },
  ];
  const tasks = [
    makeTask({
      id: "task-1",
      assignee: "member-1",
      project: "project-1",
      priority: "medium",
      date: new Date("2026-09-22T08:00:00.000Z"),
    }),
    makeTask({
      id: "task-2",
      assignee: "member-1",
      project: "project-1",
      priority: "low",
      date: new Date("2026-09-24T08:00:00.000Z"),
    }),
  ];

  const overview = getProjectWorkloadOverview({
    projects,
    tasks,
    now,
    config: DEFAULT_WORKLOAD_CONFIG,
  });

  assert.equal(overview.projects.length, 1);
  assert.equal(overview.projects[0].members[0].totalWorkload, 4);
  assert.equal(overview.projects[0].members[0].status, "AVAILABLE");
});
