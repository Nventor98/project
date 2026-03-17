const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const phone = "08034521000";
  const pin = "1234";
  const pinHash = await bcrypt.hash(pin, 12);

  // Upsert user to avoid unique constraint if re-running
  const user = await prisma.user.upsert({
    where: { phone },
    update: { pinHash, name: "Bola Adesanya", balance: 28450, accountNo: "0034521000" },
    create: {
      phone,
      pinHash,
      name: "Bola Adesanya",
      balance: 28450,
      accountNo: "0034521000",
    },
  });

  console.log(`User created/updated: ${user.name}`);

  // Insert seed transactions
  const seedTxns = [
    { type: "credit", party: "Amaka Obi", amount: 4500, note: "Fabric payment", date: "2026-03-10", time: "09:14", status: "confirmed", channel: "online" },
    { type: "debit", party: "Emeka Store", amount: 1200, note: "Spare parts", date: "2026-03-10", time: "11:30", status: "confirmed", channel: "bluetooth" },
    { type: "credit", party: "Chidi Motors", amount: 7000, note: "Transport fee", date: "2026-03-09", time: "16:45", status: "confirmed", channel: "qr" },
    { type: "debit", party: "Ngozi Foods", amount: 850, note: "Lunch supply", date: "2026-03-09", time: "13:00", status: "confirmed", channel: "nfc" },
    { type: "debit", party: "Kemi Tailors", amount: 3200, note: "Sewing materials", date: "2026-03-08", time: "10:20", status: "pending", channel: "bluetooth" },
    { type: "credit", party: "Ayo Agro", amount: 11000, note: "Harvest proceeds", date: "2026-03-07", time: "08:05", status: "confirmed", channel: "online" },
  ];

  await prisma.transaction.deleteMany({ where: { userId: user.id } }); // Clear explicit matches

  console.log("Inserting transactions...");
  for (const txn of seedTxns) {
    await prisma.transaction.create({
      data: {
        ...txn,
        userId: user.id,
      },
    });
  }

  console.log("Finished seeding database!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
