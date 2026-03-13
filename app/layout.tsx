import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import OrientationGuard from "./components/OrientationGuard";
import { NotificationProvider } from "./components/NotificationProvider";
import { AuthProvider } from "./components/AuthProvider";
import LayoutWrapper from "@/app/components/LayoutWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "3 Putra Digital - Catat Hutang",
  description: "Aplikasi digitalisasi toko untuk pencatatan transaksi dan hutang",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 flex flex-col lg:flex-row min-h-screen`}
      >
        <NotificationProvider>
          <AuthProvider>
            <OrientationGuard />
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </AuthProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}