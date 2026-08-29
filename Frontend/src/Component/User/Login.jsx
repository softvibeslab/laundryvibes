import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { RiTShirt2Line } from "react-icons/ri";
import axios from "axios";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); // State to store error messages
  const [success, setSuccess] = useState(""); // State to store success messages
  const [loading, setLoading] = useState(false); // State to store success messages

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors
    setSuccess(""); // Clear previous success messages
    setLoading(true)

    try {
      const response = await axios.post("/api/user/login", {
        email,
        password,
      });

      // Handle successful login
      setSuccess(`Welcome back, ${response.data.name}!`); // Set success message
      console.log("Login successful:", response.data);

      if(response.status===200){
      

          localStorage.setItem("token",response.data.token);
          localStorage.setItem("role",response.data.role);
          localStorage.setItem("userId",response.data.userId);
        
      }
     

      if (response.status === 200 && response.data.role === "user") {
        //navigate the user to dashbaord page

        setTimeout(() => {
          navigate("/user/userdashboard");
        }, 2000);
      } else if (response.status === 200 && response.data.role === "worker") {
        setTimeout(() => {
          navigate("/workerdashboard");
        }, 2000);
      }
    } catch (error) {
      setSuccess("")
      // Handle specific error messages from the API
      if (error.response && error.response.data.message) {
        setError(error.response.data.message); // Set error message from the API
      } else {
        setError("An error occurred. Please try again."); // Generic error message
      }
    }finally{
      setLoading(false)
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-sm border border-gray-100">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
            <RiTShirt2Line className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        {/* Header */}
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-2">
          Welcome Back
        </h2>
        <p className="text-center text-gray-500 text-sm mb-6">
          Sign in to your laundry account
        </p>

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-400 text-green-700 text-sm rounded">
            <span className="font-medium">Success:</span> {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm rounded">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}

        {/* Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Email Input */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              className="w-full px-4 py-2 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password Input */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              placeholder="Enter your password"
              className="w-full px-4 py-2 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Sign In Button */}
          <button
      type="submit"
      className={`w-full py-2 text-white rounded-lg transition-all ${
        loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
      }`}
      disabled={loading}
    >
      {loading ? 'Signing in...' : 'Sign in'}
    </button>
        </form>

        {/* Forgot Password Link */}
        <div className="mt-4 text-center">
          <Link
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            to="/forgot-password"
          >
            Forgot your password?
          </Link>
        </div>

        {/* Sign Up Link */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <Link
              to="/registration"
              className="text-blue-600 hover:text-blue-700 hover:underline"
            >
              Sign up now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
