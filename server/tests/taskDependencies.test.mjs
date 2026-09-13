import assert from "node:assert/strict";
import test from "node:test";
import {
  validateTaskDependency,
  buildDependencyGraph,
  wouldCreateDependencyCycle,
  topologicalSortTasks,
} from "../utils/taskDependencies.js";

const task = (id, project = "project-1") => ({ _id: id, project });

const assertValidOrdering = ({ order, tasks, dependencies }) => {
  const taskIds = tasks.map((item) => item._id);
  const orderedIds = order.map((item) => item._id);
  const positions = new Map(orderedIds.map((id, index) => [id, index]));

  assert.equal(new Set(orderedIds).size, orderedIds.length);
  assert.deepEqual([...orderedIds].sort(), [...taskIds].sort());
  for (const dependency of dependencies) {
    assert.ok(
      positions.get(dependency.predecessorTask) <
        positions.get(dependency.successorTask),
      `${dependency.predecessorTask} must come before ${dependency.successorTask}`,
    );
  }
};

test("topological sort handles an empty project", () => {
  assert.deepEqual(topologicalSortTasks({}), []);
});

test("topological sort returns one task", () => {
  assert.deepEqual(
    topologicalSortTasks({ tasks: [task("a")] }).map((item) => item._id),
    ["a"],
  );
});

test("topological sort respects a linear chain", () => {
  const tasks = [task("a"), task("b"), task("c"), task("d")];
  const dependencies = [
    { predecessorTask: "a", successorTask: "b" },
    { predecessorTask: "b", successorTask: "c" },
    { predecessorTask: "c", successorTask: "d" },
  ];
  const order = topologicalSortTasks({ tasks, dependencies });

  assertValidOrdering({ order, tasks, dependencies });
});

test("topological sort rejects the reported invalid ordering graph", () => {
  const tasks = [task("A"), task("B"), task("C"), task("D"), task("E")];
  const dependencies = [
    { predecessorTask: "A", successorTask: "B" },
    { predecessorTask: "A", successorTask: "D" },
    { predecessorTask: "B", successorTask: "C" },
    { predecessorTask: "D", successorTask: "C" },
  ];
  const order = topologicalSortTasks({ tasks, dependencies });

  assertValidOrdering({ order, tasks, dependencies });
  assert.throws(
    () =>
      assertValidOrdering({
        order: ["C", "E", "B", "D", "A"].map((_id) => task(_id)),
        tasks,
        dependencies,
      }),
    /must come before/,
  );
});

test("topological sort places all parallel predecessors before their successor", () => {
  const tasks = [task("a"), task("b"), task("c")];
  const dependencies = [
    { predecessorTask: "a", successorTask: "c" },
    { predecessorTask: "b", successorTask: "c" },
  ];
  const order = topologicalSortTasks({ tasks, dependencies });

  assertValidOrdering({ order, tasks, dependencies });
});

test("topological sort includes multiple independent tasks", () => {
  const tasks = [task("a"), task("b"), task("c")];
  const order = topologicalSortTasks({ tasks });

  assertValidOrdering({ order, tasks, dependencies: [] });
});

test("topological sort handles a branching graph", () => {
  const tasks = [task("a"), task("b"), task("c")];
  const dependencies = [
    { predecessorTask: "a", successorTask: "b" },
    { predecessorTask: "a", successorTask: "c" },
  ];

  assertValidOrdering({
    order: topologicalSortTasks({ tasks, dependencies }),
    tasks,
    dependencies,
  });
});

test("topological sort handles multiple predecessors", () => {
  const tasks = [task("a"), task("b"), task("c"), task("d")];
  const dependencies = [
    { predecessorTask: "a", successorTask: "c" },
    { predecessorTask: "b", successorTask: "c" },
    { predecessorTask: "d", successorTask: "c" },
  ];

  assertValidOrdering({
    order: topologicalSortTasks({ tasks, dependencies }),
    tasks,
    dependencies,
  });
});

test("topological sort handles a larger branching graph", () => {
  const tasks = [task("a"), task("b"), task("c"), task("d"), task("e")];
  const dependencies = [
    { predecessorTask: "a", successorTask: "b" },
    { predecessorTask: "a", successorTask: "c" },
    { predecessorTask: "b", successorTask: "d" },
    { predecessorTask: "c", successorTask: "d" },
    { predecessorTask: "d", successorTask: "e" },
  ];

  assertValidOrdering({
    order: topologicalSortTasks({ tasks, dependencies }),
    tasks,
    dependencies,
  });
});

test("topological sort ignores dependencies outside the selected project", () => {
  const order = topologicalSortTasks({
    tasks: [task("a"), task("b")],
    dependencies: [
      { predecessorTask: "external", successorTask: "a" },
      { predecessorTask: "a", successorTask: "b" },
    ],
  }).map((item) => item._id);

  assert.deepEqual(order, ["a", "b"]);
});

test("topological sort detects cycles", () => {
  assert.throws(
    () =>
      topologicalSortTasks({
        tasks: [task("a"), task("b"), task("c")],
        dependencies: [
          { predecessorTask: "a", successorTask: "b" },
          { predecessorTask: "b", successorTask: "c" },
          { predecessorTask: "c", successorTask: "a" },
        ],
      }),
    /dependency graph contains a cycle/i,
  );
});

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
