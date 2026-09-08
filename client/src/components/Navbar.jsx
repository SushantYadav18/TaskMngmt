import React from "react";
import { MdOutlineSearch } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { setOpenSidebar } from "../redux/slices/authSlice";
import UserAvatar from "./UserAvatar";
import NotificationPanel from "./NotificationPanel";
import { MdDarkMode, MdLightMode } from "react-icons/md";
import { useEffect, useState } from "react";

const Navbar = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem("taskme-theme") === "dark",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("taskme-theme", isDark ? "dark" : "light");
  }, [isDark]);

  return (
    <div className="flex justify-between items-center px-5 md:px-8 lg:px-10 2xl:px-14 py-5 sticky z-10 top-0">
      <div className="flex gap-4 items-center">
        <button
          onClick={() => dispatch(setOpenSidebar(true))}
          className="text-xl text-gray-600 block md:hidden icon-button w-11 h-11 rounded-2xl bg-white border border-gray-200"
        >
          ☰
        </button>

        <div>
          <p className="text-sm text-gray-500 font-medium">
            Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </p>
          <p className="text-lg font-bold text-gray-900 leading-tight">
            Your workspace
          </p>
        </div>
      </div>

      <div className="hidden sm:flex items-center py-3 px-4 gap-3 rounded-2xl bg-white border border-gray-200 search-box min-w-[240px] lg:min-w-[360px]">
        <MdOutlineSearch className="text-gray-500 text-xl" />
        <input
          type="text"
          placeholder="Search tasks, people, or projects"
          className="flex-1 outline-none bg-transparent placeholder:text-gray-500 text-gray-800 text-sm"
        />
      </div>

      <div className="flex gap-2 items-center">
        <button
          type="button"
          aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
          title={isDark ? "Light theme" : "Dark theme"}
          onClick={() => setIsDark((value) => !value)}
          className="icon-button w-11 h-11 rounded-2xl flex items-center justify-center text-gray-600 bg-white border border-gray-200 hover:text-indigo-600"
        >
          {isDark ? <MdLightMode size={20} /> : <MdDarkMode size={20} />}
        </button>
        <NotificationPanel />
        <UserAvatar />
      </div>
    </div>
  );
};

export default Navbar;
