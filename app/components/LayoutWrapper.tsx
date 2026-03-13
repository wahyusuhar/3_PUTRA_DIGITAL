'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <main className="flex-1 min-h-screen">{children}</main>;
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 lg:ml-60 min-h-screen lg:h-screen p-3 md:p-4 transition-all overflow-y-auto lg:overflow-hidden flex flex-col w-full">
        {children}
      </main>
    </>
  );
}
