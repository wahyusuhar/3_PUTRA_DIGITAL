'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CheckCircle, XCircle, Info, X, Users, Wallet, ShoppingBag } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

type ToastType = 'success' | 'error' | 'info' | 'member' | 'payment' | 'transaction';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface NotificationContextType {
  showToast: (message: string, type: ToastType, voiceText?: string) => void;
  playSound: (type: ToastType) => void;
  speak: (text: string) => void;
  confirm: (message: string, title?: string, type?: 'confirm' | 'delete') => Promise<boolean>;
  showModalAlert: (message: string, title?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};

// Sound URLs
const SOUNDS = {
  member: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Soft welcome
  payment: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3', // Cha-ching shimmer
  transaction: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Confirm ding
  error: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3', // Error blunt
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'confirm' | 'alert' | 'delete';
    resolve?: (value: boolean) => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm'
  });

  const playSound = (type: ToastType) => {
    let soundUrl = '';
    if (type === 'member') soundUrl = SOUNDS.member;
    else if (type === 'payment') soundUrl = SOUNDS.payment;
    else if (type === 'transaction' || type === 'success' || type === 'info') soundUrl = SOUNDS.transaction;
    else if (type === 'error') soundUrl = SOUNDS.error;

    if (soundUrl) {
      const audio = new Audio(soundUrl);
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Audio play failed:', e));
    }
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;
    
    window.speechSynthesis.speak(utterance);
  };

  const showToast = (message: string, type: ToastType, voiceText?: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    if (voiceText) {
      speak(voiceText);
    } else {
      playSound(type);
    }

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const confirm = (message: string, title: string = 'Konfirmasi', type: 'confirm' | 'delete' = 'confirm'): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalConfig({
        isOpen: true,
        title,
        message,
        type,
        resolve
      });
    });
  };

  const showModalAlert = (message: string, title: string = 'Pemberitahuan') => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type: 'alert'
    });
  };

  const handleModalConfirm = () => {
    if (modalConfig.resolve) modalConfig.resolve(true);
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  const handleModalCancel = () => {
    if (modalConfig.resolve) modalConfig.resolve(false);
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <NotificationContext.Provider value={{ showToast, playSound, speak, confirm, showModalAlert }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              pointer-events-auto flex items-center gap-4 p-5 rounded-[1.5rem] shadow-2xl border min-w-[320px] max-w-md
              animate-in slide-in-from-right fade-in duration-300
              ${t.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' : 
                t.type === 'member' ? 'bg-blue-50 border-blue-100 text-blue-800' :
                t.type === 'payment' ? 'bg-green-50 border-green-100 text-green-800' :
                'bg-white border-gray-100 text-gray-800'}
            `}
          >
            <div className={`p-2 rounded-xl ${
              t.type === 'error' ? 'bg-red-600 text-white' :
              t.type === 'member' ? 'bg-blue-600 text-white' :
              t.type === 'payment' ? 'bg-green-600 text-white' :
              'bg-indigo-600 text-white'
            }`}>
              {t.type === 'error' && <XCircle size={20} />}
              {t.type === 'member' && <Users size={20} />}
              {t.type === 'payment' && <Wallet size={20} />}
              {(t.type === 'transaction' || t.type === 'success') && <ShoppingBag size={20} />}
              {t.type === 'info' && <Info size={20} />}
            </div>
            
            <div className="flex-1">
               <p className="text-xs font-black uppercase tracking-widest opacity-40 mb-0.5">Notification</p>
               <p className="font-bold text-sm leading-tight">{t.message}</p>
            </div>

            <button onClick={() => removeToast(t.id)} className="p-1 hover:bg-black/5 rounded-lg transition-colors">
              <X size={16} className="opacity-30" />
            </button>
          </div>
        ))}
      </div>
      <ConfirmModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />
    </NotificationContext.Provider>
  );
};
