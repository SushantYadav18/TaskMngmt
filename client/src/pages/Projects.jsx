import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Title from "../components/Title";
import Button from "../components/Button";
import ProjectMemberSelector from "../components/project/ProjectMemberSelector";
import { useGetTeamsQuery } from "../redux/slices/api/userApiSlice";
import {
  useCreateProjectMutation,
  useGetProjectsQuery,
} from "../redux/slices/api/projectApiSlice";

const Projects = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const isAdmin = Boolean(user?.isAdmin);
  const { data: projectData = { projects: [] } } = useGetProjectsQuery();
  const { data: teamData = { teams: [] } } = useGetTeamsQuery();
  const [createProject, { isLoading }] = useCreateProjectMutation();
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "planning",
    plannedStart: "",
    plannedDeadline: "",
    projectLeader: "",
    teams: [],
    members: [],
  });

  const updateField = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));
  const toggleId = (field, id) =>
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(id)
        ? current[field].filter((value) => value !== id)
        : [...current[field], id],
    }));

  const toggleTeam = (teamId) => {
    const team = teamData.teams.find((item) => item._id === teamId);
    setForm((current) => {
      const selected = current.teams.includes(teamId);
      return {
        ...current,
        teams: selected
          ? current.teams.filter((id) => id !== teamId)
          : [...current.teams, teamId],
        members: selected
          ? current.members.filter(
              (memberId) =>
                !team?.members?.some((member) => member._id === memberId),
            )
          : current.members,
      };
    });
  };

  const projectMembers = teamData.teams
    .filter((team) => form.teams.includes(team._id))
    .flatMap((team) => team.members || [])
    .filter(
      (member, index, all) =>
        form.members.includes(member._id) &&
        all.findIndex((item) => item._id === member._id) === index,
    );

  const submit = async (event) => {
    event.preventDefault();
    try {
      await createProject(form).unwrap();
      setForm({
        name: "",
        description: "",
        status: "planning",
        plannedStart: "",
        plannedDeadline: "",
        projectLeader: "",
        teams: [],
        members: [],
      });
      toast.success("Project created successfully.");
    } catch (error) {
      toast.error(error?.data?.message || "Unable to create project.");
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-4">
        <Title title="Projects" />
      </div>

      {isAdmin && (
        <form
          onSubmit={submit}
          className="mt-6 grid gap-4 rounded-2xl bg-white p-6 shadow-md lg:grid-cols-2"
        >
          <h2 className="lg:col-span-2 text-lg font-bold text-gray-900">
            Create Project
          </h2>
          <input
            required
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Project name"
            className="rounded-xl border border-gray-200 px-3 py-2.5"
          />
          <select
            value={form.status}
            onChange={(event) => updateField("status", event.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2.5"
          >
            {["planning", "active", "completed", "archived"].map((status) => (
              <option key={status} value={status}>
                {status.toUpperCase()}
              </option>
            ))}
          </select>
          <textarea
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Description"
            className="min-h-24 rounded-xl border border-gray-200 px-3 py-2.5 lg:col-span-2"
          />
          <label className="text-sm font-semibold text-gray-700">
            Planned start
            <input
              type="date"
              value={form.plannedStart}
              onChange={(event) =>
                updateField("plannedStart", event.target.value)
              }
              className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal"
            />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Planned deadline
            <input
              type="date"
              value={form.plannedDeadline}
              onChange={(event) =>
                updateField("plannedDeadline", event.target.value)
              }
              className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal"
            />
          </label>
          <ProjectMemberSelector
            teams={teamData.teams}
            selectedTeamIds={form.teams}
            selectedMemberIds={form.members}
            onToggleTeam={toggleTeam}
            onToggleMember={(memberId) => toggleId("members", memberId)}
          />
          <label className="text-sm font-semibold text-gray-700 lg:col-span-2">
            Project Leader
            <select
              required
              value={form.projectLeader}
              onChange={(event) =>
                updateField("projectLeader", event.target.value)
              }
              className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal"
            >
              <option value="">Select Project Leader</option>
              {projectMembers.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name} ({member.role})
                </option>
              ))}
            </select>
          </label>
          <Button
            type="submit"
            label={isLoading ? "Creating..." : "Create Project"}
            className="bg-indigo-600 px-5 py-2.5 text-white lg:col-span-2"
          />
        </form>
      )}

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {projectData.projects.map((project) => (
          <button
            key={project._id}
            type="button"
            onClick={() => navigate(`/projects/${project._id}`)}
            className="text-left rounded-2xl bg-white p-6 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">
                {project.name}
              </h2>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold uppercase text-indigo-700">
                {project.status}
              </span>
            </div>
            <p className="mt-3 line-clamp-3 text-sm text-gray-500">
              {project.description || "No description provided."}
            </p>
            <div className="mt-5 space-y-1 text-xs text-gray-500">
              <p>
                Owner:{" "}
                <p>
                  Progress: {project.progress?.percent || 0}% (
                  {project.progress?.completed || 0}/
                  {project.progress?.total || 0})
                </p>
                <span className="font-semibold text-gray-700">
                  {project.owner?.name}
                </span>
              </p>
              <p>
                Project Leader:{" "}
                <span className="font-semibold text-gray-700">
                  {project.projectLeader?.name || "Legacy project"}
                </span>
              </p>
              <p>
                Teams: {project.teams?.length || 0} · Members:{" "}
                {project.members?.length || 0}
              </p>
              <p>
                {project.plannedDeadline
                  ? `Deadline: ${new Date(project.plannedDeadline).toLocaleDateString()}`
                  : "No deadline"}
              </p>
            </div>
          </button>
        ))}
      </div>
      {!projectData.projects.length && (
        <p className="mt-6 rounded-2xl bg-white p-8 text-center text-sm text-gray-500">
          No projects available.
        </p>
      )}
    </div>
  );
};

export default Projects;
