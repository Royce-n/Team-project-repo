import React from 'react';
import { useQuery } from 'react-query';
import { api } from '../services/api';
import { ExternalLink, FileText, Loader } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-hot-toast';

const ExternalForms = () => {
  const { data, isLoading, error } = useQuery(
    'externalForms',
    async () => {
      const response = await api.get('/external-forms');
      return response.data;
    },
    {
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      retry: 2,
      onError: (error) => {
        console.error('Error fetching external forms:', error);
        toast.error('Failed to load external forms');
      }
    }
  );

  const handleFormRedirect = (formLink, formName) => {
    // Open the external form in a new tab
    window.open(formLink, '_blank', 'noopener,noreferrer');
    toast.success(`Opening ${formName}...`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">External Forms</h1>
          <p className="mt-1 text-sm text-gray-500">
            Access forms from our integrated partner system
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Failed to load external forms
              </h3>
              <p className="mt-2 text-sm text-red-700">
                {error.response?.data?.error || error.message || 'An error occurred while fetching forms'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const forms = data?.forms || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">External Forms</h1>
        <p className="mt-1 text-sm text-gray-500">
          Access forms from our integrated partner system at {data?.source}
        </p>
      </div>

      {/* Forms Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {forms.map((form) => (
          <div
            key={form.form_code}
            className="bg-white overflow-hidden shadow-lg rounded-lg border-2 hover:shadow-xl transition-shadow duration-200"
            style={{ borderColor: '#C8102E', backgroundColor: 'rgba(200, 16, 46, 0.02)' }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-md" style={{ backgroundColor: 'rgba(200, 16, 46, 0.1)' }}>
                    <FileText className="h-8 w-8" style={{ color: '#C8102E' }} />
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {form.name}
              </h3>

              <p className="text-sm text-gray-500 mb-4">
                Form Code: <span className="font-mono text-gray-700">{form.form_code}</span>
              </p>

              <button
                onClick={() => handleFormRedirect(form.link, form.name)}
                className="w-full flex items-center justify-center px-4 py-2 border-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
                style={{
                  borderColor: '#C8102E',
                  backgroundColor: '#C8102E',
                  color: 'white'
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Form
              </button>

              <p className="mt-3 text-xs text-gray-400 text-center">
                This will open in a new tab
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              About External Forms
            </h3>
            <p className="mt-2 text-sm text-blue-700">
              These forms are hosted by our partner team at arlington.rindeer.com.
              When you click "Open Form", you'll be redirected to their system to complete the form.
              Your session will be maintained, and you can return here at any time.
            </p>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {forms.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No forms available</h3>
          <p className="mt-1 text-sm text-gray-500">
            There are currently no external forms available.
          </p>
        </div>
      )}
    </div>
  );
};

export default ExternalForms;
