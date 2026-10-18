# FESİH TARİHİ vs DEKONT TALEBİ Business Rule Analysis

**Analiz Tarihi**: 8 Aralık 2025  
**Test Senaryosu**: Ekim 2025 fesih + Kasım 2025 dekont talebi

---

## 🎯 **EXECUTIVE SUMMARY**

**Test Sonucu**: Sistem **KARMA** davranış sergiliyor - bazı yerler doğru blokluyor, bazı yerler tutarsız filtreleme yapıyor.

### ⚡ **Kritik Bulgular**:

- ✅ **POST Validation**: Dekont yükleme doğru şekilde engellenyor
- ❌ **GET Filtering**: 3 API'de farklı sonuçlar
- ⚠️ **Data Consistency**: İşletme bazında filtreleme tutarsızlıkları

---

## 📊 **TEST SONUÇLARI**

### **Senaryo**: Oktober 2025 Fesih → Kasım 2025 Dekont Talebi

| API                      | Davranış                     | Sonuç                | Problem                                 |
| ------------------------ | ---------------------------- | -------------------- | --------------------------------------- |
| **dashboard-stats GET**  | Mevcut ay kullanır (Aralık)  | 0 terminated student | ❌ Yanlış tarih referansı               |
| **dekont-status GET**    | İstenen ayı kullanır (Kasım) | 2 terminated student | ⚠️ Feshedilmiş öğrencileri dahil ediyor |
| **admin-dekontlar GET**  | Mevcut ay kullanır (Aralık)  | 0 terminated student | ❌ Yanlış tarih referansı               |
| **admin-dekontlar POST** | Doğru validasyon             | ❌ BLOCKED           | ✅ Doğru çalışıyor                      |

---

## 🔍 **DETAYLI ANALİZ**

### 1. **Dashboard Stats API** [`src/app/api/admin/dashboard-stats/route.ts`](src/app/api/admin/dashboard-stats/route.ts:44-95)

**Problem**: `currentDate` kullanır, requested month'u göz ardı eder

```javascript
// Line 44-46: Yanlış yaklaşım
const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth() + 1;

// Line 73-75: Mevcut ay ile filtreleme
terminationDate: {
  gte: new Date(currentYear, currentMonth - 1, 1),
}
```

**Sonuç**: Aralık ayında çalıştırılınca, sadece Aralık ve sonrası fesih olan öğrencileri dahil eder.

### 2. **Dekont Status API** [`src/app/api/admin/reports/dekont-status/route.ts`](src/app/api/admin/reports/dekont-status/route.ts:17-61)

**Daha İyi**: Requested `month` ve `year` parametrelerini kullanır

```javascript
// Line 18-19: Doğru yaklaşım
const month = parseInt(searchParams.get("month") || "1");
const year = parseInt(searchParams.get("year") || "2024");

// Line 46: İstenen ay ile filtreleme
terminationDate: {
  gte: new Date(year, month - 1, 1);
}
```

**Problem**: Ama yine de feshedilmiş öğrencileri **dahil ediyor** (2 terminated student sonucu)

### 3. **Admin Dekontlar API** [`src/app/api/admin/dekontlar/route.ts`](src/app/api/admin/dekontlar/route.ts:49-96)

**GET**: Dashboard ile aynı problem (current date kullanır)  
**POST**: Mükemmel validasyon (lines 678-694)

```javascript
// POST validation - DOĞRU ÇALIŞIYOR
if (yilNum > fesihYear || (yilNum === fesihYear && ayNum > fesihMonth)) {
  return NextResponse.json({
    error: `Staj feshedildiği için bu ay için dekont yüklenemez.`,
  });
}
```

---

## 🚨 **BUSINESS LOGIC GAPS**

### **Gap #1: Inconsistent Date Reference**

```
Dashboard-stats: Uses currentDate ❌
Dekont-status:   Uses requested month ✅
Admin-dekontlar: Uses currentDate ❌
```

### **Gap #2: Terminated Student Inclusion Logic**

Mevcut filtreleme mantığı:

```javascript
terminationDate >= monthStart;
```

**Problem**: Bu **feshedilmiş öğrencileri dahil ediyor**!

**Test Verification**:

- Oktober 31, 2025 fesih
- Kasım 1, 2025 month start
- `terminationDate >= monthStart`: `false` ❌
- **Sonuç**: Dekont-status API **2 terminated student** buluyor

---

## 💡 **RECOMMENDATİONS**

### **Priority 1: Fix Inconsistent Filtering**

**Problem**: 3 farklı API, 3 farklı tarih referansı kullanıyor

**Solution**: Tüm APIs için standart parametre yaklaşımı

```javascript
// dashboard-stats'ı düzelt
const { searchParams } = new URL(request.url);
const requestMonth = parseInt(
  searchParams.get("month") || String(currentDate.getMonth() + 1)
);
const requestYear = parseInt(
  searchParams.get("year") || String(currentDate.getFullYear())
);
```

### **Priority 2: Clarify Business Rule**

**Current Logic**: `terminationDate >= monthStart` (öğrenciyi dahil eder)  
**Business Question**: Fesih ayında dekont talep edilebilir mi?

**Önerilen Yaklaşımlar**:

#### **Option A: Strict Termination** (Önerilen)

```javascript
// Fesih ayından sonraki aylar için dekont talep edilemez
terminationDate: {
  gte: new Date(year, month, 1);
} // Next month start
```

#### **Option B: Same Month Allowed**

```javascript
// Fesih ayında dekont OK, sonraki aylar NO
terminationDate: {
  gte: new Date(year, month - 1, 1);
} // Current month start
```

### **Priority 3: Unify POST and GET Logic**

**Problem**: POST doğru blokluyor, GET'ler tutarsız

**Solution**: POST validation mantığını GET filtering'e de uygula

```javascript
// Unified termination check function
function shouldExcludeTerminatedStudent(
  terminationDate,
  requestMonth,
  requestYear
) {
  if (!terminationDate) return false;

  const fesihYear = terminationDate.getFullYear();
  const fesihMonth = terminationDate.getMonth() + 1;

  // Same logic as POST validation
  return (
    requestYear > fesihYear ||
    (requestYear === fesihYear && requestMonth > fesihMonth)
  );
}
```

---

## 📋 **IMPLEMENTATION CHECKLIST**

### **Phase 1: Critical Fixes**

- [ ] Fix dashboard-stats API date reference
- [ ] Standardize all GET filtering to use requested month/year
- [ ] Apply unified termination check across all APIs

### **Phase 2: Business Rule Clarification**

- [ ] Decide: Fesih ayında dekont talep edilebilir mi?
- [ ] Update business logic documentation
- [ ] Create comprehensive test cases

### **Phase 3: Validation & Testing**

- [ ] End-to-end testing with various termination scenarios
- [ ] Performance impact assessment
- [ ] User communication about rule changes

---

## ⚠️ **CURRENT RISK ASSESSMENT**

**Risk Level**: 🟡 **MEDIUM**

**Issues**:

- Users may see inconsistent data in different screens
- Terminated students appearing in some reports but not others
- Potential confusion in dekont submission workflow

**Mitigation**: Implement Priority 1 fixes immediately for consistency

---

## 🔍 **TECHNICAL EVIDENCE**

Test executed on: **8 Aralık 2025**  
Script: [`scripts/test-termination-dekont-business-rule.js`](scripts/test-termination-dekont-business-rule.js)

**Key Finding**:

- POST validation: ❌ Blocks correctly
- GET filtering: Mixed results (0, 2, 0 across APIs)
- No actual violations found in database (good news)

**Conclusion**: System prevents bad data creation but shows inconsistent views of existing data.
