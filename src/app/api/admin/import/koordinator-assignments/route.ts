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
          let teacher: any = null;
          if (row.koordinatorOgretmen && row.koordinatorOgretmen.trim()) {
            const teacherName = row.koordinatorOgretmen.trim().split(" ");
            const teacherFirstName = teacherName.slice(0, -1).join(" ");
            const teacherLastName = teacherName[teacherName.length - 1];

            teacher = await tx.teacherProfile.findFirst({
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
                  password: "$2b$10$placeholder",
                  role: "TEACHER",
                },
              });

              teacher = await tx.teacherProfile.create({
                data: {
                  name: teacherFirstName,
                  surname: teacherLastName,
                  pin: "2025",
                  userId: teacherUser.id,
                  alanId: null,
                  mustChangePin: true,
                  active: true,
                },
              });
            }
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
                  password: "$2b$10$placeholder",
                  role: "COMPANY",
                },
              });

              company = await tx.companyProfile.create({
                data: {
                  name: row.isletmeAdi.trim(),
                  contact: "Yetkili Kişi",
                  address: row.isletmeAdres?.trim() || null,
                  phone: row.isletmeTelefon?.trim() || null,
                  pin: "1234",
                  userId: companyUser.id,
                  teacherId: teacher?.id || null,
                  teacherAssignedAt: teacher ? new Date() : null,
                  mustChangePin: true,
                },
              });

              if (teacher) {
                await tx.teacherAssignmentHistory.create({
                  data: {
                    companyId: company.id,
                    teacherId: teacher.id,
                    assignedBy: companyUser.id,
                    reason: "Excel import ile otomatik atama",
                  },
                });
              }
            } else {
              // Mevcut işletmeyi güncelle
              const updateData: any = {};
              if (row.isletmeTelefon && row.isletmeTelefon.trim()) {
                updateData.phone = row.isletmeTelefon.trim();
              }
              if (row.isletmeAdres && row.isletmeAdres.trim()) {
                updateData.address = row.isletmeAdres.trim();
              }
              if (teacher && company.teacherId !== teacher.id) {
                updateData.teacherId = teacher.id;
                updateData.teacherAssignedAt = new Date();
              }
              if (Object.keys(updateData).length > 0) {
                company = await tx.companyProfile.update({
                  where: { id: company.id },
                  data: updateData,
                });
              }
            }
          }

          // Sınıf seviyesi hesaplama (9, 10, 11, 12)
          const gradeNum = row.sinif.startsWith("12")
            ? 12
            : row.sinif.startsWith("11")
            ? 11
            : row.sinif.startsWith("10")
            ? 10
            : row.sinif.startsWith("09") || row.sinif.startsWith("9")
            ? 9
            : 12;

          // 5. Öğrenci bilgisini al/oluştur / GÜNCELLE
          let student = await tx.student.findFirst({
            where: {
              number: row.ogrenciNo,
            },
          });

          if (!student) {
            // Eğer numarayla bulunamadıysa ada göre ara
            student = await tx.student.findFirst({
              where: {
                name: {
                  contains: row.ogrenciAdi.split(" ")[0],
                },
                surname: {
                  contains: row.ogrenciAdi.split(" ").slice(-1)[0],
                },
              },
            });
          }

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
                grade: gradeNum,
              },
            });
          } else {
            // Öğrenci zaten varsa sınıfını, alanını ve işletmesini yeni yıla göre güncelle!
            student = await tx.student.update({
              where: { id: student.id },
              data: {
                className: row.sinif,
                classId: classInfo.id,
                alanId: alan.id,
                companyId: company?.id || student.companyId,
                number: row.ogrenciNo || student.number,
              },
            });

            // Bu eğitim yılı için enrollment kaydı var mı kontrol et, yoksa oluştur, varsa güncelle
            const existingEnrollment = await tx.studentEnrollment.findFirst({
              where: {
                studentId: student.id,
                educationYearId: currentEducationYear.id,
              },
            });

            if (existingEnrollment) {
              await tx.studentEnrollment.update({
                where: { id: existingEnrollment.id },
                data: {
                  classId: classInfo.id,
                  className: row.sinif,
                  grade: gradeNum,
                  status: "ACTIVE",
                },
              });
            } else {
              await tx.studentEnrollment.create({
                data: {
                  studentId: student.id,
                  educationYearId: currentEducationYear.id,
                  classId: classInfo.id,
                  className: row.sinif,
                  grade: gradeNum,
                  status: "ACTIVE",
                },
              });
            }
          }

          // 6. Staj kaydını oluştur veya güncelle
          if (company && student) {
            const existingInternship = await tx.staj.findFirst({
              where: {
                studentId: student.id,
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
                  teacherId: teacher?.id || null,
                  educationYearId: currentEducationYear.id,
                  startDate,
                  endDate,
                  status: "ACTIVE",
                },
              });
            } else {
              // Mevcut staj kaydını bu yılki koordinatör ve işletmeye göre güncelle
              await tx.staj.update({
                where: { id: existingInternship.id },
                data: {
                  companyId: company.id,
                  teacherId: teacher?.id || existingInternship.teacherId,
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
