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
import {
  TASK_KEYWORD_DEFINITIONS,
  TASK_LEVEL_OPTIONS,
  TASK_ROLE_MATCH_OPTIONS,
  getEligibleProjectMembers,
  getTaskRequiredTechnicalRoles,
} from "../../utils/taskAccessConfig";
import { validateTaskTitle } from "../../utils/validation";

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
  const [keywords, setKeywords] = useState(task?.keywords || []);
  const [keywordError, setKeywordError] = useState("");
  const [requiredLevel, setRequiredLevel] = useState(
    task?.requiredLevel || "JUNIOR",
  );
  const [roleMatchMode, setRoleMatchMode] = useState(
    task?.roleMatchMode || "ANY",
  );
  const [exactLevelOnly, setExactLevelOnly] = useState(
    Boolean(task?.exactLevelOnly),
  );
  const [stage, setStage] = useState(task?.stage?.toUpperCase() || LISTS[0]);
  const [priority, setPriority] = useState(
    task?.priority?.toUpperCase() || PRIORIRY[2],
  );
  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
  const [updateTask, { isLoading: isUpdating }] = useUpdateTaskMutation();
  const [delegateTask, { isLoading: isDelegating }] = useDelegateTaskMutation();
  const requiredTechnicalRoles = getTaskRequiredTechnicalRoles(keywords, {
    roleMatchMode,
  });
  const eligibleProjectMembers = project
    ? getEligibleProjectMembers({
        project,
        task: {
          keywords,
          requiredLevel,
          exactLevelOnly,
          roleMatchMode,
        },
      })
    : [];
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
        description: task.description || "",
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
      setKeywords(task.keywords || []);
      setKeywordError("");
      setRequiredLevel(task.requiredLevel || "JUNIOR");
      setRoleMatchMode(task.roleMatchMode || "ANY");
      setExactLevelOnly(Boolean(task.exactLevelOnly));
      setStage(task.stage?.toUpperCase() || LISTS[0]);
      setPriority(task.priority?.toUpperCase() || PRIORIRY[2]);
    } else {
      reset({
        title: "",
        description: "",
        date: minDate,
        plannedStartDate: "",
        dueDate: "",
        estimatedDuration: "",
      });
      setAssignee("");
      setKeywords([]);
      setKeywordError("");
      setRequiredLevel("JUNIOR");
      setRoleMatchMode("ANY");
      setExactLevelOnly(false);
      setStage(LISTS[0]);
      setPriority(PRIORIRY[2]);
    }
  }, [task, reset, open, assignmentDate, minDate]);

  const submitHandler = async (data) => {
    try {
      if (!keywords.length) {
        setKeywordError("Select at least one keyword.");
        return;
      }

      const titleValidation = validateTaskTitle(data.title);
      if (!titleValidation.valid) {
        toast.error(titleValidation.message);
        return;
      }

      if (!assignee) {
        toast.error("Please select an eligible assignee.");
        return;
      }

      const payload = {
        title: data.title.trim(),
        description: data.description || "",
        keywords,
        requiredTechnicalRoles: requiredTechnicalRoles,
        requiredLevel,
        exactLevelOnly,
        roleMatchMode,
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
            <fieldset
              aria-describedby={keywordError ? "task-keyword-error" : undefined}
              className="sticky top-0 z-10 -mx-5 space-y-3 border-b border-gray-200 bg-white px-5 pb-3 pt-2 sm:-mx-8 sm:px-8"
            >
              <legend className="text-sm font-semibold text-slate-800">
                Keywords <span className="text-red-600">*</span>
              </legend>
              <p className="text-xs text-gray-500">
                Select one or more keywords for this task.
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(TASK_KEYWORD_DEFINITIONS).map(
                  ([keyword, config]) => {
                    const enabled = keywords.includes(keyword);
                    return (
                      <button
                        key={keyword}
                        type="button"
                        title={config.description}
                        aria-pressed={enabled}
                        onClick={() => {
                          setKeywordError("");
                          setKeywords((current) =>
                            current.includes(keyword)
                              ? current.filter((item) => item !== keyword)
                              : [...current, keyword],
                          );
                        }}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          enabled
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:border-indigo-300"
                        }`}
                      >
                        {config.label}
                      </button>
                    );
                  },
                )}
              </div>
              {requiredTechnicalRoles.length > 0 && (
                <p className="text-sm text-indigo-700">
                  Required Role: {requiredTechnicalRoles.join(" / ")}
                </p>
              )}
              {keywordError && (
                <p
                  id="task-keyword-error"
                  role="alert"
                  className="text-sm text-red-600"
                >
                  {keywordError}
                </p>
              )}
            </fieldset>

            <Textbox
              placeholder="Task Title"
              type="text"
              name="title"
              label="Task Title"
              className="w-full rounded"
              register={register("title", {
                required: "Title is required",
                validate: (value) => {
                  const result = validateTaskTitle(value);
                  return result.valid || result.message;
                },
              })}
              error={errors.title ? errors.title.message : ""}
            />

            <div>
              <label className="text-sm font-semibold text-slate-800">
                Description
              </label>
              <textarea
                name="description"
                placeholder="Describe the task..."
                rows={4}
                {...register("description")}
                className="mt-2 w-full rounded-2xl border border-gray-300 bg-transparent px-4 py-3.5 text-base text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <UserList
              setAssignee={setAssignee}
              assignee={assignee}
              project={project}
              eligibleUsers={eligibleProjectMembers}
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

            <div className="grid gap-4 md:grid-cols-2">
              <SelectList
                label="Priority Level"
                lists={PRIORIRY}
                selected={priority}
                setSelected={setPriority}
              />
              <SelectList
                label="Task Level"
                lists={TASK_LEVEL_OPTIONS}
                selected={requiredLevel}
                setSelected={setRequiredLevel}
              />
            </div>

            <SelectList
              label="Role Match"
              lists={TASK_ROLE_MATCH_OPTIONS}
              selected={roleMatchMode}
              setSelected={setRoleMatchMode}
            />

            <div className="flex items-center rounded border border-gray-300 bg-white p-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={exactLevelOnly}
                  onChange={(event) => setExactLevelOnly(event.target.checked)}
                />
                Exact level only
              </label>
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
