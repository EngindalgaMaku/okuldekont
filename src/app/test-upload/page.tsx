"use client";

import { useEffect, useRef, useState } from "react";

export default function TestUploadPage() {
  const [env, setEnv] = useState({ ua: "", width: 0, height: 0 });
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("Hazır");
  const [responseText, setResponseText] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setEnv({
      ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
      width: typeof window !== "undefined" ? window.innerWidth : 0,
      height: typeof window !== "undefined" ? window.innerHeight : 0,
    });

    const onVis = () => console.log("[test-upload] visibility:", document.visibilityState);
    const onBH = () => console.log("[test-upload] pagehide");
    const onBU = () => console.log("[test-upload] beforeunload");
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onBH);
    window.addEventListener("beforeunload", onBU);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onBH);
      window.removeEventListener("beforeunload", onBU);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setStatus(f ? `Seçildi: ${f.name} (${f.type || "unknown"}, ${f.size} bytes)` : "Hazır");
  };

  const handleSubmit = async () => {
    if (!file) {
      setStatus("Dosya seçin");
      return;
    }
    try {
      setStatus("Yükleniyor...");
      const fd = new FormData();
      fd.append("dosya", file);
      fd.append("note", "test-upload");
      const res = await fetch("/api/test-upload", { method: "POST", body: fd });
      const text = await res.text();
      setResponseText(text);
      setStatus(res.ok ? "Yüklendi" : `Hata: ${res.status}`);
    } catch (err: any) {
      setStatus(`Hata: ${err?.message || err}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-4">
      <h1 className="text-xl font-bold">Test Upload (Mobil İzolasyon)</h1>

      <div className="text-xs text-gray-600 p-2 bg-white rounded border">
        <div>UA: {env.ua}</div>
        <div>
          Size: {env.width} x {env.height}
        </div>
      </div>

      <div className="space-y-2 p-4 bg-white rounded border">
        <label className="block text-sm font-medium">Native File Input</label>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="block w-full"
          onChange={handleChange}
        />
        <div className="text-sm text-gray-700">Durum: {status}</div>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded bg-indigo-600 text-white text-sm"
            onClick={handleSubmit}
          >
            Yükle
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded bg-gray-200 text-gray-800 text-sm"
            onClick={() => {
              setFile(null);
              setResponseText("");
              setStatus("Hazır");
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            Sıfırla
          </button>
        </div>
      </div>

      {responseText && (
        <pre className="whitespace-pre-wrap text-xs p-3 bg-gray-900 text-green-300 rounded overflow-auto">
{responseText}
        </pre>
      )}

      <div className="p-3 text-xs text-gray-600">
        - Bu sayfa modal, dropzone, navigation gibi karmaşıklıklar olmadan yüklemeyi test eder.
        Mobilde sayfa reload veya navigasyon olursa tekrar bildirin.
      </div>
    </div>
  );
}
