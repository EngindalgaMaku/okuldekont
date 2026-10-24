"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { installDemoFetch, isDemoActive, stopDemoMode } from "@/lib/demo-mode";

// Oturum kontrolü dahil hiçbir istek atılmadan önce kurulsun (render'ı beklemeden)
installDemoFetch();

export default function DemoMode() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isDemoActive());
  }, [pathname]);

  if (!active) return null;

  const exitDemo = () => {
    stopDemoMode();
    window.location.href = "/";
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[250] flex justify-center px-4"
      style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-amber-500 py-1.5 pl-3 pr-1.5 text-sm font-medium text-white shadow-lg">
        <FlaskConical className="h-4 w-4" />
        Demo modu · örnek veriler
        <button
          type="button"
          onClick={exitDemo}
          className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold hover:bg-white/30 active:bg-white/40"
        >
          Demodan çık
        </button>
      </div>
    </div>
  );
}
