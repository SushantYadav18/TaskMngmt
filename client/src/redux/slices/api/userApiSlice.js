import { apiSlice } from "../apiSlice";

const USER_URL = "/user";

export const userApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createUser: builder.mutation({
      query: (data) => ({
        url: `${USER_URL}/create`,
        method: "POST",
        body: data,
        credentials: "include",
      }),
    }),

    updateUser: builder.mutation({
      query: (data) => ({
        url: `${USER_URL}/profile`,
        method: "PUT",
        body: data,
        credentials: "include",
      }),
    }),

    getTeamList: builder.query({
      query: () => ({
        url: `${USER_URL}/get-team`,
        method: "GET",
        credentials: "include",
      }),
    }),

    getPendingUsers: builder.query({
      query: () => ({
        url: `${USER_URL}/pending-users`,
        method: "GET",
        credentials: "include",
      }),
    }),

    approveUser: builder.mutation({
      query: ({ id, status }) => ({
        url: `${USER_URL}/approve/${id}`,
        method: "PUT",
        body: { status },
        credentials: "include",
      }),
    }),

    deleteUser: builder.mutation({
      query: (userId) => ({
        url: `${USER_URL}/${userId}`,
        method: "DELETE",
        credentials: "include",
      }),
    }),

    userAction: builder.mutation({
      query: ({ id, isAction }) => ({
        url: `${USER_URL}/${id}`,
        method: "PUT",
        body: { isAction },
        credentials: "include",
      }),
    }),

    getNotifications: builder.query({
      query: () => ({
        url: `${USER_URL}/notifications`,
        method: "GET",
        credentials: "include",
      }),
    }),

    markNotiAsRead: builder.mutation({
      query: ({ type, id }) => ({
        url: `${USER_URL}/read-noti?isReadType=${type}&id=${id}`,
        method: "PUT",
        credentials: "include",
      }),
    }),

    changePassword: builder.mutation({
      query: (data) => ({
        url: `${USER_URL}/change-password`,
        method: "PUT",
        body: data,
        credentials: "include",
      }),
    }),
  }),
});

export const {
  useCreateUserMutation,
  useUpdateUserMutation,
  useGetTeamListQuery,
  useGetPendingUsersQuery,
  useApproveUserMutation,
  useDeleteUserMutation,
  useUserActionMutation,
  useGetNotificationsQuery,
  useChangePasswordMutation,
  useMarkNotiAsReadMutation,
} = userApiSlice;