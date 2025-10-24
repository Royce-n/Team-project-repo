import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Eye,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileSignature,
  Loader2,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

const StatusBadge = ({ status }) => {
  const statusConfig = {
    draft: {
      icon: FileSignature,
      color: 'bg-gray-100 text-gray-800',
      text: 'Draft',
    },
    submitted: {
      icon: Clock,
      color: 'bg-blue-100 text-blue-800',
      text: 'Submitted',
    },
    pending: {
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-800',
      text: 'Pending',
    },
    in_review: {
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-800',
      text: 'In Review',
    },
    approved: {
      icon: CheckCircle,
      color: 'bg-green-100 text-green-800',
      text: 'Approved',
    },
    rejected: {
      icon: XCircle,
      color: 'bg-red-100 text-red-800',
      text: 'Rejected',
    },
    returned: {
      icon: AlertCircle,
      color: 'bg-orange-100 text-orange-800',
      text: 'Returned',
    },
  };

  const config = statusConfig[status] || statusConfig.draft;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
    >
      <Icon className="w-3 h-3 mr-1" />
      {config.text}
    </span>
  );
};

const PetitionsList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [petitions, setPetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
  });

  useEffect(() => {
    fetchPetitions();
  }, [filter, pagination.page]);

  const fetchPetitions = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (filter !== 'all') {
        params.status = filter;
      }

      const response = await api.get('/petitions', { params });

      if (response.data.success) {
        setPetitions(response.data.data);
        setPagination((prev) => ({
          ...prev,
          ...response.data.pagination,
        }));
      }
    } catch (error) {
      console.error('Error fetching petitions:', error);
      toast.error('Failed to load petitions');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (petitionId, requestNumber) => {
    try {
      const response = await api.get(`/pdfs/${petitionId}/download`, {
        responseType: 'blob',
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${requestNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      if (error.response?.status === 404) {
        toast.error('PDF not yet generated');
      } else {
        toast.error('Failed to download PDF');
      }
    }
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  if (loading && petitions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="w-8 h-8 mr-2 text-blue-600" />
            My Petitions
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            View and track your petition requests
          </p>
        </div>

        <Link
          to="/petitions/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Petition
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('draft')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'draft'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Drafts
          </button>
          <button
            onClick={() => setFilter('submitted')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'submitted'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Submitted
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'pending'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'approved'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'rejected'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Rejected
          </button>
          <button
            onClick={() => setFilter('returned')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'returned'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Returned
          </button>
        </div>
      </div>

      {/* Petitions List */}
      {petitions.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No petitions found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === 'all'
              ? 'Get started by creating a new petition.'
              : 'No petitions match the selected filter.'}
          </p>
          {filter === 'all' && (
            <div className="mt-6">
              <Link
                to="/petitions/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                New Petition
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {petitions.map((petition) => (
            <div
              key={petition.id}
              className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {petition.request_number}
                    </h3>
                    <StatusBadge status={petition.status} />
                  </div>

                  <p className="mt-1 text-sm text-gray-600">
                    {petition.type_number}. {petition.type_name}
                  </p>

                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                    <span>
                      Created: {new Date(petition.created_at).toLocaleDateString()}
                    </span>
                    {petition.submitted_at && (
                      <span>
                        Submitted:{' '}
                        {new Date(petition.submitted_at).toLocaleDateString()}
                      </span>
                    )}
                    {petition.completed_at && (
                      <span>
                        Completed:{' '}
                        {new Date(petition.completed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {petition.current_approval_step > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${
                                (petition.current_approval_step / 4) * 100
                              }%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">
                          Step {petition.current_approval_step} of 4
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => navigate(`/petitions/${petition.id}`)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                    title="View Details"
                  >
                    <Eye className="w-5 h-5" />
                  </button>

                  {petition.status !== 'draft' && (
                    <button
                      onClick={() =>
                        handleDownloadPDF(
                          petition.id,
                          petition.request_number
                        )
                      }
                      className="p-2 text-green-600 hover:bg-green-50 rounded-md"
                      title="Download PDF"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between bg-white shadow rounded-lg p-4">
          <div className="text-sm text-gray-700">
            Showing page {pagination.page} of {pagination.totalPages} (
            {pagination.totalCount} total)
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PetitionsList;
