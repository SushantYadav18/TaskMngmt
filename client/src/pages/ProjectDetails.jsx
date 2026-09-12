import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import Title from "../components/Title";
import Button from "../components/Button";
import ProjectMemberSelector from "../components/project/ProjectMemberSelector";
import AddTask from "../components/task/AddTask";
import Loading from "../components/Loader";
import { useGetTeamsQuery } from "../redux/slices/api/userApiSlice";
import {
  useArchiveProjectMutation,
  useGetProjectByIdQuery,
  useUpdateProjectMutation,
} from "../redux/slices/api/projectApiSlice";

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { data, isLoading, isError } = useGetProjectByIdQuery(id);
  const { data: teamData = { teams: [] } } = useGetTeamsQuery();
  const [archiveProject, { isLoading: isArchiving }] =
    useArchiveProjectMutation();
  const [openTask, setOpenTask] = useState(false);
  const [updateProject, { isLoading: isUpdating }] = useUpdateProjectMutation();
  const [editing, setEditing] = useState(false);
  const [editTeams, setEditTeams] = useState([]);
  const [editMembers, setEditMembers] = useState([]);
  const [editProjectLeader, setEditProjectLeader] = useState("");
  const project = data?.project;

  useEffect(() => {
    if (project) {
      setEditTeams(project.teams?.map((team) => team._id) || []);
      setEditMembers(project.members?.map((member) => member._id) || []);
      setEditProjectLeader(
        project.projectLeader?._id || project.projectLeader || "",
      );
    }
  }, [project]);

  if (isLoading) return <Loading />;
  if (isError || !project)
    return (
      <p className="text-center text-red-500">
        Project not found or unavailable.
      </p>
    );

  const canEdit = Boolean(
    user?.isAdmin ||
    user?._id === project.owner?._id ||
    user?._id === project.projectLeader?._id,
  );
  const canCreateProjectTask = Boolean(
    user?.isAdmin || user?._id === project.projectLeader?._id,
  );
  const selectableTeams = user?.isAdmin
    ? teamData.teams
    : project.teams?.length
      ? project.teams
      : teamData.teams;

  const archive = async () => {
    try {
      await archiveProject(project._id).unwrap();
      toast.success("Project archived successfully.");
      navigate("/projects");
    } catch (error) {
      toast.error(error?.data?.message || "Unable to archive project.");
    }
  };

  const saveProject = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await updateProject({
        id: project._id,
        name: form.get("name"),
        description: form.get("description"),
        status: form.get("status"),
        plannedStart: form.get("plannedStart") || null,
        plannedDeadline: form.get("plannedDeadline") || null,
        teams: editTeams,
        members: editMembers,
        projectLeader: editProjectLeader,
      }).unwrap();
      setEditing(false);
      toast.success("Project updated successfully.");
    } catch (error) {
      toast.error(error?.data?.message || "Unable to update project.");
    }
  };

  const toggleEditTeam = (teamId) => {
    const team = selectableTeams.find((item) => item._id === teamId);
    setEditTeams((current) => {
      const selected = current.includes(teamId);
      if (selected) {
        setEditMembers((members) =>
          members.filter(
            (memberId) =>
              !team?.members?.some((member) => member._id === memberId),
          ),
        );
        return current.filter((id) => id !== teamId);
      }
      return [...current, teamId];
    });
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => navigate("/projects")}
        className="mb-4 text-sm font-semibold text-indigo-600"
      >
        Back to Projects
      </button>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Title title={project.name} />
          <p className="mt-2 max-w-2xl text-gray-500">
            {project.description || "No description provided."}
          </p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button
              type="button"
              label="Edit"
              onClick={() => setEditing((value) => !value)}
              className="bg-gray-100 px-4 py-2 text-gray-700"
            />
          )}
          {canCreateProjectTask && (
            <Button
              type="button"
              label="Create Task"
              onClick={() => setOpenTask(true)}
              className="bg-indigo-600 px-4 py-2 text-white"
            />
          )}
          {canEdit && (
            <Button
              type="button"
              label={isArchiving ? "Archiving..." : "Archive"}
              onClick={archive}
              className="bg-gray-100 px-4 py-2 text-gray-700"
            />
          )}
        </div>
      </div>
      {editing && canEdit && (
        <form
          onSubmit={saveProject}
          className="mt-6 grid gap-3 rounded-2xl bg-white p-5 shadow md:grid-cols-2"
        >
          <input
            name="name"
            defaultValue={project.name}
            required
            className="rounded-xl border border-gray-200 px-3 py-2.5"
          />
          <select
            name="status"
            defaultValue={project.status}
            className="rounded-xl border border-gray-200 px-3 py-2.5"
          >
            {["planning", "active", "completed", "archived"].map((status) => (
              <option key={status} value={status}>
                {status.toUpperCase()}
              </option>
            ))}
          </select>
          <textarea
            name="description"
            defaultValue={project.description}
            className="min-h-24 rounded-xl border border-gray-200 px-3 py-2.5 md:col-span-2"
          />
          <label className="text-sm font-semibold">
            Planned start
            <input
              name="plannedStart"
              type="date"
              defaultValue={
                project.plannedStart ? project.plannedStart.slice(0, 10) : ""
              }
              className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal"
            />
          </label>
          <label className="text-sm font-semibold">
            Planned deadline
            <input
              name="plannedDeadline"
              type="date"
              defaultValue={
                project.plannedDeadline
                  ? project.plannedDeadline.slice(0, 10)
                  : ""
              }
              className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal"
            />
          </label>
          <label className="text-sm font-semibold md:col-span-2">
            Project Leader
            <select
              required
              value={editProjectLeader}
              onChange={(event) => setEditProjectLeader(event.target.value)}
              className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal"
            >
              <option value="">Select Project Leader</option>
              {project.members?.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name} ({member.role})
                </option>
              ))}
            </select>
          </label>
          <Button
            type="submit"
            label={isUpdating ? "Saving..." : "Save changes"}
            className="bg-indigo-600 px-4 py-2 text-white md:col-span-2"
          />
        </form>
      )}
      <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
          Project Leader
        </p>
        <p className="mt-1 font-bold text-gray-900">
          {project.projectLeader?.name ||
            "Legacy project without a Project Leader"}
        </p>
        {project.projectLeader && (
          <p className="text-sm text-gray-500">
            {project.projectLeader.role} · {project.projectLeader.email}
          </p>
        )}
      </div>
      {editing && canEdit && (
        <ProjectMemberSelector
          teams={selectableTeams}
          selectedTeamIds={editTeams}
          selectedMemberIds={editMembers}
          onToggleTeam={toggleEditTeam}
          onToggleMember={(memberId) =>
            setEditMembers((current) =>
              current.includes(memberId)
                ? current.filter((id) => id !== memberId)
                : [...current, memberId],
            )
          }
        />
      )}
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow">
          <p className="text-xs uppercase text-gray-400">Status</p>
          <p className="mt-1 font-bold uppercase">{project.status}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow">
          <p className="text-xs uppercase text-gray-400">Owner</p>
          <p className="mt-1 font-bold">{project.owner?.name}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow">
          <p className="text-xs uppercase text-gray-400">Start</p>
          <p className="mt-1 font-bold">
            {project.plannedStart
              ? new Date(project.plannedStart).toLocaleDateString()
              : "Not set"}
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow">
          <p className="text-xs uppercase text-gray-400">Deadline</p>
          <p className="mt-1 font-bold">
            {project.plannedDeadline
              ? new Date(project.plannedDeadline).toLocaleDateString()
              : "Not set"}
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow">
          <p className="text-xs uppercase text-gray-400">Actual Start</p>
          <p className="mt-1 font-bold">
            {project.actualStart
              ? new Date(project.actualStart).toLocaleDateString()
              : "Not started"}
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow">
          <p className="text-xs uppercase text-gray-400">Actual Completion</p>
          <p className="mt-1 font-bold">
            {project.actualCompletion
              ? new Date(project.actualCompletion).toLocaleDateString()
              : "Not completed"}
          </p>
        </div>
      </div>
      <section className="mt-6 rounded-2xl bg-white p-5 shadow">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Project progress</h2>
          <span className="text-lg font-bold text-indigo-600">
            {data.progress?.percent || 0}%
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <span className="rounded-full bg-indigo-100 px-2 py-1 font-semibold text-indigo-700">
            Tasks: {data.tasks?.length || 0}
          </span>
          <span className="rounded-full bg-indigo-100 px-2 py-1 font-semibold text-indigo-700">
            Dependencies: {data.dependencySummary?.total || 0}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-indigo-600"
            style={{ width: `${data.progress?.percent || 0}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-sm text-gray-600">
          <span>Completed: {data.progress?.completed || 0}</span>
          <span>In Progress: {data.progress?.inProgress || 0}</span>
          <span>Todo: {data.progress?.todo || 0}</span>
        </div>
      </section>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="font-bold">Participating teams</h2>
          <div className="mt-3 space-y-2">
            {project.teams?.map((team) => (
              <p
                key={team._id}
                className="rounded-lg bg-gray-50 px-3 py-2 text-sm"
              >
                {team.name}
              </p>
            ))}
          </div>
        </section>
        <section className="rounded-2xl bg-white p-6 shadow">
          <h2 className="font-bold">Project membership by team</h2>
          <div className="mt-3 space-y-4">
            {project.teams?.map((team) => {
              const teamMembers = project.members?.filter(
                (member) => String(member.team) === String(team._id),
              );
              return (
                <div key={team._id}>
                  <p className="text-sm font-bold text-indigo-700">
                    {team.name}
                  </p>
                  <div className="mt-2 space-y-2">
                    {teamMembers?.map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm"
                      >
                        <span className="text-emerald-600">✓</span>
                        <span className="font-semibold">{member.name}</span>
                        <span className="text-xs text-gray-500">
                          {member.role} · {member.email}
                        </span>
                      </div>
                    ))}
                    {!teamMembers?.length && (
                      <p className="text-xs text-gray-400">
                        No assigned members.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
      <section className="mt-6 rounded-2xl bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Project tasks</h2>
          <span className="text-sm text-gray-500">
            {data.tasks?.length || 0} tasks
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {data.tasks?.map((task) => (
            <button
              key={task._id}
              type="button"
              onClick={() => navigate(`/task/${task._id}`)}
              className="flex w-full items-center justify-between rounded-xl border border-gray-100 px-4 py-3 text-left hover:bg-gray-50"
            >
              <span>
                <span className="block font-semibold">{task.title}</span>
                <span className="text-xs text-gray-500">
                  {task.assignee?.name || "Unassigned"}
                </span>
              </span>
              <span className="text-xs font-bold uppercase text-gray-500">
                {task.stage} · {task.priority} ·{" "}
                {task.dueDate
                  ? new Date(task.dueDate).toLocaleDateString()
                  : "No due date"}
              </span>
            </button>
          ))}
        </div>
        {!data.tasks?.length && (
          <p className="mt-4 text-sm text-gray-500">
            No active tasks belong to this project.
          </p>
        )}
      </section>
      <AddTask open={openTask} setOpen={setOpenTask} project={project} />
    </div>
  );
};

export default ProjectDetails;
