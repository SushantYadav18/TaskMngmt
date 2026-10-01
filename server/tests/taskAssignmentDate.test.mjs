import assert from "node:assert/strict";
import test from "node:test";
import { getTaskAssignmentDate } from "../utils/taskAssignment.js";

test("task assignment dates always come from server time", () => {
  const before = new Date();
  const historicalClientDate = new Date("2000-01-01T00:00:00.000Z");
  const futureClientDate = new Date("2099-01-01T00:00:00.000Z");

  const assignedAt = getTaskAssignmentDate(
    historicalClientDate,
    futureClientDate,
  );
  const after = new Date();

  assert.ok(assignedAt >= before);
  assert.ok(assignedAt <= after);
});
