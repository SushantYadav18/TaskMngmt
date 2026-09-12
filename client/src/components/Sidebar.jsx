import React from "react";
import {
  MdDashboard,
  MdOutlineAddTask,
  MdOutlinePendingActions,
  MdSettings,
  MdTaskAlt,
} from "react-icons/md";
import { FaTasks, FaTrashAlt, FaUsers, FaFolderOpen } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import { setOpenSidebar } from "../redux/slices/authSlice";
import clsx from "clsx";

const linkData = [
  {
    label: "Dashboard",
    link: "dashboard",
    icon: <MdDashboard />,
  },
  {
    label: "Tasks",
    link: "tasks",
    icon: <FaTasks />,
  },
  {
    label: "Completed",
    link: "completed/completed",
    icon: <MdTaskAlt />,
  },
  {
    label: "In Progress",
    link: "in-progress/in%20progress",
    icon: <MdOutlinePendingActions />,
  },
  {
    label: "To Do",
    link: "todo/todo",
    icon: <MdOutlinePendingActions />,
  },
  {
    label: "Team",
    link: "team",
    icon: <FaUsers />,
  },
  {
    label: "Projects",
    link: "projects",
    icon: <FaFolderOpen />,
  },
  {
    label: "Pending",
    link: "pending-users",
    icon: <MdOutlinePendingActions />,
  },
  {
    label: "Trash",
    link: "trashed",
    icon: <FaTrashAlt />,
  },
];

const Sidebar = () => {
  const { user } = useSelector((state) => state.auth);

  const dispatch = useDispatch();
  const location = useLocation();

  const path = location.pathname.split("/")[1];

  const sidebarLinks = user?.isAdmin
    ? linkData
    : linkData.filter(
        (link) => !link.adminOnly && link.link !== "pending-users",
      );

  const closeSidebar = () => {
    dispatch(setOpenSidebar(false));
  };

  const NavLink = ({ el }) => (
    <Link
      to={el.link}
      onClick={closeSidebar}
      className={clsx(
        "w-full flex gap-3 px-3.5 py-3 rounded-2xl items-center text-[15px] font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all",
        path === el.link.split("/")[0] &&
          "bg-indigo-600 text-white shadow-glow hover:bg-indigo-600 hover:text-white",
      )}
    >
      <span className="text-lg">{el.icon}</span>
      <span>{el.label}</span>
    </Link>
  );

  return (
    <div className="w-full h-full flex flex-col gap-8 p-6 sidebar-content">
      <div className="flex gap-3 items-center">
        <p className="bg-indigo-600 p-2.5 rounded-2xl shadow-glow">
          <MdOutlineAddTask className="text-white text-2xl" />
        </p>
        <div>
          <span className="block text-xl font-extrabold text-gray-900 tracking-tight">
            TaskMe
          </span>
          <span className="text-xs font-medium text-gray-500">Workspace</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto pr-1">
        <p className="page-kicker px-3 mb-2">Menu</p>
        {sidebarLinks.map((link) => (
          <NavLink el={link} key={link.label} />
        ))}
      </div>

      <div className="rounded-2xl bg-gray-100 p-4">
        <p className="text-sm font-semibold text-gray-800">Need a hand?</p>
        <p className="text-xs text-gray-500 mt-1 leading-5">
          Keep work organized with boards, lists, and a shared team space.
        </p>
        <button className="mt-4 w-full flex gap-3 p-2.5 items-center justify-center text-sm font-semibold text-gray-600 hover:text-indigo-600 rounded-xl hover:bg-white transition-colors">
          <MdSettings />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
