import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ImportRow {
  sinif: string;
  stajGunu: string;
  bolum: string;
  ogrenciNo: string;
  ogrenciAdi: string;
  koordinatorOgretmen: string;
  isletmeAdi: string;
  isletmeAdres: string;
  isletmeTelefon: string;
  status?: "new" | "existing" | "error" | "updated";
  errors?: string[];
  suggestions?: string[];
}

interface ImportStats {
  totalRows: number;
  newStudents: number;
  newTeachers: number;
  newCompanies: number;
  newInternships: number;
  errors: number;
  warnings: number;
}

export async function POST(request: NextRequest) {
  try {
    const { data, stats }: { data: ImportRow[]; stats: ImportStats } =
      await request.json();

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı" },
        { status: 400 }
      );
    }

    let importedCount = 0;
    const errors: string[] = [];

    // Get current education year
    const currentEducationYear = await prisma.egitimYili.findFirst({
      where: { active: true },
    });

    if (!currentEducationYear) {
      return NextResponse.json(
        { error: "Aktif eğitim yılı bulunamadı" },
        { status: 400 }
      );
    }

    for (const row of data) {
      try {
        await prisma.$transaction(async (tx) => {
          // 1. Alan ve sınıf bilgisini al/oluştur
          let alan = await tx.alan.findFirst({
            where: {
              name: {
                contains: row.bolum.split("\n")[0].trim(),
              },
            },
          });

          if (!alan) {
            alan = await tx.alan.create({
              data: {
                name: row.bolum.split("\n")[0].trim(),
                description: row.bolum,
                active: true,
              },
            });
          }

          // 2. Sınıf bilgisini al/oluştur
          let classInfo = await tx.class.findFirst({
            where: {
              name: row.sinif,
              alanId: alan.id,
            },
          });

          if (!classInfo) {
            classInfo = await tx.class.create({
              data: {
                name: row.sinif,
                alanId: alan.id,
                dal: row.bolum.split("\n")[1]?.trim() || null,
              },
            });
          }

          // 3. Öğretmen bilgisini al/oluştur
          const teacherName = row.koordinatorOgretmen.trim().split(" ");
          const teacherFirstName = teacherName.slice(0, -1).join(" ");
          const teacherLastName = teacherName[teacherName.length - 1];

          let teacher = await tx.teacherProfile.findFirst({
            where: {
              name: teacherFirstName,
              surname: teacherLastName,
            },
          });

          if (!teacher) {
            // Create user first
            const teacherUser = await tx.user.create({
              data: {
                email: `${teacherFirstName.toLowerCase()}.${teacherLastName.toLowerCase()}@school.edu.tr`,
                password: "$2b$10$placeholder", // Will need to be changed
                role: "TEACHER",
              },
            });

            teacher = await tx.teacherProfile.create({
              data: {
                name: teacherFirstName,
                surname: teacherLastName,
                pin: "2025", // Default PIN
                userId: teacherUser.id,
                alanId: alan.id,
                mustChangePin: true,
                active: true,
              },
            });
          }

          // 4. İşletme bilgisini al/oluştur
          let company: any = null;
          if (row.isletmeAdi && row.isletmeAdi.trim()) {
            company = await tx.companyProfile.findFirst({
              where: {
                name: {
                  equals: row.isletmeAdi.trim(),
                },
              },
            });

            if (!company) {
              // Create user first
              const companyUser = await tx.user.create({
                data: {
                  email: `${row.isletmeAdi
                    .toLowerCase()
                    .replace(/\s/g, "")
                    .slice(0, 20)}@company.com`,
                  password: "$2b$10$placeholder", // Will need to be changed
                  role: "COMPANY",
                },
              });

              company = await tx.companyProfile.create({
                data: {
                  name: row.isletmeAdi.trim(),
                  contact: "Yetkili Kişi", // Default contact
                  address: row.isletmeAdres?.trim() || null,
                  phone: row.isletmeTelefon?.trim() || null,
                  pin: "1234", // Default PIN
                  userId: companyUser.id,
                  teacherId: teacher.id,
                  teacherAssignedAt: new Date(),
                  mustChangePin: true,
                },
              });

              // Create teacher assignment history
              await tx.teacherAssignmentHistory.create({
                data: {
                  companyId: company.id,
                  teacherId: teacher.id,
                  assignedBy: companyUser.id, // Using company user as assigner for now
                  reason: "Excel import ile otomatik atama",
                },
              });
            }
          }

          // 5. Öğrenci bilgisini al/oluştur
          let student = await tx.student.findFirst({
            where: {
              number: row.ogrenciNo,
              name: {
                contains: row.ogrenciAdi.split(" ")[0],
              },
            },
          });

          if (!student) {
            const studentName = row.ogrenciAdi.trim().split(" ");
            const firstName = studentName.slice(0, -1).join(" ");
            const lastName = studentName[studentName.length - 1];

            student = await tx.student.create({
              data: {
                name: firstName,
                surname: lastName,
                number: row.ogrenciNo,
                className: row.sinif,
                alanId: alan.id,
                classId: classInfo.id,
                companyId: company?.id || null,
              },
            });

            // Create student enrollment
            await tx.studentEnrollment.create({
              data: {
                studentId: student.id,
                educationYearId: currentEducationYear.id,
                classId: classInfo.id,
                className: row.sinif,
                grade: row.sinif.startsWith("12")
                  ? 12
                  : row.sinif.startsWith("11")
                  ? 11
                  : 10,
              },
            });
          }

          // 6. Staj kaydını oluştur (eğer yoksa)
          if (company && student) {
            const existingInternship = await tx.staj.findFirst({
              where: {
                studentId: student.id,
                companyId: company.id,
                educationYearId: currentEducationYear.id,
                status: "ACTIVE",
              },
            });

            if (!existingInternship) {
              // Create internship record
              const startDate = new Date(
                currentEducationYear.startDate || new Date()
              );
              const endDate = new Date(
                currentEducationYear.endDate ||
                  new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
              );

              await tx.staj.create({
                data: {
                  studentId: student.id,
                  companyId: company.id,
                  teacherId: teacher.id,
                  educationYearId: currentEducationYear.id,
                  startDate,
                  endDate,
                  status: "ACTIVE",
                },
              });
            }
          }

          importedCount++;
        });
      } catch (error) {
        console.error(`Row import error for ${row.ogrenciAdi}:`, error);
        errors.push(`${row.ogrenciAdi}: ${(error as Error).message}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported: importedCount,
      errors: errors.length > 0 ? errors : null,
      message: `${importedCount} kayıt başarıyla içe aktarıldı${
        errors.length > 0 ? `, ${errors.length} hataya sahip kayıt atlandı` : ""
      }`,
    });
  } catch (error) {
    console.error("Import API error:", error);
    return NextResponse.json(
      {
        error: "İçe aktarım sırasında hata oluştu: " + (error as Error).message,
      },
      { status: 500 }
    );
  }
}
