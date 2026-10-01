import React, { useEffect, useState } from "react";
import { Dialog } from "@headlessui/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import ModalWrapper from "../ModalWrapper";
import Textbox from "../Textbox";
import UserList from "./UserList";
import SelectList from "../SelectList";
import Button from "../Button";
import {
  useDelegateTaskMutation,
  useCreateTaskMutation,
  useUpdateTaskMutation,
} from "../../redux/slices/api/taskApiSlice";
import { useGetProjectWorkloadQuery } from "../../redux/slices/api/projectApiSlice";

const LISTS = ["TODO", "IN PROGRESS", "COMPLETED"];
const PRIORIRY = ["HIGH", "MEDIUM", "NORMAL", "LOW"];

const getTodayInputValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateInputValue = (value) => {
  if (!value) return getTodayInputValue();
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const AddTask = ({ open, setOpen, task, project }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const minDate = getTodayInputValue();
  const assignmentDate = task?.date ? getDateInputValue(task.date) : minDate;
  const [assignee, setAssignee] = useState(
    task?.assignee?._id || task?.assignee || "",
  );
  const [stage, setStage] = useState(task?.stage?.toUpperCase() || LISTS[0]);
  const [priority, setPriority] = useState(
    task?.priority?.toUpperCase() || PRIORIRY[2],
  );
  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
  const [delegateTask, { isLoading: isDelegating }] = useDelegateTaskMutation();
  const { data: workloadData } = useGetProjectWorkloadQuery(
    project
      ? {
          id: project._id || project,
          memberId: assignee,
          priority: priority.toLowerCase(),
        }
      : { id: null, memberId: null, priority: null },
    { skip: !project || !assignee },
  );

  useEffect(() => {
    if (task) {
      reset({
        title: task.title || "",
        date: assignmentDate,
        plannedStartDate: task.plannedStartDate
          ? new Date(task.plannedStartDate).toISOString().slice(0, 10)
          : "",
        dueDate: task.dueDate
          ? new Date(task.dueDate).toISOString().slice(0, 10)
          : "",
        estimatedDuration: task.estimatedDuration || "",
      });
      setAssignee(task.assignee?._id || task.assignee || "");
      setStage(task.stage?.toUpperCase() || LISTS[0]);
      setPriority(task.priority?.toUpperCase() || PRIORIRY[2]);
    } else {
      reset({
        title: "",
        date: minDate,
        plannedStartDate: "",
        dueDate: "",
        estimatedDuration: "",
      });
      setAssignee("");
      setStage(LISTS[0]);
      setPriority(PRIORIRY[2]);
    }
  }, [task, reset, open, assignmentDate, minDate]);

  const submitHandler = async (data) => {
    try {
      if (!assignee) {
        toast.error("Please select an assignee.");
        return;
      }

      const payload = {
        title: data.title,
        assignee,
        ...(project ? { project: project._id || project } : {}),
        stage: stage.toLowerCase(),
        priority: priority.toLowerCase(),
        plannedStartDate: data.plannedStartDate || null,
        dueDate: data.dueDate || null,
        estimatedDuration: data.estimatedDuration
          ? Number(data.estimatedDuration)
          : null,
      };

      let response;
      if (task) {
        response = await updateTask({ id: task._id, ...payload }).unwrap();
        if (assignee !== (task.assignee?._id || task.assignee)) {
          response = await delegateTask({ id: task._id, assignee }).unwrap();
        }
      } else {
        response = await createTask(payload).unwrap();
      }

      toast.success(
        response?.message ||
          (task ? "Task updated successfully." : "Task created successfully."),
      );
      reset();
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(error?.data?.message || "Failed to save task.");
    }
  };

  return (
    <>
      <ModalWrapper open={open} setOpen={setOpen}>
        <form onSubmit={handleSubmit(submitHandler)}>
          <Dialog.Title
            as="h2"
            className="text-base font-bold leading-6 text-gray-900 mb-4"
          >
            {task ? "UPDATE TASK" : "ADD TASK"}
          </Dialog.Title>

          <div className="mt-2 flex flex-col gap-6">
            <Textbox
              placeholder="Task Title"
              type="text"
              name="title"
              label="Task Title"
              className="w-full rounded"
              register={register("title", { required: "Title is required" })}
              error={errors.title ? errors.title.message : ""}
            />

            <UserList
              setAssignee={setAssignee}
              assignee={assignee}
              project={project}
            />

            <div className="grid gap-4 md:grid-cols-3">
              <Textbox
                placeholder="Planned start"
                type="date"
                name="plannedStartDate"
                label="Planned Start"
                className="w-full rounded"
                register={register("plannedStartDate")}
                min={minDate}
              />
              <Textbox
                placeholder="Due date"
                type="date"
                name="dueDate"
                label="Due Date"
                className="w-full rounded"
                register={register("dueDate")}
                min={minDate}
              />
              <Textbox
                placeholder="Working days"
                type="number"
                min="1"
                name="estimatedDuration"
                label="Estimated Duration (working days)"
                className="w-full rounded"
                register={register("estimatedDuration", {
                  min: { value: 1, message: "Duration must be positive." },
                })}
                error={errors.estimatedDuration?.message || ""}
              />
            </div>

            <div className="flex gap-4">
              <SelectList
                label="Task Stage"
                lists={LISTS}
                selected={stage}
                setSelected={setStage}
              />

              <div className="w-full">
                <Textbox
                  placeholder="Date"
                  type="date"
                  name="date"
                  label="Assignment Date"
                  className="w-full rounded"
                  register={register("date")}
                  value={assignmentDate}
                  disabled
                />
              </div>
            </div>

            <div className="flex gap-4">
              <SelectList
                label="Priority Level"
                lists={PRIORIRY}
                selected={priority}
                setSelected={setPriority}
              />
            </div>

            {project && assignee && workloadData?.preview && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-indigo-600">
                  Workload preview
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  <span>
                    Current workload: {workloadData.preview.currentWorkload} /{" "}
                    {workloadData.preview.capacity}
                  </span>
                  <span>
                    New task: {workloadData.preview.addedWorkload} workload
                    points
                  </span>
                  <span>
                    After assignment: {workloadData.preview.afterWorkload} /{" "}
                    {workloadData.preview.capacity}
                  </span>
                  <span>Remaining: {workloadData.preview.remainingAfter}</span>
                </div>
                <p className="mt-2 font-semibold">
                  Status: {workloadData.preview.status}
                </p>
                {!workloadData.preview.allowed && (
                  <p className="mt-2 text-xs font-medium text-red-700">
                    {workloadData.preview.message}
                  </p>
                )}
              </div>
            )}

            <div className="bg-gray-50 py-6 sm:flex sm:flex-row-reverse gap-4">
              {isCreating || isUpdating || isDelegating ? (
                <span className="text-sm py-2 text-red-500">
                  {isCreating ? "Creating task..." : "Updating task..."}
                </span>
              ) : (
                <Button
                  label="Submit"
                  type="submit"
                  className="bg-blue-600 px-8 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"
                />
              )}

              <Button
                type="button"
                className="bg-white px-5 text-sm font-semibold text-gray-900 sm:w-auto"
                onClick={() => setOpen(false)}
                label="Cancel"
              />
            </div>
          </div>
        </form>
      </ModalWrapper>
    </>
  );
};

export default AddTask;
