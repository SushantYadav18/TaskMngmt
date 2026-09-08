import clsx from "clsx";
import React from "react";
import { IoMdAdd } from "react-icons/io";

const TaskTitle = ({ label, className }) => {
  return (
    <div className="w-full h-14 px-4 md:px-5 rounded-2xl bg-white border border-gray-200 flex items-center justify-between">
      <div className="flex gap-3 items-center">
        <div className={clsx("w-2.5 h-2.5 rounded-full", className)} />
        <p className="text-sm md:text-base text-gray-700 font-semibold">{label}</p>
      </div>

      <button className="hidden md:flex w-8 h-8 items-center justify-center rounded-full bg-gray-100">
        <IoMdAdd className="text-lg text-black" />
      </button>
    </div>
  );
};

export default TaskTitle;
