import React from 'react';
import { X } from 'lucide-react';

const Dialog = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

const DialogHeader = ({ children, onClose }) => (
  <div className="flex items-center justify-between p-6 border-b">
    <div className="flex-1">
      {children}
    </div>
    {onClose && (
      <button
        onClick={onClose}
        className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    )}
  </div>
);

const DialogTitle = ({ children }) => (
  <h2 className="text-lg font-semibold text-gray-900">
    {children}
  </h2>
);

const DialogContent = ({ children }) => (
  <div className="p-6">
    {children}
  </div>
);

const DialogFooter = ({ children }) => (
  <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
    {children}
  </div>
);

export { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter };