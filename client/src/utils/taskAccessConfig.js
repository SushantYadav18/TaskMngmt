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

export const TASK_LEVEL_OPTIONS = Object.freeze([
  "INTERN",
  "JUNIOR",
  "ASSOCIATE",
]);
export const TASK_ROLE_MATCH_OPTIONS = Object.freeze(["ANY", "ALL"]);

export const TASK_KEYWORD_DEFINITIONS = Object.freeze({
  graphics: {
    label: "Graphics",
    description: "Design and visual content tasks",
    technicalRoles: [TECHNICAL_ROLES.GRAPHIC_DESIGNER],
  },
  frontend: {
    label: "Frontend",
    description: "UI and client-side implementation",
    technicalRoles: [TECHNICAL_ROLES.FRONTEND_DEVELOPER],
  },
  backend: {
    label: "Backend",
    description: "Server-side logic and services",
    technicalRoles: [TECHNICAL_ROLES.BACKEND_DEVELOPER],
  },
  api: {
    label: "API",
    description: "Application interfaces and integrations",
    technicalRoles: [
      TECHNICAL_ROLES.BACKEND_DEVELOPER,
      TECHNICAL_ROLES.FULL_STACK_DEVELOPER,
    ],
  },
  database: {
    label: "Database",
    description: "Schema, storage, and data design",
    technicalRoles: [
      TECHNICAL_ROLES.DATABASE_ENGINEER,
      TECHNICAL_ROLES.BACKEND_DEVELOPER,
      TECHNICAL_ROLES.FULL_STACK_DEVELOPER,
    ],
  },
  testing: {
    label: "Testing",
    description: "Quality assurance and validation",
    technicalRoles: [TECHNICAL_ROLES.QA_ENGINEER],
  },
  ui: {
    label: "UI",
    description: "Interface design and user experience",
    technicalRoles: [
      TECHNICAL_ROLES.UI_UX_DESIGNER,
      TECHNICAL_ROLES.FRONTEND_DEVELOPER,
    ],
  },
  ux: {
    label: "UX",
    description: "User experience workflow and usability",
    technicalRoles: [TECHNICAL_ROLES.UI_UX_DESIGNER],
  },
  mobile: {
    label: "Mobile",
    description: "Mobile application work",
    technicalRoles: [TECHNICAL_ROLES.MOBILE_DEVELOPER],
  },
  devops: {
    label: "DevOps",
    description: "Delivery pipelines and infrastructure automation",
    technicalRoles: [TECHNICAL_ROLES.DEVOPS_ENGINEER],
  },
  deployment: {
    label: "Deployment",
    description: "Release and environment provisioning",
    technicalRoles: [TECHNICAL_ROLES.DEVOPS_ENGINEER],
  },
  networking: {
    label: "Networking",
    description: "Infrastructure and network operations",
    technicalRoles: [TECHNICAL_ROLES.NETWORK_ENGINEER],
  },
  security: {
    label: "Security",
    description: "Security review and implementation",
    technicalRoles: [TECHNICAL_ROLES.CYBER_SECURITY_ENGINEER],
  },
  documentation: {
    label: "Documentation",
    description: "Technical writing and product documentation",
    technicalRoles: [
      TECHNICAL_ROLES.BUSINESS_ANALYST,
      TECHNICAL_ROLES.SOFTWARE_ENGINEER,
    ],
  },
  analysis: {
    label: "Analysis",
    description: "Business and requirements analysis",
    technicalRoles: [TECHNICAL_ROLES.BUSINESS_ANALYST],
  },
  data: {
    label: "Data",
    description: "Data analysis and modeling",
    technicalRoles: [TECHNICAL_ROLES.DATA_ANALYST],
  },
});

export const normalizeTaskKeyword = (keyword) =>
  String(keyword || "")
    .trim()
    .toLowerCase();
export const normalizeTechnicalRole = (role) =>
  String(role || "")
    .trim()
    .toUpperCase();

export const getTaskRequiredTechnicalRoles = (keywords = [], task = {}) => {
  const directRoles = Array.isArray(task?.requiredTechnicalRoles)
    ? task.requiredTechnicalRoles
    : [];
  if (directRoles.length) {
    return [
      ...new Set(
        directRoles.map((role) => normalizeTechnicalRole(role)).filter(Boolean),
      ),
    ];
  }

  const keywordList = Array.isArray(keywords) ? keywords : [keywords];
  const requiredRoles = new Set();

  keywordList
    .map((keyword) => normalizeTaskKeyword(keyword))
    .filter((keyword) => Boolean(keyword) && TASK_KEYWORD_DEFINITIONS[keyword])
    .forEach((keyword) => {
      (TASK_KEYWORD_DEFINITIONS[keyword].technicalRoles || []).forEach(
        (role) => {
          requiredRoles.add(normalizeTechnicalRole(role));
        },
      );
    });

  return [...requiredRoles];
};

export const getEligibleProjectMembers = ({ project, task = {} }) => {
  if (!project?.members?.length) return [];
  const requiredRoles = getTaskRequiredTechnicalRoles(
    task.keywords || task.requiredTechnicalRoles || [],
    task,
  );
  const requiredLevel = task.requiredLevel || "JUNIOR";
  const exactLevelOnly = Boolean(task.exactLevelOnly);
  const matchMode = String(task.roleMatchMode || "ANY").toUpperCase();

  if (!requiredRoles.length) return [];

  return project.members.filter((member) => {
    if (!member || member.isActive === false) return false;
    if (member.isAdmin || String(member.role || "").toUpperCase() === "ADMIN") {
      return false;
    }
    const userRoles = Array.isArray(member.technicalRoles)
      ? member.technicalRoles
      : [];
    if (matchMode === "ALL") {
      if (
        !requiredRoles.every((role) =>
          userRoles.map(normalizeTechnicalRole).includes(role),
        )
      ) {
        return false;
      }
    } else if (
      !requiredRoles.some((role) =>
        userRoles.map(normalizeTechnicalRole).includes(role),
      )
    ) {
      return false;
    }

    const memberLevel = String(member.role || "")
      .trim()
      .toUpperCase();
    if (exactLevelOnly) {
      return memberLevel === requiredLevel;
    }

    const taskLevelOrder = { INTERN: 1, JUNIOR: 2, ASSOCIATE: 3 };
    return (
      (taskLevelOrder[memberLevel] || 0) >= (taskLevelOrder[requiredLevel] || 0)
    );
  });
};
