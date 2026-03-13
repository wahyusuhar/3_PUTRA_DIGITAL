'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/app/lib/supabase';
import { useNotification } from './NotificationProvider';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { playSound } = useNotification();

  useEffect(() => {
    // Check active sessions and sets the user
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error checking user session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (_event === 'SIGNED_IN') {
        router.push('/');
      } else if (_event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // Protection Logic
  useEffect(() => {
    if (!loading && !isLoggingOut) {
      const isLoginPage = pathname === '/login';
      if (!user && !isLoginPage) {
        router.push('/login');
      } else if (user && isLoginPage) {
        router.push('/');
      }
    }
  }, [user, loading, pathname, router, isLoggingOut]);

  const signOut = async () => {
    setIsLoggingOut(true);
    playSound('logout');
    
    // Give time for sound to start and user to see loading
    await new Promise(resolve => setTimeout(resolve, 800));
    
    await supabase.auth.signOut();
    setIsLoggingOut(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {isLoggingOut && (
        <div className="fixed inset-0 z-[200] bg-white/60 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-500">
           <div className="relative">
              <div className="w-16 h-16 border-4 border-red-100 border-t-red-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-8 h-8 bg-red-600 rounded-lg animate-pulse"></div>
              </div>
           </div>
           <p className="mt-6 text-sm font-black text-red-900 tracking-[0.2em] animate-pulse uppercase">Mengakhiri Sesi...</p>
        </div>
      )}
      {!loading ? children : (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
          <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 animate-pulse">
            Authenticating
          </p>
        </div>
      )}
    </AuthContext.Provider>
  );
};
