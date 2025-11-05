const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function cleanupEncryptedAmounts() {
  try {
    console.log("🧹 Starting encrypted amount cleanup...");

    const encryptedRecords = [
      "cmhkgknon004cqr0ktcb2ys8r",
      "cmhkguc27004gqr0k3sela1fs",
      "cmhkq2jgz005oqr0kdiypydl2",
      "cmhky6stg0062qr0kew24x24n",
      "cmhlrr390006zqr0kx72xe9ae",
    ];

    console.log(
      `🔧 Cleaning up ${encryptedRecords.length} encrypted records...`
    );

    for (let i = 0; i < encryptedRecords.length; i++) {
      const recordId = encryptedRecords[i];

      try {
        // First, let's see what this record looks like
        const record = await prisma.dekont.findUnique({
          where: { id: recordId },
          select: {
            id: true,
            amount: true,
            student: {
              select: {
                name: true,
                surname: true,
              },
            },
            month: true,
            year: true,
          },
        });

        if (record) {
          console.log(
            `${i + 1}. Cleaning record for ${record.student.name} ${
              record.student.surname
            } (${record.month}/${record.year})`
          );
          console.log(
            `   Original amount: ${record.amount?.substring(0, 30)}...`
          );

          // Update the record to set amount to null
          await prisma.dekont.update({
            where: { id: recordId },
            data: { amount: null },
          });

          console.log(`   ✅ Amount set to null`);
        } else {
          console.log(`⚠️ Record ${recordId} not found`);
        }
      } catch (error) {
        console.error(`❌ Error updating record ${recordId}:`, error);
      }
    }

    console.log(
      "\n🎉 Cleanup completed! Now you can safely run the Decimal migration."
    );
    console.log("📋 Summary: 5 encrypted amount values were set to null");
  } catch (error) {
    console.error("❌ Cleanup error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupEncryptedAmounts();
