import Project from "../models/project.js";
import Task from "../models/task.js";
import TaskDependency from "../models/taskDependency.js";
import User from "../models/user.js";
import {
  canManageProject,
  canViewProject,
  validateProjectParticipants,
} from "../utils/projectAccess.js";
import { ROLES, normalizeRole } from "../utils/roles.js";
import { calculateProjectProgress } from "../utils/scheduling.js";
import { topologicalSortTasks } from "../utils/taskDependencies.js";
import { calculateCriticalPath } from "../utils/cpm.js";

const participantFields = "name title role email team isActive status";

const populateProject = (query) =>
  query
    .populate("owner", participantFields)
    .populate("projectLeader", participantFields)
    .populate({
      path: "teams",
      select: "name leader members",
      populate: { path: "members", select: participantFields },
    })
    .populate("members", participantFields);

const projectForViewer = (project, user) => {
  if (
    user?.isAdmin ||
    String(project.projectLeader?._id || project.projectLeader) ===
      String(user.userId)
  ) {
    return project;
  }

  const teamId = String(user.team || "");
  project.teams = project.teams.filter(
    (team) => String(team._id || team) === teamId,
  );
  project.members = project.members.filter(
    (member) =>
      String(member.team?._id || member.team) === teamId ||
      String(member._id) === String(user.userId),
  );
  return project;
};

const projectPayload = (body, ownerId) => ({
  name: body.name,
  description: body.description || "",
  owner: ownerId,
  projectLeader: body.projectLeader,
  teams: body.teams || [],
  members: body.members || [],
  status: body.status || "planning",
  plannedStart: body.plannedStart || null,
  plannedDeadline: body.plannedDeadline || null,
  actualCompletion: body.actualCompletion || null,
});

export const getProjects = async (req, res) => {
  try {
    const projects = await populateProject(
      Project.find().sort({ updatedAt: -1 }),
    );
    const visibleProjects = projects
      .filter((project) => canViewProject(project, req.user))
      .map((project) => projectForViewer(project, req.user));
    const projectIds = visibleProjects.map((project) => project._id);
    const projectTasks = await Task.find({
      project: { $in: projectIds },
      isTrashed: false,
    }).select("project stage");
    const projectsWithProgress = visibleProjects.map((project) => ({
      ...project.toObject(),
      progress: calculateProjectProgress(
        projectTasks.filter(
          (task) => String(task.project) === String(project._id),
        ),
      ),
    }));
    res.status(200).json({ status: true, projects: projectsWithProgress });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
};

export const createProject = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        status: false,
        message: "Only administrators can create projects.",
      });
    }

    const { name, projectLeader, teams = [], members = [] } = req.body;
    if (!name?.trim()) {
      return res
        .status(400)
        .json({ status: false, message: "Project name is required." });
    }

    const participantResult = await validateProjectParticipants({
      ownerId: req.user.userId,
      projectLeaderId: projectLeader,
      teamIds: teams,
      memberIds: members,
    });
    if (participantResult.error) {
      return res
        .status(400)
        .json({ status: false, message: participantResult.error });
    }

    const project = await Project.create(
      projectPayload(req.body, req.user.userId),
    );
    const populatedProject = await populateProject(
      Project.findById(project._id),
    );
    res.status(201).json({
      status: true,
      project: populatedProject,
      message: "Project created successfully.",
    });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
};

export const getProject = async (req, res) => {
  try {
    const project = await populateProject(Project.findById(req.params.id));
    if (!project)
      return res
        .status(404)
        .json({ status: false, message: "Project not found." });
    if (!canViewProject(project, req.user)) {
      return res
        .status(403)
        .json({ status: false, message: "You cannot access this project." });
    }

    const visibleProject = projectForViewer(project, req.user);
    const isProjectLeader =
      String(project.projectLeader?._id || project.projectLeader) ===
      String(req.user.userId);
    const taskQuery = { project: project._id, isTrashed: false };
    if (!req.user.isAdmin && !isProjectLeader) {
      taskQuery.assignee =
        normalizeRole(req.user.role) === ROLES.TEAM_LEADER
          ? { $in: visibleProject.members.map((member) => member._id) }
          : req.user.userId;
    }
    const tasks = await Task.find(taskQuery)
      .populate("assignee createdBy", "name title role email")
      .sort({ _id: -1 });
    const taskIds = tasks.map((task) => task._id);
    const dependencySummary = taskIds.length
      ? await TaskDependency.aggregate([
          {
            $match: {
              $or: [
                { predecessorTask: { $in: taskIds } },
                { successorTask: { $in: taskIds } },
              ],
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
            },
          },
        ])
      : [{ total: 0 }];
    res.status(200).json({
      status: true,
      project: visibleProject,
      tasks,
      progress: calculateProjectProgress(tasks),
      dependencySummary: {
        total: dependencySummary[0]?.total || 0,
      },
    });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
};

export const getProjectDependencyOrder = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).select(
      "_id name owner projectLeader members teams",
    );
    if (!project) {
      return res
        .status(404)
        .json({ status: false, message: "Project not found." });
    }
    if (!canViewProject(project, req.user)) {
      return res
        .status(403)
        .json({ status: false, message: "You cannot access this project." });
    }

    const tasks = await Task.find({
      project: project._id,
      isTrashed: false,
    })
      .select("title stage priority date dueDate assignee project")
      .populate("assignee", "name title role")
      .sort({ _id: 1 });
    const taskIds = tasks.map((task) => task._id);
    const dependencies = taskIds.length
      ? await TaskDependency.find({
          predecessorTask: { $in: taskIds },
          successorTask: { $in: taskIds },
        }).select("predecessorTask successorTask dependencyType")
      : [];
    const orderedTasks = topologicalSortTasks({ tasks, dependencies });

    return res.status(200).json({
      status: true,
      project: { _id: project._id, name: project.name },
      order: orderedTasks.map((task, index) => ({
        order: index + 1,
        task: task.toObject(),
      })),
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const getProjectCpm = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).select(
      "_id name owner projectLeader members teams",
    );
    if (!project) {
      return res
        .status(404)
        .json({ status: false, message: "Project not found." });
    }
    if (!canViewProject(project, req.user)) {
      return res
        .status(403)
        .json({ status: false, message: "You cannot access this project." });
    }

    const tasks = await Task.find({
      project: project._id,
      isTrashed: false,
    })
      .select(
        "title stage priority date dueDate estimatedDuration assignee project",
      )
      .populate("assignee", "name title role")
      .sort({ _id: 1 });
    const taskIds = tasks.map((task) => task._id);
    const dependencies = taskIds.length
      ? await TaskDependency.find({
          predecessorTask: { $in: taskIds },
          successorTask: { $in: taskIds },
        }).select("predecessorTask successorTask dependencyType")
      : [];
    const result = calculateCriticalPath({ tasks, dependencies });

    return res.status(200).json({
      status: true,
      project: { _id: project._id, name: project.name },
      projectDuration: result.projectDuration,
      tasks: result.tasks.map(({ task, ...metrics }) => ({
        ...metrics,
        task,
      })),
      criticalTasks: result.criticalTasks,
      criticalPath: result.criticalPath,
      criticalPaths: result.criticalPaths,
      dependencies: dependencies.map((dependency) => ({
        predecessorTask: String(dependency.predecessorTask),
        successorTask: String(dependency.successorTask),
        dependencyType: dependency.dependencyType,
      })),
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
};

export const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project)
      return res
        .status(404)
        .json({ status: false, message: "Project not found." });
    if (!canManageProject(project, req.user)) {
      return res
        .status(403)
        .json({ status: false, message: "You cannot modify this project." });
    }

    let teams = req.body.teams ?? project.teams.map(String);
    let members = req.body.members ?? project.members.map(String);
    let projectLeader = req.body.projectLeader ?? project.projectLeader;
    const isProjectLeader =
      String(project.projectLeader?._id || project.projectLeader) ===
      String(req.user.userId);

    if (!req.user.isAdmin && !isProjectLeader) {
      const originalTeamIds = project.teams.map(String);
      const ownTeamId = String(req.user.team || "");
      const existingMembers = await User.find({
        _id: { $in: project.members },
      }).select("_id team");
      const requestedMembers = await User.find({
        _id: { $in: members },
      }).select("_id team");
      const preservedMembers = existingMembers
        .filter((member) => String(member.team) !== ownTeamId)
        .map((member) => String(member._id));
      const ownTeamMembers = requestedMembers
        .filter(
          (member) =>
            String(member.team) === ownTeamId ||
            String(member._id) === String(req.user.userId),
        )
        .map((member) => String(member._id));
      teams = originalTeamIds;
      members = [...new Set([...preservedMembers, ...ownTeamMembers])];
      projectLeader = project.projectLeader;
    }
    const participantResult = await validateProjectParticipants({
      ownerId: project.owner,
      projectLeaderId: projectLeader,
      requireProjectLeader: Boolean(projectLeader),
      teamIds: teams,
      memberIds: members,
    });
    if (participantResult.error) {
      return res
        .status(400)
        .json({ status: false, message: participantResult.error });
    }

    [
      "name",
      "description",
      "status",
      "plannedStart",
      "plannedDeadline",
      "actualCompletion",
    ].forEach((field) => {
      if (req.body[field] !== undefined)
        project[field] = req.body[field] || null;
    });
    project.teams = teams;
    project.members = members;
    project.projectLeader = projectLeader;
    await project.save();

    const populatedProject = await populateProject(
      Project.findById(project._id),
    );
    res.status(200).json({
      status: true,
      project: populatedProject,
      message: "Project updated successfully.",
    });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
};

export const archiveProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project)
      return res
        .status(404)
        .json({ status: false, message: "Project not found." });
    if (!canManageProject(project, req.user)) {
      return res
        .status(403)
        .json({ status: false, message: "You cannot archive this project." });
    }
    project.status = "archived";
    await project.save();
    res
      .status(200)
      .json({ status: true, message: "Project archived successfully." });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
};
