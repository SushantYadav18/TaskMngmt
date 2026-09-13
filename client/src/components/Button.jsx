import clsx from "clsx";
import React from "react";

const Button = ({
  icon,
  className,
  label,
  type,
  onClick = () => {},
  disabled = false,
}) => {
  return (
    <button
      type={type || "button"}
      className={clsx(
        "px-4 py-2.5 outline-none rounded-xl transition-all duration-200",
        className,
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <span>{label}</span>
      {icon && icon}
    </button>
  );
};

export default Button;
