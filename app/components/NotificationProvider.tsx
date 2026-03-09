'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CheckCircle, XCircle, Info, X, Users, Wallet, ShoppingBag } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'member' | 'payment' | 'transaction';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface NotificationContextType {
  showToast: (message: string, type: ToastType) => void;
  playSound: (type: ToastType) => void;
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

  const showToast = (message: string, type: ToastType) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    playSound(type);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showToast, playSound }}>
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
    </NotificationContext.Provider>
  );
};
