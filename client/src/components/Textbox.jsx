import React from "react";
import clsx from "clsx";

const Textbox = React.forwardRef(
  ({ type, placeholder, label, className, register, name, error }, ref) => {
    return (
      <div className="w-full flex flex-col gap-2">
        {label && (
          <label htmlFor={name} className="text-sm font-semibold text-slate-800">
            {label}
          </label>
        )}

        <div>
          <input
            type={type}
            name={name}
            placeholder={placeholder}
            ref={ref}
            {...register}
            aria-invalid={error ? "true" : "false"}
            className={clsx(
              "bg-transparent px-4 py-3.5 border border-gray-300 placeholder-gray-400 text-gray-900 outline-none text-base rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 w-full",
              className,
            )}
          />
        </div>
        {error && (
          <span className="text-xs text-[#f64949fe] mt-0.5 ">{error}</span>
        )}
      </div>
    );
  },
);
export default Textbox;
