import clsx from "clsx";
import React, { useState } from "react";
import {
  MdAttachFile,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdKeyboardDoubleArrowUp,
} from "react-icons/md";
import { useSelector } from "react-redux";
import { BGS, PRIOTITYSTYELS, TASK_TYPE, formatDate } from "../utils";
import TaskDialog from "./task/TaskDialog";
import { BiMessageAltDetail } from "react-icons/bi";
import { FaList } from "react-icons/fa";
import UserInfo from "./UserInfo";
import { IoMdAdd } from "react-icons/io";
import AddSubTask from "./task/AddSubTask";

const ICONS = {
  high: <MdKeyboardDoubleArrowUp />,
  medium: <MdKeyboardArrowUp />,
  low: <MdKeyboardArrowDown />,
};

const TaskCard = ({ task }) => {
  const { user } = useSelector((state) => state.auth);
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="w-full h-fit surface-card p-6">
        <div className="w-full flex justify-between items-start">
          <div
            className={clsx(
              "flex flex-1 gap-1 items-center text-sm font-semibold",
              PRIOTITYSTYELS[task?.priority],
            )}
          >
            <span className="text-lg">{ICONS[task?.priority]}</span>
            <span className="uppercase tracking-wide">{task?.priority} Priority</span>
          </div>

          <TaskDialog task={task} />
        </div>

        <>
          <div className="flex items-center gap-3 mt-4">
            <div
              className={clsx("w-2.5 h-2.5 rounded-full", TASK_TYPE[task.stage])}
            />
            <h4 className="line-clamp-2 text-black font-bold text-lg leading-snug">
              {task?.title}
            </h4>
          </div>
          <span className="inline-block mt-3 text-sm text-gray-500">
            {formatDate(new Date(task?.date))}
          </span>
        </>

        <div className="w-full border-t border-gray-200 my-4" />
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div className="flex gap-1.5 items-center text-sm text-gray-600">
              <BiMessageAltDetail />
              <span>{task?.activities?.length}</span>
            </div>
            <div className="flex gap-1.5 items-center text-sm text-gray-600 ">
              <MdAttachFile />
              <span>{task?.assets?.length}</span>
            </div>
            <div className="flex gap-1.5 items-center text-sm text-gray-600 ">
              <FaList />
              <span>0/{task?.subTasks?.length}</span>
            </div>
          </div>

          <div className="flex flex-row-reverse">
            {task?.team?.map((m, index) => (
              <div
                key={index}
                className={clsx(
                  "w-8 h-8 rounded-full text-white flex items-center justify-center text-sm -mr-1 ring-2 ring-white",
                  BGS[index % BGS?.length],
                )}
              >
                <UserInfo user={m} />
              </div>
            ))}
          </div>
        </div>

        {task?.subTasks?.length > 0 ? (
          <div className="py-4 border-t border-gray-200">
            <h5 className="text-base line-clamp-1 text-black font-semibold">
              {task?.subTasks[0].title}
            </h5>

            <div className="pt-3 flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {formatDate(new Date(task?.subTasks[0]?.date))}
              </span>
              <span className="bg-indigo-600/10 px-3 py-1 rounded-full text-indigo-700 font-medium text-sm">
                {task?.subTasks[0].tag}
              </span>
            </div>
          </div>
        ) : (
          <>
            <div className="py-4 border-t border-gray-200">
              <span className="text-gray-500 text-sm">No sub-task yet</span>
            </div>
          </>
        )}

        <div className="w-full pt-1">
          <button
            onClick={() => setOpen(true)}
            disabled={false}
            className="w-full flex gap-3 items-center justify-center text-sm text-gray-600 font-semibold disabled:cursor-not-allowed rounded-xl py-2.5 hover:bg-gray-100"
          >
            <IoMdAdd className="text-lg" />
            <span>Add subtask</span>
          </button>
        </div>
      </div>

      <AddSubTask open={open} setOpen={setOpen} id={task._id} />
    </>
  );
};

export default TaskCard;
