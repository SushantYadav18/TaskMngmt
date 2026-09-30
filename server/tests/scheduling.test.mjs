import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateProjectProgress,
  isTaskOverdue,
  validateTaskSchedule,
} from "../utils/scheduling.js";

test("valid task schedule accepts ordered dates and positive working-day duration", () => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() + 3);
  const due = new Date(today);
  due.setDate(today.getDate() + 6);

  assert.equal(
    validateTaskSchedule({
      plannedStartDate: start,
      dueDate: due,
      estimatedDuration: 3,
    }),
    null,
  );
});

test("task schedule rejects reversed dates and non-positive duration", () => {
  const today = new Date();
  const later = new Date(today);
  later.setDate(today.getDate() + 5);
  const earlier = new Date(today);
  earlier.setDate(today.getDate() + 2);

  assert.match(
    validateTaskSchedule({
      plannedStartDate: later,
      dueDate: earlier,
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

test("task dates must not be earlier than the current local day", () => {
  const actualToday = new Date();
  const yesterday = new Date(actualToday);
  yesterday.setDate(actualToday.getDate() - 1);
  const today = new Date(actualToday);
  const tomorrow = new Date(actualToday);
  tomorrow.setDate(actualToday.getDate() + 1);

  assert.match(
    validateTaskSchedule({
      plannedStartDate: yesterday,
      dueDate: tomorrow,
      estimatedDuration: 2,
    }),
    /cannot be in the past|before today/i,
  );
  assert.equal(
    validateTaskSchedule({
      plannedStartDate: today,
      dueDate: tomorrow,
      estimatedDuration: 2,
    }),
    null,
  );
  assert.equal(
    validateTaskSchedule({
      plannedStartDate: tomorrow,
      dueDate: tomorrow,
      estimatedDuration: 2,
    }),
    null,
  );
});
