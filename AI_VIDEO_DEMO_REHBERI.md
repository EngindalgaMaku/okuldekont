// AI Video Demo Hazırlık Script'i

// 1. Ekran Görüntüleri Otomatik Alma
const puppeteer = require('puppeteer');

async function captureScreenshots() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Ana sayfa
  await page.goto('http://localhost:3000');
  await page.screenshot({path: 'screenshots/01-homepage.png', fullPage: true});
  
  // İşletme girişi
  await page.click('[data-testid="isletme-button"]');
  await page.screenshot({path: 'screenshots/02-isletme-login.png'});
  
  // Arama demo
  await page.type('input[placeholder*="İşletme"]', 'Tek');
  await page.waitForTimeout(1000);
  await page.screenshot({path: 'screenshots/03-search-demo.png'});
  
  // Dashboard
  await page.goto('http://localhost:3000/panel');
  await page.screenshot({path: 'screenshots/04-dashboard.png', fullPage: true});
  
  // Admin panel
  await page.goto('http://localhost:3000/admin');
  await page.screenshot({path: 'screenshots/05-admin-panel.png', fullPage: true});
  
  await browser.close();
}

// 2. AI Video Prompts
const videoPrompts = {
  intro: {
    prompt: "Modern education management system dashboard, clean UI, professional, tech startup feel",
    duration: "3 seconds",
    style: "cinematic, high-tech"
  },
  
  features: {
    prompt: "Smooth transitions between different interface screens, user-friendly navigation, modern web design",
    duration: "5 seconds", 
    style: "smooth transitions, professional"
  },
  
  security: {
    prompt: "Security lock animation, PIN entry interface, cybersecurity theme, blue and white colors",
    duration: "3 seconds",
    style: "tech security, animated"
  }
};

// 3. Ses Timing Hesaplaması
const audioTimings = {
  intro: {start: 0, end: 30, words: 45},
  homepage: {start: 30, end: 120, words: 135},
  security: {start: 120, end: 180, words: 90},
  isletme: {start: 180, end: 300, words: 180},
  ogretmen: {start: 300, end: 420, words: 180},
  admin: {start: 420, end: 660, words: 360},
  responsive: {start: 660, end: 720, words: 90},
  conclusion: {start: 720, end: 780, words: 90}
};

// Export için kullanılacak
module.exports = {
  captureScreenshots,
  videoPrompts,
  audioTimings
}; 