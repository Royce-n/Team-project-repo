import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogIn, Users, Shield, CheckCircle } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Login = () => {
  const { login, loading } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await login();
      toast.success('Successfully logged in!');
    } catch (error) {
      console.error('Login error:', error);
      if (error.message.includes('HTTPS or localhost')) {
        toast.error('Authentication requires HTTPS or localhost. Please use HTTPS or access via localhost.');
      } else if (error.message.includes('AADSTS700016')) {
        toast.error('This application is not registered in your organization. Please contact your administrator.');
      } else if (error.message.includes('interaction_in_progress')) {
        toast.error('Authentication is already in progress. Please wait...');
      } else {
        toast.error(`Login failed: ${error.message}`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Check if we're in a secure context
  const isSecureContext = window.isSecureContext || 
                         window.location.protocol === 'https:' || 
                         window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';

  const features = [
    {
      icon: Users,
      title: 'User Management',
      description: 'Create, update, and manage user accounts with role-based access control.'
    },
    {
      icon: Shield,
      title: 'Role-Based Access',
      description: 'Define and assign roles with specific permissions for different user types.'
    },
    {
      icon: CheckCircle,
      title: 'Office365 Integration',
      description: 'Seamless authentication using your Office365 credentials.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100">
            <Users className="h-6 w-6 text-primary-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            User Management System
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in with your Office365 account to continue
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-4">
            <button
              onClick={handleLogin}
              disabled={isLoggingIn || loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn || loading ? (
                <LoadingSpinner size="small" className="mr-2" />
              ) : (
                <LogIn className="w-5 h-5 mr-2" />
              )}
              {isLoggingIn || loading ? 'Signing in...' : 'Sign in with Office365'}
            </button>
            
            <button
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear authentication state and retry
            </button>
          </div>

          {!isSecureContext && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Authentication Limited
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Office365 authentication requires HTTPS or localhost. 
                      For full functionality, please access via HTTPS or localhost.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Features</span>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start">
                  <div className="flex-shrink-0">
                    <feature.icon className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          Team Aurora - User Management System v1.0
        </p>
      </div>
    </div>
  );
};

export default Login;
