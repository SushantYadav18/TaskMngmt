import assert from "node:assert/strict";
import test from "node:test";
import Task from "../models/task.js";
import { validateSubtaskTitle } from "../utils/subtasks.js";

test("subtask titles reject empty and whitespace-only values", () => {
  assert.match(validateSubtaskTitle(""), /required/i);
  assert.match(validateSubtaskTitle("   "), /required/i);
});

test("subtask titles accept trimmed text and enforce a reasonable length", () => {
  assert.equal(validateSubtaskTitle("  Create login UI  "), null);
  assert.match(validateSubtaskTitle("x".repeat(201)), /200 characters/i);
});

test("embedded subtasks persist a completed flag defaulting to false", () => {
  const subtaskSchema = Task.schema.path("subTasks").schema;
  assert.equal(subtaskSchema.path("completed").defaultValue, false);
  assert.equal(subtaskSchema.path("date"), undefined);
  assert.equal(subtaskSchema.path("tag"), undefined);
});
