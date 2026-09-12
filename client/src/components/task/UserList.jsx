import { Listbox, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";
import { BsChevronExpand } from "react-icons/bs";
import clsx from "clsx";
import { MdCheck } from "react-icons/md";
import { useSelector } from "react-redux";
import { useGetTeamListQuery } from "../../redux/slices/api/userApiSlice";
import { getInitials } from "../../utils";

const UserList = ({ setAssignee, assignee, project }) => {
  const { user: currentUser } = useSelector((state) => state.auth);
  const { data: teamUsers = [] } = useGetTeamListQuery();
  const [selectedUser, setSelectedUser] = useState(null);
  const data = project?.members || teamUsers;

  const sourceRole = currentUser?.role?.toUpperCase();
  const validUsers = data.filter((user) => {
    const targetRole = user.role?.toUpperCase();
    if (project) {
      if (currentUser?.isAdmin) {
        return user._id === project.projectLeader?._id;
      }
      if (currentUser?._id === project.projectLeader?._id) {
        return targetRole !== "ADMIN";
      }
      const projectAllowed = {
        ASSOCIATE: ["JUNIOR", "INTERN"],
        JUNIOR: ["INTERN"],
      };
      return projectAllowed[sourceRole]?.includes(targetRole);
    }
    if (currentUser?.isAdmin || sourceRole === "ADMIN") {
      return targetRole === "TEAM_LEADER";
    }
    if (!currentUser?.team || user.team !== currentUser.team) return false;
    const allowed = {
      TEAM_LEADER: ["ASSOCIATE", "JUNIOR", "INTERN"],
      ASSOCIATE: ["JUNIOR", "INTERN"],
      JUNIOR: ["INTERN"],
    };
    return allowed[sourceRole]?.includes(targetRole);
  });

  const handleChange = (el) => {
    setSelectedUser(el);
    setAssignee(el?._id || "");
  };

  useEffect(() => {
    if (!assignee) {
      if (validUsers[0]) {
        setSelectedUser(validUsers[0]);
        setAssignee(validUsers[0]._id);
      }
      return;
    }

    setSelectedUser(data.find((user) => user._id === assignee) || null);
  }, [data, assignee, setAssignee, validUsers]);

  return (
    <div>
      <p className="text-gray-700">Assign Task To: </p>
      <Listbox value={selectedUser} onChange={(el) => handleChange(el)}>
        <div className="relative mt-1">
          <Listbox.Button className="relative w-full cursor-default rounded bg-white pl-3 pr-10 text-left px-3 py-2.5 2xl:py-3 border border-gray-300 sm:text-sm">
            <span className="block truncate">
              {selectedUser?.name || "Select assignee"}
            </span>

            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <BsChevronExpand
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </span>
          </Listbox.Button>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="z-50 absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
              {validUsers?.map((user, index) => (
                <Listbox.Option
                  key={index}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4. ${
                      active ? "bg-amber-100 text-amber-900" : "text-gray-900"
                    }`
                  }
                  value={user}
                >
                  {({ selected }) => (
                    <>
                      <div
                        className={clsx(
                          "flex items-center gap-2 truncate",
                          selected ? "font-medium" : "font-normal",
                        )}
                      >
                        <div className="w-6 h-6 rounded-full text-white flex items-center justify-center bg-violet-600">
                          <span className="text-center text-[10px]">
                            {getInitials(user.name)}
                          </span>
                        </div>
                        <span>{user.name}</span>
                      </div>
                      {selected ? (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                          <MdCheck className="h-5 w-5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
};

export default UserList;
