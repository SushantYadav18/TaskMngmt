import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import Title from "../components/Title";
import Button from "../components/Button";
import { ConfirmationDialog } from "../components/Dialogs";
import {
  useCreateTeamMutation,
  useDeleteTeamMutation,
  useGetTeamListQuery,
  useGetTeamsQuery,
  useMoveTeamMemberMutation,
  useUserActionMutation,
} from "../redux/slices/api/userApiSlice";

const roleLabel = (role) => role?.replaceAll("_", " ") || "UNKNOWN";

const Teams = () => {
  const { user: currentUser } = useSelector((state) => state.auth);
  const isAdmin = Boolean(currentUser?.isAdmin);
  const isTeamLeader = currentUser?.role?.toUpperCase() === "TEAM_LEADER";
  const { data: teamsData = { teams: [] }, refetch: refetchTeams } =
    useGetTeamsQuery();
  const { data: users = [], refetch: refetchUsers } = useGetTeamListQuery();
  const [createTeam, { isLoading: isCreating }] = useCreateTeamMutation();
  const [moveTeamMember, { isLoading: isMoving }] = useMoveTeamMemberMutation();
  const [deleteTeam, { isLoading: isDeleting }] = useDeleteTeamMutation();
  const [userAction, { isLoading: isChangingStatus }] = useUserActionMutation();
  const [name, setName] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [search, setSearch] = useState("");
  const [draggedMember, setDraggedMember] = useState(null);
  const [draggedOverTeam, setDraggedOverTeam] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  const leaders = users.filter(
    (user) =>
      user.role?.toUpperCase() === "TEAM_LEADER" && !user.team && user.isActive,
  );

  const visibleTeams = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return teamsData.teams;
    return teamsData.teams.filter((team) =>
      team.name.toLowerCase().includes(normalizedSearch),
    );
  }, [search, teamsData.teams]);

  const submitTeam = async (event) => {
    event.preventDefault();
    try {
      await createTeam({ name, leaderId }).unwrap();
      setName("");
      setLeaderId("");
      toast.success("Team created successfully.");
      await Promise.all([refetchTeams(), refetchUsers()]);
    } catch (error) {
      toast.error(error?.data?.message || "Unable to create team.");
    }
  };

  const toggleUserStatus = async (member) => {
    try {
      const result = await userAction({
        id: member._id,
        isAction: !member.isActive,
      }).unwrap();
      toast.success(result.message || "User status updated.");
      await Promise.all([refetchTeams(), refetchUsers()]);
    } catch (error) {
      toast.error(error?.data?.message || "Unable to update user status.");
    }
  };

  const canManageStatus = (member) =>
    isAdmin ||
    (isTeamLeader &&
      member._id !== currentUser?._id &&
      member.role?.toUpperCase() !== "TEAM_LEADER");

  const startDragging = (event, member) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", member._id);
    setDraggedMember(member);
  };

  const dropMember = async (event, team) => {
    event.preventDefault();
    setDraggedOverTeam(null);

    if (!isAdmin || !draggedMember || draggedMember.team === team._id) {
      setDraggedMember(null);
      return;
    }

    try {
      await moveTeamMember({
        userId: draggedMember._id,
        destinationTeamId: team._id,
      }).unwrap();
      toast.success(`${draggedMember.name} moved to ${team.name}.`);
      await Promise.all([refetchTeams(), refetchUsers()]);
    } catch (error) {
      toast.error(error?.data?.message || "Unable to move team member.");
    } finally {
      setDraggedMember(null);
    }
  };

  const removeTeam = async () => {
    if (!deleteCandidate) return;
    try {
      await deleteTeam(deleteCandidate._id).unwrap();
      toast.success("Team deleted successfully.");
      setDeleteCandidate(null);
      await Promise.all([refetchTeams(), refetchUsers()]);
    } catch (error) {
      toast.error(error?.data?.message || "Unable to delete team.");
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <Title title="Teams" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search teams..."
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 md:max-w-sm"
          aria-label="Search teams"
        />
      </div>

      {isAdmin && (
        <form
          onSubmit={submitTeam}
          className="mt-6 grid gap-3 rounded-2xl bg-white p-5 shadow-md md:grid-cols-[1fr_1fr_auto] md:items-end"
        >
          <label className="text-sm font-semibold text-gray-700">
            Team name
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Team Leader
            <select
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 font-normal"
              value={leaderId}
              onChange={(event) => setLeaderId(event.target.value)}
              required
            >
              <option value="">Select Team Leader</option>
              {leaders.map((leader) => (
                <option key={leader._id} value={leader._id}>
                  {leader.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="submit"
            label={isCreating ? "Creating..." : "Create Team"}
            className="bg-blue-600 px-4 py-2.5 text-white"
          />
        </form>
      )}

      <div className="mt-6 space-y-6">
        {visibleTeams.map((team) => {
          const members = (team.members || []).filter(
            (member) => member._id !== team.leader?._id,
          );
          const isDropTarget = draggedOverTeam === team._id;

          return (
            <section
              key={team._id}
              onDragOver={(event) => {
                if (isAdmin && draggedMember) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDraggedOverTeam(team._id);
                }
              }}
              onDragLeave={() => setDraggedOverTeam(null)}
              onDrop={(event) => dropMember(event, team)}
              className={`rounded-2xl border bg-white p-5 shadow-md transition-colors ${
                isDropTarget
                  ? "border-indigo-400 bg-indigo-50/40"
                  : "border-gray-100"
              }`}
            >
              <div className="border-b border-gray-100 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                    {team.name}
                  </p>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setDeleteCandidate(team)}
                      disabled={isDeleting || isMoving}
                      className="text-xs font-semibold text-red-600"
                    >
                      {isDeleting ? "Deleting..." : "Delete team"}
                    </button>
                  )}
                </div>
                <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                        Team Leader
                      </p>
                      <p className="mt-1 font-bold text-gray-900">
                        {team.leader?.name || "Unassigned"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {team.leader?.email || "No email"}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-indigo-700">
                        {roleLabel(team.leader?.role)}
                      </p>
                    </div>
                    {isAdmin && team.leader && (
                      <button
                        type="button"
                        onClick={() => toggleUserStatus(team.leader)}
                        disabled={isChangingStatus}
                        className="text-xs font-semibold text-indigo-700"
                      >
                        {team.leader.isActive ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">
                    Members
                  </h2>
                  {isAdmin && (
                    <span className="text-xs text-gray-400">
                      {isMoving
                        ? "Moving member..."
                        : "Drag members between teams"}
                    </span>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {members.map((member) => (
                    <article
                      key={member._id}
                      draggable={isAdmin && !isMoving}
                      onDragStart={(event) => startDragging(event, member)}
                      onDragEnd={() => {
                        setDraggedMember(null);
                        setDraggedOverTeam(null);
                      }}
                      className={`rounded-xl border p-4 transition-opacity ${
                        member.isActive
                          ? "border-gray-200 bg-white"
                          : "border-gray-200 bg-gray-50 opacity-60"
                      } ${isAdmin ? "cursor-grab active:cursor-grabbing" : ""} ${
                        draggedMember?._id === member._id
                          ? "ring-2 ring-indigo-400"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {member.name}
                          </p>
                          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-gray-500">
                            {roleLabel(member.role)}
                          </p>
                          <p className="mt-2 break-all text-sm text-gray-500">
                            {member.email}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                            member.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {member.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {canManageStatus(member) && (
                        <button
                          type="button"
                          onClick={() => toggleUserStatus(member)}
                          disabled={isChangingStatus}
                          className="mt-4 text-xs font-semibold text-indigo-600"
                        >
                          {member.isActive ? "Deactivate" : "Activate"}
                        </button>
                      )}
                    </article>
                  ))}
                </div>
                {members.length === 0 && (
                  <p className="rounded-xl border border-dashed border-gray-200 p-5 text-sm text-gray-500">
                    No members in this team yet.
                  </p>
                )}
              </div>
            </section>
          );
        })}
        {visibleTeams.length === 0 && (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500 shadow-md">
            {search
              ? "No teams match your search."
              : "No team is assigned to this account."}
          </p>
        )}
      </div>
      <ConfirmationDialog
        open={Boolean(deleteCandidate)}
        setOpen={(open) => {
          if (!open) setDeleteCandidate(null);
        }}
        msg={
          deleteCandidate
            ? `Delete ${deleteCandidate.name}? Teams with members or project references cannot be deleted.`
            : ""
        }
        onClick={removeTeam}
      />
    </div>
  );
};

export default Teams;
