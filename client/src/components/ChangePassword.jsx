import { useForm } from "react-hook-form";
import { Dialog } from "@headlessui/react";
import { toast } from "sonner";
import { useChangePasswordMutation } from "../redux/slices/api/userApiSlice";
import ModalWrapper from "./ModalWrapper";
import Textbox from "./Textbox";
import Loader from "./Loader";
import Button from "./Button";

const ChangePassword = ({ open, setOpen }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const handleOnSubmit = async (data) => {
    if (data.password !== data.cpass) {
      toast.error("Password and Confirm Password do not match");
      return;
    }

    try {
      const res = await changePassword(data).unwrap();
      toast.success(res.message);

      setTimeout(() => {
        setOpen(false);
      }, 1000);
    } catch (error) {
      toast.error(
        error?.data?.message ||
          "An error occurred while changing password. Please try again."
      );
    }
  };

  return (
    <>
      <ModalWrapper open={open} setOpen={setOpen} title='Change Password'>
        <form onSubmit={handleSubmit(handleOnSubmit)} className='flex flex-col gap-4'>
          <Dialog.Title
            as='h2'
            className='text-base font-bold leading-6 text-gray-900 mb-4'
          >
            Change Password
          </Dialog.Title>
          <div className='mt-2 flex flex-col gap-6'>
            <Textbox
              placeholder='New Password'
              type='password'
              name='password'
              className='w-full rounded'
              register={register("password", {
                required: "Password is required",
              })}
              error={errors.password?.message || ""}
            />

            <Textbox
              placeholder='Confirm Password'
              type='password'
              name='cpass'
              className='w-full rounded'
              register={register("cpass", {
                required: "Please confirm your password",
              })}
              error={errors.cpass?.message || ""}
            />
          </div>
          {isLoading ? (
            <div className='flex items-center justify-center p-4'>
              <Loader />
            </div>
          ) : (
            <div className='py-3 mt-4 sm:flex sm:flex-row-reverse'>
              <Button
                type='submit'
                className='bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded'
                label='save'
              />
              <Button
                type='button'
                className='bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded'
                onClick={() => setOpen(false)}
                label='Cancel'
              />
            </div>
          )}
        </form>
      </ModalWrapper>
    </>
  );
};

export default ChangePassword;