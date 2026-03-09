'use client';

import { useEffect, useState } from 'react';
import { Smartphone, RotateCw } from 'lucide-react';

export default function OrientationGuard() {
  const [isPortrait, setIsPortrait] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check if it's a mobile/tablet-sized screen and in portrait
      const mobileWidth = window.innerWidth < 1024;
      const portrait = window.innerHeight > window.innerWidth;
      
      setIsMobile(mobileWidth);
      setIsPortrait(portrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  if (!isMobile || !isPortrait) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-blue-600 flex flex-col items-center justify-center p-8 text-center text-white">
      <div className="bg-white/20 p-8 rounded-[3rem] backdrop-blur-md mb-8 animate-bounce">
        <Smartphone size={80} className="rotate-0 md:rotate-90 transition-transform duration-700" />
      </div>
      
      <h2 className="text-3xl font-black mb-4">Putar Layar Anda 🔄</h2>
      <p className="text-lg font-medium opacity-90 max-w-xs leading-relaxed">
        Aplikasi ini dioptimalkan untuk tampilan **Landscape** agar data transaksi terlihat lebih jelas dan lega.
      </p>
      
      <div className="mt-10 flex items-center gap-3 bg-white/10 px-6 py-3 rounded-full border border-white/20">
         <RotateCw size={20} className="animate-spin" />
         <span className="text-sm font-bold uppercase tracking-widest">Silakan Rotasi HP</span>
      </div>
    </div>
  );
}
