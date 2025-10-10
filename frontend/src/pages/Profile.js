import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { User, Mail, Shield, Calendar, CheckCircle, XCircle } from 'lucide-react';

const Profile = () => {
  const { user } = useAuth();

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-yellow-100 text-yellow-800';
      case 'basicuser':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  const getRoleDescription = (role) => {
    switch (role) {
      case 'admin':
        return 'Full access to all system features including user management, role management, and system administration.';
      case 'manager':
        return 'Can view and update user information, manage team members, and access management features.';
      case 'basicuser':
        return 'Basic access to view personal profile and limited system features.';
      default:
        return 'No specific role description available.';
    }
  };

  const getPermissions = (role) => {
    switch (role) {
      case 'admin':
        return [
          'View all users',
          'Create new users',
          'Update user information',
          'Delete users',
          'Manage user roles',
          'Deactivate/Reactivate users',
          'Access all system features'
        ];
      case 'manager':
        return [
          'View user information',
          'Update user details',
          'View team members',
          'Access management features'
        ];
      case 'basicuser':
        return [
          'View own profile',
          'Update personal information'
        ];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your personal information and account details
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Personal Information
              </h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Full Name
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">{user?.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    Email Address
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">{user?.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    Role
                  </dt>
                  <dd className="mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user?.role)}`}>
                      {user?.role}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    {user?.status === 'active' ? (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Account Status
                  </dt>
                  <dd className="mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user?.status)}`}>
                      {user?.status}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Role Information */}
          <div className="mt-6 bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Role Information
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 capitalize">
                    {user?.role} Role
                  </h4>
                  <p className="mt-1 text-sm text-gray-500">
                    {getRoleDescription(user?.role)}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    Permissions
                  </h4>
                  <ul className="mt-2 space-y-1">
                    {getPermissions(user?.role).map((permission, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-500">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        {permission}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Account Summary
              </h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-primary-100 rounded-md flex items-center justify-center">
                      <User className="h-5 w-5 text-primary-600" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Account Type</p>
                    <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Status</p>
                    <p className="text-sm text-gray-500 capitalize">{user?.status}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Last Login</p>
                    <p className="text-sm text-gray-500">Just now</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                  Update Profile
                </button>
                <button className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                  Change Password
                </button>
                <button className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                  Security Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
