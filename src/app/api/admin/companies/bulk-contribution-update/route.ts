import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface BulkContributionUpdateRequest {
  companyIds: string[];
  stateContributionRequest: "Evet" | "Hayır";
  reason?: string;
}

// Simple validation function
function validateRequest(body: any): {
  isValid: boolean;
  error?: string;
  data?: BulkContributionUpdateRequest;
} {
  if (
    !body.companyIds ||
    !Array.isArray(body.companyIds) ||
    body.companyIds.length === 0
  ) {
    return { isValid: false, error: "En az bir işletme seçilmelidir" };
  }

  if (
    !body.stateContributionRequest ||
    !["Evet", "Hayır"].includes(body.stateContributionRequest)
  ) {
    return { isValid: false, error: "Geçerli bir devlet katkısı durumu seçin" };
  }

  return {
    isValid: true,
    data: {
      companyIds: body.companyIds,
      stateContributionRequest: body.stateContributionRequest,
      reason: body.reason || undefined,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = validateRequest(body);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error,
        },
        { status: 400 }
      );
    }

    const { companyIds, stateContributionRequest, reason } = validation.data!;

    // Check if companies exist
    const existingCompanies = await prisma.companyProfile.findMany({
      where: {
        id: { in: companyIds },
      },
      select: {
        id: true,
        name: true,
        stateContributionRequest: true,
      },
    });

    if (existingCompanies.length !== companyIds.length) {
      const foundIds = existingCompanies.map((c) => c.id);
      const missingIds = companyIds.filter(
        (id: string) => !foundIds.includes(id)
      );
      return NextResponse.json(
        {
          error: "Some companies not found",
          missingIds,
        },
        { status: 404 }
      );
    }

    // Perform bulk update
    let successCount = 0;
    let failureCount = 0;
    const results: any[] = [];

    for (const company of existingCompanies) {
      try {
        // Only update if the value is different
        if (company.stateContributionRequest !== stateContributionRequest) {
          await prisma.companyProfile.update({
            where: { id: company.id },
            data: {
              stateContributionRequest,
            },
          });

          // Log the change in audit trail (if you have such system)
          // You can add audit logging here if needed

          successCount++;
          results.push({
            id: company.id,
            name: company.name,
            status: "updated",
            oldValue: company.stateContributionRequest,
            newValue: stateContributionRequest,
          });
        } else {
          // Company already has this value
          results.push({
            id: company.id,
            name: company.name,
            status: "unchanged",
            currentValue: company.stateContributionRequest,
          });
        }
      } catch (updateError) {
        console.error(`Failed to update company ${company.id}:`, updateError);
        failureCount++;
        results.push({
          id: company.id,
          name: company.name,
          status: "failed",
          error:
            updateError instanceof Error
              ? updateError.message
              : "Unknown error",
        });
      }
    }

    // Prepare response
    const responseData = {
      success: successCount > 0 || (successCount === 0 && failureCount === 0),
      message:
        successCount > 0
          ? `${successCount} işletmenin devlet katkısı durumu başarıyla güncellendi`
          : failureCount > 0
          ? `${failureCount} işletme güncellenirken hata oluştu`
          : "Tüm işletmeler zaten istenen durumda",
      results: {
        total: companyIds.length,
        updated: successCount,
        failed: failureCount,
        unchanged: companyIds.length - successCount - failureCount,
      },
      details: results,
      stateContributionRequest,
      reason:
        reason ||
        `Toplu güncelleme: ${
          stateContributionRequest === "Evet"
            ? "Devlet katkısı isteyenler"
            : "Devlet katkısı istemeyenler"
        }`,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Bulk contribution update error:", error);

    return NextResponse.json(
      {
        error: "Toplu devlet katkısı güncellemesi sırasında hata oluştu",
        details: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
