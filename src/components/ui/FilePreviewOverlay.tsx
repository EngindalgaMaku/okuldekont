"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, FileWarning, Loader2 } from "lucide-react";

// Android uygulamasındaki WebView PDF gösteremediği için dekont/belge önizlemesi
// bu katmanda yapılır: PDF'ler pdf.js ile çizilir, resimler doğrudan gösterilir.

interface PreviewRequest {
  src: string;
  downloadUrl?: string;
  title?: string;
}

const OPEN_EVENT = "open-file-preview";

// Yalnızca kendi sunucumuzdaki dosya adreslerine izin ver
const isSafeUrl = (url?: string) =>
  !!url && url.startsWith("/") && !url.startsWith("//") && !url.includes("..");

export const isAppMode = () =>
  typeof document !== "undefined" && !!document.documentElement.dataset.app;

export function openFilePreview(request: PreviewRequest) {
  window.dispatchEvent(new CustomEvent<PreviewRequest>(OPEN_EVENT, { detail: request }));
}

// Aynı dosya tekrar açıldığında (ör. inceleme ekranından büyütme) yeniden indirilmesin
const fileCache = new Map<string, Promise<{ type: string; blob: Blob }>>();
const FILE_CACHE_LIMIT = 6;

function loadFile(src: string) {
  let entry = fileCache.get(src);
  if (!entry) {
    entry = fetch(src, { credentials: "same-origin" }).then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { type: res.headers.get("content-type") || "", blob: await res.blob() };
    });
    entry.catch(() => fileCache.delete(src));
    fileCache.set(src, entry);
    if (fileCache.size > FILE_CACHE_LIMIT) {
      const oldest = fileCache.keys().next().value;
      if (oldest !== undefined) fileCache.delete(oldest);
    }
  }
  return entry;
}

// Sıradaki dosyayı arka planda indirip hazır tutar
export function prefetchFile(src?: string) {
  if (src && isSafeUrl(src)) loadFile(src).catch(() => {});
}

// Resmi doğrudan, PDF'i pdf.js ile kapsayıcı genişliğinde çizer
export function FileViewer({ src, alt }: { src: string; alt?: string }) {
  const [state, setState] = useState<"loading" | "pdf" | "image" | "error">("loading");
  const [imageUrl, setImageUrl] = useState("");
  const pagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSafeUrl(src)) {
      setState("error");
      return;
    }
    let cancelled = false;
    let objectUrl = "";
    setState("loading");
    setImageUrl("");
    if (pagesRef.current) pagesRef.current.innerHTML = "";

    (async () => {
      try {
        const { type, blob } = await loadFile(src);
        if (cancelled) return;

        if (type.startsWith("image/")) {
          objectUrl = URL.createObjectURL(blob);
          setImageUrl(objectUrl);
          setState("image");
          return;
        }

        if (!type.includes("pdf")) throw new Error(`Desteklenmeyen tür: ${type}`);

        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.js",
          import.meta.url
        ).toString();
        // isEvalSupported: false — pdf.js 3.x'teki kötü amaçlı PDF ile kod çalıştırma açığını kapatır
        const doc = await pdfjs.getDocument({
          data: new Uint8Array(await blob.arrayBuffer()),
          isEvalSupported: false,
        }).promise;
        if (cancelled) return;
        setState("pdf");

        const container = pagesRef.current;
        if (!container) return;
        container.innerHTML = "";
        const width = container.clientWidth;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);

        for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
          const page = await doc.getPage(pageNumber);
          if (cancelled) return;
          const baseViewport = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (width / baseViewport.width) * pixelRatio });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.className = "block rounded-lg bg-white shadow-md";
          container.appendChild(canvas);
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Canvas kullanılamıyor");
          await page.render({ canvasContext: context, viewport }).promise;
        }
      } catch (error) {
        console.error("Önizleme hatası:", error);
        if (!cancelled) setState("error");
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  return (
    <div className="relative min-h-full">
      {state === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="mt-3 text-sm">Dekont yükleniyor...</p>
        </div>
      )}
      {state === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center text-slate-300">
          <FileWarning className="h-10 w-10" />
          <p className="mt-3 font-medium text-white">Dosya önizlenemedi</p>
          <p className="mt-1 text-sm">İndir düğmesiyle dosyayı telefonunuza kaydedebilirsiniz.</p>
        </div>
      )}
      {state === "image" && imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={alt || "Dekont"} className="mx-auto max-w-full rounded-lg bg-white shadow-md" />
      )}
      {/* PDF sayfaları buraya çizilir; genişliği ölçülebilsin diye her zaman yerinde */}
      <div ref={pagesRef} className={`mx-auto max-w-3xl space-y-3 ${state === "pdf" ? "" : "invisible h-0 overflow-hidden"}`} />
    </div>
  );
}

export default function FilePreviewOverlay() {
  const [request, setRequest] = useState<PreviewRequest | null>(null);

  const close = useCallback(() => {
    // Geçmişe eklediğimiz kaydı geri alarak kapat; popstate dinleyicisi temizliği yapar
    if (window.history.state?.filePreview) {
      window.history.back();
    } else {
      setRequest(null);
    }
  }, []);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<PreviewRequest>).detail;
      if (!isSafeUrl(detail?.src)) return;
      // Android geri tuşu önizlemeyi kapatsın, sayfadan çıkmasın
      window.history.pushState({ ...(window.history.state || {}), filePreview: true }, "");
      setRequest(detail);
    };
    const onPopState = () => {
      if (!window.history.state?.filePreview) setRequest(null);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    if (!request) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [request]);

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-slate-900" role="dialog" aria-modal="true" aria-label="Önizleme">
      <div
        className="flex items-center gap-2 bg-indigo-700 px-2 py-2 text-white shadow"
        style={{ paddingTop: "max(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)), 0.5rem)" }}
      >
        <button
          type="button"
          onClick={close}
          className="rounded-full p-2 hover:bg-white/10 active:bg-white/20"
          aria-label="Kapat"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <p className="min-w-0 flex-1 truncate font-medium">{request.title || "Önizleme"}</p>
        {isSafeUrl(request.downloadUrl) && (
          <a
            href={request.downloadUrl}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-sm font-medium hover:bg-white/25 active:bg-white/30"
          >
            <Download className="h-4 w-4" />
            İndir
          </a>
        )}
      </div>

      <div className="relative flex-1 overflow-y-auto overscroll-contain p-3">
        <FileViewer key={request.src} src={request.src} alt={request.title} />
      </div>
    </div>
  );
}
