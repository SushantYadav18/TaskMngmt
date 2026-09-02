import React, { useState } from "react";
import clsx from "clsx";
import { IoMdAdd } from "react-icons/io";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import Title from "../components/Title";
import Button from "../components/Button";
import { getInitials } from "../utils";
import { ConfirmationDialog, UserAction } from "../components/Dialogs";
import AddUser from "../components/AddUser";
import {
  useApproveUserMutation,
  useDeleteUserMutation,
  useGetPendingUsersQuery,
  useGetTeamListQuery,
  useUserActionMutation,
} from "../redux/slices/api/userApiSlice";

const Users = ({ pendingOnly = false }) => {

  const { user } = useSelector((state) => state.auth);
  const isAdmin = Boolean(user?.isAdmin);
  const [openDialog, setOpenDialog] = useState(false);
  const [open, setOpen] = useState(false);
  const [openAction, setOpenAction] = useState(false);
  const [selected, setSelected] = useState(null);

  const { data: teamMembers = [], refetch: refetchTeam } = useGetTeamListQuery();
  const { data: pendingUsers = [], refetch: refetchPending } = useGetPendingUsersQuery();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();
  const [userAction, { isLoading: isUserAction }] = useUserActionMutation();
  const [approveUser, { isLoading: isApproving }] = useApproveUserMutation();

  const userActionHandler = async () => {
    try {
      const result = await userAction({
        isAction: !selected?.isActive,
        id: selected?._id,
      }).unwrap();
      await refetchTeam();
      await refetchPending();
      toast.success(result.message || "User action performed successfully!");

      setSelected(null);
      setTimeout(() => {
        setOpenAction(false);
      }, 500);
    } catch (error) {
      console.error("Error performing user action:", error);
      toast.error("Error performing user action. Please try again.");
    }
  };

  const approvalHandler = async (status) => {
    if (!selected) return;

    try {
      const result = await approveUser({
        id: selected._id,
        status,
      }).unwrap();

      await refetchTeam();
      await refetchPending();
      toast.success(result.message || `User ${status} successfully.`);
      setSelected(null);
    } catch (error) {
      console.error("Approval failed:", error);
      toast.error(error?.data?.message || "Unable to update approval status.");
    }
  };

  const deleteHandler = async () => {
    try {
      const result = await deleteUser(selected).unwrap();
      await refetch();
      toast.success(result.message || "User deleted successfully!");

      setSelected(null);
      setTimeout(() => {
        setOpenAction(false);
      }, 500);
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Error deleting user. Please try again.");
    }
  };

  const deleteClick = (id) => {
    setSelected(id);
    setOpenDialog(true);
  };

  const editClick = (el) => {
    setSelected(el);
    setOpen(true);
  };

  const userStatusClick = (el) => {
    setSelected(el);
    setOpenAction(true);
  };

  const TableHeader = () => (
    <thead className='border-b border-gray-300'>
      <tr className='text-black text-left'>
        <th className='py-2'>Full Name</th>
        <th className='py-2'>Title</th>
        <th className='py-2'>Email</th>
        <th className='py-2'>Role</th>
        <th className='py-2'>Status</th>
      </tr>
    </thead>
  );

  const TableRow = ({ user }) => (
    <tr className='border-b border-gray-200 text-gray-600 hover:bg-gray-400/10'>
      <td className='p-2'>
        <div className='flex items-center gap-3'>
          <div className='w-9 h-9 rounded-full text-white flex items-center justify-center text-sm bg-blue-700'>
            <span className='text-xs md:text-sm text-center'>
              {getInitials(user.name)}
            </span>
          </div>
          {user.name}
        </div>
      </td>

      <td className='p-2'>{user.title}</td>
      <td className='p-2'>{user.email || "user.emal.com"}</td>
      <td className='p-2'>{user.role}</td>

      <td>
        <button
          onClick={() => userStatusClick(user)}
          className={clsx(
            "w-fit px-4 py-1 rounded-full",
            user?.isActive ? "bg-blue-200" : "bg-yellow-100"
          )}
        >
          {user?.isActive ? "Active" : "Disabled"}
        </button>
      </td>

      {isAdmin && (
        <td className='p-2 flex gap-4 justify-end'>
          <Button
            className='text-blue-600 hover:text-blue-500 font-semibold sm:px-0'
            label='Edit'
            type='button'
            onClick={() => editClick(user)}
          />

          <Button
            className='text-red-700 hover:text-red-500 font-semibold sm:px-0'
            label='Delete'
            type='button'
            onClick={() => deleteClick(user?._id)}
          />
        </td>
      )}
    </tr>
  );

  const PendingUserRow = ({ user }) => (
    <tr className='border-b border-gray-200 text-gray-600 hover:bg-gray-400/10'>
      <td className='p-2'>
        <div className='flex items-center gap-3'>
          <div className='w-9 h-9 rounded-full text-white flex items-center justify-center text-sm bg-blue-700'>
            <span className='text-xs md:text-sm text-center'>
              {getInitials(user.name)}
            </span>
          </div>
          {user.name}
        </div>
      </td>
      <td className='p-2'>{user.title}</td>
      <td className='p-2'>{user.email}</td>
      <td className='p-2'>{user.role}</td>
      <td className='p-2'>
        <span className='px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 uppercase text-xs font-semibold'>
          {user.status}
        </span>
      </td>
      {isAdmin && (
        <td className='p-2 flex gap-3 justify-end'>
          <Button
            className='bg-green-600 text-white px-3 rounded-md'
            label={isApproving ? 'Updating...' : 'Approve'}
            type='button'
            onClick={() => {
              setSelected(user);
              approvalHandler('approved');
            }}
          />
          <Button
            className='bg-red-600 text-white px-3 rounded-md'
            label='Reject'
            type='button'
            onClick={() => {
              setSelected(user);
              approvalHandler('rejected');
            }}
          />
        </td>
      )}
    </tr>
  );

  return (
    <>
      <div className='w-full md:px-1 px-0 mb-6'>
        <div className='flex items-center justify-between mb-8'>
          <Title title={pendingOnly ? 'Pending Approvals' : 'Team Members'} />
          {!pendingOnly && isAdmin && (
            <Button
              label='Add New User'
              icon={<IoMdAdd className='text-lg' />}
              className='flex flex-row-reverse gap-1 items-center bg-blue-600 text-white rounded-md 2xl:py-2.5'
              onClick={() => setOpen(true)}
            />
          )}
        </div>

        {pendingOnly ? (
          <div className='bg-white px-2 md:px-4 py-4 shadow-md rounded'>
            <div className='overflow-x-auto'>
              <table className='w-full mb-5'>
                <thead className='border-b border-gray-300'>
                  <tr className='text-black text-left'>
                    <th className='py-2'>Full Name</th>
                    <th className='py-2'>Title</th>
                    <th className='py-2'>Email</th>
                    <th className='py-2'>Role</th>
                    <th className='py-2'>Status</th>
                    {isAdmin && <th className='py-2 text-right'>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers?.map((user) => (
                    <PendingUserRow key={user._id} user={user} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <>
            <div className='bg-white px-2 md:px-4 py-4 shadow-md rounded mb-8'>
              <div className='overflow-x-auto'>
                <table className='w-full mb-5'>
                  <TableHeader />
                  <tbody>
                    {teamMembers?.map((user, index) => (
                      <TableRow key={index} user={user} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className='bg-white px-2 md:px-4 py-4 shadow-md rounded'>
              <div className='flex items-center justify-between mb-4'>
                <Title title='Pending Approvals' />
              </div>
              <div className='overflow-x-auto'>
                <table className='w-full mb-5'>
                  <thead className='border-b border-gray-300'>
                    <tr className='text-black text-left'>
                      <th className='py-2'>Full Name</th>
                      <th className='py-2'>Title</th>
                      <th className='py-2'>Email</th>
                      <th className='py-2'>Role</th>
                      <th className='py-2'>Status</th>
                      <th className='py-2 text-right'>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers?.map((user) => (
                      <PendingUserRow key={user._id} user={user} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <AddUser
        open={open}
        setOpen={setOpen}
        userData={selected}
        key={new Date().getTime().toString()}
      />

      <ConfirmationDialog
        open={openDialog}
        setOpen={setOpenDialog}
        onClick={deleteHandler}
      />

      <UserAction
        open={openAction}
        setOpen={setOpenAction}
        onClick={userActionHandler}
      />
    </>
  );
};

export default Users;
