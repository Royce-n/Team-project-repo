import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FileText, Save, Send, Loader2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import SignatureUpload from '../components/SignatureUpload';

const NewPetition = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [petitionTypes, setPetitionTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      petitionTypeId: '5', // Change of Major
      uhNumber: '',
      phoneNumber: '',
      mailingAddress: '',
      city: '',
      state: '',
      zip: '',
      fromMajor: '',
      toMajor: '',
      explanation: '',
    },
  });

  const selectedTypeId = watch('petitionTypeId');
  const selectedType = petitionTypes.find(
    (t) => t.id === parseInt(selectedTypeId)
  );

  useEffect(() => {
    fetchPetitionTypes();
  }, []);

  const fetchPetitionTypes = async () => {
    try {
      const response = await api.get('/petitions/types/list');
      if (response.data.success) {
        setPetitionTypes(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching petition types:', error);
      toast.error('Failed to load petition types');
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureChange = (signature) => {
    setHasSignature(!!signature);
  };

  const onSubmit = async (data, isDraft = true) => {
    if (!isDraft && !hasSignature) {
      toast.error('Please upload your signature before submitting');
      return;
    }

    setSaving(true);
    try {
      // Prepare petition data based on type
      const petitionData = {};

      if (parseInt(data.petitionTypeId) === 5) {
        // Change of Major
        petitionData.fromMajor = data.fromMajor;
        petitionData.toMajor = data.toMajor;
      }

      const payload = {
        petitionTypeId: parseInt(data.petitionTypeId),
        uhNumber: data.uhNumber,
        phoneNumber: data.phoneNumber,
        mailingAddress: data.mailingAddress,
        city: data.city,
        state: data.state,
        zip: data.zip,
        petitionData,
        explanation: data.explanation,
      };

      // Create draft petition
      const response = await api.post('/petitions', payload);

      if (response.data.success) {
        const petitionId = response.data.data.id;

        if (!isDraft) {
          // Submit petition for approval
          try {
            await api.post(`/petitions/${petitionId}/submit`);
            toast.success('Petition submitted successfully!');
          } catch (submitError) {
            console.error('Error submitting petition:', submitError);
            toast.error(
              submitError.response?.data?.error ||
                'Failed to submit petition. Saved as draft.'
            );
          }
        } else {
          toast.success('Petition saved as draft');
        }

        navigate('/petitions');
      }
    } catch (error) {
      console.error('Error saving petition:', error);
      toast.error(
        error.response?.data?.error || 'Failed to save petition'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#C8102E' }} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6 flex items-center gap-4">
        <img src="/uh_logo.png" alt="University of Houston" className="h-16 w-auto" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="w-8 h-8 mr-2" style={{ color: '#C8102E' }} />
            New Petition Request
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Complete the form below to submit a petition request. Fields marked
            with * are required.
          </p>
        </div>
      </div>

      <form className="space-y-6">
        {/* Petition Type Selection */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Petition Type</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Petition Type *
            </label>
            <select
              {...register('petitionTypeId', { required: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {petitionTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.type_number}. {type.type_name}
                </option>
              ))}
            </select>
            {selectedType && selectedType.description && (
              <p className="mt-2 text-sm text-gray-600">
                {selectedType.description}
              </p>
            )}
          </div>
        </div>

        {/* Student Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Student Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={user?.name || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
              <p className="mt-1 text-xs text-gray-500">
                Auto-filled from your account
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
              <p className="mt-1 text-xs text-gray-500">
                Auto-filled from your account
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                UH Number / HA Number *
              </label>
              <input
                type="text"
                {...register('uhNumber', { required: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 1234567"
              />
              {errors.uhNumber && (
                <p className="mt-1 text-sm text-red-600">
                  UH Number is required
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                {...register('phoneNumber')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(123) 456-7890"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mailing Address
              </label>
              <input
                type="text"
                {...register('mailingAddress')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Street address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                {...register('city')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                {...register('state')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="TX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ZIP Code
              </label>
              <input
                type="text"
                {...register('zip')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="77204"
              />
            </div>
          </div>
        </div>

        {/* Change of Major Fields */}
        {parseInt(selectedTypeId) === 5 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              Change of Major Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Major (From) *
                </label>
                <input
                  type="text"
                  {...register('fromMajor', { required: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Computer Science"
                />
                {errors.fromMajor && (
                  <p className="mt-1 text-sm text-red-600">
                    Current major is required
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Major (To) *
                </label>
                <input
                  type="text"
                  {...register('toMajor', { required: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Data Science"
                />
                {errors.toMajor && (
                  <p className="mt-1 text-sm text-red-600">
                    New major is required
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Explanation */}
        {selectedType?.requires_explanation && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              Explanation of Request *
            </h2>

            <div>
              <textarea
                {...register('explanation', { required: true })}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Please provide a detailed explanation for your petition request..."
              />
              {errors.explanation && (
                <p className="mt-1 text-sm text-red-600">
                  Explanation is required
                </p>
              )}
              <p className="mt-2 text-sm text-gray-600">
                Provide a clear and detailed explanation of why you are
                requesting this change.
              </p>
            </div>
          </div>
        )}

        {/* Signature Upload */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">
            Electronic Signature *
          </h2>

          <SignatureUpload onSignatureUploaded={handleSignatureChange} />

          <p className="mt-4 text-sm text-gray-600">
            Your signature is required to submit the petition. You can save as
            a draft without a signature and submit later.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4 bg-gray-50 p-4 rounded-lg">
          <button
            type="button"
            onClick={() => navigate('/petitions')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit((data) => onSubmit(data, true))}
            disabled={saving}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save as Draft'}
          </button>

          <button
            type="button"
            onClick={handleSubmit((data) => onSubmit(data, false))}
            disabled={saving || !hasSignature}
            className="flex items-center px-4 py-2 text-white rounded-md hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#C8102E' }}
          >
            <Send className="w-4 h-4 mr-2" />
            {saving ? 'Submitting...' : 'Submit Petition'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewPetition;
