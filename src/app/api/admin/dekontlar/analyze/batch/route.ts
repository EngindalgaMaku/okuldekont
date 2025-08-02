import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAuthAndRole } from '@/middleware/auth';
import { processDocumentForOCR, extractStructuredData } from '@/lib/ocr-service';
import { analyzeBatch } from '@/lib/ai-analysis-service';
import { decryptFinancialData } from '@/lib/encryption';
import {
  validateAnalysisRequest,
  validateFileForAnalysis,
  validateBatchAnalysisRequest,
  SecurityLimits,
  logSecurityEvent,
  sanitizeAnalysisInput
} from '@/lib/security-validation';
import path from 'path';
import fs from 'fs/promises';

// Yardımcı fonksiyonlar
function generateSecurityFlags(ocrResult: any, aiAnalysis: any, expectedData: any) {
  const flags = [];

  if (ocrResult.confidence < 70) {
    flags.push({
      type: 'LOW_OCR_CONFIDENCE',
      severity: 'WARNING',
      message: `OCR güvenilirliği düşük: ${ocrResult.confidence}%`
    });
  }

  if (aiAnalysis.securityAssessment.forgeryRisk > 0.3) {
    flags.push({
      type: 'HIGH_FORGERY_RISK',
      severity: 'ERROR',
      message: `Yüksek sahtelik riski: ${Math.round(aiAnalysis.securityAssessment.forgeryRisk * 100)}%`
    });
  }

  if (aiAnalysis.dataValidation.consistency.score < 0.7) {
    flags.push({
      type: 'DATA_INCONSISTENCY',
      severity: 'WARNING',
      message: 'Veri tutarsızlığı tespit edildi'
    });
  }

  return flags;
}

function calculateOverallReliability(ocrResult: any, aiAnalysis: any, extractedData: any, expectedData: any): number {
  let score = 0;
  let factors = 0;

  score += (ocrResult.confidence / 100) * 0.3;
  factors += 0.3;

  score += aiAnalysis.overallReliability * 0.4;
  factors += 0.4;

  score += aiAnalysis.dataValidation.consistency.score * 0.2;
  factors += 0.2;

  score += (1 - aiAnalysis.securityAssessment.forgeryRisk) * 0.1;
  factors += 0.1;

  return factors > 0 ? score / factors : 0;
}

export async function POST(request: NextRequest) {
  const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Auth kontrolü - sadece ADMIN
  const authResult = await validateAuthAndRole(request, ['ADMIN']);
  if (!authResult.success) {
    await logSecurityEvent('', 'UNAUTHORIZED_BATCH_ANALYSIS_ATTEMPT', {
      ip: clientIp,
      userAgent,
      error: authResult.error
    }, 'WARNING');
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const userId = authResult.user!.id;

  try {
    // Güvenlik validasyonları
    const requestValidation = validateAnalysisRequest(request);
    if (!requestValidation.isValid) {
      await logSecurityEvent(userId, 'INVALID_BATCH_ANALYSIS_REQUEST', {
        error: requestValidation.error,
        code: requestValidation.code,
        ip: clientIp
      }, 'WARNING');
      return NextResponse.json({ error: requestValidation.error }, { status: 400 });
    }

    // Rate limiting kontrolü (batch analiz için)
    const rateLimitCheck = SecurityLimits.checkBatchAnalysisRateLimit(userId);
    if (!rateLimitCheck.isValid) {
      await logSecurityEvent(userId, 'BATCH_ANALYSIS_RATE_LIMIT_EXCEEDED', {
        ip: clientIp,
        userAgent
      }, 'WARNING');
      return NextResponse.json({ error: rateLimitCheck.error }, { status: 429 });
    }

    const body = await request.json();
    const { dekontIds, options = {} } = sanitizeAnalysisInput(body);

    // Batch request validasyonu
    const batchValidation = validateBatchAnalysisRequest(dekontIds);
    if (!batchValidation.isValid) {
      await logSecurityEvent(userId, 'INVALID_BATCH_REQUEST', {
        error: batchValidation.error,
        code: batchValidation.code,
        requestedCount: Array.isArray(dekontIds) ? dekontIds.length : 'invalid',
        ip: clientIp
      }, 'WARNING');
      return NextResponse.json({ error: batchValidation.error }, { status: 400 });
    }

    console.log(`🔄 BATCH ANALYSIS: Starting batch analysis for ${dekontIds.length} dekontlar`);

    // Dekontları getir
    const dekontlar = await prisma.dekont.findMany({
      where: {
        id: { in: dekontIds },
        fileUrl: { not: null }
      },
      include: {
        staj: {
          include: {
            student: {
              include: {
                alan: true
              }
            },
            company: true,
          },
        },
        company: true,
        teacher: true
      },
    });

    if (dekontlar.length === 0) {
      return NextResponse.json({ 
        error: 'Hiç dekont bulunamadı veya dosyaları eksik' 
      }, { status: 404 });
    }

    console.log(`📋 BATCH ANALYSIS: Found ${dekontlar.length} dekontlar with files`);

    const results = [];
    const errors = [];
    let processed = 0;

    // Her dekont için analiz yap
    for (const dekont of dekontlar) {
      try {
        console.log(`🔍 BATCH ANALYSIS: Processing dekont ${dekont.id} (${processed + 1}/${dekontlar.length})`);

        // Dosya kontrolü
        const filePath = path.join(process.cwd(), 'public', dekont.fileUrl!);
        
        try {
          await fs.access(filePath);
        } catch (error) {
          errors.push({
            dekontId: dekont.id,
            error: 'Dosya bulunamadı',
            details: `File not found: ${dekont.fileUrl}`
          });
          continue;
        }

        // Dosyayı oku
        const fileBuffer = await fs.readFile(filePath);
        const fileName = path.basename(dekont.fileUrl!);

        // Dosya güvenlik kontrolü
        const fileValidation = validateFileForAnalysis(fileBuffer, fileName);
        if (!fileValidation.isValid) {
          await logSecurityEvent(userId, 'INVALID_FILE_IN_BATCH', {
            dekontId: dekont.id,
            fileName,
            error: fileValidation.error,
            code: fileValidation.code,
            fileSize: fileBuffer.length
          }, 'ERROR');
          errors.push({
            dekontId: dekont.id,
            error: 'Dosya güvenlik kontrolü başarısız',
            details: fileValidation.error
          });
          continue;
        }

        // Beklenen veriyi hazırla ve sanitize et
        const expectedData = sanitizeAnalysisInput({
          studentName: dekont.staj?.student ? `${dekont.staj.student.name} ${dekont.staj.student.surname}` : undefined,
          companyName: dekont.staj?.company?.name || dekont.company?.name,
          month: dekont.month,
          year: dekont.year,
          amount: dekont.amount ? Number(decryptFinancialData(dekont.amount.toString())) : undefined
        });

        // OCR işlemi
        const ocrResult = await processDocumentForOCR(fileBuffer, fileName);
        
        // Yapılandırılmış veri çıkarımı
        const extractedData = extractStructuredData(ocrResult, expectedData);

        // Bu veriyi batch AI analizi için hazırla
        const analysisData = {
          id: dekont.id,
          ocrText: ocrResult.text,
          expectedData,
          ocrResult,
          extractedData
        };

        results.push(analysisData);
        processed++;

      } catch (error) {
        console.error(`❌ BATCH ANALYSIS: Failed for dekont ${dekont.id}:`, error);
        errors.push({
          dekontId: dekont.id,
          error: 'İşlem hatası',
          details: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
      }
    }

    console.log(`🤖 BATCH ANALYSIS: Starting AI analysis for ${results.length} processed documents`);

    // Toplu AI analizi
    const aiAnalysisResults = results.length > 0 ? await analyzeBatch(
      results.map(r => ({
        id: r.id,
        ocrText: r.ocrText,
        expectedData: r.expectedData
      }))
    ) : [];

    // Sonuçları birleştir ve veritabanını güncelle
    const finalResults = [];
    const updatePromises = [];

    for (const result of results) {
      const aiAnalysis = aiAnalysisResults.find(ai => ai.id === result.id)?.analysis;
      
      if (aiAnalysis) {
        // Güvenlik flaglerini oluştur
        const securityFlags = generateSecurityFlags(result.ocrResult, aiAnalysis, result.expectedData);
        
        // Genel güvenirlik skorunu hesapla
        const overallReliability = calculateOverallReliability(result.ocrResult, aiAnalysis, result.extractedData, result.expectedData);

        const analysisResult = {
          timestamp: new Date().toISOString(),
          ocrResult: {
            text: result.ocrResult.text,
            confidence: result.ocrResult.confidence,
            wordCount: result.ocrResult.words.length,
            lineCount: result.ocrResult.lines.length
          },
          extractedData: result.extractedData,
          aiAnalysis,
          securityFlags,
          overallReliability,
          analysisVersion: '1.0',
          performedBy: authResult.user?.id,
          batchAnalysis: true
        };

        finalResults.push({
          dekontId: result.id,
          success: true,
          analysis: analysisResult,
          reliability: overallReliability,
          recommendation: aiAnalysis.recommendation
        });

        // Veritabanı güncellemesi için promise ekle
        updatePromises.push(
          prisma.dekont.update({
            where: { id: result.id },
            data: {
              ocrAnalysisResult: JSON.parse(JSON.stringify(analysisResult)),
              reliabilityScore: overallReliability,
              aiAnalysisResult: JSON.parse(JSON.stringify(aiAnalysis)),
              isAnalyzed: true,
              analyzedAt: new Date(),
              analyzedBy: authResult.user?.id,
              securityFlags: JSON.parse(JSON.stringify(securityFlags)),
              extractedData: JSON.parse(JSON.stringify(result.extractedData))
            },
          })
        );
      }
    }

    // Tüm güncellemeleri paralel olarak yap
    if (updatePromises.length > 0) {
      console.log(`💾 BATCH ANALYSIS: Updating ${updatePromises.length} dekontlar in database`);
      await Promise.all(updatePromises);
    }

    const summary = {
      totalRequested: dekontIds.length,
      totalProcessed: processed,
      successful: finalResults.length,
      failed: errors.length,
      averageReliability: finalResults.length > 0 
        ? finalResults.reduce((sum, r) => sum + r.reliability, 0) / finalResults.length 
        : 0,
      recommendations: {
        approve: finalResults.filter(r => r.recommendation === 'APPROVE').length,
        reject: finalResults.filter(r => r.recommendation === 'REJECT').length,
        manualReview: finalResults.filter(r => r.recommendation === 'MANUAL_REVIEW').length
      }
    };

    console.log(`✅ BATCH ANALYSIS: Completed successfully`, summary);

    return NextResponse.json({
      success: true,
      summary,
      results: finalResults,
      errors: errors.length > 0 ? errors : undefined,
      batchId: `batch_${Date.now()}`,
      completedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ BATCH ANALYSIS: Failed:', error);
    return NextResponse.json({ 
      error: 'Toplu analiz sırasında bir hata oluştu',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    }, { status: 500 });
  }
}
