import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { userAPI } from '../services/api';
import { ArrowLeft, Save } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const UserForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: {
      name: '',
      email: '',
      role: 'basicuser',
      status: 'active'
    }
  });

  const { data: userData, isLoading: userLoading } = useQuery(
    ['user', id],
    () => userAPI.getUser(id),
    {
      enabled: isEdit,
      onSuccess: (data) => {
        const user = data.data.data;
        setValue('name', user.name);
        setValue('email', user.email);
        setValue('role', user.role);
        setValue('status', user.status);
      }
    }
  );

  const createMutation = useMutation(userAPI.createUser, {
    onSuccess: () => {
      queryClient.invalidateQueries('users');
      toast.success('User created successfully');
      navigate('/users');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create user');
    }
  });

  const updateMutation = useMutation(
    ({ id, data }) => userAPI.updateUser(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        queryClient.invalidateQueries(['user', id]);
        toast.success('User updated successfully');
        navigate('/users');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update user');
      }
    }
  );

  const onSubmit = (data) => {
    if (isEdit) {
      updateMutation.mutate({ id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = userLoading || createMutation.isLoading || updateMutation.isLoading;

  if (isEdit && userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/users')}
            className="mr-4 p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit User' : 'Create User'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isEdit ? 'Update user information' : 'Add a new user to the system'}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Full Name *
              </label>
              <input
                type="text"
                {...register('name', { required: 'Name is required' })}
                className={`input mt-1 ${errors.name ? 'border-red-300' : ''}`}
                placeholder="Enter full name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email Address *
              </label>
              <input
                type="email"
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                className={`input mt-1 ${errors.email ? 'border-red-300' : ''}`}
                placeholder="Enter email address"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Role *
              </label>
              <select
                {...register('role', { required: 'Role is required' })}
                className={`input mt-1 ${errors.role ? 'border-red-300' : ''}`}
              >
                <option value="basicuser">Basic User</option>
                <option value="manager">Manager</option>
                <option value="admin">Administrator</option>
              </select>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status *
              </label>
              <select
                {...register('status', { required: 'Status is required' })}
                className={`input mt-1 ${errors.status ? 'border-red-300' : ''}`}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/users')}
              className="btn btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <LoadingSpinner size="small" className="mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isLoading ? 'Saving...' : (isEdit ? 'Update User' : 'Create User')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;
