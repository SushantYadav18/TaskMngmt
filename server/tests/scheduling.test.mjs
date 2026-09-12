import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateProjectProgress,
  isTaskOverdue,
  validateTaskSchedule,
} from "../utils/scheduling.js";

test("valid task schedule accepts ordered dates and positive working-day duration", () => {
  assert.equal(
    validateTaskSchedule({
      plannedStartDate: "2026-09-15",
      dueDate: "2026-09-18",
      estimatedDuration: 3,
    }),
    null,
  );
});

test("task schedule rejects reversed dates and non-positive duration", () => {
  assert.match(
    validateTaskSchedule({
      plannedStartDate: "2026-09-20",
      dueDate: "2026-09-18",
      estimatedDuration: 3,
    }),
    /on or before/,
  );
  assert.match(validateTaskSchedule({ estimatedDuration: 0 }), /positive/);
  assert.match(validateTaskSchedule({ estimatedDuration: -2 }), /positive/);
});

test("project progress handles empty, partial, and complete projects", () => {
  assert.deepEqual(calculateProjectProgress([]), {
    total: 0,
    completed: 0,
    inProgress: 0,
    todo: 0,
    percent: 0,
  });
  assert.equal(
    calculateProjectProgress([
      { stage: "completed" },
      { stage: "todo" },
      { stage: "in progress" },
      { stage: "todo" },
    ]).percent,
    25,
  );
  assert.equal(
    calculateProjectProgress([
      { stage: "completed" },
      { stage: "completed" },
      { stage: "completed" },
      { stage: "completed" },
    ]).percent,
    100,
  );
});

test("overdue means past due date and not completed", () => {
  const now = new Date("2026-09-20T00:00:00.000Z");
  assert.equal(
    isTaskOverdue({ dueDate: "2026-09-19", stage: "todo" }, now),
    true,
  );
  assert.equal(
    isTaskOverdue({ dueDate: "2026-09-19", stage: "completed" }, now),
    false,
  );
  assert.equal(
    isTaskOverdue({ dueDate: "2026-09-21", stage: "todo" }, now),
    false,
  );
});
