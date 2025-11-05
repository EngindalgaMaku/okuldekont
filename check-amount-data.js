const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkAmountData() {
  try {
    console.log("🔍 Checking current amount field data...");

    const dekontlar = await prisma.dekont.findMany({
      where: {
        amount: {
          not: null,
        },
      },
      select: {
        id: true,
        amount: true,
        month: true,
        year: true,
        student: {
          select: {
            name: true,
            surname: true,
          },
        },
      },
      take: 10, // İlk 10 kaydı görelim
    });

    console.log(`📊 Total records with amount: ${dekontlar.length}`);
    console.log("\n📋 Sample data:");

    dekontlar.forEach((dekont, index) => {
      console.log(`${index + 1}. ID: ${dekont.id}`);
      console.log(
        `   Student: ${dekont.student.name} ${dekont.student.surname}`
      );
      console.log(
        `   Amount: "${
          dekont.amount
        }" (Type: ${typeof dekont.amount}, Length: ${dekont.amount?.length})`
      );
      console.log(`   Month/Year: ${dekont.month}/${dekont.year}`);

      // Check if it looks like encrypted data
      if (
        dekont.amount &&
        dekont.amount.length > 20 &&
        /^[A-Za-z0-9+/=]+$/.test(dekont.amount)
      ) {
        console.log(`   📝 Likely encrypted`);
      } else if (dekont.amount && /^\d+\.?\d*$/.test(dekont.amount)) {
        console.log(`   📝 Likely plain number: ${parseFloat(dekont.amount)}`);
      } else {
        console.log(`   📝 Unknown format`);
      }
      console.log("");
    });
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAmountData();
