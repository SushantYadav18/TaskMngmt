import React, { useState } from "react";
import { FaList } from "react-icons/fa";
import { MdGridView } from "react-icons/md";
import { useParams } from "react-router-dom";
import Loading from "../components/Loader";
import Title from "../components/Title";
import Button from "../components/Button";
import { IoMdAdd } from "react-icons/io";
import Tabs from "../components/Tabs";
import TaskTitle from "../components/TaskTitle";
import BoardView from "../components/BoardView";
import Table from "../components/task/Table";
import AddTask from "../components/task/AddTask";
import { useGetTasksQuery } from "../redux/slices/api/taskApiSlice";
import { useSelector } from "react-redux";

const TABS = [
  { title: "Board View", icon: <MdGridView /> },
  { title: "List View", icon: <FaList /> },
];

const TASK_TYPE = {
  todo: "bg-blue-600",
  "in progress": "bg-yellow-600",
  completed: "bg-green-600",
};

const Tasks = () => {
  const params = useParams();
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);
  const { user } = useSelector((state) => state.auth);

  const rawStatus = decodeURIComponent(params?.status || "").trim();
  const normalizeStage = (value) => {
    if (!value) return "";

    const normalized = value.toLowerCase().trim();
    if (normalized === "in-progress" || normalized === "in progress") {
      return "in progress";
    }

    return normalized;
  };

  const status = normalizeStage(rawStatus);
  const { data, isLoading } = useGetTasksQuery({
    stage: status || undefined,
    isTrashed: false,
  });

  const tasks = data?.tasks || [];

  return isLoading ? (
    <div className="py-10">
      <Loading />
    </div>
  ) : (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <p className="page-kicker">Work</p>
          <Title
            title={status ? `${status} Tasks` : "Tasks"}
            className="mt-2"
          />
          <p className="text-gray-500 mt-2">
            Switch between a spacious board and a clean list.
          </p>
        </div>

        {!status && user?.isAdmin && (
          <Button
            onClick={() => setOpen(true)}
            label="Create Task"
            icon={<IoMdAdd className="text-lg" />}
            className="flex flex-row-reverse gap-2 items-center bg-indigo-600 text-white rounded-2xl py-3 px-5 font-semibold shadow-glow"
          />
        )}
      </div>

      <Tabs tabs={TABS} setSelected={setSelected}>
        {!status && (
          <div className="w-full flex flex-col md:flex-row justify-between gap-4 md:gap-6 pb-2">
            <TaskTitle label="To Do" className={TASK_TYPE.todo} />
            <TaskTitle
              label="In Progress"
              className={TASK_TYPE["in progress"]}
            />
            <TaskTitle label="completed" className={TASK_TYPE.completed} />
          </div>
        )}

        {selected !== 1 ? (
          <BoardView tasks={tasks} />
        ) : (
          <div className="w-full">
            <Table tasks={tasks} />
          </div>
        )}
      </Tabs>

      <AddTask open={open} setOpen={setOpen} />
    </div>
  );
};

export default Tasks;
