import { getPrisma } from '../src/prisma.js';

export async function ensureSeedData() {
  const prisma = getPrisma();

  const jennifer = await prisma.user.findUnique({ where: { email: 'jennifer.anderson@kmutt.ac.th' } });
  const michael = await prisma.user.findUnique({ where: { email: 'michael.brown@kmutt.ac.th' } });
  const david = await prisma.user.findUnique({ where: { email: 'david.lee@kmutt.ac.th' } });
  const alex = await prisma.user.findUnique({ where: { email: 'alex.turner@toktickit.kmutt.ac.th' } });
  const kevin = await prisma.user.findUnique({ where: { email: 'kevin.patel@toktickit.kmutt.ac.th' } });

  const catNetwork = await prisma.category.findFirst({ where: { name: 'Network' } });
  const catHardware = await prisma.category.findFirst({ where: { name: 'Hardware' } });
  const catSoftware = await prisma.category.findFirst({ where: { name: 'Software' } });
  const catAccount = await prisma.category.findFirst({ where: { name: 'Account and Access' } });

  const sysWifi = await prisma.related_system.findFirst({ where: { name: 'Campus Wi-Fi' } });
  const sysLaptop = await prisma.related_system.findFirst({ where: { name: 'Corporate Laptop' } });
  const sysGrades = await prisma.related_system.findFirst({ where: { name: 'Grade Submission App' } });

  if (
    !jennifer ||
    !michael ||
    !david ||
    !alex ||
    !catNetwork ||
    !catHardware ||
    !catSoftware ||
    !catAccount ||
    !sysWifi ||
    !sysLaptop ||
    !sysGrades
  ) {
    return;
  }

  // TKT-SEED-001 (Jennifer, IN_PROGRESS, 2 actions)
  const t001 = await prisma.ticket.upsert({
    where: { ticketNumber: 'TKT-SEED-001' },
    update: { currentStatus: 'IN_PROGRESS', ownerId: alex.id, itPriority: 'HIGH' },
    create: {
      ticketNumber: 'TKT-SEED-001',
      submittedById: jennifer.id,
      ownerId: alex.id,
      categoryId: catNetwork.id,
      relatedSystemId: sysWifi.id,
      summary: 'Campus Wi-Fi drops intermittently in CB2',
      description: 'Wi-Fi connection drops every 5–10 minutes in building CB2, room 401. Affects all devices.',
      requestedPriority: 'HIGH',
      itPriority: 'HIGH',
      currentStatus: 'IN_PROGRESS',
      updatedAt: new Date(),
    },
  });

  // TKT-SEED-002 (Michael, NEW, 0 actions)
  await prisma.ticket.upsert({
    where: { ticketNumber: 'TKT-SEED-002' },
    update: { currentStatus: 'NEW', ownerId: null, itPriority: 'MEDIUM' },
    create: {
      ticketNumber: 'TKT-SEED-002',
      submittedById: michael.id,
      ownerId: null,
      categoryId: catHardware.id,
      relatedSystemId: sysLaptop.id,
      summary: 'Laptop battery drains within 30 minutes',
      description: 'Dell laptop battery health has degraded significantly and requires replacement. Purchased 18 months ago.',
      requestedPriority: 'MEDIUM',
      itPriority: 'MEDIUM',
      currentStatus: 'NEW',
      updatedAt: new Date(),
    },
  });

  // TKT-SEED-004 (David, RESOLVED, 1 action)
  const t004 = await prisma.ticket.upsert({
    where: { ticketNumber: 'TKT-SEED-004' },
    update: { currentStatus: 'RESOLVED', ownerId: alex.id, itPriority: 'HIGH' },
    create: {
      ticketNumber: 'TKT-SEED-004',
      submittedById: david.id,
      ownerId: alex.id,
      categoryId: catAccount.id,
      relatedSystemId: sysGrades.id,
      summary: 'Cannot log into Grade Submission App',
      description: 'Receives Account locked error on the Grade Submission App. SSO works fine on other systems.',
      requestedPriority: 'HIGH',
      itPriority: 'HIGH',
      currentStatus: 'RESOLVED',
      updatedAt: new Date(),
    },
  });

  // TKT-SEED-006 (Michael, OPEN, 0 actions)
  await prisma.ticket.upsert({
    where: { ticketNumber: 'TKT-SEED-006' },
    update: { currentStatus: 'OPEN', ownerId: null, itPriority: 'LOW' },
    create: {
      ticketNumber: 'TKT-SEED-006',
      submittedById: michael.id,
      ownerId: null,
      categoryId: catSoftware.id,
      relatedSystemId: sysLaptop.id,
      summary: 'Microsoft Office fails to activate after reinstall',
      description: 'After reinstalling Windows, Microsoft Office 365 cannot activate despite valid license credentials.',
      requestedPriority: 'LOW',
      itPriority: 'LOW',
      currentStatus: 'OPEN',
      updatedAt: new Date(),
    },
  });

  // Ensure actions exist for TKT-SEED-001
  const actionCount001 = await prisma.action_taken.count({ where: { ticketId: t001.id } });
  if (actionCount001 < 2) {
    await prisma.action_taken.deleteMany({ where: { ticketId: t001.id } });
    await prisma.action_taken.createMany({
      data: [
        {
          ticketId: t001.id,
          performedById: alex.id,
          actionDateTime: new Date('2026-10-01T09:00:00.000Z'),
          description: 'Conducted initial site survey of CB2 room 401. Checked channel interference on AP-CB2-401.',
          result: 'Found channel overlap with neighboring APs. Reconfigured to channel 11 (5GHz band).',
          followUpRequired: true,
          followUpNote: 'Monitor signal stability for 24 hours and confirm with jennifer.anderson.',
          attachmentNotes: null,
          updatedAt: new Date('2026-10-01T09:30:00.000Z'),
        },
        {
          ticketId: t001.id,
          performedById: kevin ? kevin.id : alex.id,
          actionDateTime: new Date('2026-10-02T10:00:00.000Z'),
          description: 'Performed firmware upgrade on AP-CB2-401 and reset DHCP lease table.',
          result: 'Firmware upgraded from v6.2.1 to v6.4.0. No disconnects observed after 2 hours of monitoring.',
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: 'Firmware changelog: ap-firmware-v6.4.0-notes.pdf',
          updatedAt: new Date('2026-10-02T10:45:00.000Z'),
        },
      ],
    });
  }

  // Ensure action exists for TKT-SEED-004
  const actionCount004 = await prisma.action_taken.count({ where: { ticketId: t004.id } });
  if (actionCount004 === 0) {
    await prisma.action_taken.create({
      data: {
        ticketId: t004.id,
        performedById: alex.id,
        actionDateTime: new Date('2026-09-30T14:00:00.000Z'),
        description: 'Unlocked the user account in the Grade Submission App admin panel. Reset SSO session token.',
        result: 'User account unlocked. David Lee confirmed successful login and grade submission.',
        followUpRequired: false,
        followUpNote: null,
        attachmentNotes: null,
        updatedAt: new Date('2026-09-30T14:30:00.000Z'),
      },
    });
  }
}
