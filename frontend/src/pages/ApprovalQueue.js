import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, Eye, Clock, FileText, Loader2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ApprovalQueue = () => {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovalQueue();
  }, []);

  const fetchApprovalQueue = async () => {
    setLoading(true);
    try {
      const response = await api.get('/approvals/my-queue');
      if (response.data.success) {
        setQueue(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching approval queue:', error);
      toast.error('Failed to load approval queue');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      advisor: 'Advisor/Instructor',
      chairperson: 'Chairperson',
      dean: 'College Dean',
      provost: 'Sr. Vice President/Provost',
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#C8102E' }} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header with UH Logo */}
      <div className="mb-6 flex items-center gap-4">
        <img src="/uh_logo.png" alt="University of Houston" className="h-16 w-auto" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Approval Queue
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Petitions awaiting your approval
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{queue.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <FileText className="w-8 h-8 mr-3" style={{ color: '#C8102E' }} />
            <div>
              <p className="text-sm text-gray-600">In Review</p>
              <p className="text-2xl font-bold text-gray-900">
                {queue.filter((p) => p.step_status === 'in_review').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <Inbox className="w-8 h-8 text-gray-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Awaiting</p>
              <p className="text-2xl font-bold text-gray-900">
                {queue.filter((p) => p.step_status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Queue List */}
      {queue.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <Inbox className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No petitions in queue
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            You don't have any petitions awaiting your approval.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((petition) => (
            <div
              key={petition.id}
              className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/petitions/${petition.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {petition.request_number}
                    </h3>

                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        petition.step_status === 'in_review'
                          ? 'text-white'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                      style={petition.step_status === 'in_review' ? { backgroundColor: '#C8102E' } : {}}
                    >
                      {petition.step_status === 'in_review'
                        ? 'In Review'
                        : 'Pending'}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-gray-600">
                    {petition.type_number}. {petition.type_name}
                  </p>

                  <div className="mt-2 flex items-center gap-6 text-sm text-gray-500">
                    <div>
                      <span className="font-medium text-gray-700">
                        Student:
                      </span>{' '}
                      {petition.student_name}
                    </div>

                    <div>
                      <span className="font-medium text-gray-700">
                        Submitted:
                      </span>{' '}
                      {new Date(petition.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-white" style={{ backgroundColor: '#C8102E' }}>
                      Your Role: {getRoleLabel(petition.approver_role)}
                    </span>
                  </div>

                  {petition.approval_chain && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${(petition.step_order / (Array.isArray(petition.approval_chain) ? petition.approval_chain.length : JSON.parse(petition.approval_chain).length)) * 100}%`,
                              backgroundColor: '#C8102E'
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 whitespace-nowrap">
                          Step {petition.step_order} of {Array.isArray(petition.approval_chain) ? petition.approval_chain.length : JSON.parse(petition.approval_chain).length}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/petitions/${petition.id}`);
                    }}
                    className="p-2 hover:bg-red-50 rounded-md"
                    style={{ color: '#C8102E' }}
                    title="View Details"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApprovalQueue;
