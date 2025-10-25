import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FileText, Save, Send, Loader2, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import SignatureUpload from '../components/SignatureUpload';

const EditPetition = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [petition, setPetition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm();

  const selectedTypeId = watch('petitionTypeId');

  useEffect(() => {
    fetchPetition();
  }, [id]);

  const fetchPetition = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/petitions/${id}`);
      if (response.data.success) {
        const petitionData = response.data.data.petition;

        // Check if it's a draft
        if (petitionData.status !== 'draft') {
          toast.error('Only draft petitions can be edited');
          navigate('/petitions');
          return;
        }

        // Check if user owns this petition
        if (petitionData.user_id !== user?.id) {
          toast.error('Access denied');
          navigate('/petitions');
          return;
        }

        setPetition(petitionData);

        // Parse petition_data
        const parsedData =
          typeof petitionData.petition_data === 'string'
            ? JSON.parse(petitionData.petition_data)
            : petitionData.petition_data;

        // Set form values
        setValue('petitionTypeId', petitionData.petition_type_id);
        setValue('uhNumber', petitionData.uh_number);
        setValue('phoneNumber', petitionData.phone_number || '');
        setValue('mailingAddress', petitionData.mailing_address || '');
        setValue('city', petitionData.city || '');
        setValue('state', petitionData.state || '');
        setValue('zip', petitionData.zip || '');
        setValue('explanation', petitionData.explanation || '');

        // Set petition-specific fields
        if (parsedData.fromMajor) setValue('fromMajor', parsedData.fromMajor);
        if (parsedData.toMajor) setValue('toMajor', parsedData.toMajor);
      }
    } catch (error) {
      console.error('Error fetching petition:', error);
      toast.error('Failed to load petition');
      navigate('/petitions');
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureChange = (signature) => {
    setHasSignature(!!signature);
  };

  const onSubmit = async (data, shouldSubmit = false) => {
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

      // Update petition
      await api.put(`/petitions/${id}`, payload);

      if (shouldSubmit) {
        // Submit petition for approval
        if (!hasSignature) {
          toast.error('Please upload your signature before submitting');
          return;
        }

        try {
          await api.post(`/petitions/${id}/submit`);
          toast.success('Petition updated and submitted successfully!');
        } catch (submitError) {
          console.error('Error submitting petition:', submitError);
          toast.error(
            submitError.response?.data?.error ||
              'Failed to submit petition. Changes saved as draft.'
          );
        }
      } else {
        toast.success('Petition updated successfully');
      }

      navigate('/petitions');
    } catch (error) {
      console.error('Error updating petition:', error);
      toast.error(error.response?.data?.error || 'Failed to update petition');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!petition) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/petitions')}
          className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Petitions
        </button>

        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <FileText className="w-8 h-8 mr-2 text-blue-600" />
          Edit Petition Draft
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {petition.request_number} - Make changes to your draft petition
        </p>
      </div>

      <form className="space-y-6">
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                UH Number *
              </label>
              <input
                type="text"
                {...register('uhNumber', { required: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.uhNumber && (
                <p className="mt-1 text-sm text-red-600">UH Number is required</p>
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
                />
                {errors.fromMajor && (
                  <p className="mt-1 text-sm text-red-600">Current major is required</p>
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
                />
                {errors.toMajor && (
                  <p className="mt-1 text-sm text-red-600">New major is required</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Explanation */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Explanation of Request</h2>

          <div>
            <textarea
              {...register('explanation', { required: true })}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Please provide a detailed explanation for your petition request..."
            />
            {errors.explanation && (
              <p className="mt-1 text-sm text-red-600">Explanation is required</p>
            )}
          </div>
        </div>

        {/* Signature Upload */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Electronic Signature</h2>

          <SignatureUpload onSignatureUploaded={handleSignatureChange} />

          <p className="mt-4 text-sm text-gray-600">
            Your signature is required to submit the petition. You can save as a
            draft without a signature and submit later.
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
            onClick={handleSubmit((data) => onSubmit(data, false))}
            disabled={saving}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          <button
            type="button"
            onClick={handleSubmit((data) => onSubmit(data, true))}
            disabled={saving || !hasSignature}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4 mr-2" />
            {saving ? 'Submitting...' : 'Submit Petition'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditPetition;
