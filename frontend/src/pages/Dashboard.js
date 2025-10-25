import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useAuth } from '../hooks/useAuth';
import { userAPI, api } from '../services/api';
import { Users, Shield, UserCheck, UserX, TrendingUp } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data: usersData, isLoading: usersLoading } = useQuery(
    'users',
    () => userAPI.getUsers({ limit: 1000 }),
    {
      enabled: user?.role === 'admin' || user?.role === 'manager',
      staleTime: 0, // Always consider data stale to prevent caching issues
      cacheTime: 0 // Don't cache the data
    }
  );

  const { data: sessionStats, isLoading: sessionStatsLoading } = useQuery(
    'sessionStats',
    () => api.get('/auth/sessions/stats'),
    {
      enabled: user?.role === 'admin' || user?.role === 'manager',
      staleTime: 10000, // Refresh every 10 seconds
      refetchInterval: 10000 // Auto-refresh every 10 seconds for real-time updates
    }
  );

  // Clear users cache when user role changes to prevent showing wrong data
  useEffect(() => {
    if (user?.role === 'basicuser') {
      queryClient.removeQueries('users');
    }
  }, [user?.role, queryClient]);

  const users = usersData?.data?.data || [];
  const activeUserAccounts = users.filter(u => u.status === 'active').length;
  const inactiveUsers = users.filter(u => u.status === 'inactive').length;
  const adminUsers = users.filter(u => u.role === 'admin').length;
  const managerUsers = users.filter(u => u.role === 'manager').length;
  const basicUsers = users.filter(u => u.role === 'basicuser').length;

  // User statistics
  const activeUsers = sessionStats?.data?.data?.activeUsers || 0;
  const totalUsers = sessionStats?.data?.data?.totalUsers || 0;
  const usersActivity = sessionStats?.data?.data?.usersActivity || [];

  const stats = [
    {
      name: 'Total Users',
      value: totalUsers,
      icon: Users,
      color: '#C8102E',
      bgColor: 'rgba(200, 16, 46, 0.1)'
    },
    {
      name: 'Active Users',
      value: activeUsers,
      icon: UserCheck,
      color: '#C8102E',
      bgColor: 'rgba(200, 16, 46, 0.1)'
    },
    {
      name: 'Inactive Users',
      value: inactiveUsers,
      icon: UserX,
      color: '#C8102E',
      bgColor: 'rgba(200, 16, 46, 0.1)'
    },
    {
      name: 'Online Now',
      value: usersActivity.filter(u => u.status_text === 'Online').length,
      icon: Shield,
      color: '#C8102E',
      bgColor: 'rgba(200, 16, 46, 0.1)'
    }
  ];

  const roleDistribution = [
    { name: 'Basic Users', value: basicUsers, color: 'bg-blue-500' },
    { name: 'Managers', value: managerUsers, color: 'bg-green-500' },
    { name: 'Administrators', value: adminUsers, color: 'bg-purple-500' }
  ];

  // Show loading spinner while auth is loading or user data is not available
  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // Show loading spinner for admin/manager users while fetching data
  if ((user?.role === 'admin' || user?.role === 'manager') && (usersLoading || sessionStatsLoading)) {
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
          <div className="bg-white overflow-hidden shadow-lg rounded-lg border-2" style={{ borderColor: '#C8102E', backgroundColor: 'rgba(200, 16, 46, 0.02)' }}>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-md" style={{ backgroundColor: 'rgba(200, 16, 46, 0.1)' }}>
                    <Users className="h-6 w-6" style={{ color: '#C8102E' }} />
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

          <div className="bg-white overflow-hidden shadow-lg rounded-lg border-2" style={{ borderColor: '#C8102E', backgroundColor: 'rgba(200, 16, 46, 0.02)' }}>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-md" style={{ backgroundColor: 'rgba(200, 16, 46, 0.1)' }}>
                    <UserCheck className="h-6 w-6" style={{ color: '#C8102E' }} />
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

          <div className="bg-white overflow-hidden shadow-lg rounded-lg border-2" style={{ borderColor: '#C8102E', backgroundColor: 'rgba(200, 16, 46, 0.02)' }}>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-md" style={{ backgroundColor: 'rgba(200, 16, 46, 0.1)' }}>
                    <Shield className="h-6 w-6" style={{ color: '#C8102E' }} />
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
                className="block w-full border-2 rounded-md py-2 px-4 text-sm font-medium text-center hover:opacity-90"
                style={{ borderColor: '#C8102E', backgroundColor: 'rgba(200, 16, 46, 0.1)', color: '#C8102E' }}
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
          <div key={stat.name} className="bg-white overflow-hidden shadow-lg rounded-lg border-2" style={{ borderColor: '#C8102E', backgroundColor: 'rgba(200, 16, 46, 0.02)' }}>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-md" style={{ backgroundColor: stat.bgColor }}>
                    <stat.icon className="h-6 w-6" style={{ color: stat.color }} />
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
        {/* User Activity Status */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              User Activity Status
            </h3>
            <div className="mt-2 mb-4">
              <p className="text-xs text-gray-500">
                💡 Activity tracking: Click anywhere to stay active. Inactive after 30 seconds.
              </p>
            </div>
            <div className="mt-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-3 animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700">Online</span>
                    <span className="text-xs text-gray-400 ml-2">(active in 30s)</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {usersActivity.filter(u => u.status_text === 'Online').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 mr-3"></div>
                    <span className="text-sm font-medium text-gray-700">Away</span>
                    <span className="text-xs text-gray-400 ml-2">(2 min ago)</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {usersActivity.filter(u => u.status_text === 'Away').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-gray-400 mr-3"></div>
                    <span className="text-sm font-medium text-gray-700">Offline</span>
                    <span className="text-xs text-gray-400 ml-2">(10+ min ago)</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {usersActivity.filter(u => u.status_text === 'Offline').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

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
                  className="block w-full border-2 rounded-md py-2 px-4 text-sm font-medium text-center hover:opacity-90"
                  style={{ borderColor: '#C8102E', backgroundColor: 'rgba(200, 16, 46, 0.1)', color: '#C8102E' }}
                >
                  Manage Users
                </a>
              )}
              {(user?.role === 'admin') && (
                <a
                  href="/roles"
                  className="block w-full border-2 rounded-md py-2 px-4 text-sm font-medium text-center hover:opacity-90"
                  style={{ borderColor: '#C8102E', backgroundColor: 'rgba(200, 16, 46, 0.1)', color: '#C8102E' }}
                >
                  Manage Roles
                </a>
              )}
              <a
                href="/profile"
                className="block w-full border-2 rounded-md py-2 px-4 text-sm font-medium text-center hover:opacity-90"
                style={{ borderColor: '#C8102E', backgroundColor: 'rgba(200, 16, 46, 0.1)', color: '#C8102E' }}
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

