import { PrismaClient, UserRole, RequestedPriority, TicketStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// All seeded accounts use "Password123!" as their development password.
const DEV_PASSWORD = "Password123!";

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

async function main() {
  console.log("Starting Lab 3 seed...");

  // ─────────────────────────────────────────────────
  // 1. Seed Categories
  // ─────────────────────────────────────────────────
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
  console.log("✓ Categories seeded.");

  // ─────────────────────────────────────────────────
  // 2. Seed Related Systems
  // ─────────────────────────────────────────────────
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
    await prisma.related_system.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("✓ Related Systems seeded.");

  // ─────────────────────────────────────────────────
  // 3. Seed Users
  // ─────────────────────────────────────────────────
  const devPasswordHash = await hashPassword(DEV_PASSWORD);

  const users = [
    // 4 Active Requesters
    {
      email: "jennifer.anderson@kmutt.ac.th",
      name: "Jennifer Anderson",
      role: UserRole.REQUESTER,
      isActive: true,
      mustChangePassword: false,
    },
    {
      email: "michael.brown@kmutt.ac.th",
      name: "Michael Brown",
      role: UserRole.REQUESTER,
      isActive: true,
      mustChangePassword: false,
    },
    {
      email: "sarah.johnson@kmutt.ac.th",
      name: "Sarah Johnson",
      role: UserRole.REQUESTER,
      isActive: true,
      mustChangePassword: false,
    },
    {
      email: "david.lee@kmutt.ac.th",
      name: "David Lee",
      role: UserRole.REQUESTER,
      isActive: true,
      mustChangePassword: false,
    },
    // 1 Inactive Requester (BR-01 testing)
    {
      email: "robert.taylor@kmutt.ac.th",
      name: "Robert Taylor",
      role: UserRole.REQUESTER,
      isActive: false,
      mustChangePassword: false,
    },
    // 3 Active IT Staff
    {
      email: "alex.turner@toktickit.kmutt.ac.th",
      name: "Alex Turner",
      role: UserRole.IT_STAFF,
      isActive: true,
      mustChangePassword: true,
    },
    {
      email: "jessica.miller@toktickit.kmutt.ac.th",
      name: "Jessica Miller",
      role: UserRole.IT_STAFF,
      isActive: true,
      mustChangePassword: true,
    },
    {
      email: "kevin.patel@toktickit.kmutt.ac.th",
      name: "Kevin Patel",
      role: UserRole.IT_STAFF,
      isActive: true,
      mustChangePassword: true,
    },
    // 1 Inactive IT Staff
    {
      email: "rachel.green@toktickit.kmutt.ac.th",
      name: "Rachel Green",
      role: UserRole.IT_STAFF,
      isActive: false,
      mustChangePassword: false,
    },
    // 1 Active Administrator
    {
      email: "admin@toktickit.kmutt.ac.th",
      name: "System Admin",
      role: UserRole.ADMIN,
      isActive: true,
      mustChangePassword: false,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      },
      create: {
        ...user,
        passwordHash: devPasswordHash,
        updatedAt: new Date(),
      },
    });
  }
  console.log("✓ Users seeded (5 Requesters, 4 IT Staff, 1 Admin).");

  // ─────────────────────────────────────────────────
  // 4. Fetch IDs for ticket seeding
  // ─────────────────────────────────────────────────
  const jennifer = await prisma.user.findUniqueOrThrow({ where: { email: "jennifer.anderson@kmutt.ac.th" } });
  const michael = await prisma.user.findUniqueOrThrow({ where: { email: "michael.brown@kmutt.ac.th" } });
  const sarah = await prisma.user.findUniqueOrThrow({ where: { email: "sarah.johnson@kmutt.ac.th" } });
  const david = await prisma.user.findUniqueOrThrow({ where: { email: "david.lee@kmutt.ac.th" } });
  const alex = await prisma.user.findUniqueOrThrow({ where: { email: "alex.turner@toktickit.kmutt.ac.th" } });
  const jessica = await prisma.user.findUniqueOrThrow({ where: { email: "jessica.miller@toktickit.kmutt.ac.th" } });

  const catNetwork = await prisma.category.findFirstOrThrow({ where: { name: "Network" } });
  const catHardware = await prisma.category.findFirstOrThrow({ where: { name: "Hardware" } });
  const catSoftware = await prisma.category.findFirstOrThrow({ where: { name: "Software" } });
  const catAccount = await prisma.category.findFirstOrThrow({ where: { name: "Account and Access" } });

  const sysWifi = await prisma.related_system.findFirstOrThrow({ where: { name: "Campus Wi-Fi" } });
  const sysLaptop = await prisma.related_system.findFirstOrThrow({ where: { name: "Corporate Laptop" } });
  const sysEmail = await prisma.related_system.findFirstOrThrow({ where: { name: "Email" } });
  const sysGrades = await prisma.related_system.findFirstOrThrow({ where: { name: "Grade Submission App" } });
  const sysVPN = await prisma.related_system.findFirstOrThrow({ where: { name: "VPN" } });

  // ─────────────────────────────────────────────────
  // 5. Seed Tickets
  // ─────────────────────────────────────────────────
  const ticketDefs = [
    {
      ticketNumber: "TKT-SEED-001",
      submittedById: jennifer.id,
      ownerId: alex.id,
      categoryId: catNetwork.id,
      relatedSystemId: sysWifi.id,
      summary: "Campus Wi-Fi drops intermittently in CB2",
      description: "Wi-Fi connection drops every 5–10 minutes in building CB2, room 401. Affects all devices.",
      requestedPriority: RequestedPriority.HIGH,
      itPriority: RequestedPriority.HIGH,
      currentStatus: TicketStatus.IN_PROGRESS,
    },
    {
      ticketNumber: "TKT-SEED-002",
      submittedById: michael.id,
      ownerId: null,
      categoryId: catHardware.id,
      relatedSystemId: sysLaptop.id,
      summary: "Laptop battery drains within 30 minutes",
      description: "Dell laptop battery health has degraded significantly and requires replacement. Purchased 18 months ago.",
      requestedPriority: RequestedPriority.MEDIUM,
      itPriority: RequestedPriority.MEDIUM,
      currentStatus: TicketStatus.NEW,
    },
    {
      ticketNumber: "TKT-SEED-003",
      submittedById: sarah.id,
      ownerId: jessica.id,
      categoryId: catSoftware.id,
      relatedSystemId: sysEmail.id,
      summary: "Cannot send emails with attachments larger than 10MB",
      description: "Outlook blocks outgoing emails with attachments above 10MB. Need the limit raised or an alternative workaround.",
      requestedPriority: RequestedPriority.HIGH,
      itPriority: RequestedPriority.HIGH,
      currentStatus: TicketStatus.WAITING_FOR_REQUESTER,
    },
    {
      ticketNumber: "TKT-SEED-004",
      submittedById: david.id,
      ownerId: alex.id,
      categoryId: catAccount.id,
      relatedSystemId: sysGrades.id,
      summary: "Cannot log into Grade Submission App",
      description: "Receives Account locked error on the Grade Submission App. SSO works fine on other systems.",
      requestedPriority: RequestedPriority.HIGH,
      itPriority: RequestedPriority.HIGH,
      currentStatus: TicketStatus.RESOLVED,
    },
    {
      ticketNumber: "TKT-SEED-005",
      submittedById: jennifer.id,
      ownerId: jessica.id,
      categoryId: catNetwork.id,
      relatedSystemId: sysVPN.id,
      summary: "VPN disconnects after 10 minutes of inactivity",
      description: "The FortiClient VPN disconnects when idle for more than 10 minutes, requiring reconnection which interrupts remote desktop sessions.",
      requestedPriority: RequestedPriority.HIGH,
      itPriority: RequestedPriority.MEDIUM,
      currentStatus: TicketStatus.CLOSED,
    },
    {
      ticketNumber: "TKT-SEED-006",
      submittedById: michael.id,
      ownerId: null,
      categoryId: catSoftware.id,
      relatedSystemId: sysLaptop.id,
      summary: "Microsoft Office fails to activate after reinstall",
      description: "After reinstalling Windows, Microsoft Office 365 cannot activate despite valid license credentials.",
      requestedPriority: RequestedPriority.LOW,
      itPriority: RequestedPriority.LOW,
      currentStatus: TicketStatus.OPEN,
    },
  ];

  for (const t of ticketDefs) {
    await prisma.ticket.upsert({
      where: { ticketNumber: t.ticketNumber },
      update: {
        currentStatus: t.currentStatus,
        ownerId: t.ownerId,
        itPriority: t.itPriority,
      },
    create: { ...t, updatedAt: new Date() },
    });
  }
  console.log("✓ Sample tickets seeded across multiple statuses.");

  // ─────────────────────────────────────────────────
  // 6. Seed Public Comments
  // ─────────────────────────────────────────────────
  const ticket001 = await prisma.ticket.findUniqueOrThrow({ where: { ticketNumber: "TKT-SEED-001" } });
  const ticket003 = await prisma.ticket.findUniqueOrThrow({ where: { ticketNumber: "TKT-SEED-003" } });

  const publicCount001 = await prisma.public_comment.count({ where: { ticketId: ticket001.id } });
  if (publicCount001 === 0) {
    await prisma.public_comment.createMany({
      data: [
        {
          ticketId: ticket001.id,
          authorId: jennifer.id,
          content: "I noticed the disconnect happens specifically in room 401. Other rooms on the same floor seem unaffected.",
        },
        {
          ticketId: ticket001.id,
          authorId: alex.id,
          content: "Investigating the access point AP-CB2-401. Will update after rebooting the AP.",
        },
      ],
    });
  }

  const publicCount003 = await prisma.public_comment.count({ where: { ticketId: ticket003.id } });
  if (publicCount003 === 0) {
    await prisma.public_comment.createMany({
      data: [
        {
          ticketId: ticket003.id,
          authorId: jessica.id,
          content: "The mail server limit is currently 10MB. Can you confirm the specific file types you need to send?",
        },
        {
          ticketId: ticket003.id,
          authorId: sarah.id,
          content: "Mostly PDF and Excel files, some up to 25MB. We often send monthly reports to external partners.",
        },
      ],
    });
  }
  console.log("✓ Sample public comments seeded.");

  // ─────────────────────────────────────────────────
  // 7. Seed Internal Notes
  // ─────────────────────────────────────────────────
  const internalCount001 = await prisma.internal_note.count({ where: { ticketId: ticket001.id } });
  if (internalCount001 === 0) {
    await prisma.internal_note.createMany({
      data: [
        {
          ticketId: ticket001.id,
          authorId: alex.id,
          content: "AP-CB2-401 rebooted at 09:00. Signal strength normalized. Monitoring for 24h before resolving.",
        },
      ],
    });
  }

  const internalCount003 = await prisma.internal_note.count({ where: { ticketId: ticket003.id } });
  if (internalCount003 === 0) {
    await prisma.internal_note.createMany({
      data: [
        {
          ticketId: ticket003.id,
          authorId: jessica.id,
          content: "Checked Exchange settings. Limit is a global policy. Waiting for manager approval to raise to 30MB.",
        },
      ],
    });
  }
  console.log("✓ Sample internal notes seeded.");

  console.log("\n🎉 Lab 3 seed completed successfully!");
  console.log("   Development password for all accounts: Password123!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
