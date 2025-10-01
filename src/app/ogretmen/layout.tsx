"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function OgretmenLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const isOnPanel = pathname?.startsWith("/ogretmen/panel");

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex items-center gap-2 text-indigo-700">
            <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span>Yükleniyor...</span>
          </div>
        </div>
      }
    >
      <div className="min-h-[100dvh] flex flex-col bg-gray-50">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/ogretmen/panel" className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                Öğretmen Paneli
              </Link>
              <span className="hidden sm:inline text-gray-300">/</span>
              {!isOnPanel && (
                <span className="hidden sm:inline text-sm text-gray-600 truncate">Dekont Yükle</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isOnPanel && (
                <button
                  type="button"
                  onClick={() => router.push("/ogretmen/panel?tab=isletmeler")}
                  className="px-3 py-1.5 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  Panele Dön
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer (opsiyonel) */}
        <footer className="bg-white/80 border-t border-gray-200 mt-auto" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}>
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 text-xs text-gray-500 flex items-center justify-between">
            <span>Okul Dekont Sistemi</span>
            <span className="hidden sm:inline">© {new Date().getFullYear()}</span>
          </div>
        </footer>
      </div>
    </Suspense>
  );
}
