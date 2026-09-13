import React from "react";
import {
  MdAdminPanelSettings,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdKeyboardDoubleArrowUp,
} from "react-icons/md";
import { MdOutlineAssignment } from "react-icons/md";
import { FaNewspaper, FaUsers } from "react-icons/fa";
import { FaArrowsToDot } from "react-icons/fa6";
import moment from "moment";
import clsx from "clsx";
import { Chart } from "../components/Chart";
import { BGS, PRIOTITYSTYELS, TASK_TYPE, getInitials } from "../utils";
import UserInfo from "../components/UserInfo";
import { useGetDashboardStatsQuery } from "../redux/slices/api/taskApiSlice";
import Loading from "../components/Loader";

const TaskTable = ({ tasks }) => {
  const ICONS = {
    high: <MdKeyboardDoubleArrowUp />,
    medium: <MdKeyboardArrowUp />,
    low: <MdKeyboardArrowDown />,
  };

  const TableHeader = () => (
    <thead className="border-b border-gray-200">
      <tr className="text-left text-xs uppercase tracking-[0.14em] text-gray-500">
        <th className="py-4 font-semibold">Task Title</th>
        <th className="py-4 font-semibold">Priority</th>
        <th className="py-4 font-semibold">Assignee</th>
        <th className="py-4 font-semibold hidden md:table-cell">Created At</th>
      </tr>
    </thead>
  );

  const TableRow = ({ task }) => (
    <tr className="border-b border-gray-200 text-gray-600 hover:bg-gray-100/70">
      <td className="py-4 pr-4">
        <div className="flex items-center gap-3">
          <div
            className={clsx("w-2.5 h-2.5 rounded-full", TASK_TYPE[task.stage])}
          />
          <p className="text-base font-semibold text-black">{task.title}</p>
        </div>
      </td>

      <td className="py-4 pr-4">
        <div className="flex gap-1 items-center">
          <span className={clsx("text-lg", PRIOTITYSTYELS[task.priority])}>
            {ICONS[task.priority]}
          </span>
          <span className="capitalize">{task.priority}</span>
        </div>
      </td>

      <td className="py-4 pr-4">
        <div className="flex">
          {task.assignee &&
            [task.assignee].map((m, index) => (
              <div
                key={index}
                className={clsx(
                  "w-8 h-8 rounded-full text-white flex items-center justify-center text-sm -mr-1 ring-2 ring-white",
                  BGS[index % BGS.length],
                )}
              >
                <UserInfo user={m} />
              </div>
            ))}
        </div>
      </td>
      <td className="py-4 hidden md:table-cell">
        <span className="text-sm text-gray-600">
          {moment(task?.date).fromNow()}
        </span>
      </td>
    </tr>
  );
  return (
    <div className="w-full md:w-2/3 surface-card px-6 md:px-8 pt-6 pb-4">
      <div className="mb-2">
        <p className="page-kicker">Recent</p>
        <h3 className="text-xl font-bold mt-2">Latest tasks</h3>
      </div>
      <table className="w-full">
        <TableHeader />
        <tbody>
          {tasks?.map((task, id) => (
            <TableRow key={id} task={task} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

const UserTable = ({ users }) => {
  const TableHeader = () => (
    <thead className="border-b border-gray-200">
      <tr className="text-left text-xs uppercase tracking-[0.14em] text-gray-500">
        <th className="py-4 font-semibold">Full Name</th>
        <th className="py-4 font-semibold">Status</th>
        <th className="py-4 font-semibold">Created At</th>
      </tr>
    </thead>
  );

  const TableRow = ({ user }) => (
    <tr className="border-b border-gray-200 text-gray-600 hover:bg-gray-100/70">
      <td className="py-4 pr-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full text-white flex items-center justify-center text-sm bg-indigo-600">
            <span className="text-center">{getInitials(user?.name)}</span>
          </div>

          <div>
            <p className="font-semibold text-gray-900">
              {user?.name || "Unknown User"}
            </p>
            <span className="text-xs text-gray-500">
              {user?.role || "No Role"}
            </span>
          </div>
        </div>
      </td>

      <td>
        <p
          className={clsx(
            "w-fit px-3 py-1 rounded-full text-sm font-semibold",
            user?.isActive
              ? "bg-teal-100 text-teal-800"
              : "bg-amber-100 text-amber-800",
          )}
        >
          {user?.isActive ? "Active" : "Disabled"}
        </p>
      </td>
      <td className="py-4 text-sm">{moment(user?.createdAt).fromNow()}</td>
    </tr>
  );

  return (
    <div className="w-full md:w-1/3 surface-card h-fit px-6 md:px-7 py-6">
      <div className="mb-2 flex items-center gap-2">
        <FaUsers className="text-indigo-500" />
        <h3 className="text-xl font-bold">Team</h3>
      </div>
      <table className="w-full mb-2">
        <TableHeader />
        <tbody>
          {users?.map((user, index) => (
            <TableRow key={index + user?._id} user={user} />
          ))}
        </tbody>
      </table>
    </div>
  );
};
const Dashboard = () => {
  const { data, isLoading, isError } = useGetDashboardStatsQuery();

  const summary = data || {
    totalTasks: 0,
    tasks: {},
    graphData: [],
    last10Task: [],
    users: [],
  };

  const totals = summary.tasks || {};

  const stats = [
    {
      _id: "1",
      label: "Total tasks",
      total: summary?.totalTasks || 0,
      icon: <FaNewspaper />,
      bg: "bg-indigo-600",
      hint: "Across every stage",
    },
    {
      _id: "2",
      label: "Completed",
      total: totals["completed"] || 0,
      icon: <MdAdminPanelSettings />,
      bg: "bg-teal-700",
      hint: "Ready to close",
    },
    {
      _id: "3",
      label: "In progress",
      total: totals["in progress"] || 0,
      icon: <MdOutlineAssignment />,
      bg: "bg-amber-500",
      hint: "Currently moving",
    },
    {
      _id: "4",
      label: "To do",
      total: totals["todo"] || 0,
      icon: <FaArrowsToDot />,
      bg: "bg-rose-600",
      hint: "Waiting to start",
    },
  ];

  const Card = ({ label, count, bg, icon, hint }) => {
    return (
      <div className="w-full min-h-[150px] surface-card p-6 flex items-center justify-between">
        <div className="h-full flex flex-1 flex-col justify-between gap-4">
          <p className="text-sm font-semibold text-gray-500">{label}</p>
          <span className="text-4xl font-extrabold tracking-tight">
            {count}
          </span>
          <span className="text-sm text-gray-400">{hint}</span>
        </div>

        <div
          className={clsx(
            "w-12 h-12 rounded-2xl flex items-center justify-center text-white",
            bg,
          )}
        >
          {icon}
        </div>
      </div>
    );
  };
  if (isLoading) {
    return (
      <div className="py-10">
        <Loading />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-10 text-center text-red-500">
        Failed to load dashboard data.
      </div>
    );
  }

  return (
    <div className="h-full py-2">
      <div className="mb-8">
        <p className="page-kicker">Overview</p>
        <h1 className="text-3xl font-extrabold tracking-tight mt-2">
          Dashboard
        </h1>
        <p className="text-gray-500 mt-2 max-w-2xl">
          A quiet snapshot of workload, progress, and the people around it.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {stats.map(({ icon, bg, label, total, hint }, index) => (
          <Card
            key={index}
            icon={icon}
            bg={bg}
            label={label}
            count={total}
            hint={hint}
          />
        ))}
      </div>

      <div className="w-full surface-card my-10 p-6 md:p-8">
        <div className="mb-6">
          <p className="page-kicker">Priority</p>
          <h4 className="text-xl text-gray-900 font-bold mt-2">
            Chart by priority
          </h4>
        </div>
        <Chart data={summary.graphData || []} />
      </div>

      <div className="w-full flex flex-col md:flex-row gap-6 2xl:gap-8 py-2">
        <TaskTable tasks={summary.last10Task || []} />
        <UserTable users={summary.users || []} />
      </div>
    </div>
  );
};

export default Dashboard;
