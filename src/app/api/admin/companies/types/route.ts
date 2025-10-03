import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateAuthAndRole } from "@/middleware/auth";

export async function GET(request: NextRequest) {
  // Company types sadece authenticate olmuş kullanıcılar görebilir
  const authResult = await validateAuthAndRole(request, ["ADMIN", "TEACHER"]);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    // Get all companies with their companyType
    const companies = await prisma.companyProfile.findMany({
      select: {
        id: true,
        companyType: true,
      },
      where: {
        companyType: {
          not: null,
        },
      },
    });

    // Convert to object format for easier lookup
    const companyTypes: { [key: string]: string } = {};
    companies.forEach((company: any) => {
      if (company.companyType) {
        companyTypes[company.id.toString()] = company.companyType;
      }
    });

    return NextResponse.json(companyTypes);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Beklenmeyen bir hata oluştu" },
      { status: 500 }
    );
  }
}
