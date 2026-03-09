'use client';

import React from 'react';
import { AlertCircle, Trash2, X, Info } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'confirm' | 'alert' | 'delete';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ isOpen, title, message, type, onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'delete': return <Trash2 className="text-red-500" size={32} />;
      case 'alert': return <AlertCircle className="text-blue-500" size={32} />;
      case 'confirm': return <Info className="text-blue-500" size={32} />;
      default: return <AlertCircle className="text-blue-500" size={32} />;
    }
  };

  const getButtonClass = () => {
    switch (type) {
      case 'delete': return 'bg-red-600 hover:bg-red-700 shadow-red-100';
      case 'alert': return 'bg-blue-600 hover:bg-blue-700 shadow-blue-100';
      case 'confirm': return 'bg-blue-600 hover:bg-blue-700 shadow-blue-100';
      default: return 'bg-blue-600 hover:bg-blue-700 shadow-blue-100';
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      ></div>

      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="absolute top-6 right-6">
          <button 
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 sm:p-10 pt-12 text-center">
          <div className="inline-flex p-5 bg-gray-50 rounded-[2rem] mb-6">
            {getIcon()}
          </div>
          
          <h3 className="text-2xl font-black text-gray-800 tracking-tight mb-3">
            {title}
          </h3>
          <p className="text-gray-500 font-medium leading-relaxed px-2">
            {message}
          </p>
        </div>

        <div className="flex gap-3 p-8 sm:p-10 pt-0">
          {type !== 'alert' && (
            <button
              onClick={onCancel}
              className="flex-1 py-4 px-6 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all active:scale-95"
            >
              Batal
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`flex-1 py-4 px-6 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 ${getButtonClass()}`}
          >
            {type === 'delete' ? 'Ya, Hapus' : 'Oke, Lanjut'}
          </button>
        </div>
      </div>
    </div>
  );
}
