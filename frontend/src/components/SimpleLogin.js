import React from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, Users, Shield, CheckCircle } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";
import toast from "react-hot-toast";

const SimpleLogin = ({ onLogin, loading }) => {
  const navigate = useNavigate();

  const handleTestLogin = async (user) => {
    try {
      console.log("Attempting login with:", user);
      const result = await onLogin(user);
      console.log("Login result:", result);
      toast.success(`Successfully logged in as ${user.name}!`);
      // Refresh the page after successful login
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Login error:", error);
      toast.error(`Login failed: ${error.message}`);
    }
  };

  const testUsers = [
    {
      email: "admin@test.com",
      password: "password123",
      role: "admin",
      name: "Admin User",
      description: "Full system access and user management",
    },
    {
      email: "manager@test.com",
      password: "password123",
      role: "manager",
      name: "Manager User",
      description: "Team management and reporting access",
    },
    {
      email: "user@test.com",
      password: "password123",
      role: "basicuser",
      name: "Basic User",
      description: "Standard user access and profile management",
    },
  ];

  const features = [
    {
      icon: Users,
      title: "User Management",
      description: "Manage users, roles, and permissions",
    },
    {
      icon: Shield,
      title: "Role-Based Access",
      description: "Secure access control with different user roles",
    },
    {
      icon: CheckCircle,
      title: "Easy Development",
      description: "Simple login for development and testing",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Features */}
          <div className="space-y-8">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                User Management System
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Development Login - Simple Authentication
              </p>
            </div>

            <div className="space-y-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <feature.icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Test Login Buttons */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <LogIn className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Quick Login</h2>
              <p className="text-gray-600 mt-2">
                Choose a test user to sign in instantly
              </p>
            </div>

            {/* Test Users */}
            <div className="space-y-4">
              {testUsers.map((user, index) => (
                <button
                  key={index}
                  onClick={() => handleTestLogin(user)}
                  disabled={loading}
                  className="w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="font-medium text-gray-900 group-hover:text-blue-900">
                          {user.name}
                        </div>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {user.role}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {user.email}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {user.description}
                      </div>
                    </div>
                    {loading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <LogIn className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 text-center">
                All test users use password:{" "}
                <code className="bg-gray-200 px-2 py-1 rounded font-mono">
                  password123
                </code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleLogin;
