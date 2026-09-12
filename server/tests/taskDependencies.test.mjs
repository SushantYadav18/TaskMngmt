import assert from "node:assert/strict";
import test from "node:test";
import {
  validateTaskDependency,
  buildDependencyGraph,
  wouldCreateDependencyCycle,
} from "../utils/taskDependencies.js";

test("allows a valid dependency within the same project", () => {
  const result = validateTaskDependency({
    predecessorTaskId: "a",
    successorTaskId: "b",
    dependencyType: "FS",
    taskMap: {
      a: { _id: "a", project: "project-1" },
      b: { _id: "b", project: "project-1" },
    },
    existingDependencies: [],
  });

  assert.equal(result.valid, true);
  assert.equal(result.error, null);
});

test("rejects self dependency", () => {
  const result = validateTaskDependency({
    predecessorTaskId: "a",
    successorTaskId: "a",
    dependencyType: "FS",
    taskMap: {
      a: { _id: "a", project: "project-1" },
    },
    existingDependencies: [],
  });

  assert.equal(result.valid, false);
  assert.match(result.error, /cannot depend on itself/i);
});

test("rejects duplicate dependency", () => {
  const result = validateTaskDependency({
    predecessorTaskId: "a",
    successorTaskId: "b",
    dependencyType: "FS",
    taskMap: {
      a: { _id: "a", project: "project-1" },
      b: { _id: "b", project: "project-1" },
    },
    existingDependencies: [{ predecessorTask: "a", successorTask: "b" }],
  });

  assert.equal(result.valid, false);
  assert.match(result.error, /already exists/i);
});

test("rejects cross-project dependency", () => {
  const result = validateTaskDependency({
    predecessorTaskId: "a",
    successorTaskId: "b",
    dependencyType: "FS",
    taskMap: {
      a: { _id: "a", project: "project-1" },
      b: { _id: "b", project: "project-2" },
    },
    existingDependencies: [],
  });

  assert.equal(result.valid, false);
  assert.match(result.error, /same project/i);
});

test("rejects a direct cycle", () => {
  const graph = buildDependencyGraph([
    { predecessorTask: "a", successorTask: "b" },
    { predecessorTask: "b", successorTask: "a" },
  ]);

  assert.equal(wouldCreateDependencyCycle(graph, "a", "b"), true);
  assert.equal(wouldCreateDependencyCycle(graph, "b", "a"), true);
});

test("rejects an indirect cycle", () => {
  const graph = buildDependencyGraph([
    { predecessorTask: "a", successorTask: "b" },
    { predecessorTask: "b", successorTask: "c" },
  ]);

  assert.equal(wouldCreateDependencyCycle(graph, "c", "a"), true);
});

test("allows a chain and branching relationships", () => {
  const chain = buildDependencyGraph([
    { predecessorTask: "a", successorTask: "b" },
    { predecessorTask: "b", successorTask: "c" },
    { predecessorTask: "c", successorTask: "d" },
  ]);

  assert.equal(wouldCreateDependencyCycle(chain, "a", "b"), false);
  assert.equal(wouldCreateDependencyCycle(chain, "b", "c"), false);
  assert.equal(wouldCreateDependencyCycle(chain, "c", "d"), false);
});
