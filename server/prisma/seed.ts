import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Seed Categories (4 Required)
  const categories = [
    "Account and Access",
    "Hardware",
    "Software",
    "Network",
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("Categories seeded.");

  // 2. Seed Related Systems (7 Realistic Systems)
  const relatedSystems = [
    "Email",
    "Campus Wi-Fi",
    "VPN",
    "LEB2 App",
    "Grade Submission App",
    "Printer",
    "Corporate Laptop",
  ];

  for (const name of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("Related Systems seeded.");

  // 3. Seed Development Requesters (4 Active, 1 Inactive)
  const requesters = [
    {
      name: "Jennifer Anderson",
      email: "jennifer.anderson@kmutt.ac.th",
      department: "Computer Engineering",
      isActive: true,
    },
    {
      name: "Michael Brown",
      email: "michael.brown@kmutt.ac.th",
      department: "IT Support",
      isActive: true,
    },
    {
      name: "Sarah Johnson",
      email: "sarah.johnson@kmutt.ac.th",
      department: "Finance",
      isActive: true,
    },
    {
      name: "David Lee",
      email: "david.lee@kmutt.ac.th",
      department: "Marketing",
      isActive: true,
    },
    {
      name: "Robert Taylor",
      email: "robert.taylor@kmutt.ac.th",
      department: "Administration",
      isActive: false, // Inactive Requester for BR-04 validation testing
    },
  ];

  for (const req of requesters) {
    await prisma.requesterUser.upsert({
      where: { email: req.email },
      update: {
        name: req.name,
        department: req.department,
        isActive: req.isActive,
      },
      create: req,
    });
  }
  console.log("Development Requesters seeded.");

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

