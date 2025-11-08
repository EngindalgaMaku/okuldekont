const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkHardcodedUser() {
  try {
    console.log(
      '🔍 Checking for hardcoded "akademik-kullanici" in database...'
    );

    // Check in users table
    console.log("\n👤 Checking Users table...");
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        adminProfile: {
          select: {
            name: true,
          },
        },
        teacherProfile: {
          select: {
            name: true,
            surname: true,
          },
        },
        companyProfile: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log(`📊 Total users found: ${users.length}`);

    let suspiciousUsers = [];
    users.forEach((user, index) => {
      const displayName =
        user.adminProfile?.name ||
        (user.teacherProfile
          ? `${user.teacherProfile.name} ${user.teacherProfile.surname}`
          : null) ||
        user.companyProfile?.name ||
        user.email;

      console.log(
        `${index + 1}. ID: ${user.id}, Email: ${user.email}, Role: ${
          user.role
        }, Name: ${displayName}`
      );

      // Check for suspicious patterns
      if (
        user.email.includes("akademik") ||
        displayName?.includes("akademik") ||
        user.id === "akademik-kullanici" ||
        user.email === "akademik-kullanici"
      ) {
        suspiciousUsers.push(user);
      }
    });

    if (suspiciousUsers.length > 0) {
      console.log("\n⚠️ SUSPICIOUS USERS FOUND:");
      suspiciousUsers.forEach((user, index) => {
        console.log(`${index + 1}. Suspicious user:`, user);
      });
    }

    // Check for any field that might contain "akademik-kullanici"
    console.log(
      '\n🔍 Checking for "akademik-kullanici" string in any user fields...'
    );

    try {
      const rawQuery = await prisma.$queryRaw`
        SELECT * FROM users 
        WHERE email LIKE '%akademik%' 
           OR id = 'akademik-kullanici'
           OR password LIKE '%akademik%'
      `;

      if (Array.isArray(rawQuery) && rawQuery.length > 0) {
        console.log('🚨 Found users with "akademik" pattern:', rawQuery);
      } else {
        console.log('✅ No users with "akademik" pattern found in users table');
      }
    } catch (error) {
      console.log("⚠️ Could not execute raw query:", error.message);
    }

    // Check in admin profiles
    console.log("\n👔 Checking AdminProfile table...");
    const adminProfiles = await prisma.adminProfile.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        userId: true,
      },
    });

    adminProfiles.forEach((admin, index) => {
      console.log(
        `${index + 1}. Admin: ${admin.name} (${admin.email}), UserID: ${
          admin.userId
        }`
      );

      if (
        admin.name?.includes("akademik") ||
        admin.email?.includes("akademik") ||
        admin.id === "akademik-kullanici"
      ) {
        console.log(`🚨 SUSPICIOUS ADMIN FOUND:`, admin);
      }
    });

    // Check in teacher profiles
    console.log("\n🎓 Checking TeacherProfile table...");
    const teacherProfiles = await prisma.teacherProfile.findMany({
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        userId: true,
      },
      take: 10,
    });

    teacherProfiles.forEach((teacher, index) => {
      const fullName = `${teacher.name} ${teacher.surname}`;
      console.log(
        `${index + 1}. Teacher: ${fullName} (${teacher.email}), UserID: ${
          teacher.userId
        }`
      );

      if (
        fullName.includes("akademik") ||
        teacher.email?.includes("akademik") ||
        teacher.id === "akademik-kullanici"
      ) {
        console.log(`🚨 SUSPICIOUS TEACHER FOUND:`, teacher);
      }
    });

    // Check in company profiles
    console.log("\n🏢 Checking CompanyProfile table...");
    const companyProfiles = await prisma.companyProfile.findMany({
      select: {
        id: true,
        name: true,
        contact: true,
        email: true,
        userId: true,
      },
      take: 10,
    });

    companyProfiles.forEach((company, index) => {
      console.log(
        `${index + 1}. Company: ${company.name} (${company.email}), Contact: ${
          company.contact
        }, UserID: ${company.userId}`
      );

      if (
        company.name?.includes("akademik") ||
        company.contact?.includes("akademik") ||
        company.email?.includes("akademik") ||
        company.id === "akademik-kullanici"
      ) {
        console.log(`🚨 SUSPICIOUS COMPANY FOUND:`, company);
      }
    });

    // Look for any sessions or other tables that might have this value
    console.log("\n🔍 Checking for other possible sources...");

    console.log(
      "\n✅ Investigation completed. If no suspicious entries were found,"
    );
    console.log('   "akademik-kullanici" might be coming from:');
    console.log("   - A deleted/archived user");
    console.log("   - A session table (if exists)");
    console.log("   - A seeded/test data");
    console.log("   - Environment variables or config files");
  } catch (error) {
    console.error("❌ Error during investigation:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHardcodedUser();
