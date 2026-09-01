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
      invalidatesTags: ["Task"],
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
      invalidatesTags: ["Task"],
    }),

    deleteRestoreTask: builder.mutation({
      query: ({ id, actionType }) => ({
        url: `${TASK_URL}/delete-restore/${id || ""}`,
        method: "DELETE",
        params: { actionType },
        credentials: "include",
      }),
      invalidatesTags: ["Task"],
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
  useUpdateTaskMutation,
  useTrashTaskMutation,
  useDeleteRestoreTaskMutation,
  useDuplicateTaskMutation,
  useAddSubTaskMutation,
  usePostTaskActivityMutation,
} = taskApiSlice;
