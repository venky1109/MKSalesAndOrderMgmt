// src/components/BarcodeScanner.js
import { BrowserMultiFormatReader } from '@zxing/browser';
import { useEffect, useRef } from 'react';

const BarcodeScanner = ({ onDetected, onClose }) => {
  const videoRef = useRef(null);
  const codeReader = useRef(null);

  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();

    codeReader.current.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
      if (result) {
        onDetected(result.getText());
        codeReader.current.reset();
        onClose();
      }
    });

    return () => {
      codeReader.current.reset();
    };
  }, [onDetected, onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50">
      <video ref={videoRef} className="w-full max-w-sm rounded shadow-lg" />
      <button
        onClick={() => {
          codeReader.current.reset();
          onClose();
        }}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
      >
        Cancel
      </button>
    </div>
  );
};

export default BarcodeScanner;
