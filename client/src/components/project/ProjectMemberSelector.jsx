import React, { useEffect, useMemo, useState } from "react";

const ProjectMemberSelector = ({
  teams = [],
  selectedTeamIds = [],
  selectedMemberIds = [],
  onToggleTeam,
  onToggleMember,
  disabled = false,
}) => {
  const [activeTeamId, setActiveTeamId] = useState(selectedTeamIds[0] || "");

  useEffect(() => {
    if (!selectedTeamIds.includes(activeTeamId)) {
      setActiveTeamId(selectedTeamIds[0] || "");
    }
  }, [activeTeamId, selectedTeamIds]);

  const activeTeam = useMemo(
    () => teams.find((team) => team._id === activeTeamId),
    [activeTeamId, teams],
  );

  return (
    <div className="rounded-xl border border-gray-200 p-3 md:col-span-2">
      <div className="grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-700">Teams</p>
          <div className="space-y-2">
            {teams.map((team) => (
              <label
                key={team._id}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  activeTeamId === team._id
                    ? "bg-indigo-50 text-indigo-700"
                    : "bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedTeamIds.includes(team._id)}
                  disabled={disabled}
                  onChange={() => onToggleTeam(team._id)}
                  onClick={() => setActiveTeamId(team._id)}
                />
                <span
                  onClick={() => setActiveTeamId(team._id)}
                  className="flex-1"
                >
                  {team.name}
                </span>
              </label>
            ))}
            {!teams.length && (
              <p className="text-sm text-gray-500">No teams available.</p>
            )}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-700">
            Members {activeTeam ? `in ${activeTeam.name}` : ""}
          </p>
          {activeTeam ? (
            <div className="space-y-2">
              {(activeTeam.members || [])
                .filter(
                  (member) => member.status === "approved" && member.isActive,
                )
                .map((member) => (
                  <label
                    key={member._id}
                    className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(member._id)}
                      disabled={
                        disabled || !selectedTeamIds.includes(activeTeam._id)
                      }
                      onChange={() => onToggleMember(member._id)}
                    />
                    <span className="font-medium">{member.name}</span>
                    <span className="text-xs text-gray-500">{member.role}</span>
                    <span className="ml-auto text-xs text-gray-400">
                      {member.email}
                    </span>
                  </label>
                ))}
              {!activeTeam.members?.some(
                (member) => member.status === "approved" && member.isActive,
              ) && (
                <p className="text-sm text-gray-500">
                  No active members in this team.
                </p>
              )}
            </div>
          ) : (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">
              Select a team to view its members.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectMemberSelector;
