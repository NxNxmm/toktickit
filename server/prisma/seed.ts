import { PrismaClient, UserRole, RequestedPriority, TicketStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { pathToFileURL } from "node:url";

export const prisma = new PrismaClient();

// All seeded accounts use "Password123!" as their development password.
const DEV_PASSWORD = "Password123!";

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

/**
 * Idempotently provisions the development seed data. Exported so the test
 * harness (`server/tests/global-setup.ts`) can canonize the database before a
 * server test run, and entry-point guarded so `npm run prisma:seed` — and the
 * Prisma `prisma.seed` hook — keep working exactly as before.
 */
export async function runSeed() {
  console.log("Starting Lab 4 seed...");

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
    { email: "jennifer.anderson@kmutt.ac.th", name: "Jennifer Anderson", role: UserRole.REQUESTER, isActive: true, requiresPasswordChange: false },
    { email: "michael.brown@kmutt.ac.th", name: "Michael Brown", role: UserRole.REQUESTER, isActive: true, requiresPasswordChange: false },
    { email: "sarah.johnson@kmutt.ac.th", name: "Sarah Johnson", role: UserRole.REQUESTER, isActive: true, requiresPasswordChange: false },
    { email: "david.lee@kmutt.ac.th", name: "David Lee", role: UserRole.REQUESTER, isActive: true, requiresPasswordChange: false },
    // 1 Inactive Requester (BR-01 testing)
    { email: "robert.taylor@kmutt.ac.th", name: "Robert Taylor", role: UserRole.REQUESTER, isActive: false, requiresPasswordChange: false },
    // 3 Active IT Staff
    { email: "alex.turner@toktickit.kmutt.ac.th", name: "Alex Turner", role: UserRole.IT_STAFF, isActive: true, requiresPasswordChange: true },
    { email: "jessica.miller@toktickit.kmutt.ac.th", name: "Jessica Miller", role: UserRole.IT_STAFF, isActive: true, requiresPasswordChange: true },
    { email: "kevin.patel@toktickit.kmutt.ac.th", name: "Kevin Patel", role: UserRole.IT_STAFF, isActive: true, requiresPasswordChange: true },
    // 1 Inactive IT Staff (BR-04 testing — inactive actor rejected for POST actions-taken)
    { email: "rachel.green@toktickit.kmutt.ac.th", name: "Rachel Green", role: UserRole.IT_STAFF, isActive: false, requiresPasswordChange: false },
    // 1 Active Administrator
    { email: "admin@toktickit.kmutt.ac.th", name: "System Admin", role: UserRole.ADMIN, isActive: true, requiresPasswordChange: false },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, isActive: user.isActive, requiresPasswordChange: user.requiresPasswordChange, passwordHash: devPasswordHash },
      create: { ...user, passwordHash: devPasswordHash, updatedAt: new Date() },
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
  const kevin = await prisma.user.findUniqueOrThrow({ where: { email: "kevin.patel@toktickit.kmutt.ac.th" } });

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
      update: { currentStatus: t.currentStatus, ownerId: t.ownerId, itPriority: t.itPriority },
      create: { ...t, updatedAt: new Date() },
    });
  }
  console.log("✓ Sample tickets seeded across multiple statuses.");

  // ─────────────────────────────────────────────────
  // 6. Seed Public Comments
  // ─────────────────────────────────────────────────
  const ticket001 = await prisma.ticket.findUniqueOrThrow({ where: { ticketNumber: "TKT-SEED-001" } });
  const ticket003 = await prisma.ticket.findUniqueOrThrow({ where: { ticketNumber: "TKT-SEED-003" } });
  const ticket004 = await prisma.ticket.findUniqueOrThrow({ where: { ticketNumber: "TKT-SEED-004" } });
  const ticket005 = await prisma.ticket.findUniqueOrThrow({ where: { ticketNumber: "TKT-SEED-005" } });

  const publicCount001 = await prisma.public_comment.count({ where: { ticketId: ticket001.id } });
  if (publicCount001 === 0) {
    await prisma.public_comment.createMany({
      data: [
        { ticketId: ticket001.id, authorId: jennifer.id, content: "I noticed the disconnect happens specifically in room 401. Other rooms on the same floor seem unaffected." },
        { ticketId: ticket001.id, authorId: alex.id, content: "Investigating the access point AP-CB2-401. Will update after rebooting the AP." },
      ],
    });
  }

  const publicCount003 = await prisma.public_comment.count({ where: { ticketId: ticket003.id } });
  if (publicCount003 === 0) {
    await prisma.public_comment.createMany({
      data: [
        { ticketId: ticket003.id, authorId: jessica.id, content: "The mail server limit is currently 10MB. Can you confirm the specific file types you need to send?" },
        { ticketId: ticket003.id, authorId: sarah.id, content: "Mostly PDF and Excel files, some up to 25MB. We often send monthly reports to external partners." },
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
      data: [{ ticketId: ticket001.id, authorId: alex.id, content: "AP-CB2-401 rebooted at 09:00. Signal strength normalized. Monitoring for 24h before resolving." }],
    });
  }

  const internalCount003 = await prisma.internal_note.count({ where: { ticketId: ticket003.id } });
  if (internalCount003 === 0) {
    await prisma.internal_note.createMany({
      data: [{ ticketId: ticket003.id, authorId: jessica.id, content: "Checked Exchange settings. Limit is a global policy. Waiting for manager approval to raise to 30MB." }],
    });
  }
  console.log("✓ Sample internal notes seeded.");

  // ─────────────────────────────────────────────────
  // 8. Seed Actions Taken (Lab 4 — idempotent)
  //    Scenarios:
  //      TKT-SEED-001 → 2 actions  (IN_PROGRESS: active work log)
  //      TKT-SEED-004 → 1 action   (RESOLVED: proves resolution gate prerequisite)
  //      TKT-SEED-005 → 2 actions  (CLOSED: full lifecycle)
  //      TKT-SEED-002, 003, 006 → 0 actions (NEW/WAITING/OPEN: tests the gate blocks)
  // ─────────────────────────────────────────────────
  const actionCount001 = await prisma.action_taken.count({ where: { ticketId: ticket001.id } });
  if (actionCount001 === 0) {
    await prisma.action_taken.createMany({
      data: [
        {
          ticketId: ticket001.id,
          performedById: alex.id,
          actionDateTime: new Date("2026-10-01T09:00:00.000Z"),
          description: "Conducted initial site survey of CB2 room 401. Checked channel interference on AP-CB2-401.",
          result: "Found channel overlap with neighboring APs. Reconfigured to channel 11 (5GHz band).",
          followUpRequired: true,
          followUpNote: "Monitor signal stability for 24 hours and confirm with jennifer.anderson.",
          attachmentNotes: null,
          updatedAt: new Date("2026-10-01T09:30:00.000Z"),
        },
        {
          ticketId: ticket001.id,
          performedById: kevin.id,
          actionDateTime: new Date("2026-10-02T10:00:00.000Z"),
          description: "Performed firmware upgrade on AP-CB2-401 and reset DHCP lease table.",
          result: "Firmware upgraded from v6.2.1 to v6.4.0. No disconnects observed after 2 hours of monitoring.",
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: "Firmware changelog: ap-firmware-v6.4.0-notes.pdf",
          updatedAt: new Date("2026-10-02T10:45:00.000Z"),
        },
      ],
    });
  }

  const actionCount004 = await prisma.action_taken.count({ where: { ticketId: ticket004.id } });
  if (actionCount004 === 0) {
    await prisma.action_taken.createMany({
      data: [
        {
          ticketId: ticket004.id,
          performedById: alex.id,
          actionDateTime: new Date("2026-09-30T14:00:00.000Z"),
          description: "Unlocked the user account in the Grade Submission App admin panel. Reset SSO session token.",
          result: "User account unlocked. David Lee confirmed successful login and grade submission.",
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
          updatedAt: new Date("2026-09-30T14:30:00.000Z"),
        },
      ],
    });
  }

  const actionCount005 = await prisma.action_taken.count({ where: { ticketId: ticket005.id } });
  if (actionCount005 === 0) {
    await prisma.action_taken.createMany({
      data: [
        {
          ticketId: ticket005.id,
          performedById: jessica.id,
          actionDateTime: new Date("2026-09-28T11:00:00.000Z"),
          description: "Investigated FortiClient VPN idle-disconnect policy. Reviewed firewall keep-alive settings.",
          result: "Identified idle timeout set to 600 seconds. Raised change request to Network team to extend to 3600 seconds.",
          followUpRequired: true,
          followUpNote: "Await Network team change approval. Expected by end of week.",
          attachmentNotes: null,
          updatedAt: new Date("2026-09-28T11:30:00.000Z"),
        },
        {
          ticketId: ticket005.id,
          performedById: jessica.id,
          actionDateTime: new Date("2026-09-29T09:00:00.000Z"),
          description: "Network team applied idle timeout policy change (3600s). Coordinated re-test with jennifer.anderson.",
          result: "Idle timeout confirmed extended. jennifer.anderson verified no disconnects after 60 minutes. Ticket closed.",
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: "Policy change approval: network-cr-2026-042.pdf",
          updatedAt: new Date("2026-09-29T09:45:00.000Z"),
        },
      ],
    });
  }

  console.log("✓ Lab 4 Actions Taken seeded (TKT-001: 2 actions, TKT-004: 1 action, TKT-005: 2 actions, TKT-002/003/006: 0 actions).");

  console.log("\n🎉 Lab 4 seed completed successfully!");
  console.log("   Development password for all accounts: Password123!");
}

// Run the seed automatically only when executed directly (e.g. `npm run
// prisma:seed` or Prisma's `prisma.seed` hook). Importing seed.ts — as the
// test harness does — must not fire a background side effect.
const isDirectEntry =
  process.argv[1] &&
  import.meta.url.replace(/\\/g, "/").toLowerCase() ===
    pathToFileURL(process.argv[1]).href.replace(/\\/g, "/").toLowerCase();

if (isDirectEntry) {
  runSeed()
    .catch((e) => {
      console.error("Error during seeding:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
