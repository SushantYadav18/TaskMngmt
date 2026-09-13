import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useGetProjectCpmQuery,
  useGetProjectDependencyOrderQuery,
} from "../redux/slices/api/projectApiSlice";
import Loading from "../components/Loader";
import Title from "../components/Title";

const formatNumber = (value) =>
  Number.isInteger(value) ? value : Number(value).toFixed(2);

const SchedulingAnalysis = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    data: cpmData,
    isLoading: isCpmLoading,
    isError: isCpmError,
    error: cpmError,
  } = useGetProjectCpmQuery(id, { skip: !id });
  const {
    data: orderData,
    isLoading: isOrderLoading,
    isError: isOrderError,
  } = useGetProjectDependencyOrderQuery(id, { skip: !id });

  if (isCpmLoading || isOrderLoading) {
    return (
      <div className="py-10">
        <Loading />
      </div>
    );
  }

  if (isCpmError || isOrderError || !cpmData) {
    return (
      <div className="surface-card p-8 text-center">
        <p className="text-lg font-bold text-gray-900">
          Scheduling analysis is unavailable.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          {cpmError?.data?.message ||
            "The project could not be loaded or you are not authorized to view it."}
        </p>
        <button
          type="button"
          onClick={() => navigate(`/projects/${id}`)}
          className="mt-5 font-semibold text-indigo-600"
        >
          Return to project
        </button>
      </div>
    );
  }

  const scheduledTasks = cpmData.tasks || [];
  const dependencies = cpmData.dependencies || [];
  const taskById = new Map(
    scheduledTasks.map((item) => [String(item.taskId), item]),
  );
  const taskTitle = (taskId) =>
    taskById.get(String(taskId))?.task?.title || "Unknown task";
  const criticalPaths = cpmData.criticalPaths?.length
    ? cpmData.criticalPaths
    : cpmData.criticalPath?.length
      ? [cpmData.criticalPath]
      : [];
  const blockedTasks = scheduledTasks.filter((item) =>
    dependencies.some(
      (dependency) =>
        dependency.successorTask === item.taskId &&
        taskById.get(dependency.predecessorTask)?.task?.stage !== "completed",
    ),
  );
  const overdueTasks = scheduledTasks.filter(
    (item) =>
      item.task?.dueDate &&
      item.task.stage !== "completed" &&
      new Date(item.task.dueDate) < new Date(),
  );

  return (
    <div className="w-full space-y-6">
      <div>
        <button
          type="button"
          onClick={() => navigate(`/projects/${id}`)}
          className="mb-4 text-sm font-semibold text-indigo-600"
        >
          Back to project
        </button>
        <Title title="Scheduling Analysis" />
        <p className="mt-2 text-gray-500">
          {cpmData.project?.name || "Project"} · dependency-aware CPM results
        </p>
      </div>

      {!scheduledTasks.length ? (
        <section className="surface-card p-8 text-center">
          <h2 className="font-bold text-gray-900">
            No tasks available for scheduling analysis.
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Add an active project task with an estimated duration to calculate a
            schedule.
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="surface-card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Project duration
              </p>
              <p className="mt-2 text-3xl font-extrabold text-indigo-700">
                {formatNumber(cpmData.projectDuration)} days
              </p>
            </div>
            <div className="surface-card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Total tasks
              </p>
              <p className="mt-2 text-3xl font-extrabold text-gray-900">
                {scheduledTasks.length}
              </p>
            </div>
            <div className="surface-card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Critical tasks
              </p>
              <p className="mt-2 text-3xl font-extrabold text-rose-700">
                {cpmData.criticalTasks?.length || 0}
              </p>
            </div>
            <div className="surface-card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Dependencies
              </p>
              <p className="mt-2 text-3xl font-extrabold text-gray-900">
                {dependencies.length}
              </p>
            </div>
          </section>

          <section className="surface-card p-5 md:p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="page-kicker">CPM schedule</p>
                <h2 className="mt-1 text-xl font-bold">Task schedule</h2>
              </div>
              <p className="text-sm text-gray-500">
                Durations use the project&apos;s estimated working-day unit.
              </p>
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-[850px] w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-3">Task</th>
                    <th className="px-3 py-3">Duration</th>
                    <th className="px-3 py-3">ES</th>
                    <th className="px-3 py-3">EF</th>
                    <th className="px-3 py-3">LS</th>
                    <th className="px-3 py-3">LF</th>
                    <th className="px-3 py-3">Slack</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledTasks.map((item) => (
                    <tr
                      key={item.taskId}
                      className={
                        item.isCritical
                          ? "border-b border-rose-100 bg-rose-50/70"
                          : "border-b border-gray-100"
                      }
                    >
                      <td className="px-3 py-4">
                        <p className="font-semibold text-gray-900">
                          {item.task?.title}
                        </p>
                        <p className="text-xs uppercase text-gray-500">
                          {item.task?.stage}
                        </p>
                      </td>
                      <td className="px-3 py-4">
                        {formatNumber(item.duration)}
                      </td>
                      <td className="px-3 py-4">
                        {formatNumber(item.earliestStart)}
                      </td>
                      <td className="px-3 py-4">
                        {formatNumber(item.earliestFinish)}
                      </td>
                      <td className="px-3 py-4">
                        {formatNumber(item.latestStart)}
                      </td>
                      <td className="px-3 py-4">
                        {formatNumber(item.latestFinish)}
                      </td>
                      <td className="px-3 py-4 font-semibold">
                        {formatNumber(item.slack)}
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                            item.isCritical
                              ? "bg-rose-100 text-rose-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {item.isCritical ? "Critical" : "Flexible"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="surface-card p-5 md:p-6">
              <p className="page-kicker">Session 4 result</p>
              <h2 className="mt-1 text-xl font-bold">
                Recommended dependency order
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                This is a dependency-respecting order, not a strict sequential
                schedule.
              </p>
              {!dependencies.length && (
                <p className="mt-5 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
                  This project currently has no dependency relationships.
                </p>
              )}
              <ol className="mt-5 space-y-2">
                {(orderData?.order || []).map((item) => (
                  <li
                    key={item.task._id}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-3"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                      {item.order}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {item.task.title}
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="surface-card p-5 md:p-6">
              <p className="page-kicker">CPM result</p>
              <h2 className="mt-1 text-xl font-bold">Critical path</h2>
              {!criticalPaths.length ? (
                <p className="mt-5 text-sm text-gray-500">
                  No critical path is available for this project.
                </p>
              ) : (
                <div className="mt-5 space-y-4">
                  {criticalPaths.map((path, pathIndex) => (
                    <div key={path.join("-")}>
                      {criticalPaths.length > 1 && (
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-rose-600">
                          Critical path {pathIndex + 1}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        {path.map((taskId, index) => (
                          <React.Fragment key={taskId}>
                            <span className="rounded-lg bg-rose-100 px-3 py-2 text-sm font-bold text-rose-800">
                              {taskTitle(taskId)}
                            </span>
                            {index < path.length - 1 && (
                              <span
                                className="text-gray-400"
                                aria-hidden="true"
                              >
                                →
                              </span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="surface-card p-5 md:p-6">
              <p className="page-kicker">Relationships</p>
              <h2 className="mt-1 text-xl font-bold">Dependency overview</h2>
              {!dependencies.length ? (
                <p className="mt-5 text-sm text-gray-500">
                  Add dependencies to see predecessor and successor
                  relationships here.
                </p>
              ) : (
                <div className="mt-5 space-y-2">
                  {dependencies.map((dependency) => (
                    <div
                      key={`${dependency.predecessorTask}-${dependency.successorTask}`}
                      className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-3 text-sm"
                    >
                      <span className="font-semibold text-gray-900">
                        {taskTitle(dependency.predecessorTask)}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="font-semibold text-gray-900">
                        {taskTitle(dependency.successorTask)}
                      </span>
                      <span className="ml-auto text-xs font-bold uppercase text-gray-400">
                        {dependency.dependencyType}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="surface-card p-5 md:p-6">
              <p className="page-kicker">Attention</p>
              <h2 className="mt-1 text-xl font-bold">Scheduling warnings</h2>
              <div className="mt-5 space-y-2 text-sm">
                {!blockedTasks.length && !overdueTasks.length && (
                  <p className="rounded-xl bg-emerald-50 p-4 text-emerald-700">
                    No blocked or overdue tasks reported for this project.
                  </p>
                )}
                {blockedTasks.map((item) => (
                  <p
                    key={`blocked-${item.taskId}`}
                    className="rounded-xl bg-amber-50 p-4 text-amber-800"
                  >
                    <strong>{item.task?.title}</strong> has an incomplete
                    predecessor.
                  </p>
                ))}
                {overdueTasks.map((item) => (
                  <p
                    key={`overdue-${item.taskId}`}
                    className="rounded-xl bg-red-50 p-4 text-red-700"
                  >
                    <strong>{item.task?.title}</strong> is overdue.
                  </p>
                ))}
                {scheduledTasks.filter((item) => item.isCritical).length >
                  0 && (
                  <p className="rounded-xl bg-rose-50 p-4 text-rose-700">
                    {scheduledTasks.filter((item) => item.isCritical).length}{" "}
                    task(s) have zero slack and are critical.
                  </p>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default SchedulingAnalysis;
