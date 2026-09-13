import assert from "node:assert/strict";
import test from "node:test";
import { calculateCriticalPath } from "../utils/cpm.js";

const task = (id, estimatedDuration, project = "project-1") => ({
  _id: id,
  project,
  estimatedDuration,
});

const dependency = (predecessorTask, successorTask) => ({
  predecessorTask,
  successorTask,
});

const byId = (result) =>
  new Map(result.tasks.map((item) => [item.taskId, item]));

const assertScheduleMath = ({ result, tasks, dependencies }) => {
  const schedule = byId(result);
  assert.equal(
    new Set(result.tasks.map((item) => item.taskId)).size,
    tasks.length,
  );
  assert.deepEqual(
    [...schedule.keys()].sort(),
    tasks.map((item) => item._id).sort(),
  );

  for (const item of result.tasks) {
    assert.equal(item.earliestFinish, item.earliestStart + item.duration);
    assert.equal(item.latestStart, item.latestFinish - item.duration);
    assert.equal(item.slack, item.latestStart - item.earliestStart);
    assert.equal(item.isCritical, item.slack === 0);
  }

  for (const edge of dependencies) {
    assert.ok(
      schedule.get(edge.predecessorTask).earliestFinish <=
        schedule.get(edge.successorTask).earliestStart,
    );
  }

  assert.equal(
    result.projectDuration,
    Math.max(...result.tasks.map((item) => item.earliestFinish), 0),
  );
};

test("CPM handles an empty project", () => {
  const result = calculateCriticalPath({});
  assert.equal(result.projectDuration, 0);
  assert.deepEqual(result.tasks, []);
  assert.deepEqual(result.criticalPath, []);
  assert.deepEqual(result.criticalPaths, []);
});

test("CPM handles a single task", () => {
  const tasks = [task("A", 4)];
  const result = calculateCriticalPath({ tasks });
  const schedule = result.tasks[0];

  assert.deepEqual(
    {
      earliestStart: schedule.earliestStart,
      earliestFinish: schedule.earliestFinish,
      latestStart: schedule.latestStart,
      latestFinish: schedule.latestFinish,
      slack: schedule.slack,
    },
    {
      earliestStart: 0,
      earliestFinish: 4,
      latestStart: 0,
      latestFinish: 4,
      slack: 0,
    },
  );
  assert.deepEqual(result.criticalPath, ["A"]);
});

test("CPM calculates the linear chain", () => {
  const tasks = [task("A", 3), task("B", 2), task("C", 4), task("D", 1)];
  const dependencies = [
    dependency("A", "B"),
    dependency("B", "C"),
    dependency("C", "D"),
  ];
  const result = calculateCriticalPath({ tasks, dependencies });

  assert.equal(result.projectDuration, 10);
  assert.deepEqual(result.criticalPath, ["A", "B", "C", "D"]);
  assertScheduleMath({ result, tasks, dependencies });
});

test("CPM returns both equal-length critical branches", () => {
  const tasks = [task("A", 3), task("B", 2), task("C", 4), task("D", 2)];
  const dependencies = [
    dependency("A", "B"),
    dependency("A", "D"),
    dependency("B", "C"),
    dependency("D", "C"),
  ];
  const result = calculateCriticalPath({ tasks, dependencies });

  assert.equal(result.projectDuration, 9);
  assert.deepEqual(result.criticalPaths, [
    ["A", "B", "C"],
    ["A", "D", "C"],
  ]);
  assertScheduleMath({ result, tasks, dependencies });
});

test("CPM gives the shorter parallel branch positive slack", () => {
  const tasks = [task("A", 3), task("B", 2), task("C", 5), task("D", 2)];
  const dependencies = [
    dependency("A", "B"),
    dependency("A", "C"),
    dependency("B", "D"),
    dependency("C", "D"),
  ];
  const result = calculateCriticalPath({ tasks, dependencies });
  const schedule = byId(result);

  assert.equal(result.projectDuration, 10);
  assert.equal(schedule.get("D").earliestStart, 8);
  assert.equal(schedule.get("B").slack, 3);
  assert.equal(schedule.get("C").slack, 0);
  assert.deepEqual(result.criticalPath, ["A", "C", "D"]);
  assertScheduleMath({ result, tasks, dependencies });
});

test("CPM handles multiple predecessors and successors", () => {
  const tasks = [task("A", 2), task("B", 5), task("C", 1), task("D", 3)];
  const dependencies = [
    dependency("A", "C"),
    dependency("B", "C"),
    dependency("C", "D"),
  ];
  const result = calculateCriticalPath({ tasks, dependencies });
  const schedule = byId(result);

  assert.equal(schedule.get("C").earliestStart, 5);
  assert.equal(result.projectDuration, 9);
  assertScheduleMath({ result, tasks, dependencies });
});

test("CPM handles independent tasks", () => {
  const tasks = [task("A", 2), task("B", 5), task("C", 1), task("D", 3)];
  const result = calculateCriticalPath({ tasks });
  const schedule = byId(result);

  assert.equal(result.projectDuration, 5);
  assert.equal(schedule.get("A").slack, 3);
  assert.equal(schedule.get("B").slack, 0);
  assertScheduleMath({ result, tasks, dependencies: [] });
});

test("CPM isolates tasks and dependencies outside the selected project", () => {
  const tasks = [task("A", 2, "project-1"), task("B", 3, "project-1")];
  const dependencies = [
    dependency("A", "B"),
    dependency("X", "Y"),
    dependency("X", "A"),
  ];
  const result = calculateCriticalPath({ tasks, dependencies });

  assert.deepEqual(
    result.tasks.map((item) => item.taskId),
    ["A", "B"],
  );
  assert.equal(result.projectDuration, 5);
  assertScheduleMath({ result, tasks, dependencies: [dependency("A", "B")] });
});

test("CPM rejects a dependency cycle", () => {
  assert.throws(
    () =>
      calculateCriticalPath({
        tasks: [task("A", 1), task("B", 1), task("C", 1)],
        dependencies: [
          dependency("A", "B"),
          dependency("B", "C"),
          dependency("C", "A"),
        ],
      }),
    /dependency graph contains a cycle/i,
  );
});

test("CPM rejects missing or invalid durations", () => {
  assert.throws(
    () => calculateCriticalPath({ tasks: [task("A", null)] }),
    /valid estimated duration/i,
  );
  assert.throws(
    () => calculateCriticalPath({ tasks: [task("A", -1)] }),
    /valid estimated duration/i,
  );
});
