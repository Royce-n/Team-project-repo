import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Send,
  MessageSquare,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

const PetitionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [petition, setPetition] = useState(null);
  const [approvalSteps, setApprovalSteps] = useState([]);
  const [actionHistory, setActionHistory] = useState([]);
  const [storedPdfs, setStoredPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState(null); // 'approve', 'reject', 'return'
  const [comments, setComments] = useState('');

  useEffect(() => {
    fetchPetitionDetail();
  }, [id]);

  const fetchPetitionDetail = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/petitions/${id}`);
      if (response.data.success) {
        setPetition(response.data.data.petition);
        setApprovalSteps(response.data.data.approvalSteps || []);
        setActionHistory(response.data.data.actionHistory || []);
        setStoredPdfs(response.data.data.storedPdfs || []);
      }
    } catch (error) {
      console.error('Error fetching petition:', error);
      toast.error('Failed to load petition details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = async (action) => {
    if (action !== 'approve' && !comments.trim()) {
      toast.error('Please provide comments');
      return;
    }

    setActionLoading(true);
    try {
      const endpoint = `/approvals/${id}/${action}`;
      const payload = comments.trim() ? { comments: comments.trim() } : {};

      await api.post(endpoint, payload);

      toast.success(
        `Petition ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'returned'} successfully`
      );

      setShowApprovalModal(false);
      setComments('');
      fetchPetitionDetail(); // Refresh data
    } catch (error) {
      console.error(`Error ${action}ing petition:`, error);
      toast.error(error.response?.data?.error || `Failed to ${action} petition`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResubmit = async () => {
    setActionLoading(true);
    try {
      await api.post(`/approvals/${id}/resubmit`);
      toast.success('Petition resubmitted successfully');
      fetchPetitionDetail();
    } catch (error) {
      console.error('Error resubmitting petition:', error);
      toast.error(error.response?.data?.error || 'Failed to resubmit petition');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPDF = async (version = null) => {
    try {
      const url = version
        ? `/pdfs/${id}/download?version=${version}`
        : `/pdfs/${id}/download`;

      const response = await api.get(url, { responseType: 'blob' });

      const blob = new Blob([response.data]);
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `petition_${petition.request_number}_v${version || 'latest'}.pdf`;
      link.click();

      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const openApprovalModal = (action) => {
    setApprovalAction(action);
    setShowApprovalModal(true);
    setComments('');
  };

  const canApprove = () => {
    if (!petition || !user) return false;

    const currentStep = approvalSteps.find(
      (step) => step.step_order === petition.current_approval_step
    );

    if (!currentStep) return false;

    // Check if user has the required approver role
    // This is simplified - in production, check against approver_assignments table
    return (
      user.role === 'admin' ||
      user.role === currentStep.approver_role ||
      currentStep.approver_user_id === user.id
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!petition) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Petition not found</p>
        </div>
      </div>
    );
  }

  const petitionData =
    typeof petition.petition_data === 'string'
      ? JSON.parse(petition.petition_data)
      : petition.petition_data;

  const isOwner = petition.user_id === user?.id;
  const canTakeAction = canApprove() && ['submitted', 'pending', 'in_review'].includes(petition.status);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/petitions')}
          className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Petitions
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <FileText className="w-8 h-8 mr-2 text-blue-600" />
              {petition.request_number}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {petition.type_number}. {petition.type_name}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {storedPdfs.length > 0 && (
              <button
                onClick={() => handleDownloadPDF()}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </button>
            )}

            {petition.status === 'returned' && isOwner && (
              <button
                onClick={handleResubmit}
                disabled={actionLoading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4 mr-2" />
                {actionLoading ? 'Resubmitting...' : 'Resubmit'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status and Progress */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Status</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Current Status:</span>
            <span className="text-sm font-medium text-gray-900 uppercase">
              {petition.status.replace('_', ' ')}
            </span>
          </div>

          {petition.current_approval_step > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Approval Progress:</span>
                <span className="text-sm font-medium text-gray-900">
                  Step {petition.current_approval_step} of {approvalSteps.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${(petition.current_approval_step / approvalSteps.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Petition Details */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Petition Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-600">Student Name:</span>
            <p className="text-sm font-medium text-gray-900">
              {petition.student_name}
            </p>
          </div>

          <div>
            <span className="text-sm text-gray-600">Email:</span>
            <p className="text-sm font-medium text-gray-900">
              {petition.student_email}
            </p>
          </div>

          <div>
            <span className="text-sm text-gray-600">UH Number:</span>
            <p className="text-sm font-medium text-gray-900">
              {petition.uh_number}
            </p>
          </div>

          {petition.phone_number && (
            <div>
              <span className="text-sm text-gray-600">Phone:</span>
              <p className="text-sm font-medium text-gray-900">
                {petition.phone_number}
              </p>
            </div>
          )}

          {petitionData.fromMajor && (
            <div>
              <span className="text-sm text-gray-600">From Major:</span>
              <p className="text-sm font-medium text-gray-900">
                {petitionData.fromMajor}
              </p>
            </div>
          )}

          {petitionData.toMajor && (
            <div>
              <span className="text-sm text-gray-600">To Major:</span>
              <p className="text-sm font-medium text-gray-900">
                {petitionData.toMajor}
              </p>
            </div>
          )}
        </div>

        {petition.explanation && (
          <div className="mt-4">
            <span className="text-sm text-gray-600">Explanation:</span>
            <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
              {petition.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Approval Steps */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Approval Workflow</h2>

        <div className="space-y-4">
          {approvalSteps.map((step, index) => (
            <div
              key={step.id}
              className={`border rounded-lg p-4 ${
                step.status === 'approved'
                  ? 'border-green-300 bg-green-50'
                  : step.status === 'rejected'
                  ? 'border-red-300 bg-red-50'
                  : step.status === 'in_review'
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step.status === 'approved'
                        ? 'bg-green-600 text-white'
                        : step.status === 'rejected'
                        ? 'bg-red-600 text-white'
                        : step.status === 'in_review'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-400 text-white'
                    }`}
                  >
                    {step.status === 'approved' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : step.status === 'rejected' ? (
                      <XCircle className="w-5 h-5" />
                    ) : (
                      <Clock className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 capitalize">
                      {step.approver_role.replace('_', ' ')}
                    </h3>
                    {step.approver_name && (
                      <p className="text-sm text-gray-600">
                        {step.approver_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  {step.decision && (
                    <span
                      className={`text-sm font-medium ${
                        step.decision === 'approved'
                          ? 'text-green-700'
                          : 'text-red-700'
                      }`}
                    >
                      {step.decision === 'approved' ? 'Approved' : 'Disapproved'}
                    </span>
                  )}
                  {step.completed_at && (
                    <p className="text-xs text-gray-500">
                      {new Date(step.completed_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {step.comments && (
                <div className="mt-3 p-3 bg-white border border-gray-200 rounded">
                  <p className="text-sm text-gray-700">{step.comments}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Approval Actions */}
        {canTakeAction && (
          <div className="mt-6 flex gap-4">
            <button
              onClick={() => openApprovalModal('approve')}
              className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </button>

            <button
              onClick={() => openApprovalModal('return')}
              className="flex-1 flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Return for Changes
            </button>

            <button
              onClick={() => openApprovalModal('reject')}
              className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </button>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {approvalAction === 'approve'
                ? 'Approve Petition'
                : approvalAction === 'reject'
                ? 'Reject Petition'
                : 'Return for Changes'}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments {approvalAction !== 'approve' && '*'}
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={
                  approvalAction === 'approve'
                    ? 'Optional comments...'
                    : 'Required: Please provide a reason...'
                }
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowApprovalModal(false)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprovalAction(approvalAction)}
                disabled={actionLoading}
                className={`flex-1 px-4 py-2 rounded-md text-white disabled:opacity-50 ${
                  approvalAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : approvalAction === 'reject'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {actionLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PetitionDetail;
