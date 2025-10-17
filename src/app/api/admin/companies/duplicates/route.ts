import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Company {
  id: string;
  name: string;
  contact: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxNumber: string | null;
  activityField: string | null;
  students: { id: string }[];
  dekontlar: { id: string }[];
  stajlar: { id: string }[];
}

interface DuplicateGroup {
  normalizedName: string;
  totalUniqueStudents: number;
  totalUniqueDekontlar: number;
  totalUniqueStajlar: number;
  companies: (Company & {
    studentCount: number;
    dekontCount: number;
    stajCount: number;
  })[];
}

export async function GET() {
  try {
    // Tüm şirketleri al
    const companies = await prisma.companyProfile.findMany({
      select: {
        id: true,
        name: true,
        contact: true,
        phone: true,
        email: true,
        address: true,
        taxNumber: true,
        activityField: true,
        students: {
          select: { id: true },
        },
        dekontlar: {
          select: { id: true },
        },
        stajlar: {
          select: { id: true },
        },
      },
    });

    // Şirket adlarına göre normalize et ve duplicateları bul
    const duplicateGroups: DuplicateGroup[] = [];
    const processedNames = new Set<string>();

    companies.forEach((company) => {
      const normalizedName = normalizeCompanyName(company.name);

      if (processedNames.has(normalizedName)) return;
      processedNames.add(normalizedName);

      // Aynı normalized name'e sahip tüm şirketleri bul
      const similarCompanies = companies.filter(
        (c) => normalizeCompanyName(c.name) === normalizedName
      );

      if (similarCompanies.length > 1) {
        // Bu grup içindeki tüm unique öğrencileri bul
        const allStudentIds = new Set<string>();
        const allDekontIds = new Set<string>();
        const allStajIds = new Set<string>();

        similarCompanies.forEach((company) => {
          company.students.forEach((student) => allStudentIds.add(student.id));
          company.dekontlar.forEach((dekont) => allDekontIds.add(dekont.id));
          company.stajlar.forEach((staj) => allStajIds.add(staj.id));
        });

        duplicateGroups.push({
          normalizedName,
          totalUniqueStudents: allStudentIds.size,
          totalUniqueDekontlar: allDekontIds.size,
          totalUniqueStajlar: allStajIds.size,
          companies: similarCompanies.map((c) => ({
            ...c,
            studentCount: c.students.length,
            dekontCount: c.dekontlar.length,
            stajCount: c.stajlar.length,
          })),
        });
      }
    });

    return NextResponse.json({
      success: true,
      duplicateGroups,
      totalDuplicates: duplicateGroups.reduce(
        (sum, group) => sum + group.companies.length,
        0
      ),
    });
  } catch (error) {
    console.error("Duplicate companies detection error:", error);
    return NextResponse.json(
      { success: false, error: "Duplicate detection failed" },
      { status: 500 }
    );
  }
}

function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ") // Multiple spaces to single space
    .replace(/[^\w\s]/g, "") // Remove special characters
    .replace(
      /\b(ltd|şti|aş|inc|corp|limited|şirketi|san|tic|inş|turizm|otomotiv|otelcilik)\b/g,
      ""
    ) // Remove common business suffixes
    .trim();
}
