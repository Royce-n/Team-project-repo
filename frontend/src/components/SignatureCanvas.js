import React, { useRef, useState, useEffect } from 'react';
import { X, RotateCcw, Check } from 'lucide-react';

const SignatureCanvas = ({ onSave, onCancel }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState(null);
  const [mode, setMode] = useState('draw'); // 'draw' or 'type'
  const [typedText, setTypedText] = useState('');
  const [fontStyle, setFontStyle] = useState('cursive');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      setContext(ctx);

      // Set white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  useEffect(() => {
    if (mode === 'type' && typedText && context) {
      drawTypedSignature();
    }
  }, [typedText, fontStyle, mode]);

  const startDrawing = (e) => {
    if (mode !== 'draw') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.beginPath();
    context.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || mode !== 'draw') return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const startDrawingTouch = (e) => {
    if (mode !== 'draw') return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    context.beginPath();
    context.moveTo(x, y);
    setIsDrawing(true);
  };

  const drawTouch = (e) => {
    if (!isDrawing || mode !== 'draw') return;
    e.preventDefault();

    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    context.lineTo(x, y);
    context.stroke();
  };

  const drawTypedSignature = () => {
    const canvas = canvasRef.current;
    const ctx = context;

    // Clear canvas
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text
    ctx.fillStyle = '#000000';

    // Set font based on style
    const fonts = {
      cursive: '48px "Brush Script MT", cursive',
      script: '48px "Lucida Handwriting", cursive',
      elegant: '48px "Edwardian Script ITC", cursive',
      modern: '48px "Segoe Script", cursive',
      simple: '48px "Times New Roman", serif',
    };

    ctx.font = fonts[fontStyle] || fonts.cursive;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Center text
    ctx.fillText(typedText, canvas.width / 2, canvas.height / 2);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);
    setTypedText('');
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL('image/png');

    // Convert to base64 without data URI prefix
    const base64Data = dataURL.split(',')[1];

    onSave({
      imageData: base64Data,
      imageFormat: 'png',
    });
  };

  return (
    <div className="space-y-4">
      {/* Mode Selection */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => {
            setMode('draw');
            clearCanvas();
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            mode === 'draw'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Draw Signature
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('type');
            clearCanvas();
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            mode === 'type'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Type Signature
        </button>
      </div>

      {/* Type Mode Options */}
      {mode === 'type' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <input
              type="text"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Font Style
            </label>
            <select
              value={fontStyle}
              onChange={(e) => setFontStyle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="cursive">Cursive</option>
              <option value="script">Script</option>
              <option value="elegant">Elegant</option>
              <option value="modern">Modern</option>
              <option value="simple">Simple</option>
            </select>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawingTouch}
          onTouchMove={drawTouch}
          onTouchEnd={stopDrawing}
          className="w-full cursor-crosshair touch-none"
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* Instructions */}
      <p className="text-sm text-gray-600">
        {mode === 'draw' ? (
          <>
            <strong>Draw your signature</strong> using your mouse or touchscreen
            in the box above
          </>
        ) : (
          <>
            <strong>Type your name</strong> and choose a font style - your
            signature will appear above
          </>
        )}
      </p>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={clearCanvas}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Clear
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Check className="w-4 h-4 mr-2" />
          Save Signature
        </button>
      </div>
    </div>
  );
};

export default SignatureCanvas;
