import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Check, Loader2, Edit3 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import SignatureCanvas from './SignatureCanvas';

const SignatureUpload = ({ onSignatureUploaded, existingSignature }) => {
  const [signature, setSignature] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Load existing signature if provided
    if (existingSignature && existingSignature.imageData) {
      const imageData = existingSignature.imageData.startsWith('data:')
        ? existingSignature.imageData
        : `data:image/${existingSignature.imageFormat};base64,${existingSignature.imageData}`;
      setPreview(imageData);
      setSignature(existingSignature);
    } else {
      // Fetch user's current signature
      fetchCurrentSignature();
    }
  }, [existingSignature]);

  const fetchCurrentSignature = async () => {
    setLoading(true);
    try {
      const response = await api.get('/signatures/my-signature');
      if (response.data.success && response.data.data) {
        const sig = response.data.data;
        const imageData = sig.imageData.startsWith('data:')
          ? sig.imageData
          : `data:image/${sig.imageFormat};base64,${sig.imageData}`;
        setPreview(imageData);
        setSignature(sig);
        if (onSignatureUploaded) {
          onSignatureUploaded(sig);
        }
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error fetching signature:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PNG, JPG, or SVG image');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setPreview(base64String);

      // Extract base64 data without data URI prefix
      const base64Data = base64String.split(',')[1];

      // Determine image format
      let imageFormat = 'png';
      if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
        imageFormat = 'jpg';
      } else if (file.type === 'image/svg+xml') {
        imageFormat = 'svg';
      }

      // Upload signature
      uploadSignature(base64Data, imageFormat);
    };

    reader.readAsDataURL(file);
  };

  const uploadSignature = async (imageData, imageFormat) => {
    setUploading(true);
    try {
      // Upload signature
      const response = await api.post('/signatures/upload', {
        imageData,
        imageFormat,
      });

      if (response.data.success) {
        toast.success('Signature uploaded successfully');
        setSignature(response.data.data);
        if (onSignatureUploaded) {
          onSignatureUploaded(response.data.data);
        }
      }
    } catch (error) {
      console.error('Error uploading signature:', error);
      toast.error(
        error.response?.data?.error || 'Failed to upload signature'
      );
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  // normalize a data URL or object to { base64, format }
  // Acceptable inputs:
  //  - "data:image/png;base64,...."
  //  - { dataUrl: "data:image/png;base64,..." }  (in case your SignatureCanvas returns an object)
  const normalizeDataUrl = (dataUrlOrObj) => {
    const dataUrl = typeof dataUrlOrObj === 'string'
      ? dataUrlOrObj
      : dataUrlOrObj?.dataUrl || dataUrlOrObj?.imageDataUrl || dataUrlOrObj?.imageData || null;

    if (!dataUrl) return null;

    // match png, jpeg, jpg, svg+xml
    const matches = dataUrl.match(/^data:image\/(png|jpeg|jpg|svg\+xml);base64,(.*)$/);
    if (!matches) {
      // Not a base64 image data URL we recognized.
      return null;
    }

    let format = matches[1];
    if (format === 'jpeg') format = 'jpg';
    const base64 = matches[2];
    return { base64, format };
  };
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your signature?')) {
      return;
    }

    try {
      await api.delete('/signatures/my-signature');
      toast.success('Signature deleted successfully');
      setSignature(null);
      setPreview(null);
      if (onSignatureUploaded) {
        onSignatureUploaded(null);
      }
    } catch (error) {
      console.error('Error deleting signature:', error);
      toast.error(
        error.response?.data?.error || 'Failed to delete signature'
      );
    }
  };

  const handleCanvasSave = async (dataUrl) => {
    if (!dataUrl) {
      toast.error('No signature data received');
      return;
    }

    console.log('Received data URL:', dataUrl.substring(0, 100) + '...');
    
    // Make sure we have a proper data URL
    if (!dataUrl.startsWith('data:image/png;base64,')) {
      toast.error('Invalid signature format');
      return;
    }

    // Set preview immediately for better UX
    setPreview(dataUrl);
    
    try {
      // Extract base64 data without the data URL prefix
      const base64Data = dataUrl.split(',')[1];
      console.log('Extracted base64:', base64Data.substring(0, 100) + '...');
      
      // Upload using the same format as file upload
      await uploadSignature(base64Data, 'png');
      setShowCanvas(false);
    } catch (error) {
      console.error('Save error details:', error.response?.data);
      setPreview(null);
      toast.error(error.response?.data?.error || 'Failed to save signature');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        <span className="ml-2 text-gray-600">Loading signature...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        {preview ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">
                Your Signature
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleUploadClick}
                  disabled={uploading}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Change'}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={uploading}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded p-4 flex items-center justify-center min-h-[120px]">
              <img
                src={preview}
                alt="Signature preview"
                className="max-h-24 max-w-full object-contain"
              />
            </div>

            {signature && (
              <div className="flex items-center text-sm text-green-600">
                <Check className="w-4 h-4 mr-1" />
                <span>
                  Signature uploaded on{' '}
                  {new Date(signature.uploadedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        ) : showCanvas ? (
          <SignatureCanvas
            onSave={handleCanvasSave}
            onCancel={() => setShowCanvas(false)}
          />
        ) : (
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => setShowCanvas(true)}
                disabled={uploading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Create Signature
              </button>
              <div className="text-sm text-gray-500">or</div>
              <button
                type="button"
                onClick={handleUploadClick}
                disabled={uploading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image
                  </>
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Draw, type your name, or upload PNG/JPG (max 2MB)
            </p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> Your signature will be used to electronically
          sign petition forms. Please ensure it represents your actual
          signature.
        </p>
      </div>
    </div>
  );
};

export default SignatureUpload;
