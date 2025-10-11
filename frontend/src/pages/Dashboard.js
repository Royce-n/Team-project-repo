import React from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '../hooks/useAuth';
import { userAPI } from '../services/api';
import { Users, Shield, UserCheck, UserX, TrendingUp } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const { user } = useAuth();

  const { data: usersData, isLoading: usersLoading } = useQuery(
    'users',
    () => userAPI.getUsers({ limit: 1000 }),
    {
      enabled: user?.role === 'admin' || user?.role === 'manager'
    }
  );

  const users = usersData?.data?.data || [];
  const activeUsers = users.filter(u => u.status === 'active').length;
  const inactiveUsers = users.filter(u => u.status === 'inactive').length;
  const adminUsers = users.filter(u => u.role === 'admin').length;
  const managerUsers = users.filter(u => u.role === 'manager').length;
  const basicUsers = users.filter(u => u.role === 'basicuser').length;

  const stats = [
    {
      name: 'Total Users',
      value: users.length,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: 'Active Users',
      value: activeUsers,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'Inactive Users',
      value: inactiveUsers,
      icon: UserX,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      name: 'Administrators',
      value: adminUsers,
      icon: Shield,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  const roleDistribution = [
    { name: 'Basic Users', value: basicUsers, color: 'bg-blue-500' },
    { name: 'Managers', value: managerUsers, color: 'bg-green-500' },
    { name: 'Administrators', value: adminUsers, color: 'bg-purple-500' }
  ];

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  // Basic user dashboard content
  if (user?.role === 'basicuser') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {user?.name}! Here's your personal dashboard.
          </p>
        </div>

        {/* Basic User Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-md bg-blue-100">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Your Role
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 capitalize">
                      {user?.role}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-md bg-green-100">
                    <UserCheck className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Account Status
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 capitalize">
                      {user?.status}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-md bg-purple-100">
                    <Shield className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Permissions
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      Limited
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions for Basic Users */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Quick Actions
            </h3>
            <div className="mt-5 space-y-3">
              <a
                href="/profile"
                className="block w-full bg-primary-50 border border-primary-200 rounded-md py-2 px-4 text-sm font-medium text-primary-700 hover:bg-primary-100 text-center"
              >
                View Profile
              </a>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              System Status
            </h3>
            <div className="mt-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    All systems operational
                  </p>
                  <p className="text-sm text-gray-500">
                    Your account is active and ready to use
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {user?.name}! Here's an overview of your user management system.
        </p>
      </div>

      {/* Stats Grid - Only for admin/manager */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`p-3 rounded-md ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts and Additional Info */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Role Distribution */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Role Distribution
            </h3>
            <div className="mt-5">
              <div className="space-y-3">
                {roleDistribution.map((role) => (
                  <div key={role.name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full ${role.color} mr-3`}></div>
                      <span className="text-sm font-medium text-gray-700">
                        {role.name}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">{role.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Quick Actions
            </h3>
            <div className="mt-5 space-y-3">
              {(user?.role === 'admin' || user?.role === 'manager') && (
                <a
                  href="/users"
                  className="block w-full bg-primary-50 border border-primary-200 rounded-md py-2 px-4 text-sm font-medium text-primary-700 hover:bg-primary-100 text-center"
                >
                  Manage Users
                </a>
              )}
              {(user?.role === 'admin') && (
                <a
                  href="/roles"
                  className="block w-full bg-gray-50 border border-gray-200 rounded-md py-2 px-4 text-sm font-medium text-gray-700 hover:bg-gray-100 text-center"
                >
                  Manage Roles
                </a>
              )}
              <a
                href="/profile"
                className="block w-full bg-gray-50 border border-gray-200 rounded-md py-2 px-4 text-sm font-medium text-gray-700 hover:bg-gray-100 text-center"
              >
                View Profile
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity (placeholder) */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            System Status
          </h3>
          <div className="mt-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  All systems operational
                </p>
                <p className="text-sm text-gray-500">
                  User management system is running smoothly
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

