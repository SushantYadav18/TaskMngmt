const EMPTY_PRIORITY_COUNTS = () => ({
  high: 0,
  medium: 0,
  normal: 0,
  low: 0,
});

export const DEFAULT_WORKLOAD_CONFIG = Object.freeze({
  allocationPeriodDays: 15,
  maxWorkload: 20,
  hardLimits: Object.freeze({
    high: 1,
    medium: 3,
  }),
  weights: Object.freeze({
    high: 5,
    medium: 3,
    normal: 2,
    low: 1,
  }),
  thresholds: Object.freeze({
    available: 0.6,
    nearLimit: 0.86,
    full: 1,
  }),
});

export const normalizePriority = (priority) => {
  const normalized = String(priority ?? "normal")
    .trim()
    .toLowerCase();
  if (["high", "medium", "normal", "low"].includes(normalized)) {
    return normalized;
  }
  return "normal";
};

export const getWorkloadWeight = (
  priority,
  config = DEFAULT_WORKLOAD_CONFIG,
) => {
  const normalized = normalizePriority(priority);
  return Number(config?.weights?.[normalized] ?? 1);
};

export const getHardPriorityLimit = (
  priority,
  config = DEFAULT_WORKLOAD_CONFIG,
) => {
  const normalized = normalizePriority(priority);
  if (
    !config?.hardLimits ||
    !(normalized === "high" || normalized === "medium")
  ) {
    return null;
  }

  return Number(config.hardLimits[normalized] ?? null);
};

export const getAllocationWindowStart = (
  now = new Date(),
  config = DEFAULT_WORKLOAD_CONFIG,
) => {
  const boundary = new Date(now);
  boundary.setDate(boundary.getDate() - (config?.allocationPeriodDays ?? 15));
  return boundary;
};

export const getLatestAssignmentDate = (task) => {
  if (!task) return null;

  const assignedDates = (task.activities || [])
    .filter(
      (activity) => String(activity?.type || "").toLowerCase() === "assigned",
    )
    .map((activity) => new Date(activity.date))
    .filter((date) => !Number.isNaN(date.getTime()));

  if (assignedDates.length) {
    return new Date(Math.max(...assignedDates.map((date) => date.getTime())));
  }

  const fallback = task.date ? new Date(task.date) : null;
  if (fallback && !Number.isNaN(fallback.getTime())) {
    return fallback;
  }

  return null;
};

export const isTaskWithinAllocationWindow = (
  task,
  now = new Date(),
  config = DEFAULT_WORKLOAD_CONFIG,
) => {
  const assignmentDate = getLatestAssignmentDate(task);
  if (!assignmentDate || Number.isNaN(assignmentDate.getTime())) {
    return false;
  }

  const windowStart = getAllocationWindowStart(now, config);
  return assignmentDate >= windowStart && assignmentDate <= now;
};

export const getWorkloadStatus = (
  totalWorkload,
  maxWorkload = DEFAULT_WORKLOAD_CONFIG.maxWorkload,
  config = DEFAULT_WORKLOAD_CONFIG,
) => {
  if (totalWorkload <= 0) return "AVAILABLE";

  const ratio = maxWorkload > 0 ? totalWorkload / maxWorkload : 0;
  if (ratio < (config?.thresholds?.available ?? 0.6)) {
    return "AVAILABLE";
  }
  if (ratio < (config?.thresholds?.nearLimit ?? 0.86)) {
    return "NEAR_LIMIT";
  }
  if (ratio < (config?.thresholds?.full ?? 1)) {
    return "FULL";
  }
  return "OVERLOADED";
};

export const getProjectMemberWorkload = ({
  projectId,
  memberId,
  tasks = [],
  now = new Date(),
  config = DEFAULT_WORKLOAD_CONFIG,
}) => {
  const byPriority = EMPTY_PRIORITY_COUNTS();
  let totalWorkload = 0;
  let overdueTasks = 0;

  for (const task of tasks || []) {
    if (!task || task.isTrashed) continue;
    if (projectId && String(task.project) !== String(projectId)) continue;
    if (memberId && String(task.assignee) !== String(memberId)) continue;
    if (!isTaskWithinAllocationWindow(task, now, config)) continue;

    const priority = normalizePriority(task.priority);
    byPriority[priority] += 1;
    totalWorkload += getWorkloadWeight(priority, config);

    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const isOverdue =
      dueDate &&
      !Number.isNaN(dueDate.getTime()) &&
      String(task.stage || "").toLowerCase() !== "completed" &&
      dueDate < now;

    if (isOverdue) {
      overdueTasks += 1;
    }
  }

  const remaining = config.maxWorkload - totalWorkload;
  return {
    memberId,
    projectId,
    allocationPeriodDays: config.allocationPeriodDays,
    maxWorkload: config.maxWorkload,
    hardLimits: config.hardLimits || { high: 1, medium: 3 },
    byPriority,
    totalWorkload,
    remaining,
    percent:
      config.maxWorkload > 0 ? (totalWorkload / config.maxWorkload) * 100 : 0,
    status: getWorkloadStatus(totalWorkload, config.maxWorkload, config),
    overdueTasks,
  };
};

export const validateProjectTaskAssignment = ({
  projectId,
  memberId,
  tasks = [],
  newPriority,
  now = new Date(),
  config = DEFAULT_WORKLOAD_CONFIG,
}) => {
  const current = getProjectMemberWorkload({
    projectId,
    memberId,
    tasks,
    now,
    config,
  });

  const normalizedPriority = normalizePriority(newPriority);
  const hardLimit = getHardPriorityLimit(normalizedPriority, config);
  if (hardLimit !== null) {
    const projectedCount = current.byPriority[normalizedPriority] + 1;
    if (projectedCount > hardLimit) {
      const label = normalizedPriority.toUpperCase();
      const countText = `${hardLimit} ${label} priority task${hardLimit === 1 ? "" : "s"}`;
      return {
        allowed: false,
        memberId,
        projectId,
        currentWorkload: current.totalWorkload,
        addedWorkload: getWorkloadWeight(normalizedPriority, config),
        afterWorkload:
          current.totalWorkload + getWorkloadWeight(normalizedPriority, config),
        remainingBefore: config.maxWorkload - current.totalWorkload,
        remainingAfter:
          config.maxWorkload -
          (current.totalWorkload +
            getWorkloadWeight(normalizedPriority, config)),
        status: getWorkloadStatus(
          current.totalWorkload,
          config.maxWorkload,
          config,
        ),
        message: `Cannot assign ${label} priority task. This member already has the maximum of ${countText} for the current 15-day allocation period.`,
        capacity: config.maxWorkload,
        allocationPeriodDays: config.allocationPeriodDays,
        hardLimit,
        reason: "hard_count_limit",
      };
    }
  }

  const addedWorkload = getWorkloadWeight(normalizedPriority, config);
  const afterWorkload = current.totalWorkload + addedWorkload;
  const allowed = afterWorkload <= config.maxWorkload;

  if (!allowed) {
    return {
      allowed: false,
      memberId,
      projectId,
      currentWorkload: current.totalWorkload,
      addedWorkload,
      afterWorkload,
      remainingBefore: config.maxWorkload - current.totalWorkload,
      remainingAfter: config.maxWorkload - afterWorkload,
      status: getWorkloadStatus(afterWorkload, config.maxWorkload, config),
      message:
        "Cannot assign this task. The assignment would exceed the member's workload capacity.",
      capacity: config.maxWorkload,
      allocationPeriodDays: config.allocationPeriodDays,
      reason: "workload_capacity",
    };
  }

  return {
    allowed: true,
    memberId,
    projectId,
    currentWorkload: current.totalWorkload,
    addedWorkload,
    afterWorkload,
    remainingBefore: config.maxWorkload - current.totalWorkload,
    remainingAfter: config.maxWorkload - afterWorkload,
    status: getWorkloadStatus(afterWorkload, config.maxWorkload, config),
    message:
      "Assignment is within the member's workload capacity and count limits.",
    capacity: config.maxWorkload,
    allocationPeriodDays: config.allocationPeriodDays,
    reason: null,
  };
};

export const getProjectWorkloadOverview = ({
  projects = [],
  tasks = [],
  now = new Date(),
  config = DEFAULT_WORKLOAD_CONFIG,
}) => {
  const projectSummaries = (projects || []).map((project) => {
    const memberRows = (project.members || []).map((member) => {
      const memberId = String(member._id || member);
      const summary = getProjectMemberWorkload({
        projectId: project._id,
        memberId,
        tasks,
        now,
        config,
      });

      return {
        _id: memberId,
        name: member.name || member.email || "Member",
        email: member.email || null,
        role: member.role || null,
        team: member.team
          ? {
              _id: member.team._id || member.team,
              name: member.team.name || "Team",
            }
          : null,
        ...summary,
      };
    });

    const leader = project.projectLeader
      ? {
          _id: String(project.projectLeader._id || project.projectLeader),
          name: project.projectLeader.name || "Project Leader",
          email: project.projectLeader.email || null,
        }
      : null;

    return {
      _id: project._id,
      name: project.name,
      projectLeader: leader,
      allocationPeriodDays: config.allocationPeriodDays,
      maxWorkload: config.maxWorkload,
      members: memberRows,
      membersAtCapacity: memberRows.filter((member) =>
        ["FULL", "OVERLOADED"].includes(member.status),
      ).length,
      membersNearLimit: memberRows.filter(
        (member) => member.status === "NEAR_LIMIT",
      ).length,
      overdueMembers: memberRows.filter((member) => member.overdueTasks > 0)
        .length,
    };
  });

  return {
    allocationPeriodDays: config.allocationPeriodDays,
    maxWorkload: config.maxWorkload,
    projects: projectSummaries,
  };
};
