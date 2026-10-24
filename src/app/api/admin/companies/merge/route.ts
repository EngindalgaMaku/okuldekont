import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { primaryCompanyId, duplicateCompanyIds } = await request.json();

    if (
      !primaryCompanyId ||
      !duplicateCompanyIds ||
      !Array.isArray(duplicateCompanyIds)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Geçersiz parametre: primaryCompanyId ve duplicateCompanyIds gerekli",
        },
        { status: 400 }
      );
    }

    // Ana şirket bilgilerini al
    const primaryCompany = await prisma.companyProfile.findUnique({
      where: { id: primaryCompanyId },
      include: {
        students: true,
        stajlar: true,
        dekontlar: true,
        monthlyPayments: true,
        teacherAssignmentHistory: true,
        koordinatorlukProgrami: true,
        belgeler: true,
        pinAttempts: true,
      },
    });

    if (!primaryCompany) {
      return NextResponse.json(
        { success: false, error: "Ana şirket bulunamadı" },
        { status: 404 }
      );
    }

    // Duplicate şirketleri al
    const duplicateCompanies = await Promise.all(
      duplicateCompanyIds.map((id) =>
        prisma.companyProfile.findUnique({
          where: { id },
          include: {
            students: true,
            stajlar: true,
            dekontlar: true,
            monthlyPayments: true,
            teacherAssignmentHistory: true,
            koordinatorlukProgrami: true,
            belgeler: true,
            pinAttempts: true,
          },
        })
      )
    );

    // Hiç biri null olmamalı
    if (duplicateCompanies.some((company) => !company)) {
      return NextResponse.json(
        { success: false, error: "Bazı duplicate şirketler bulunamadı" },
        { status: 404 }
      );
    }

    let transferReport = {
      students: 0,
      stajlar: 0,
      dekontlar: 0,
      monthlyPayments: 0,
      teacherAssignments: 0,
      koordinatorlukPrograms: 0,
      belgeler: 0,
      pinAttempts: 0,
    };

    // Transaction ile merge işlemini yap
    await prisma.$transaction(async (tx) => {
      for (const duplicateCompany of duplicateCompanies) {
        if (!duplicateCompany) continue;

        // 1. Öğrencileri transfer et
        if (duplicateCompany.students.length > 0) {
          await tx.student.updateMany({
            where: { companyId: duplicateCompany.id },
            data: { companyId: primaryCompanyId },
          });
          transferReport.students += duplicateCompany.students.length;
        }

        // 2. Stajları transfer et
        if (duplicateCompany.stajlar.length > 0) {
          await tx.staj.updateMany({
            where: { companyId: duplicateCompany.id },
            data: { companyId: primaryCompanyId },
          });
          transferReport.stajlar += duplicateCompany.stajlar.length;
        }

        // 3. Dekontları transfer et
        if (duplicateCompany.dekontlar.length > 0) {
          await tx.dekont.updateMany({
            where: { companyId: duplicateCompany.id },
            data: { companyId: primaryCompanyId },
          });
          transferReport.dekontlar += duplicateCompany.dekontlar.length;
        }

        // 4. Monthly payments transfer et
        if (duplicateCompany.monthlyPayments.length > 0) {
          await tx.monthlyPayment.updateMany({
            where: { companyId: duplicateCompany.id },
            data: { companyId: primaryCompanyId },
          });
          transferReport.monthlyPayments +=
            duplicateCompany.monthlyPayments.length;
        }

        // 5. Teacher assignment history transfer et
        if (duplicateCompany.teacherAssignmentHistory.length > 0) {
          await tx.teacherAssignmentHistory.updateMany({
            where: { companyId: duplicateCompany.id },
            data: { companyId: primaryCompanyId },
          });
          transferReport.teacherAssignments +=
            duplicateCompany.teacherAssignmentHistory.length;
        }

        // 6. Koordinatörlük programlarını transfer et
        if (duplicateCompany.koordinatorlukProgrami.length > 0) {
          await tx.koordinatorlukProgrami.updateMany({
            where: { isletmeId: duplicateCompany.id },
            data: { isletmeId: primaryCompanyId },
          });
          transferReport.koordinatorlukPrograms +=
            duplicateCompany.koordinatorlukProgrami.length;
        }

        // 7. Belgeleri transfer et
        if (duplicateCompany.belgeler.length > 0) {
          await tx.belge.updateMany({
            where: { isletmeId: duplicateCompany.id },
            data: { isletmeId: primaryCompanyId },
          });
          transferReport.belgeler += duplicateCompany.belgeler.length;
        }

        // 8. PIN attempts transfer et
        if (duplicateCompany.pinAttempts.length > 0) {
          await tx.pinAttempt.updateMany({
            where: { companyId: duplicateCompany.id },
            data: { companyId: primaryCompanyId },
          });
          transferReport.pinAttempts += duplicateCompany.pinAttempts.length;
        }

        // Son olarak duplicate company'yi sil
        await tx.companyProfile.delete({
          where: { id: duplicateCompany.id },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Şirketler başarıyla birleştirildi",
      primaryCompany: {
        id: primaryCompany.id,
        name: primaryCompany.name,
      },
      mergedCompanies: duplicateCompanies.map((c) => ({
        id: c!.id,
        name: c!.name,
      })),
      transferReport,
    });
  } catch (error) {
    console.error("Company merge error:", error);
    return NextResponse.json(
      { success: false, error: "Şirket birleştirme işlemi başarısız" },
      { status: 500 }
    );
  }
}
