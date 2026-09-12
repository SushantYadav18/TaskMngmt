import assert from "node:assert/strict";
import test from "node:test";
import {
  getBlockingPredecessors,
  validateTaskStatusTransition,
} from "../utils/taskDependencies.js";

test("todo to in progress is allowed", () => {
  const result = validateTaskStatusTransition({
    currentStage: "todo",
    nextStage: "in progress",
    predecessorTasks: [],
  });

  assert.equal(result.valid, true);
  assert.equal(result.error, null);
});

test("in progress to completed is allowed", () => {
  const result = validateTaskStatusTransition({
    currentStage: "in progress",
    nextStage: "completed",
    predecessorTasks: [],
  });

  assert.equal(result.valid, true);
  assert.equal(result.error, null);
});

test("todo to completed is rejected", () => {
  const result = validateTaskStatusTransition({
    currentStage: "todo",
    nextStage: "completed",
    predecessorTasks: [],
  });

  assert.equal(result.valid, false);
  assert.match(result.error, /must be started before it can be completed/i);
});

test("completed to in progress is rejected", () => {
  const result = validateTaskStatusTransition({
    currentStage: "completed",
    nextStage: "in progress",
    predecessorTasks: [],
  });

  assert.equal(result.valid, false);
  assert.match(result.error, /cannot be reopened/i);
});

test("a task cannot start while a predecessor remains incomplete", () => {
  const result = validateTaskStatusTransition({
    currentStage: "todo",
    nextStage: "in progress",
    predecessorTasks: [{ title: "Backend API", stage: "todo" }],
  });

  assert.equal(result.valid, false);
  assert.match(result.error, /prerequisite tasks are not completed/i);
});

test("a task with all predecessor tasks completed can start", () => {
  const result = validateTaskStatusTransition({
    currentStage: "todo",
    nextStage: "in progress",
    predecessorTasks: [
      { title: "Backend API", stage: "completed" },
      { title: "Database Design", stage: "completed" },
    ],
  });

  assert.equal(result.valid, true);
});

test("multiple incomplete predecessors are reported as blockers", () => {
  const blockers = getBlockingPredecessors({
    predecessorTasks: [
      { title: "Backend API", stage: "completed" },
      { title: "Testing", stage: "todo" },
      { title: "Review", stage: "in progress" },
    ],
  });

  assert.deepEqual(
    blockers.map((task) => task.title).sort(),
    ["Review", "Testing"].sort(),
  );
});
