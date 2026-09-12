import clsx from "clsx";
import moment from "moment";
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { FaBug, FaTasks, FaThumbsUp, FaUser } from "react-icons/fa";
import { GrInProgress } from "react-icons/gr";
import {
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdKeyboardDoubleArrowUp,
  MdOutlineDoneAll,
  MdOutlineMessage,
  MdTaskAlt,
} from "react-icons/md";
import { RxActivityLog } from "react-icons/rx";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import Tabs from "../components/Tabs";
import { PRIOTITYSTYELS, TASK_TYPE, getInitials } from "../utils";
import Loading from "../components/Loader";
import Button from "../components/Button";
import {
  useAddTaskDependencyMutation,
  useGetTaskByIdQuery,
  useGetTaskDependenciesQuery,
  usePostTaskActivityMutation,
  useRemoveTaskDependencyMutation,
} from "../redux/slices/api/taskApiSlice";
import { useGetProjectByIdQuery } from "../redux/slices/api/projectApiSlice";

const assets = [
  "https://images.pexels.com/photos/2418664/pexels-photo-2418664.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
  "https://images.pexels.com/photos/8797307/pexels-photo-8797307.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
  "https://images.pexels.com/photos/2534523/pexels-photo-2534523.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
  "https://images.pexels.com/photos/804049/pexels-photo-804049.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
];

const ICONS = {
  high: <MdKeyboardDoubleArrowUp />,
  medium: <MdKeyboardArrowUp />,
  low: <MdKeyboardArrowDown />,
};

const bgColor = {
  high: "bg-red-200",
  medium: "bg-yellow-200",
  low: "bg-blue-200",
};

const TABS = [
  { title: "Task Detail", icon: <FaTasks /> },
  { title: "Activities/Timeline", icon: <RxActivityLog /> },
];

const TASKTYPEICON = {
  commented: (
    <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center text-white">
      <MdOutlineMessage />
    </div>
  ),
  started: (
    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
      <FaThumbsUp size={20} />
    </div>
  ),
  assigned: (
    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-500 text-white">
      <FaUser size={14} />
    </div>
  ),
  bug: (
    <div className="text-red-600">
      <FaBug size={24} />
    </div>
  ),
  completed: (
    <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white">
      <MdOutlineDoneAll size={24} />
    </div>
  ),
  "in progress": (
    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-violet-600 text-white">
      <GrInProgress size={16} />
    </div>
  ),
};

const act_types = [
  "Commented",
  "Started",
  "Completed",
  "In Progress",
  "Bug",
  "Assigned",
];

const TaskDetails = () => {
  const { id } = useParams();
  const { user } = useSelector((state) => state.auth);
  const { data, isLoading, isError, refetch } = useGetTaskByIdQuery(id);
  const { data: dependencyData } = useGetTaskDependenciesQuery(id, {
    skip: !id,
  });
  const task = data?.task;
  const projectId = task?.project?._id || task?.project;
  const { data: projectData } = useGetProjectByIdQuery(projectId, {
    skip: !projectId,
  });
  const [selected, setSelected] = useState(0);
  const [selectedPredecessor, setSelectedPredecessor] = useState("");
  const [addTaskDependency, { isLoading: isAddingDependency }] =
    useAddTaskDependencyMutation();
  const [removeTaskDependency, { isLoading: isRemovingDependency }] =
    useRemoveTaskDependencyMutation();
  const [postTaskActivity, { isLoading: isStatusUpdating }] =
    usePostTaskActivityMutation();

  const allDependencies = dependencyData?.dependencies ||
    task?.dependencies || {
      dependsOn: [],
      blocks: [],
    };
  const availablePredecessors = (projectData?.tasks || []).filter(
    (candidate) => candidate._id !== task?._id,
  );
  const blockingPredecessors = useMemo(
    () =>
      (allDependencies.dependsOn || []).filter(
        (item) => item.task && item.task.stage !== "completed",
      ),
    [allDependencies],
  );
  const canManageDependencies = Boolean(
    user?.isAdmin ||
    user?._id === task?.project?.projectLeader?._id ||
    user?._id === task?.assignee?._id,
  );
  const canManageStatus = Boolean(
    user?.isAdmin ||
    user?._id === task?.project?.projectLeader?._id ||
    user?._id === task?.assignee?._id,
  );

  useEffect(() => {
    if (availablePredecessors.length && !selectedPredecessor) {
      setSelectedPredecessor(availablePredecessors[0]._id);
    }
  }, [availablePredecessors, selectedPredecessor]);

  const formatScheduleDate = (value) =>
    value ? new Date(value).toLocaleDateString() : "Not set";
  const isOverdue = Boolean(
    task?.dueDate &&
    task.stage !== "completed" &&
    new Date() > new Date(task.dueDate),
  );

  const handleAddDependency = async () => {
    if (!selectedPredecessor) {
      toast.error("Select a predecessor task first.");
      return;
    }

    try {
      const response = await addTaskDependency({
        id,
        predecessorTask: selectedPredecessor,
        dependencyType: "FS",
      }).unwrap();
      toast.success(response?.message || "Dependency added.");
      setSelectedPredecessor("");
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || "Unable to add dependency.");
    }
  };

  const handleRemoveDependency = async (dependencyId) => {
    try {
      const response = await removeTaskDependency({
        id,
        dependencyId,
      }).unwrap();
      toast.success(response?.message || "Dependency removed.");
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || "Unable to remove dependency.");
    }
  };

  const handleStatusAction = async (nextStage) => {
    if (!canManageStatus) {
      toast.error("You are not authorized to update this task.");
      return;
    }

    const actionType = nextStage === "in progress" ? "started" : "completed";

    try {
      const response = await postTaskActivity({
        id,
        type: actionType,
        activity:
          actionType === "started" ? "Task started." : "Task completed.",
      }).unwrap();
      toast.success(response?.message || "Task status updated.");
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || "Unable to update task status.");
    }
  };

  if (isLoading) {
    return (
      <div className="py-10">
        <Loading />
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="w-full py-10 text-center text-red-500">
        Task not found or failed to load.
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3 mb-4 overflow-y-hidden">
      <h1 className="text-2xl text-gray-600 font-bold">{task?.title}</h1>

      <Tabs tabs={TABS} setSelected={setSelected}>
        {selected === 0 ? (
          <>
            <div className="w-full flex flex-col md:flex-row gap-5 2xl:gap-8 bg-white shadow-md p-8 overflow-y-auto">
              <div className="w-full md:w-1/2 space-y-8">
                <div className="flex items-center gap-5">
                  <div
                    className={clsx(
                      "flex gap-1 items-center text-base font-semibold px-3 py-1 rounded-full",
                      PRIOTITYSTYELS[task?.priority],
                      bgColor[task?.priority],
                    )}
                  >
                    <span className="text-lg">{ICONS[task?.priority]}</span>
                    <span className="uppercase">{task?.priority} Priority</span>
                  </div>

                  <div className={clsx("flex items-center gap-2")}>
                    <div
                      className={clsx(
                        "w-4 h-4 rounded-full",
                        TASK_TYPE[task.stage],
                      )}
                    />
                    <span className="text-black uppercase">{task?.stage}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-indigo-700">Status</p>
                    <span className="text-xs font-bold uppercase text-indigo-600">
                      {task.stage}
                    </span>
                  </div>

                  <div className="mt-3 space-y-3">
                    {task.stage === "todo" && (
                      <>
                        {blockingPredecessors.length > 0 ? (
                          <p className="text-sm text-red-600">
                            Blocked by:{" "}
                            {blockingPredecessors
                              .map((item) => item.task.title)
                              .join(", ")}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-700">
                            Complete all prerequisite tasks before starting this
                            task.
                          </p>
                        )}
                        <Button
                          type="button"
                          label={
                            isStatusUpdating ? "Starting..." : "Start Task"
                          }
                          onClick={() => handleStatusAction("in progress")}
                          className="bg-indigo-600 text-white"
                          disabled={
                            !canManageStatus ||
                            blockingPredecessors.length > 0 ||
                            isStatusUpdating
                          }
                        />
                      </>
                    )}

                    {task.stage === "in progress" && (
                      <>
                        <p className="text-sm text-gray-700">
                          This task is active. Finish the task when ready.
                        </p>
                        <Button
                          type="button"
                          label={
                            isStatusUpdating ? "Completing..." : "Complete Task"
                          }
                          onClick={() => handleStatusAction("completed")}
                          className="bg-green-600 text-white"
                          disabled={!canManageStatus || isStatusUpdating}
                        />
                      </>
                    )}

                    {task.stage === "completed" && (
                      <p className="text-sm text-green-700">
                        This task is completed and no reopen action is
                        available.
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-gray-500">
                  Created At:{" "}
                  {new Date(task?.date || Date.now()).toDateString()}
                </p>

                <div className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-700">Schedule</p>
                    {isOverdue && (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold uppercase text-red-700">
                        Overdue
                      </span>
                    )}
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-gray-500">Planned Start</dt>
                      <dd className="font-semibold">
                        {formatScheduleDate(task.plannedStartDate)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Due Date</dt>
                      <dd className="font-semibold">
                        {formatScheduleDate(task.dueDate)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Estimated Duration</dt>
                      <dd className="font-semibold">
                        {task.estimatedDuration
                          ? `${task.estimatedDuration} working days`
                          : "Not set"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Actual Start</dt>
                      <dd className="font-semibold">
                        {formatScheduleDate(task.actualStartDate)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Actual Completion</dt>
                      <dd className="font-semibold">
                        {formatScheduleDate(task.actualCompletionDate)}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="flex items-center gap-8 p-4 border-y border-gray-200">
                  <div className="space-x-2">
                    <span className="font-semibold">Assets :</span>
                    <span>{task?.assets?.length}</span>
                  </div>

                  <span className="text-gray-400">|</span>

                  <div className="space-x-2">
                    <span className="font-semibold">Sub-Task :</span>
                    <span>{task?.subTasks?.length}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-indigo-700">
                      Dependency Overview
                    </p>
                    <span className="text-xs font-bold uppercase text-indigo-600">
                      {allDependencies.dependsOn?.length || 0} Depends On ·{" "}
                      {allDependencies.blocks?.length || 0} Blocks
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-sm font-semibold text-gray-700">
                        Depends On
                      </p>
                      <div className="space-y-2">
                        {allDependencies.dependsOn?.length ? (
                          allDependencies.dependsOn.map((item) => (
                            <div
                              key={item._id}
                              className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"
                            >
                              <span>{item.task?.title || "Task"}</span>
                              {canManageDependencies && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveDependency(item._id)
                                  }
                                  className="text-xs font-semibold text-red-600"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">
                            No prerequisite tasks.
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-semibold text-gray-700">
                        Blocks
                      </p>
                      <div className="space-y-2">
                        {allDependencies.blocks?.length ? (
                          allDependencies.blocks.map((item) => (
                            <div
                              key={item._id}
                              className="rounded-lg bg-white px-3 py-2 text-sm"
                            >
                              {item.task?.title || "Task"}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">
                            No waiting tasks.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {canManageDependencies && projectData?.tasks?.length > 1 && (
                    <div className="mt-4 rounded-lg border border-indigo-200 bg-white p-3">
                      <p className="mb-2 text-sm font-semibold text-gray-700">
                        Add Dependency
                      </p>
                      <div className="flex flex-col gap-3 md:flex-row md:items-center">
                        <select
                          value={selectedPredecessor}
                          onChange={(event) =>
                            setSelectedPredecessor(event.target.value)
                          }
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        >
                          <option value="">Select predecessor task</option>
                          {availablePredecessors.map((candidate) => (
                            <option key={candidate._id} value={candidate._id}>
                              {candidate.title}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          label={
                            isAddingDependency ? "Adding..." : "Add Dependency"
                          }
                          onClick={handleAddDependency}
                          className="bg-indigo-600 text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4 py-6">
                  <p className="text-gray-600 font-semibold test-sm">
                    RESPONSIBLE ASSIGNEE
                  </p>
                  <div className="space-y-3">
                    {task?.assignee &&
                      [task.assignee].map((m, index) => (
                        <div
                          key={index}
                          className="flex gap-4 py-2 items-center border-t border-gray-200"
                        >
                          <div
                            className={
                              "w-10 h-10 rounded-full text-white flex items-center justify-center text-sm -mr-1 bg-blue-600"
                            }
                          >
                            <span className="text-center">
                              {getInitials(m?.name)}
                            </span>
                          </div>

                          <div>
                            <p className="text-lg font-semibold">{m?.name}</p>
                            <span className="text-gray-500">{m?.title}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="space-y-4 py-6">
                  <p className="text-gray-500 font-semibold text-sm">
                    SUB-TASKS
                  </p>
                  <div className="space-y-8">
                    {task?.subTasks?.map((el, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-violet-50-200">
                          <MdTaskAlt className="text-violet-600" size={26} />
                        </div>

                        <div className="space-y-1">
                          <div className="flex gap-2 items-center">
                            <span className="text-sm text-gray-500">
                              {new Date(el?.date).toDateString()}
                            </span>

                            <span className="px-2 py-0.5 text-center text-sm rounded-full bg-violet-100 text-violet-700 font-semibold">
                              {el?.tag}
                            </span>
                          </div>

                          <p className="text-gray-700">{el?.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="w-full md:w-1/2 space-y-8">
                <p className="text-lg font-semibold">ASSETS</p>

                <div className="w-full grid grid-cols-2 gap-4">
                  {task?.assets?.map((el, index) => (
                    <img
                      key={index}
                      src={el}
                      alt={task?.title}
                      className="w-full rounded h-28 md:h-36 2xl:h-52 cursor-pointer transition-all duration-700 hover:scale-125 hover:z-50"
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <Activities activity={task?.activities} id={id} />
        )}
      </Tabs>
    </div>
  );
};

const Activities = ({ activity, id }) => {
  const [selected, setSelected] = useState("Commented");
  const [text, setText] = useState("");
  const [postTaskActivity, { isLoading }] = usePostTaskActivityMutation();

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Please enter activity text.");
      return;
    }

    try {
      const response = await postTaskActivity({
        id,
        type: selected.toLowerCase(),
        activity: trimmed,
      }).unwrap();

      toast.success(response?.message || "Activity added.");
      setText("");
      setSelected("Commented");
    } catch (error) {
      console.error(error);
      toast.error(error?.data?.message || "Failed to add activity.");
    }
  };

  const Card = ({ item }) => {
    return (
      <div className="flex space-x-4">
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="w-10 h-10 flex items-center justify-center">
            {TASKTYPEICON[item?.type]}
          </div>
          <div className="w-full flex items-center">
            <div className="w-0.5 bg-gray-300 h-full"></div>
          </div>
        </div>

        <div className="flex flex-col gap-y-1 mb-8">
          <p className="font-semibold">{item?.by?.name}</p>
          <div className="text-gray-500 space-y-2">
            <span className="capitalize">{item?.type}</span>
            <span className="text-sm">{moment(item?.date).fromNow()}</span>
          </div>
          <div className="text-gray-700">{item?.activity}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex gap-10 2xl:gap-20 min-h-screen px-10 py-8 bg-white shadow rounded-md justify-between overflow-y-auto">
      <div className="w-full md:w-1/2">
        <h4 className="text-gray-600 font-semibold text-lg mb-5">Activities</h4>

        <div className="w-full">
          {activity?.map((el, index) => (
            <Card
              key={index}
              item={el}
              isConnected={index < activity.length - 1}
            />
          ))}
        </div>
      </div>

      <div className="w-full md:w-1/3">
        <h4 className="text-gray-600 font-semibold text-lg mb-5">
          Add Activity
        </h4>
        <div className="w-full flex flex-wrap gap-5">
          {act_types.map((item) => (
            <div key={item} className="flex gap-2 items-center">
              <input
                type="radio"
                name="activity-type"
                className="w-4 h-4"
                checked={selected === item}
                onChange={() => setSelected(item)}
              />
              <p>{item}</p>
            </div>
          ))}
          <textarea
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a project update or comment..."
            className="bg-white w-full mt-4 border border-gray-300 outline-none p-4 rounded-md focus:ring-2 ring-blue-500"
          />
          {isLoading ? (
            <Loading />
          ) : (
            <Button
              type="button"
              label="Post"
              onClick={handleSubmit}
              className="bg-blue-600 text-white rounded"
              disabled={!text.trim()}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetails;
