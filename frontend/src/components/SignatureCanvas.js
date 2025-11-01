import React, { useRef, useState, useEffect } from 'react';
import { X, RotateCcw, Check } from 'lucide-react';
import SignaturePad from 'signature_pad';

const SignatureCanvas = ({ onSave, onCancel }) => {
  const canvasRef = useRef(null);
  const signaturePadRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    signaturePadRef.current = new SignaturePad(canvas);
  }, []);

  const clear = () => {
    signaturePadRef.current?.clear();
  };

  const save = () => {
    if (signaturePadRef.current?.isEmpty()){
      alert('Please sign before saving.');
      return;
    }
    // Get PNG format with better quality
    const dataUrl = signaturePadRef.current.toDataURL('image/png', 1.0);
    console.log('SignatureCanvas sending:', dataUrl.substring(0, 100) + '...');
    onSave && onSave(dataUrl);
  };

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={400}
        height={200}
        className="border border-gray-300 rounded"
      />
      <div className="flex gap-4 mt-4">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            clear();
          }}
        >
          <RotateCcw className="w-6 h-6" />
        </button>  
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onCancel();
          }}
        >
          <X className="w-6 h-6" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Check className="w-6 h-6" />
        </button>
      </div>
    </div>    
  )
};

export default SignatureCanvas;
