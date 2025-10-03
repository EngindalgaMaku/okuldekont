import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCompanyTypeLabel } from "@/lib/company-utils";
import type { CompanyType } from "@/lib/company-utils";

// Define the request body type
interface BulkUpdateRequest {
  companyIds: string[];
  companyType: CompanyType;
  reason?: string;
}

// Define the response type
interface BulkUpdateResponse {
  success: boolean;
  message: string;
  results: {
    updated: number;
    failed: number;
    details: Array<{
      companyId: string;
      companyName: string;
      success: boolean;
      error?: string;
    }>;
  };
}

export async function POST(request: Request) {
  try {
    const body: BulkUpdateRequest = await request.json();
    const { companyIds, companyType, reason } = body;

    // Validate input
    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return NextResponse.json(
        { error: "Company IDs array is required and cannot be empty" },
        { status: 400 }
      );
    }

    if (!companyType || !["PRIVATE", "GOVERNMENT"].includes(companyType)) {
      return NextResponse.json(
        { error: "Valid company type is required (PRIVATE or GOVERNMENT)" },
        { status: 400 }
      );
    }

    const results: BulkUpdateResponse["results"] = {
      updated: 0,
      failed: 0,
      details: [],
    };

    // Process each company
    for (const companyId of companyIds) {
      try {
        // First, get the company to check if it exists and get its current state
        const existingCompany = await prisma.companyProfile.findUnique({
          where: { id: companyId },
          select: {
            id: true,
            name: true,
            companyType: true,
          },
        });

        if (!existingCompany) {
          results.failed++;
          results.details.push({
            companyId,
            companyName: "Unknown",
            success: false,
            error: "Company not found",
          });
          continue;
        }

        // Skip if company type is already the same
        if (existingCompany.companyType === companyType) {
          results.details.push({
            companyId,
            companyName: existingCompany.name,
            success: true,
            error: `Company type was already ${getCompanyTypeLabel(
              companyType
            )}`,
          });
          continue;
        }

        // Start a transaction to update company and create history record
        await prisma.$transaction(async (tx) => {
          // Update company type
          await tx.companyProfile.update({
            where: { id: companyId },
            data: { companyType },
          });

          // Create history record
          await tx.companyHistory.create({
            data: {
              companyId,
              changeType: "OTHER_UPDATE",
              fieldName: "companyType",
              previousValue: existingCompany.companyType,
              newValue: companyType,
              changedBy: "system", // You might want to get actual user ID from session
              reason:
                reason || `Bulk update to ${getCompanyTypeLabel(companyType)}`,
              notes: `Company type changed from ${getCompanyTypeLabel(
                existingCompany.companyType
              )} to ${getCompanyTypeLabel(companyType)} via bulk update`,
            },
          });
        });

        results.updated++;
        results.details.push({
          companyId,
          companyName: existingCompany.name,
          success: true,
        });
      } catch (error) {
        console.error(`Error updating company ${companyId}:`, error);
        results.failed++;
        results.details.push({
          companyId,
          companyName: "Unknown",
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const response: BulkUpdateResponse = {
      success: results.updated > 0,
      message: `Bulk update completed. ${results.updated} companies updated, ${results.failed} failed.`,
      results,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Bulk company update error:", error);
    return NextResponse.json(
      { error: "Internal server error during bulk update" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST for bulk updates." },
    { status: 405 }
  );
}
