import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { userAPI } from '../services/api';
import { ArrowLeft, Save } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import api from '../services/api';

const UserForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const [approverRoles, setApproverRoles] = useState({
    advisor: false,
    chairperson: false,
    dean: false,
    provost: false
  });
  const [approverDepartment, setApproverDepartment] = useState('');

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

  // Fetch approver assignments for this user
  useEffect(() => {
    if (isEdit && id) {
      api.get(`/users/${id}/approver-roles`).then(response => {
        if (response.data.success && response.data.data.length > 0) {
          const roles = {};
          response.data.data.forEach(assignment => {
            roles[assignment.approver_role] = true;
            if (assignment.department) {
              setApproverDepartment(assignment.department);
            }
          });
          setApproverRoles(roles);
        }
      }).catch(error => {
        console.error('Error fetching approver roles:', error);
      });
    }
  }, [isEdit, id]);

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

  const onSubmit = async (data) => {
    try {
      // Save user data first
      if (isEdit) {
        await updateMutation.mutateAsync({ id, data });
      } else {
        const result = await createMutation.mutateAsync(data);
        // If creating, we don't have an ID yet for approver roles
        // Navigate will happen in mutation success callback
        return;
      }

      // Save approver role assignments
      const selectedRoles = Object.keys(approverRoles).filter(role => approverRoles[role]);
      if (selectedRoles.length > 0 && isEdit) {
        await api.post(`/users/${id}/approver-roles`, {
          roles: selectedRoles,
          department: approverDepartment || null
        });
      }
    } catch (error) {
      console.error('Error saving user:', error);
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

          {/* Approver Role Assignments */}
          {isEdit && (
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Approver Role Assignments</h3>
              <p className="text-sm text-gray-500 mb-4">
                Assign approver roles to allow this user to approve petitions. Multiple roles can be assigned.
              </p>

              <div className="space-y-4">
                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Department (Optional)
                  </label>
                  <input
                    type="text"
                    value={approverDepartment}
                    onChange={(e) => setApproverDepartment(e.target.value)}
                    className="input mt-1"
                    placeholder="e.g., Computer Science"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Specify a department if this user approves for a specific department
                  </p>
                </div>

                {/* Approver Role Checkboxes */}
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center space-x-3 p-3 border-2 rounded-md cursor-pointer hover:bg-gray-50"
                         style={{ borderColor: approverRoles.advisor ? '#C8102E' : '#E5E7EB' }}>
                    <input
                      type="checkbox"
                      checked={approverRoles.advisor}
                      onChange={(e) => setApproverRoles({...approverRoles, advisor: e.target.checked})}
                      className="h-4 w-4"
                      style={{ accentColor: '#C8102E' }}
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Advisor/Instructor</div>
                      <div className="text-xs text-gray-500">First step approver</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border-2 rounded-md cursor-pointer hover:bg-gray-50"
                         style={{ borderColor: approverRoles.chairperson ? '#C8102E' : '#E5E7EB' }}>
                    <input
                      type="checkbox"
                      checked={approverRoles.chairperson}
                      onChange={(e) => setApproverRoles({...approverRoles, chairperson: e.target.checked})}
                      className="h-4 w-4"
                      style={{ accentColor: '#C8102E' }}
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Chairperson</div>
                      <div className="text-xs text-gray-500">Department chair</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border-2 rounded-md cursor-pointer hover:bg-gray-50"
                         style={{ borderColor: approverRoles.dean ? '#C8102E' : '#E5E7EB' }}>
                    <input
                      type="checkbox"
                      checked={approverRoles.dean}
                      onChange={(e) => setApproverRoles({...approverRoles, dean: e.target.checked})}
                      className="h-4 w-4"
                      style={{ accentColor: '#C8102E' }}
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">College Dean</div>
                      <div className="text-xs text-gray-500">College-level approval</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border-2 rounded-md cursor-pointer hover:bg-gray-50"
                         style={{ borderColor: approverRoles.provost ? '#C8102E' : '#E5E7EB' }}>
                    <input
                      type="checkbox"
                      checked={approverRoles.provost}
                      onChange={(e) => setApproverRoles({...approverRoles, provost: e.target.checked})}
                      className="h-4 w-4"
                      style={{ accentColor: '#C8102E' }}
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Sr. Vice President/Provost</div>
                      <div className="text-xs text-gray-500">Final approval authority</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

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

