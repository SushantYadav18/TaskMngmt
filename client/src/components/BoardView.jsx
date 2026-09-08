import React from "react";
import TaskCard from "./TaskCard";

const BoardView = ({ tasks }) => {
  if (!tasks?.length) {
    return (
      <div className="w-full py-16 surface-card text-center">
        <p className="text-lg font-semibold text-gray-900">No tasks yet</p>
        <p className="text-gray-500 mt-2">Create a task to fill this board.</p>
      </div>
    );
  }

  return (
    <div className="w-full py-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 2xl:gap-8">
      {tasks.map((task, index) => (
        <TaskCard task={task} key={index} />
      ))}
    </div>
  );
};

export default BoardView;
