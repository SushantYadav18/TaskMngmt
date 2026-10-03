import {
  DEFAULT_WORKLOAD_CONFIG,
  validateProjectTaskAssignment,
} from "./workload.js";
import { validateAssignmentTarget } from "./roles.js";

export const TECHNICAL_ROLES = Object.freeze({
  FRONTEND_DEVELOPER: "FRONTEND_DEVELOPER",
  BACKEND_DEVELOPER: "BACKEND_DEVELOPER",
  FULL_STACK_DEVELOPER: "FULL_STACK_DEVELOPER",
  MOBILE_DEVELOPER: "MOBILE_DEVELOPER",
  QA_ENGINEER: "QA_ENGINEER",
  UI_UX_DESIGNER: "UI_UX_DESIGNER",
  GRAPHIC_DESIGNER: "GRAPHIC_DESIGNER",
  DEVOPS_ENGINEER: "DEVOPS_ENGINEER",
  DATABASE_ENGINEER: "DATABASE_ENGINEER",
  NETWORK_ENGINEER: "NETWORK_ENGINEER",
  CYBER_SECURITY_ENGINEER: "CYBER_SECURITY_ENGINEER",
  SOFTWARE_ENGINEER: "SOFTWARE_ENGINEER",
  BUSINESS_ANALYST: "BUSINESS_ANALYST",
  DATA_ANALYST: "DATA_ANALYST",
});

export const TECHNICAL_ROLE_VALUES = Object.values(TECHNICAL_ROLES);

export const TASK_LEVELS = Object.freeze({
  INTERN: "INTERN",
  JUNIOR: "JUNIOR",
  ASSOCIATE: "ASSOCIATE",
});

export const TASK_LEVEL_ORDER = Object.freeze({
  INTERN: 1,
  JUNIOR: 2,
  ASSOCIATE: 3,
});

export const TASK_ROLE_MATCH_MODES = Object.freeze({
  ANY: "ANY",
  ALL: "ALL",
});

export const TASK_KEYWORD_DEFINITIONS = Object.freeze({
  graphics: {
    label: "Graphics",
    description: "Design and visual content tasks",
    technicalRoles: [TECHNICAL_ROLES.GRAPHIC_DESIGNER],
    active: true,
  },
  frontend: {
    label: "Frontend",
    description: "UI and client-side implementation",
    technicalRoles: [TECHNICAL_ROLES.FRONTEND_DEVELOPER],
    active: true,
  },
  backend: {
    label: "Backend",
    description: "Server-side logic and services",
    technicalRoles: [TECHNICAL_ROLES.BACKEND_DEVELOPER],
    active: true,
  },
  api: {
    label: "API",
    description: "Application interfaces and integrations",
    technicalRoles: [
      TECHNICAL_ROLES.BACKEND_DEVELOPER,
      TECHNICAL_ROLES.FULL_STACK_DEVELOPER,
    ],
    active: true,
  },
  database: {
    label: "Database",
    description: "Schema, storage, and data design",
    technicalRoles: [
      TECHNICAL_ROLES.DATABASE_ENGINEER,
      TECHNICAL_ROLES.BACKEND_DEVELOPER,
      TECHNICAL_ROLES.FULL_STACK_DEVELOPER,
    ],
    active: true,
  },
  testing: {
    label: "Testing",
    description: "Quality assurance and validation",
    technicalRoles: [TECHNICAL_ROLES.QA_ENGINEER],
    active: true,
  },
  ui: {
    label: "UI",
    description: "Interface design and user experience",
    technicalRoles: [
      TECHNICAL_ROLES.UI_UX_DESIGNER,
      TECHNICAL_ROLES.FRONTEND_DEVELOPER,
    ],
    active: true,
  },
  ux: {
    label: "UX",
    description: "User experience workflow and usability",
    technicalRoles: [TECHNICAL_ROLES.UI_UX_DESIGNER],
    active: true,
  },
  mobile: {
    label: "Mobile",
    description: "Mobile application work",
    technicalRoles: [TECHNICAL_ROLES.MOBILE_DEVELOPER],
    active: true,
  },
  devops: {
    label: "DevOps",
    description: "Delivery pipelines and infrastructure automation",
    technicalRoles: [TECHNICAL_ROLES.DEVOPS_ENGINEER],
    active: true,
  },
  deployment: {
    label: "Deployment",
    description: "Release and environment provisioning",
    technicalRoles: [TECHNICAL_ROLES.DEVOPS_ENGINEER],
    active: true,
  },
  networking: {
    label: "Networking",
    description: "Infrastructure and network operations",
    technicalRoles: [TECHNICAL_ROLES.NETWORK_ENGINEER],
    active: true,
  },
  security: {
    label: "Security",
    description: "Security review and implementation",
    technicalRoles: [TECHNICAL_ROLES.CYBER_SECURITY_ENGINEER],
    active: true,
  },
  documentation: {
    label: "Documentation",
    description: "Technical writing and product documentation",
    technicalRoles: [
      TECHNICAL_ROLES.BUSINESS_ANALYST,
      TECHNICAL_ROLES.SOFTWARE_ENGINEER,
    ],
    active: true,
  },
  analysis: {
    label: "Analysis",
    description: "Business and requirements analysis",
    technicalRoles: [TECHNICAL_ROLES.BUSINESS_ANALYST],
    active: true,
  },
  data: {
    label: "Data",
    description: "Data analysis and modeling",
    technicalRoles: [TECHNICAL_ROLES.DATA_ANALYST],
    active: true,
  },
});

export const TASK_KEYWORDS = Object.freeze(
  Object.fromEntries(
    Object.entries(TASK_KEYWORD_DEFINITIONS).map(([name, definition]) => [
      name,
      {
        ...definition,
        technicalRoles: [...definition.technicalRoles],
      },
    ]),
  ),
);

export const normalizeTechnicalRole = (role) =>
  String(role || "")
    .trim()
    .toUpperCase();

export const normalizeTaskKeyword = (keyword) =>
  String(keyword || "")
    .trim()
    .toLowerCase();

export const normalizeTaskLevel = (level) => {
  const normalized = String(level || "")
    .trim()
    .toUpperCase();
  return TASK_LEVELS[normalized] || null;
};

export const normalizeRoleMatchMode = (mode) => {
  const normalized = String(mode || TASK_ROLE_MATCH_MODES.ANY)
    .trim()
    .toUpperCase();
  return Object.values(TASK_ROLE_MATCH_MODES).includes(normalized)
    ? normalized
    : TASK_ROLE_MATCH_MODES.ANY;
};

export const normalizeTaskKeywords = (keywords) => {
  if (!keywords) return [];
  const list = Array.isArray(keywords) ? keywords : [keywords];
  return [
    ...new Set(
      list
        .map((keyword) => normalizeTaskKeyword(keyword))
        .filter(
          (keyword) =>
            Boolean(keyword) && Boolean(TASK_KEYWORD_DEFINITIONS[keyword]),
        ),
    ),
  ];
};

export const getTaskRequiredTechnicalRoles = (keywords = [], task = {}) => {
  const directRoles = Array.isArray(task?.requiredTechnicalRoles)
    ? task.requiredTechnicalRoles
    : [];

  if (directRoles.length) {
    return [
      ...new Set(
        directRoles
          .map((role) => normalizeTechnicalRole(role))
          .filter(
            (role) => Boolean(role) && TECHNICAL_ROLE_VALUES.includes(role),
          ),
      ),
    ];
  }

  const keywordList = normalizeTaskKeywords(keywords);
  const requiredRoles = new Set();

  for (const keyword of keywordList) {
    const config = TASK_KEYWORD_DEFINITIONS[keyword];
    if (!config) continue;
    for (const role of config.technicalRoles || []) {
      requiredRoles.add(normalizeTechnicalRole(role));
    }
  }

  return [...requiredRoles];
};

export const hasRequiredTechnicalRole = ({
  userTechnicalRoles = [],
  requiredRoles = [],
  roleMatchMode = TASK_ROLE_MATCH_MODES.ANY,
}) => {
  if (!requiredRoles.length) return true;

  const normalizedUserRoles = new Set(
    (Array.isArray(userTechnicalRoles) ? userTechnicalRoles : [])
      .map((role) => normalizeTechnicalRole(role))
      .filter(Boolean),
  );
  const normalizedRequiredRoles = requiredRoles
    .map((role) => normalizeTechnicalRole(role))
    .filter((role) => Boolean(role));

  if (roleMatchMode === TASK_ROLE_MATCH_MODES.ALL) {
    return normalizedRequiredRoles.every((role) =>
      normalizedUserRoles.has(role),
    );
  }

  return normalizedRequiredRoles.some((role) => normalizedUserRoles.has(role));
};

export const satisfiesTaskLevel = (
  userRole,
  requiredLevel,
  exactLevelOnly = false,
) => {
  const normalizedUserLevel = normalizeTaskLevel(userRole);
  const normalizedRequiredLevel = normalizeTaskLevel(requiredLevel);

  if (!normalizedUserLevel || !normalizedRequiredLevel) {
    return false;
  }

  if (exactLevelOnly) {
    return normalizedUserLevel === normalizedRequiredLevel;
  }

  return (
    TASK_LEVEL_ORDER[normalizedUserLevel] >=
    TASK_LEVEL_ORDER[normalizedRequiredLevel]
  );
};

export const getEligibleProjectMembers = ({ project, task = {} }) => {
  const requiredRoles = getTaskRequiredTechnicalRoles(
    task.keywords || task.requiredTechnicalRoles || [],
    task,
  );
  const requiredLevel =
    normalizeTaskLevel(task.requiredLevel) || TASK_LEVELS.JUNIOR;
  const exactLevelOnly = Boolean(task.exactLevelOnly);
  const roleMatchMode = normalizeRoleMatchMode(task.roleMatchMode);

  if (!requiredRoles.length) {
    return [];
  }

  return (project?.members || []).filter((member) => {
    if (!member) return false;
    if (member.isActive === false) return false;
    if (
      member.isAdmin ||
      String(member.role || "")
        .trim()
        .toUpperCase() === "ADMIN"
    ) {
      return false;
    }

    const technicalRoles = Array.isArray(member.technicalRoles)
      ? member.technicalRoles
      : [];

    if (
      !hasRequiredTechnicalRole({
        userTechnicalRoles: technicalRoles,
        requiredRoles,
        roleMatchMode,
      })
    ) {
      return false;
    }

    if (!satisfiesTaskLevel(member.role, requiredLevel, exactLevelOnly)) {
      return false;
    }

    return true;
  });
};

export const validateTaskAssignment = ({
  project,
  task = {},
  targetUser,
  creatorUser = null,
  projectTasks = [],
  now = new Date(),
  config = DEFAULT_WORKLOAD_CONFIG,
}) => {
  if (!targetUser) {
    return {
      allowed: false,
      reason: "missing_user",
      message: "A valid assignee is required.",
    };
  }

  const assignmentCheck = validateAssignmentTarget({
    role: targetUser.role,
    isActive: targetUser.isActive,
    status: targetUser.status,
  });

  if (!assignmentCheck.allowed) {
    return {
      allowed: false,
      reason: assignmentCheck.reason,
      message: assignmentCheck.message,
    };
  }

  const requiredRoles = getTaskRequiredTechnicalRoles(
    task.keywords || task.requiredTechnicalRoles || [],
    task,
  );

  if (!requiredRoles.length) {
    return {
      allowed: false,
      reason: "missing_keyword",
      message: "Task keywords are required before assignment.",
    };
  }

  if (targetUser.isActive === false) {
    return {
      allowed: false,
      reason: "inactive_member",
      message: "The target user is not active and cannot be assigned tasks.",
    };
  }

  if (project) {
    const isProjectMember = (project.members || []).some(
      (member) =>
        String(member?._id || member) ===
        String(targetUser._id || targetUser.userId),
    );

    if (!isProjectMember) {
      return {
        allowed: false,
        reason: "not_project_member",
        message: "The target user must be a project member.",
      };
    }
  }

  if (
    !hasRequiredTechnicalRole({
      userTechnicalRoles: targetUser.technicalRoles || [],
      requiredRoles,
      roleMatchMode: normalizeRoleMatchMode(task.roleMatchMode),
    })
  ) {
    return {
      allowed: false,
      reason: "technical_role_mismatch",
      message: `The target user does not have the required technical role for this task (${requiredRoles.join(", ")}).`,
    };
  }

  const requiredLevel =
    normalizeTaskLevel(task.requiredLevel) || TASK_LEVELS.JUNIOR;
  const exactLevelOnly = Boolean(task.exactLevelOnly);

  if (!satisfiesTaskLevel(targetUser.role, requiredLevel, exactLevelOnly)) {
    return {
      allowed: false,
      reason: "task_level_mismatch",
      message: `The target user does not satisfy the required level (${requiredLevel}).`,
    };
  }

  if (project && Array.isArray(projectTasks)) {
    const workloadCheck = validateProjectTaskAssignment({
      projectId: project._id,
      memberId: targetUser._id || targetUser.userId,
      tasks: projectTasks,
      newPriority: task.priority,
      now,
      config,
    });

    if (!workloadCheck.allowed) {
      return {
        allowed: false,
        reason: workloadCheck.reason || "workload_limit",
        message: workloadCheck.message,
        preview: workloadCheck,
      };
    }
  }

  return {
    allowed: true,
    reason: "valid",
    message: "Assignment is valid.",
    requiredTechnicalRoles: requiredRoles,
    requiredLevel,
    exactLevelOnly,
    roleMatchMode: normalizeRoleMatchMode(task.roleMatchMode),
    creatorUser: creatorUser
      ? String(creatorUser._id || creatorUser.userId)
      : null,
  };
};
