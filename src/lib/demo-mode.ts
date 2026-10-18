// Demo modu: Google Play incelemesi ve tanıtım için, veritabanına hiç bağlanmadan
// öğretmen panelini uydurma verilerle gösterir. Demo açıkken öğretmen paneliyle ilgili
// API istekleri tarayıcıda karşılanır, sunucuya gitmez; gerçek oturum açılmaz.
// Bu yüzden demo PIN'inin bilinmesi hiçbir gerçek veriye erişim sağlamaz.

export const DEMO_TEACHER_ID = "demo-ogretmen";
export const DEMO_PIN = "2580";
const STORAGE_KEY = "kpanel:demo";

export function isDemoActive(): boolean {
  try {
    return typeof window !== "undefined" && window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function startDemoMode() {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {}
}

export function stopDemoMode() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
  demoState = null;
}

// ---------------------------------------------------------------------------
// Uydurma veriler (gerçek kişilerle ilgisi yoktur)
// ---------------------------------------------------------------------------

interface DemoState {
  isletmeler: any[];
  dekontlar: any[];
  notifications: any[];
  files: Map<string, Blob>;
  nextId: number;
}

let demoState: DemoState | null = null;

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function buildState(): DemoState {
  const now = new Date();
  const monthsAgo = (n: number) => new Date(now.getFullYear(), now.getMonth() - n, 1);
  const start = monthsAgo(7);
  start.setDate(10);

  const ogr = (id: string, ad: string, soyad: string, no: string, alan: string, baslangic = start) => ({
    id,
    ad,
    soyad,
    sinif: "12-D",
    no,
    alan,
    staj_id: `staj-${id}`,
    baslangic_tarihi: ymd(baslangic),
    aktif: true,
    durum: "ACTIVE",
  });

  const isletmeler = [
    {
      id: "demo-isletme-1",
      ad: "Örnek Yazılım Teknolojileri Ltd. Şti.",
      yukleyen_kisi: "Demo Yetkili",
      telefon: null,
      total_students: 2,
      ogrenciler: [
        ogr("demo-ogr-1", "Ahmet", "Yılmaz", "9001", "Bilişim Teknolojileri"),
        ogr("demo-ogr-2", "Zeynep", "Kaya", "9002", "Bilişim Teknolojileri"),
      ],
    },
    {
      id: "demo-isletme-2",
      ad: "Deneme Muhasebe Bürosu",
      yukleyen_kisi: "Demo Muhasebeci",
      telefon: null,
      total_students: 2,
      ogrenciler: [
        ogr("demo-ogr-3", "Elif", "Demir", "9003", "Muhasebe ve Finansman"),
        ogr("demo-ogr-4", "Mert", "Aydın", "9004", "Muhasebe ve Finansman", monthsAgo(3)),
      ],
    },
    {
      id: "demo-isletme-3",
      ad: "Örnek İlçe Milli Eğitim Müdürlüğü",
      yukleyen_kisi: "Demo Memur",
      telefon: null,
      total_students: 1,
      ogrenciler: [ogr("demo-ogr-5", "Ayşe", "Çelik", "9005", "Muhasebe ve Finansman")],
    },
    {
      // Stajı feshedilmiş eski işletme: yalnızca "Pasifler" açıkken listelenir
      id: "demo-isletme-4",
      ad: "Eski Örnek Reklam Ajansı",
      yukleyen_kisi: "Demo Ajans Yetkilisi",
      telefon: null,
      total_students: 1,
      is_fully_terminated: true,
      latest_termination_date: ymd(monthsAgo(3)),
      termination_reason: "Öğrenci başka işletmeye geçti",
      ogrenciler: [
        {
          ...ogr("demo-ogr-6", "Can", "Öztürk", "9006", "Bilişim Teknolojileri"),
          aktif: false,
          durum: "TERMINATED",
          fesih_tarihi: ymd(monthsAgo(3)),
          fesih_nedeni: "Başka işletmeye geçti",
        },
      ],
    },
  ];

  let nextId = 1;
  const dekontlar: any[] = [];
  const add = (isletme: any, o: any, n: number, durum: string, extra: Record<string, unknown> = {}) => {
    const m = monthsAgo(n);
    const ay = m.getMonth() + 1;
    const yil = m.getFullYear();
    const ext = nextId % 2 === 0 ? "jpg" : "pdf";
    dekontlar.push({
      id: nextId++,
      isletme_ad: isletme.ad,
      isletme_id: isletme.id,
      ogrenci_ad: `${o.ad} ${o.soyad}`,
      ogrenci_id: o.id,
      staj_id: o.staj_id,
      miktar: 9000 + (o.no.charCodeAt(3) % 5) * 250,
      odeme_tarihi: ymd(new Date(yil, ay - 1, 5)),
      onay_durumu: durum,
      ay,
      yil,
      dosya_url: `/uploads/dekontlar/demo-${nextId}.${ext}`,
      yukleyen_kisi: isletme.yukleyen_kisi,
      created_at: new Date(yil, ay, 3, 10, 30).toISOString(),
      ...extra,
    });
  };

  const [yazilim, muhasebe, , eskiAjans] = isletmeler;
  // Can: feshedilmiş stajdan kalan onaylı dekontlar (pasif)
  for (let n = 6; n >= 4; n--) add(eskiAjans, eskiAjans.ogrenciler[0], n, "onaylandi");
  // Ahmet: hepsi onaylı, geçen ay bekliyor
  for (let n = 6; n >= 2; n--) add(yazilim, yazilim.ogrenciler[0], n, "onaylandi");
  add(yazilim, yazilim.ogrenciler[0], 1, "bekliyor");
  // Zeynep: hepsi onaylı (güncel)
  for (let n = 6; n >= 1; n--) add(yazilim, yazilim.ogrenciler[1], n, "onaylandi");
  // Elif: iki ay önce reddedildi, geçen ay eksik
  for (let n = 6; n >= 3; n--) add(muhasebe, muhasebe.ogrenciler[0], n, "onaylandi");
  add(muhasebe, muhasebe.ogrenciler[0], 2, "reddedildi", {
    red_nedeni: "Dekonttaki tutar okunmuyor, lütfen daha net bir görüntü yükleyin.",
  });
  // Mert: yeni başladı, geçen ay bekliyor
  add(muhasebe, muhasebe.ogrenciler[1], 2, "onaylandi");
  add(muhasebe, muhasebe.ogrenciler[1], 1, "bekliyor");

  const notifications = [
    {
      id: "demo-bildirim-1",
      title: "Dekont hatırlatması",
      content: "Geçen aya ait dekontların ayın 7'sine kadar yüklenmesi gerekmektedir.",
      priority: "normal",
      sent_by: "Okul Yönetimi",
      is_read: false,
      created_at: new Date(now.getFullYear(), now.getMonth(), 1, 9).toISOString(),
    },
  ];

  return { isletmeler, dekontlar, notifications, files: new Map(), nextId };
}

function state(): DemoState {
  if (!demoState) demoState = buildState();
  return demoState;
}

// ---------------------------------------------------------------------------
// Örnek dekont dosyaları
// ---------------------------------------------------------------------------

function demoPdf(): Blob {
  const content = [
    "BT /F1 30 Tf 60 760 Td (ORNEK DEKONT) Tj ET",
    "BT /F1 14 Tf 60 730 Td (K-Panel demo modu icin olusturulmustur.) Tj ET",
    "BT /F1 14 Tf 60 712 Td (Gercek bir odeme belgesi degildir.) Tj ET",
    "BT /F1 16 Tf 60 650 Td (Tutar: 9.000,00 TL) Tj ET",
    "BT /F1 48 Tf 0.85 0.1 0.1 rg 330 470 Td (ORNEK) Tj ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => (pdf += `${String(o).padStart(10, "0")} 00000 n \n`));
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Blob([pdf], { type: "application/pdf" });
}

async function demoImage(): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 800, 1000);
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 52px sans-serif";
  ctx.fillText("ÖRNEK DEKONT", 60, 120);
  ctx.fillStyle = "#475569";
  ctx.font = "24px sans-serif";
  ctx.fillText("K-Panel demo modu için oluşturulmuştur.", 60, 175);
  ctx.fillText("Gerçek bir ödeme belgesi değildir.", 60, 210);
  ctx.fillStyle = "#0f172a";
  ctx.font = "30px sans-serif";
  ctx.fillText("Tutar: 9.000,00 TL", 60, 320);
  ctx.save();
  ctx.translate(400, 680);
  ctx.rotate(-0.35);
  ctx.fillStyle = "rgba(220, 38, 38, 0.35)";
  ctx.font = "bold 110px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ÖRNEK", 0, 0);
  ctx.restore();
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.85));
}

// ---------------------------------------------------------------------------
// İstek karşılayıcı
// ---------------------------------------------------------------------------

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

const demoSession = () => ({
  user: {
    id: DEMO_TEACHER_ID,
    name: "Demo Öğretmen",
    email: "demo@kpanel.local",
    role: "TEACHER",
    teacherId: DEMO_TEACHER_ID,
    profile: { id: DEMO_TEACHER_ID, name: "Demo", surname: "Öğretmen" },
  },
  expires: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
});

async function handle(url: URL, init?: RequestInit): Promise<Response | null> {
  const path = url.pathname;
  const method = (init?.method || "GET").toUpperCase();
  const s = state();

  if (path === "/api/auth/session") return json(demoSession());
  if (path === "/api/auth/csrf") return json({ csrfToken: "demo" });
  if (path === "/api/auth/signout") {
    stopDemoMode();
    return json({ url: `${location.origin}/` });
  }
  if (path.startsWith("/api/auth/_log")) return json({});

  const t = `/api/admin/teachers/${DEMO_TEACHER_ID}`;
  if (path === t) return json({ id: DEMO_TEACHER_ID, name: "Demo", surname: "Öğretmen", mustChangePin: false });
  if (path === `${t}/internships`) {
    // Gerçek API gibi: pasif işletmeler yalnızca includeInactive=true iken döner
    const includeInactive = url.searchParams.get("includeInactive") === "true";
    return json(includeInactive ? s.isletmeler : s.isletmeler.filter((i) => !i.is_fully_terminated));
  }
  if (path === `${t}/dekontlar`) return json(s.dekontlar);
  if (path === `${t}/historical-dekontlar`) return json([]);
  if (path === `${t}/belgeler`) return json([]);
  if (path === `${t}/notifications`) {
    if (method !== "GET") s.notifications.forEach((n) => (n.is_read = true));
    return json(method === "GET" ? s.notifications : { success: true });
  }
  if (path === `${t}/pin`) return json({ error: "Demo modunda PIN değiştirilemez" }, 400);

  if (path === "/api/admin/system-settings") return json([{ key: "dekont_son_gun", value: "7" }]);
  if (path === "/api/admin/companies/types") {
    return json({ "demo-isletme-1": "PRIVATE", "demo-isletme-2": "PRIVATE", "demo-isletme-3": "GOVERNMENT" });
  }
  if (path === "/api/teachers/issues") return json(method === "GET" ? [] : { success: true });

  if (path === "/api/admin/internships/find") {
    const ogrenciId = url.searchParams.get("ogrenci_id");
    const o = s.isletmeler.flatMap((i) => i.ogrenciler).find((x: any) => x.id === ogrenciId);
    return o ? json({ id: o.staj_id }) : json({ error: "Staj bulunamadı" }, 404);
  }

  if (path === "/api/admin/payments/student-payment") {
    const stajId = url.searchParams.get("stajId");
    const month = Number(url.searchParams.get("month"));
    const year = Number(url.searchParams.get("year"));
    const existing = s.dekontlar.find((d) => d.staj_id === stajId && d.ay === month && d.yil === year);
    return json({
      paymentInfo: { amount: 9000, found: true },
      existingDekont: {
        exists: !!existing,
        status: existing?.onay_durumu ?? null,
        amount: existing?.miktar ?? null,
        isApproved: existing?.onay_durumu === "onaylandi",
      },
    });
  }

  // Dekont yükleme: yalnızca bu cihazın belleğine eklenir, sunucuya gitmez
  if (path === "/api/admin/dekontlar" && method === "POST") {
    const form = init?.body instanceof FormData ? init.body : null;
    const stajId = String(form?.get("staj_id") || "");
    const isletme = s.isletmeler.find((i) => i.ogrenciler.some((o: any) => o.staj_id === stajId));
    const o = isletme?.ogrenciler.find((x: any) => x.staj_id === stajId);
    if (!isletme || !o) return json({ error: "Staj bulunamadı" }, 404);
    const file = form?.get("dosya");
    const ext = file instanceof File && file.type.startsWith("image/") ? "jpg" : "pdf";
    const fileName = `demo-yuklenen-${s.nextId}.${ext}`;
    if (file instanceof Blob) s.files.set(fileName, file);
    s.dekontlar.unshift({
      id: s.nextId++,
      isletme_ad: isletme.ad,
      isletme_id: isletme.id,
      ogrenci_ad: `${o.ad} ${o.soyad}`,
      ogrenci_id: o.id,
      staj_id: o.staj_id,
      miktar: Number(form?.get("miktar")) || null,
      odeme_tarihi: ymd(new Date()),
      onay_durumu: "bekliyor",
      ay: Number(form?.get("ay")),
      yil: Number(form?.get("yil")),
      dosya_url: `/uploads/dekontlar/${fileName}`,
      yukleyen_kisi: "Demo Öğretmen",
      created_at: new Date().toISOString(),
    });
    return json({ success: true, message: "Dekont yüklendi (demo)" });
  }

  const deleteMatch = path.match(/^\/api\/admin\/dekontlar\/(\d+)$/);
  if (deleteMatch && method === "DELETE") {
    s.dekontlar = s.dekontlar.filter((d) => String(d.id) !== deleteMatch[1]);
    return json({ success: true, message: "Dekont silindi (demo)" });
  }

  const previewMatch = path.match(/^\/api\/admin\/dekontlar\/(preview|download)\/(.+)$/);
  if (previewMatch) {
    const fileName = decodeURIComponent(previewMatch[2]);
    const uploaded = s.files.get(fileName);
    if (uploaded) return new Response(uploaded, { headers: { "Content-Type": uploaded.type || "application/pdf" } });
    if (fileName.endsWith(".jpg")) {
      return new Response(await demoImage(), { headers: { "Content-Type": "image/jpeg" } });
    }
    return new Response(demoPdf(), { headers: { "Content-Type": "application/pdf" } });
  }

  if (path === "/api/admin/belgeler" && method === "POST") return json({ success: true });

  // Demo kapsamındaki diğer admin istekleri sunucuya gitmesin
  if (path.startsWith("/api/admin/") || path.startsWith("/api/companies/")) {
    return json({ error: "Demo modunda kullanılamaz" }, 403);
  }

  return null;
}

let installed = false;

export function installDemoFetch() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!isDemoActive()) return original(input, init);
    try {
      const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const url = new URL(raw, location.origin);
      if (url.origin === location.origin) {
        const response = await handle(url, init);
        if (response) return response;
      }
    } catch (error) {
      console.error("Demo modu hatası:", error);
    }
    return original(input, init);
  };
}
