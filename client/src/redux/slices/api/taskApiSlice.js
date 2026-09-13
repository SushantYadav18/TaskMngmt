import { apiSlice } from "../apiSlice";

const TASK_URL = "/task";

export const taskApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardStats: builder.query({
      query: () => ({
        url: `${TASK_URL}/dashboard`,
        method: "GET",
        credentials: "include",
      }),
    }),

    getTasks: builder.query({
      query: ({ stage, isTrashed = false } = {}) => ({
        url: TASK_URL,
        method: "GET",
        params: {
          ...(stage ? { stage } : {}),
          ...(isTrashed === undefined ? {} : { isTrashed: Boolean(isTrashed) }),
        },
        credentials: "include",
      }),
      providesTags: ["Task"],
    }),

    getTaskById: builder.query({
      query: (id) => ({
        url: `${TASK_URL}/${id}`,
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Task"],
    }),

    createTask: builder.mutation({
      query: (data) => ({
        url: `${TASK_URL}/create`,
        method: "POST",
        body: data,
        credentials: "include",
      }),
      invalidatesTags: ["Task", "Project"],
    }),

    delegateTask: builder.mutation({
      query: ({ id, assignee }) => ({
        url: `${TASK_URL}/delegate/${id}`,
        method: "POST",
        body: { assignee },
        credentials: "include",
      }),
      invalidatesTags: ["Task", "Project"],
    }),

    updateTask: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${TASK_URL}/update/${id}`,
        method: "PUT",
        body: data,
        credentials: "include",
      }),
      invalidatesTags: ["Task"],
    }),

    trashTask: builder.mutation({
      query: (id) => ({
        url: `${TASK_URL}/${id}`,
        method: "PUT",
        credentials: "include",
      }),
      invalidatesTags: ["Task", "Project"],
    }),

    deleteRestoreTask: builder.mutation({
      query: ({ id, actionType }) => ({
        url: `${TASK_URL}/delete-restore/${id || ""}`,
        method: "DELETE",
        params: { actionType },
        credentials: "include",
      }),
      invalidatesTags: ["Task", "Project"],
    }),

    duplicateTask: builder.mutation({
      query: (id) => ({
        url: `${TASK_URL}/duplicate/${id}`,
        method: "POST",
        credentials: "include",
      }),
      invalidatesTags: ["Task"],
    }),

    addSubTask: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${TASK_URL}/create-subtask/${id}`,
        method: "PUT",
        body: data,
        credentials: "include",
      }),
      invalidatesTags: ["Task"],
    }),

    updateSubTask: builder.mutation({
      query: ({ id, subtaskId, completed }) => ({
        url: `${TASK_URL}/${id}/subtasks/${subtaskId}`,
        method: "PUT",
        body: { completed },
        credentials: "include",
      }),
      invalidatesTags: ["Task", "Project"],
    }),

    getTaskDependencies: builder.query({
      query: (id) => ({
        url: `${TASK_URL}/${id}/dependencies`,
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Task"],
    }),

    addTaskDependency: builder.mutation({
      query: ({ id, predecessorTask, dependencyType = "FS" }) => ({
        url: `${TASK_URL}/${id}/dependencies`,
        method: "POST",
        body: { predecessorTask, dependencyType },
        credentials: "include",
      }),
      invalidatesTags: ["Task"],
    }),

    removeTaskDependency: builder.mutation({
      query: ({ id, dependencyId }) => ({
        url: `${TASK_URL}/${id}/dependencies/${dependencyId}`,
        method: "DELETE",
        credentials: "include",
      }),
      invalidatesTags: ["Task"],
    }),

    postTaskActivity: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${TASK_URL}/activity/${id}`,
        method: "POST",
        body: data,
        credentials: "include",
      }),
      invalidatesTags: ["Task"],
    }),
  }),
});

export const {
  useGetDashboardStatsQuery,
  useGetTasksQuery,
  useGetTaskByIdQuery,
  useCreateTaskMutation,
  useDelegateTaskMutation,
  useUpdateTaskMutation,
  useTrashTaskMutation,
  useDeleteRestoreTaskMutation,
  useDuplicateTaskMutation,
  useAddSubTaskMutation,
  useUpdateSubTaskMutation,
  useGetTaskDependenciesQuery,
  useAddTaskDependencyMutation,
  useRemoveTaskDependencyMutation,
  usePostTaskActivityMutation,
} = taskApiSlice;
