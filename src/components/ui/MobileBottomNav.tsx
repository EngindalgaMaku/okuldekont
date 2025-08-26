"use client";

import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Home, Building2, User, Users, FileText, Receipt, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { useSession, signOut } from "next-auth/react";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  tab?: string; // optional tab id for panel routes
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  // If user is not authenticated, do not show the mobile bottom nav at all
  if (status !== "authenticated") {
    return null;
  }

  const role = session?.user?.role as string | undefined;

  let items: NavItem[];
  if (role === "COMPANY") {
    // İşletme girişi menüsü: Öğrenciler, Dekontlar, Belgeler
    items = [
      { label: "Öğrenciler", href: "/isletme?tab=ogrenciler", tab: "ogrenciler", icon: <Users className="h-5 w-5" /> },
      { label: "Dekontlar", href: "/isletme?tab=dekontlar", tab: "dekontlar", icon: <Receipt className="h-5 w-5" /> },
      { label: "Belgeler", href: "/isletme?tab=belgeler", tab: "belgeler", icon: <FileText className="h-5 w-5" /> },
    ];
  } else if (role === "TEACHER") {
    // Öğretmen girişi menüsü: İşletmeler, Dekont Listesi, Belgeler
    items = [
      { label: "İşletmeler", href: "/ogretmen/panel?tab=isletmeler", tab: "isletmeler", icon: <Building2 className="h-5 w-5" /> },
      { label: "Dekont Listesi", href: "/ogretmen/panel?tab=dekontlar", tab: "dekontlar", icon: <Receipt className="h-5 w-5" /> },
      { label: "Belgeler", href: "/ogretmen/panel?tab=belgeler", tab: "belgeler", icon: <FileText className="h-5 w-5" /> },
    ];
  } else {
    // Authenticated but no specific role: default to empty nav
    items = [];
  }

  // Hide on admin and print routes
  const isPrintLike = pathname?.startsWith("/gorev-belgesi") || pathname?.includes("/yazdir");
  const hideOnRoute = pathname?.startsWith("/admin") || pathname?.startsWith("/print") || isPrintLike;
  // Hide on login and keypad/pin screens
  const isAuthScreens = pathname?.includes("/login") || pathname?.includes("/keypad") || pathname?.includes("/pin");
  if (hideOnRoute || isAuthScreens) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-[100] border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80"
      role="navigation"
      aria-label="Alt menü"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0px)" }}
    >
      <ul className={`grid ${
        (items.length + (session ? 1 : 0)) === 2 ? "grid-cols-2" :
        (items.length + (session ? 1 : 0)) === 3 ? "grid-cols-3" :
        (items.length + (session ? 1 : 0)) === 4 ? "grid-cols-4" : "grid-cols-5"
      }`}>
        {items.map((item) => {
          // Aktiflik: panel sayfalarında tab parametresi ile kontrol
          const basePath = item.href.split("?")[0];
          const tabParam = searchParams?.get("tab");
          const isPanel = basePath === "/isletme" || basePath === "/ogretmen/panel";
          // Default tab if no tab param present
          const defaultPanelTab = basePath === "/ogretmen/panel" ? "isletmeler" : basePath === "/isletme" ? "ogrenciler" : undefined;
          const isItemActiveOnPanel = () => {
            if (!pathname?.startsWith(basePath)) return false;
            if (!item.tab) return true; // non-tabbed item under same base
            if (tabParam) return tabParam === item.tab;
            // No tab in URL: fallback to default panel tab
            return item.tab === defaultPanelTab;
          };
          const active = isPanel ? isItemActiveOnPanel() : (pathname === basePath || (basePath !== "/" && pathname?.startsWith(basePath)));
          return (
            <li key={`${item.href}-${item.label}`} className="flex">
              <button
                type="button"
                onClick={() => router.push(item.href)}
                className={
                  "flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium rounded-md transition-colors " +
                  (active ? "text-indigo-600 bg-indigo-50" : "text-gray-500 hover:text-gray-700")
                }
                aria-current={active ? "page" : undefined}
              >
                <span className={"mb-1 " + (active ? "text-indigo-600" : "text-gray-500")}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
        {session && (
          <li key="logout" className="flex">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium text-gray-500 hover:text-red-600 transition-colors"
              aria-label="Çıkış Yap"
              title="Çıkış Yap"
              type="button"
            >
              <span className="mb-1"><LogOut className="h-5 w-5" /></span>
              <span>Çıkış</span>
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
}
