import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { signInWithPopup } from "firebase/auth";
import Textbox from "../components/Textbox";
import Button from "../components/Button";
import {
  useLoginMutation,
  useRegisterMutation,
} from "../redux/slices/api/authApiSlice";
import { useDispatch } from "react-redux";
import { setCredentials } from "../redux/slices/authSlice";
import Loading from "../components/Loader";
import { auth, googleProvider } from "../utils/firebase";

const Login = () => {
  const { user } = useSelector((state) => state.auth);
  const [isRegistering, setIsRegistering] = useState(false);

  const loginForm = useForm();
  const registerForm = useForm();

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [login, { isLoading: isLoggingIn }] = useLoginMutation();
  const [registerUser, { isLoading: isRegisteringUser }] =
    useRegisterMutation();

  const submitHandler = async (data) => {
    try {
      const response = await login(data).unwrap();
      dispatch(setCredentials(response));
      toast.success("Login successful!");
      navigate("/dashboard");
    } catch (err) {
      console.error("Login failed:", err);
      toast.error(err?.data?.message || "Login failed. Please try again.");
    }
  };

  const handleRegister = async (data) => {
    try {
      const response = await registerUser({
        ...data,
        password: data.password,
      }).unwrap();

      toast.success(
        response?.message || "Registration submitted. Awaiting approval.",
      );
      setIsRegistering(false);
      registerForm.reset();
    } catch (err) {
      console.error("Registration failed:", err);
      toast.error(err?.data?.message || "Registration failed.");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const googleUser = result.user;

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8800/api"}/user/google`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: googleUser.displayName || "Google User",
            email: googleUser.email,
            title: "Team Member",
            role: "Member",
            googleAuth: true,
          }),
        },
      ).then((res) => res.json());

      if (!response.status) {
        throw new Error(response.message || "Google sign-in failed.");
      }

      toast.success(
        response.message || "Google sign-in submitted for approval.",
      );
      if (response.user) {
        dispatch(setCredentials(response.user));
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Google login failed:", error);
      toast.error(error?.message || "Google sign-in failed.");
    }
  };

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  return (
    <div className="w-full min-h-screen flex items-center justify-center app-background px-4 py-10">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <div className="hidden lg:flex auth-mesh rounded-[2rem] p-12 text-white flex-col justify-between min-h-[680px]">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] uppercase text-white/70">
              TaskMe
            </p>
            <h1 className="mt-8 text-5xl font-extrabold leading-tight tracking-tight">
              Calm, clear
              <br />
              task flow.
            </h1>
            <p className="mt-6 text-lg text-white/75 max-w-md leading-8">
              Plan work, follow progress, and keep the whole team aligned in one
              quiet workspace.
            </p>
          </div>

          <div className="space-y-5">
            {[
              "Boards and lists that stay readable",
              "Team approvals without clutter",
              "A dashboard that shows what matters",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3.5 backdrop-blur-sm"
              >
                <span className="h-2 w-2 rounded-full bg-teal-300" />
                <span className="text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center">
          {!isRegistering ? (
            <form
              onSubmit={loginForm.handleSubmit(submitHandler)}
              className="form-container w-full flex flex-col gap-y-8 px-8 md:px-10 pt-12 pb-12"
            >
              <div className="space-y-2">
                <p className="page-kicker">Sign in</p>
                <p className="text-3xl font-extrabold text-gray-900 tracking-tight">
                  Welcome back
                </p>
                <p className="text-base text-gray-500">
                  Enter your details to continue to your workspace.
                </p>
              </div>

              <div className="flex flex-col gap-y-5">
                <Textbox
                  placeholder="email@example.com"
                  type="email"
                  name="email"
                  label="Email Address"
                  className="w-full rounded-2xl"
                  register={loginForm.register("email", {
                    required: "Email Address is required!",
                  })}
                  error={
                    loginForm.formState.errors.email
                      ? loginForm.formState.errors.email.message
                      : ""
                  }
                />
                <Textbox
                  placeholder="your password"
                  type="password"
                  name="password"
                  label="Password"
                  className="w-full rounded-2xl"
                  register={loginForm.register("password", {
                    required: "Password is required!",
                  })}
                  error={
                    loginForm.formState.errors.password
                      ? loginForm.formState.errors.password.message
                      : ""
                  }
                />

                <span className="text-sm text-gray-500 hover:text-indigo-600 cursor-pointer">
                  Forget Password?
                </span>

                {isLoggingIn ? (
                  <Loading />
                ) : (
                  <Button
                    type="submit"
                    label="Continue"
                    className="w-full h-12 bg-indigo-600 text-white rounded-2xl font-semibold shadow-glow"
                  />
                )}

                <Button
                  type="button"
                  label="Continue with Google"
                  className="w-full h-12 bg-white text-gray-800 border border-gray-200 rounded-2xl font-semibold"
                  onClick={handleGoogleLogin}
                />

                <button
                  type="button"
                  className="text-sm text-indigo-600 font-semibold"
                  onClick={() => setIsRegistering(true)}
                >
                  Need an account? Register here
                </button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={registerForm.handleSubmit(handleRegister)}
              className="form-container w-full flex flex-col gap-y-6 px-8 md:px-10 pt-10 pb-10"
            >
              <div className="space-y-2">
                <p className="page-kicker">Create account</p>
                <p className="text-3xl font-extrabold text-gray-900 tracking-tight">
                  Join the workspace
                </p>
                <p className="text-base text-gray-500">
                  Registration requires admin approval.
                </p>
              </div>

              <Textbox
                placeholder="Full name"
                type="text"
                name="name"
                label="Full Name"
                className="w-full rounded-2xl"
                register={registerForm.register("name", {
                  required: "Full name is required!",
                })}
                error={
                  registerForm.formState.errors.name
                    ? registerForm.formState.errors.name.message
                    : ""
                }
              />

              <Textbox
                placeholder="Title"
                type="text"
                name="title"
                label="Title"
                className="w-full rounded-2xl"
                register={registerForm.register("title", {
                  required: "Title is required!",
                })}
                error={
                  registerForm.formState.errors.title
                    ? registerForm.formState.errors.title.message
                    : ""
                }
              />

              <Textbox
                placeholder="Role"
                type="text"
                name="role"
                label="Role"
                className="w-full rounded-2xl"
                register={registerForm.register("role", {
                  required: "Role is required!",
                })}
                error={
                  registerForm.formState.errors.role
                    ? registerForm.formState.errors.role.message
                    : ""
                }
              />

              <Textbox
                placeholder="email@example.com"
                type="email"
                name="email"
                label="Email Address"
                className="w-full rounded-2xl"
                register={registerForm.register("email", {
                  required: "Email is required!",
                })}
                error={
                  registerForm.formState.errors.email
                    ? registerForm.formState.errors.email.message
                    : ""
                }
              />

              <Textbox
                placeholder="Set password"
                type="password"
                name="password"
                label="Password"
                className="w-full rounded-2xl"
                register={registerForm.register("password", {
                  required: "Password is required!",
                  minLength: {
                    value: 6,
                    message: "Password must be at least 6 characters.",
                  },
                })}
                error={
                  registerForm.formState.errors.password
                    ? registerForm.formState.errors.password.message
                    : ""
                }
              />

              {isRegisteringUser ? (
                <Loading />
              ) : (
                <Button
                  type="submit"
                  label="Register"
                  className="w-full h-12 bg-indigo-600 text-white rounded-2xl font-semibold shadow-glow"
                />
              )}

              <button
                type="button"
                className="text-sm text-indigo-600 font-semibold"
                onClick={() => setIsRegistering(false)}
              >
                Already have an account? Login here
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
