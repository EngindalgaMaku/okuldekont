import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAuthAndRole } from "@/middleware/auth";
import {
  processDocumentForOCR,
  extractStructuredData,
} from "@/lib/ocr-service";
import { analyzeWithAI } from "@/lib/ai-analysis-service";
import { decryptFinancialData } from "@/lib/encryption";
import {
  validateAnalysisRequest,
  validateFileForAnalysis,
  validateAnalysisPermissions,
  SecurityLimits,
  logSecurityEvent,
  sanitizeAnalysisInput,
} from "@/lib/security-validation";
import path from "path";
import fs from "fs/promises";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientIp = request.headers.get("x-forwarded-for") || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  // Auth kontrolü
  const authResult = await validateAuthAndRole(request, ["ADMIN", "TEACHER"]);
  if (!authResult.success) {
    await logSecurityEvent(
      "",
      "UNAUTHORIZED_ANALYSIS_ATTEMPT",
      {
        ip: clientIp,
        userAgent,
        error: authResult.error,
      },
      "WARNING"
    );
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const userId = authResult.user!.id;

  try {
    const { id } = await params;

    // Güvenlik validasyonları
    const requestValidation = validateAnalysisRequest(request);
    if (!requestValidation.isValid) {
      await logSecurityEvent(
        userId,
        "INVALID_ANALYSIS_REQUEST",
        {
          error: requestValidation.error,
          code: requestValidation.code,
          ip: clientIp,
        },
        "WARNING"
      );
      return NextResponse.json(
        { error: requestValidation.error },
        { status: 400 }
      );
    }

    // Rate limiting kontrolü
    const rateLimitCheck = SecurityLimits.checkAnalysisRateLimit(userId);
    if (!rateLimitCheck.isValid) {
      await logSecurityEvent(
        userId,
        "ANALYSIS_RATE_LIMIT_EXCEEDED",
        {
          ip: clientIp,
          userAgent,
        },
        "WARNING"
      );
      return NextResponse.json(
        { error: rateLimitCheck.error },
        { status: 429 }
      );
    }

    // İzin kontrolü
    const permissionCheck = await validateAnalysisPermissions(userId, id);
    if (!permissionCheck.isValid) {
      await logSecurityEvent(
        userId,
        "INSUFFICIENT_ANALYSIS_PERMISSIONS",
        {
          dekontId: id,
          error: permissionCheck.error,
          ip: clientIp,
        },
        "WARNING"
      );
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: 403 }
      );
    }

    console.log(
      `🔍 ANALYSIS: Starting comprehensive analysis for dekont ${id}`
    );

    // Dekont ve ilişkili verileri getir
    const dekont = await prisma.dekont.findUnique({
      where: { id },
      include: {
        staj: {
          include: {
            student: {
              include: {
                alan: true,
              },
            },
            company: true,
          },
        },
        company: true,
        teacher: true,
      },
    });

    if (!dekont || !dekont.fileUrl) {
      return NextResponse.json(
        {
          error: "Dekont veya dosya bulunamadı",
        },
        { status: 404 }
      );
    }

    // Dosya yolunu oluştur
    const filePath = path.join(
      process.cwd(),
      dekont.fileUrl.replace(/^\//, "")
    );

    // Dosyanın varlığını kontrol et
    try {
      await fs.access(filePath);
    } catch (error) {
      console.error(`❌ ANALYSIS: File not found at ${filePath}`);
      return NextResponse.json(
        {
          error: "Dekont dosyası sistemde bulunamadı",
        },
        { status: 404 }
      );
    }

    // Dosyayı oku
    const fileBuffer = await fs.readFile(filePath);
    const fileName = path.basename(dekont.fileUrl);

    console.log(
      `📄 ANALYSIS: Processing file ${fileName} (${fileBuffer.length} bytes)`
    );

    // Beklenen veriyi hazırla
    const expectedData = {
      studentName: dekont.staj?.student
        ? `${dekont.staj.student.name} ${dekont.staj.student.surname}`
        : undefined,
      companyName: dekont.staj?.company?.name || dekont.company?.name,
      month: dekont.month,
      year: dekont.year,
      amount: dekont.amount
        ? Number(decryptFinancialData(dekont.amount.toString()))
        : undefined,
    };

    console.log("📋 ANALYSIS: Expected data:", expectedData);

    // 1. OCR İşlemi
    console.log("🔍 ANALYSIS: Step 1 - OCR Processing");
    const ocrResult = await processDocumentForOCR(fileBuffer, fileName);

    // 2. Yapılandırılmış veri çıkarımı
    console.log("📊 ANALYSIS: Step 2 - Structured Data Extraction");
    const extractedData = extractStructuredData(ocrResult, expectedData);

    // 3. AI Analizi
    console.log("🤖 ANALYSIS: Step 3 - AI Analysis");
    const aiAnalysis = await analyzeWithAI(ocrResult.text, expectedData);

    // 4. Güvenlik flaglerini oluştur
    const securityFlags = generateSecurityFlags(
      ocrResult,
      aiAnalysis,
      expectedData
    );

    // 5. Genel güvenirlik skorunu hesapla
    const overallReliability = calculateOverallReliability(
      ocrResult,
      aiAnalysis,
      extractedData,
      expectedData
    );

    // Analiz sonuçlarını hazırla
    const analysisResult = {
      timestamp: new Date().toISOString(),
      ocrResult: {
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        wordCount: ocrResult.words.length,
        lineCount: ocrResult.lines.length,
      },
      extractedData,
      aiAnalysis,
      securityFlags,
      overallReliability,
      analysisVersion: "1.0",
      performedBy: authResult.user?.id,
    };

    console.log(
      `✅ ANALYSIS: Analysis completed with ${Math.round(
        overallReliability * 100
      )}% reliability`
    );

    // Veritabanını güncelle
    const updatedDekont = await prisma.dekont.update({
      where: { id },
      data: {
        ocrAnalysisResult: JSON.parse(JSON.stringify(analysisResult)),
        reliabilityScore: overallReliability,
        aiAnalysisResult: JSON.parse(JSON.stringify(aiAnalysis)),
        isAnalyzed: true,
        analyzedAt: new Date(),
        analyzedBy: authResult.user?.id,
        securityFlags: JSON.parse(JSON.stringify(securityFlags)),
        extractedData: JSON.parse(JSON.stringify(extractedData)),
      },
    });

    // Analiz logunu kaydet
    console.log(`📝 ANALYSIS: Results saved for dekont ${id}`, {
      reliability: Math.round(overallReliability * 100),
      recommendation: aiAnalysis.recommendation,
      userId: authResult.user?.id,
    });

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      dekont: {
        id: updatedDekont.id,
        reliabilityScore: overallReliability,
        recommendation: aiAnalysis.recommendation,
        isAnalyzed: true,
        analyzedAt: (updatedDekont as any).analyzedAt,
      },
    });
  } catch (error) {
    console.error("❌ ANALYSIS: Comprehensive analysis failed:", error);
    return NextResponse.json(
      {
        error: "Dekont analizi sırasında bir hata oluştu",
        details: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 }
    );
  }
}

// Güvenlik flaglerini oluştur
function generateSecurityFlags(
  ocrResult: any,
  aiAnalysis: any,
  expectedData: any
) {
  const flags = [];

  // OCR güvenilirlik kontrolü
  if (ocrResult.confidence < 70) {
    flags.push({
      type: "LOW_OCR_CONFIDENCE",
      severity: "WARNING",
      message: `OCR güvenilirliği düşük: ${ocrResult.confidence}%`,
    });
  }

  // AI analiz uyarıları
  if (aiAnalysis.securityAssessment.forgeryRisk > 0.3) {
    flags.push({
      type: "HIGH_FORGERY_RISK",
      severity: "ERROR",
      message: `Yüksek sahtelik riski: ${Math.round(
        aiAnalysis.securityAssessment.forgeryRisk * 100
      )}%`,
    });
  }

  // Veri tutarsızlığı
  if (aiAnalysis.dataValidation.consistency.score < 0.7) {
    flags.push({
      type: "DATA_INCONSISTENCY",
      severity: "WARNING",
      message: "Veri tutarsızlığı tespit edildi",
    });
  }

  return flags;
}

// Genel güvenirlik skorunu hesapla
function calculateOverallReliability(
  ocrResult: any,
  aiAnalysis: any,
  extractedData: any,
  expectedData: any
): number {
  let score = 0;
  let factors = 0;

  // OCR güvenilirliği (30%)
  score += (ocrResult.confidence / 100) * 0.3;
  factors += 0.3;

  // AI analiz güvenilirliği (40%)
  score += aiAnalysis.overallReliability * 0.4;
  factors += 0.4;

  // Veri tutarlılığı (20%)
  score += aiAnalysis.dataValidation.consistency.score * 0.2;
  factors += 0.2;

  // Güvenlik assessment (10%)
  score += (1 - aiAnalysis.securityAssessment.forgeryRisk) * 0.1;
  factors += 0.1;

  return factors > 0 ? score / factors : 0;
}
