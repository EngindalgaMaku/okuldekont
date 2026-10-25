"use client";

import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { Loader2, ShieldCheck } from "lucide-react";

export const DONUS_ANAHTARI = "kpanel:yoneticiDonus";

// Yönetici bir öğretmenin hesabına geçtiğinde her sayfada görünen şerit
export default function YoneticiOturumu() {
  const { data: session } = useSession();
  const [donuluyor, setDonuluyor] = useState(false);

  const yonetici = session?.user?.impersonatedBy;
  if (!yonetici || session?.user?.role !== "TEACHER") return null;

  const yoneticiyeDon = async () => {
    setDonuluyor(true);
    let token: string | null = null;
    try {
      token = sessionStorage.getItem(DONUS_ANAHTARI);
    } catch {}
    try {
      if (token) {
        const sonuc = await signIn("yonetici-donus", { token, redirect: false });
        if (!sonuc?.error) {
          try {
            sessionStorage.removeItem(DONUS_ANAHTARI);
          } catch {}
          window.location.href = "/yonetim";
          return;
        }
      }
      // Dönüş belirteci yoksa veya süresi dolduysa yönetici yeniden giriş yapar
      await signOut({ callbackUrl: "/yonetim" });
    } catch {
      setDonuluyor(false);
    }
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[250] flex justify-center px-3"
      style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full bg-slate-900 py-1.5 pl-3 pr-1.5 text-sm font-medium text-white shadow-lg ring-2 ring-amber-400">
        <ShieldCheck className="h-4 w-4 shrink-0 text-amber-300" />
        <span className="truncate">Yönetici olarak · {session.user.name || "öğretmen"}</span>
        <button
          type="button"
          onClick={yoneticiyeDon}
          disabled={donuluyor}
          className="flex shrink-0 items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-70"
        >
          {donuluyor && <Loader2 className="h-3 w-3 animate-spin" />}
          Yöneticiye dön
        </button>
      </div>
    </div>
  );
}
