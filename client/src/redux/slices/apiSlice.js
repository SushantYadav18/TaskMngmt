import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// const API_URI = "http://localhost:8800/api";
const API_URI = import.meta.env.VITE_APP_BASE_URL;
const baseUrl = API_URI ? `${API_URI}/api` : "/api";

const baseQuery = fetchBaseQuery({ baseUrl });

export const apiSlice = createApi({
  baseQuery,
  tagTypes: ["Task", "Team", "User", "Project"],
  endpoints: (builder) => ({}),
});
export const { usePrefetch } = apiSlice;
