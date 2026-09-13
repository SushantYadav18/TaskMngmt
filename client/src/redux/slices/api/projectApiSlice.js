import { apiSlice } from "../apiSlice";

const PROJECT_URL = "/project";

export const projectApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query({
      query: () => ({
        url: PROJECT_URL,
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Project"],
    }),
    getProjectById: builder.query({
      query: (id) => ({
        url: `${PROJECT_URL}/${id}`,
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Project", "Task"],
    }),
    getProjectDependencyOrder: builder.query({
      query: (id) => ({
        url: `${PROJECT_URL}/${id}/dependency-order`,
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Project", "Task"],
    }),
    getProjectCpm: builder.query({
      query: (id) => ({
        url: `${PROJECT_URL}/${id}/cpm`,
        method: "GET",
        credentials: "include",
      }),
      providesTags: ["Project", "Task"],
    }),
    createProject: builder.mutation({
      query: (data) => ({
        url: PROJECT_URL,
        method: "POST",
        body: data,
        credentials: "include",
      }),
      invalidatesTags: ["Project", "Task"],
    }),
    updateProject: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${PROJECT_URL}/${id}`,
        method: "PUT",
        body: data,
        credentials: "include",
      }),
      invalidatesTags: ["Project", "Task"],
    }),
    archiveProject: builder.mutation({
      query: (id) => ({
        url: `${PROJECT_URL}/${id}`,
        method: "DELETE",
        credentials: "include",
      }),
      invalidatesTags: ["Project", "Task"],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectByIdQuery,
  useGetProjectDependencyOrderQuery,
  useGetProjectCpmQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useArchiveProjectMutation,
} = projectApiSlice;
