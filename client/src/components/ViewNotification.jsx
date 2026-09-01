import Button from "./Button";
import ModalWrapper from "./ModalWrapper";
import { Dialog } from "@headlessui/react";

const ViewNotification = ({ open, setOpen, el }) => {
  return (
    <>
      <ModalWrapper open={open} setOpen={setOpen}>
        <div className='py-4 flex flex-col gap-4 items-center justify-center'>
          <Dialog.Title as='h3' className='text-lg font-semibold leading-6 text-gray-900'>
            {el?.task?.title}
          </Dialog.Title>

          <p className='text-start text-gray-500'>{el?.text}</p>

          <Button
            type='button'
            onClick={() => setOpen(false)}
            className='mt-4 w-full bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-4 py-2 text-sm font-medium'
            label='ok'
          />
        </div>
      </ModalWrapper>
    </>
  );
};

export default ViewNotification;
