// Test script to validate teacher dekont upload fix
// Run with: node test-teacher-dekont-fix.js

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testTeacherAuthFlow() {
  console.log("🔍 TESTING TEACHER DEKONT UPLOAD FIX\n");

  try {
    // 1. Test User -> TeacherProfile mapping
    console.log("1. Testing User -> TeacherProfile mapping...");

    const users = await prisma.user.findMany({
      where: { role: "TEACHER" },
      include: { teacherProfile: true },
      take: 3,
    });

    console.log(`Found ${users.length} teacher users:`);
    users.forEach((user) => {
      console.log(
        `   User ID: ${user.id} -> TeacherProfile ID: ${
          user.teacherProfile?.id || "NOT FOUND"
        }`
      );
      console.log(
        `   Email: ${user.email} -> Name: ${
          user.teacherProfile?.name || "N/A"
        } ${user.teacherProfile?.surname || ""}`
      );
    });

    // 2. Test TeacherProfile existence
    console.log("\n2. Testing TeacherProfile records...");

    const teacherProfiles = await prisma.teacherProfile.findMany({
      take: 3,
      select: { id: true, name: true, surname: true, userId: true },
    });

    console.log(`Found ${teacherProfiles.length} teacher profiles:`);
    teacherProfiles.forEach((teacher) => {
      console.log(
        `   TeacherProfile ID: ${teacher.id} -> User ID: ${teacher.userId}`
      );
      console.log(`   Name: ${teacher.name} ${teacher.surname}`);
    });

    // 3. Test Active Stajlar for teachers
    console.log("\n3. Testing active stajlar for teachers...");

    const activeStajlar = await prisma.staj.findMany({
      where: {
        status: "ACTIVE",
        teacherId: { not: null },
      },
      include: {
        teacher: { select: { id: true, name: true, surname: true } },
        student: { select: { name: true, surname: true } },
        company: { select: { name: true } },
      },
      take: 3,
    });

    console.log(`Found ${activeStajlar.length} active stajlar:`);
    activeStajlar.forEach((staj) => {
      console.log(`   Staj ID: ${staj.id}`);
      console.log(
        `   Teacher: ${staj.teacher?.name} ${staj.teacher?.surname} (ID: ${staj.teacherId})`
      );
      console.log(`   Student: ${staj.student?.name} ${staj.student?.surname}`);
      console.log(`   Company: ${staj.company?.name}`);
    });

    console.log("\n✅ TEST COMPLETED - Check above results for any issues");
    console.log("\n💡 EXPECTED BEHAVIOR:");
    console.log(
      "- Each User with role TEACHER should have a matching TeacherProfile"
    );
    console.log("- TeacherProfile.userId should match User.id");
    console.log("- Active stajlar should have valid teacher assignments");
  } catch (error) {
    console.error("❌ TEST FAILED:", error.message);
    console.error("Stack:", error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testTeacherAuthFlow();
