import crypto from "crypto";

// Şifreleme algoritması ve anahtar
const ALGORITHM = "aes-256-gcm";
const SECRET_KEY =
  process.env.ENCRYPTION_SECRET || "default-32-char-secret-key-here!";
const KEY = crypto.scryptSync(SECRET_KEY, "salt", 32);

/**
 * Mali verileri şifreler (dekont miktarları, ödeme bilgileri)
 * @param text Şifrelenecek veri
 * @returns Şifrelenmiş veri (hex format)
 */
export function encryptFinancialData(text: string | number): string {
  try {
    const textToEncrypt = typeof text === "number" ? text.toString() : text;

    if (!textToEncrypt || textToEncrypt.trim() === "") {
      return textToEncrypt;
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    cipher.setAAD(Buffer.from("financial-data", "utf8"));

    let encrypted = cipher.update(textToEncrypt, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // IV + AuthTag + Encrypted data
    return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
  } catch (error) {
    console.error("🔥 Mali veri şifreleme hatası:", error);
    return typeof text === "number" ? text.toString() : text;
  }
}

/**
 * Mali verilerin şifresini çözer
 * @param encryptedText Şifrelenmiş veri
 * @returns Orijinal veri
 */
export function decryptFinancialData(encryptedText: string): string {
  try {
    if (!encryptedText || !encryptedText.includes(":")) {
      return encryptedText; // Şifrelenmemiş veri
    }

    const [ivHex, authTagHex, encrypted] = encryptedText.split(":");

    if (!ivHex || !authTagHex || !encrypted) {
      return encryptedText; // Geçersiz format
    }

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAAD(Buffer.from("financial-data", "utf8"));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("🔥 Mali veri şifre çözme hatası:", error);
    return encryptedText; // Hata durumunda orijinal veriyi döndür
  }
}

/**
 * Finansal veri için güvenli karşılaştırma
 * @param plainValue Ham değer
 * @param encryptedValue Şifrelenmiş değer
 * @returns Karşılaştırma sonucu
 */
export function compareFinancialData(
  plainValue: string | number,
  encryptedValue: string
): boolean {
  try {
    const plainStr =
      typeof plainValue === "number" ? plainValue.toString() : plainValue;
    const decryptedValue = decryptFinancialData(encryptedValue);
    return plainStr === decryptedValue;
  } catch (error) {
    console.error("🔥 Mali veri karşılaştırma hatası:", error);
    return false;
  }
}

/**
 * Mali veri maskeleme (log'larda göstermek için)
 * @param value Mali değer
 * @returns Maskelenmiş değer
 */
export function maskFinancialData(value: string | number | null): string {
  if (!value) return "****";

  const str = typeof value === "number" ? value.toString() : value;
  if (str.length <= 4) return "****";

  return (
    str.substring(0, 2) +
    "*".repeat(str.length - 4) +
    str.substring(str.length - 2)
  );
}

// Environment değişkeninin kontrol edilmesi
if (!process.env.ENCRYPTION_SECRET) {
  console.warn(
    "⚠️ ENCRYPTION_SECRET environment variable is not set. Using default key (NOT SECURE for production)"
  );
}
