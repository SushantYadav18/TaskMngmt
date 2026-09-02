import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { signInWithPopup } from "firebase/auth";
import Textbox from "../components/Textbox";
import Button from "../components/Button";
import { useLoginMutation, useRegisterMutation } from "../redux/slices/api/authApiSlice";
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
  const [registerUser, { isLoading: isRegisteringUser }] = useRegisterMutation();

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

      toast.success(response?.message || "Registration submitted. Awaiting approval.");
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

      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8800/api"}/user/google`, {
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
      }).then((res) => res.json());

      if (!response.status) {
        throw new Error(response.message || "Google sign-in failed.");
      }

      toast.success(response.message || "Google sign-in submitted for approval.");
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
    <div className='w-full min-h-screen flex items-center justify-center flex-col lg:flex-row bg-[#f3f4f6]'>
      <div className='w-full md:w-auto flex gap-0 md:gap-40 flex-col md:flex-row items-center justify-center'>
        <div className='h-full w-full lg:w-2/3 flex flex-col items-center justify-center'>
          <div className='w-full md:max-w-lg 2xl:max-w-3xl flex flex-col items-center justify-center gap-5 md:gap-y-10 2xl:-mt-20'>
            <span className='flex gap-1 py-1 px-3 border rounded-full text-sm md:text-base bordergray-300 text-gray-600'>
              Manage all your task in one place!
            </span>
            <p className='flex flex-col gap-0 md:gap-4 text-4xl md:text-6xl 2xl:text-7xl font-black text-center text-blue-700'>
              <span>Cloud-Based</span>
              <span>Task Manager</span>
            </p>

            <div className='cell'>
              <div className='circle rotate-in-up-left'></div>
            </div>
          </div>
        </div>

        <div className='w-full md:w-1/3 p-4 md:p-1 flex flex-col justify-center items-center'>
          {!isRegistering ? (
            <form
              onSubmit={loginForm.handleSubmit(submitHandler)}
              className='form-container w-full md:w-[400px] flex flex-col gap-y-8 bg-white px-10 pt-14 pb-14'
            >
              <div className=''>
                <p className='text-blue-600 text-3xl font-bold text-center'>
                  Welcome back!
                </p>
                <p className='text-center text-base text-gray-700 '>
                  Keep all your credential safe.
                </p>
              </div>

              <div className='flex flex-col gap-y-5'>
                <Textbox
                  placeholder='email@example.com'
                  type='email'
                  name='email'
                  label='Email Address'
                  className='w-full rounded-full'
                  register={loginForm.register("email", {
                    required: "Email Address is required!",
                  })}
                  error={loginForm.formState.errors.email ? loginForm.formState.errors.email.message : ""}
                />
                <Textbox
                  placeholder='your password'
                  type='password'
                  name='password'
                  label='Password'
                  className='w-full rounded-full'
                  register={loginForm.register("password", {
                    required: "Password is required!",
                  })}
                  error={loginForm.formState.errors.password ? loginForm.formState.errors.password.message : ""}
                />

                <span className='text-sm text-gray-500 hover:text-blue-600 hover:underline cursor-pointer'>
                  Forget Password?
                </span>

                {isLoggingIn ? (
                  <Loading />
                ) : (
                  <Button
                    type='submit'
                    label='Submit'
                    className='w-full h-10 bg-blue-700 text-white rounded-full'
                  />
                )}

                <Button
                  type='button'
                  label='Continue with Google'
                  className='w-full h-10 bg-red-600 text-white rounded-full'
                  onClick={handleGoogleLogin}
                />

                <button
                  type='button'
                  className='text-sm text-blue-600 underline'
                  onClick={() => setIsRegistering(true)}
                >
                  Need an account? Register here
                </button>
              </div>
            </form>
          ) : (
            <form
              onSubmit={registerForm.handleSubmit(handleRegister)}
              className='form-container w-full md:w-[420px] flex flex-col gap-y-6 bg-white px-10 pt-12 pb-12'
            >
              <div>
                <p className='text-blue-600 text-3xl font-bold text-center'>
                  Create account
                </p>
                <p className='text-center text-base text-gray-700 '>
                  Registration requires admin approval.
                </p>
              </div>

              <Textbox
                placeholder='Full name'
                type='text'
                name='name'
                label='Full Name'
                className='w-full rounded-full'
                register={registerForm.register("name", { required: "Full name is required!" })}
                error={registerForm.formState.errors.name ? registerForm.formState.errors.name.message : ""}
              />

              <Textbox
                placeholder='Title'
                type='text'
                name='title'
                label='Title'
                className='w-full rounded-full'
                register={registerForm.register("title", { required: "Title is required!" })}
                error={registerForm.formState.errors.title ? registerForm.formState.errors.title.message : ""}
              />

              <Textbox
                placeholder='Role'
                type='text'
                name='role'
                label='Role'
                className='w-full rounded-full'
                register={registerForm.register("role", { required: "Role is required!" })}
                error={registerForm.formState.errors.role ? registerForm.formState.errors.role.message : ""}
              />

              <Textbox
                placeholder='email@example.com'
                type='email'
                name='email'
                label='Email Address'
                className='w-full rounded-full'
                register={registerForm.register("email", { required: "Email is required!" })}
                error={registerForm.formState.errors.email ? registerForm.formState.errors.email.message : ""}
              />

              <Textbox
                placeholder='Set password'
                type='password'
                name='password'
                label='Password'
                className='w-full rounded-full'
                register={registerForm.register("password", {
                  required: "Password is required!",
                  minLength: { value: 6, message: "Password must be at least 6 characters." },
                })}
                error={registerForm.formState.errors.password ? registerForm.formState.errors.password.message : ""}
              />

              {isRegisteringUser ? (
                <Loading />
              ) : (
                <Button
                  type='submit'
                  label='Register'
                  className='w-full h-10 bg-blue-700 text-white rounded-full'
                />
              )}

              <button
                type='button'
                className='text-sm text-blue-600 underline'
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
