import React, { useEffect, useState } from "react";
import { Dialog } from "@headlessui/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import ModalWrapper from "../ModalWrapper";
import Textbox from "../Textbox";
import UserList from "./UserList";
import SelectList from "../SelectList";
import { BiImages } from "react-icons/bi";
import Button from "../Button";
import {
  useDelegateTaskMutation,
  useCreateTaskMutation,
  useUpdateTaskMutation,
} from "../../redux/slices/api/taskApiSlice";

const LISTS = ["TODO", "IN PROGRESS", "COMPLETED"];
const PRIORIRY = ["HIGH", "MEDIUM", "NORMAL", "LOW"];

const AddTask = ({ open, setOpen, task, project }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const [assignee, setAssignee] = useState(
    task?.assignee?._id || task?.assignee || "",
  );
  const [stage, setStage] = useState(task?.stage?.toUpperCase() || LISTS[0]);
  const [priority, setPriority] = useState(
    task?.priority?.toUpperCase() || PRIORIRY[2],
  );
  const [assets, setAssets] = useState(task?.assets || []);
  const [uploading, setUploading] = useState(false);
  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
  const [delegateTask, { isLoading: isDelegating }] = useDelegateTaskMutation();

  useEffect(() => {
    if (task) {
      reset({
        title: task.title || "",
        date: task.date ? new Date(task.date).toISOString().slice(0, 10) : "",
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
      setAssets(task.assets || []);
    } else {
      reset({
        title: "",
        date: "",
        plannedStartDate: "",
        dueDate: "",
        estimatedDuration: "",
      });
      setAssignee("");
      setStage(LISTS[0]);
      setPriority(PRIORIRY[2]);
      setAssets([]);
    }
  }, [task, reset]);

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
        date: data.date,
        priority: priority.toLowerCase(),
        assets,
        plannedStartDate: data.plannedStartDate || null,
        dueDate: data.dueDate || null,
        estimatedDuration: data.estimatedDuration
          ? Number(data.estimatedDuration)
          : null,
      };

      const response = task
        ? await Promise.all([
            updateTask({ id: task._id, ...payload }).unwrap(),
            assignee !== (task.assignee?._id || task.assignee)
              ? delegateTask({ id: task._id, assignee }).unwrap()
              : Promise.resolve(null),
          ]).then(
            ([updateResponse, delegateResponse]) =>
              delegateResponse || updateResponse,
          )
        : await createTask(payload).unwrap();

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

  const handleSelect = (e) => {
    setAssets(Array.from(e.target.files || []).map((file) => file.name));
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
              />
              <Textbox
                placeholder="Due date"
                type="date"
                name="dueDate"
                label="Due Date"
                className="w-full rounded"
                register={register("dueDate")}
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
                  label="Task Date"
                  className="w-full rounded"
                  register={register("date", {
                    required: "Date is required!",
                  })}
                  error={errors.date ? errors.date.message : ""}
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

              <div className="w-full flex items-center justify-center mt-4">
                <label
                  className="flex items-center gap-1 text-base text-ascent-2 hover:text-ascent-1 cursor-pointer my-4"
                  htmlFor="imgUpload"
                >
                  <input
                    type="file"
                    className="hidden"
                    id="imgUpload"
                    onChange={(e) => handleSelect(e)}
                    accept=".jpg, .png, .jpeg"
                    multiple={true}
                  />
                  <BiImages />
                  <span>Add Assets</span>
                </label>
              </div>
            </div>

            <div className="bg-gray-50 py-6 sm:flex sm:flex-row-reverse gap-4">
              {uploading || isCreating || isUpdating || isDelegating ? (
                <span className="text-sm py-2 text-red-500">
                  {isCreating
                    ? "Creating task..."
                    : isUpdating || isDelegating
                      ? "Updating task..."
                      : "Uploading assets"}
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
