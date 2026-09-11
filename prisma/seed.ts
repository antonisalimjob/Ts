import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Demo123!", 10);

  await prisma.auditLog.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.messageReadReceipt.deleteMany();
  await prisma.commentMention.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.ticketComment.deleteMany();
  await prisma.ticketFollowUp.deleteMany();
  await prisma.ticketActivity.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.followUpTemplate.deleteMany();
  await prisma.ticketSequence.deleteMany();
  await prisma.slaPolicy.deleteMany();
  await prisma.category.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();

  const [avery, jordan, riley, samira] = await Promise.all([
    prisma.user.create({
      data: {
        email: "avery.chen@acme.com",
        name: "Avery Chen",
        passwordHash,
        role: "END_USER",
        department: "People Operations",
        title: "HR Coordinator",
      },
    }),
    prisma.user.create({
      data: {
        email: "jordan.hale@acme.com",
        name: "Jordan Hale",
        passwordHash,
        role: "TECHNICIAN",
        department: "IT Support",
        title: "Service Desk Technician",
      },
    }),
    prisma.user.create({
      data: {
        email: "riley.okonkwo@acme.com",
        name: "Riley Okonkwo",
        passwordHash,
        role: "TECHNICIAN",
        department: "IT Support",
        title: "Network Specialist",
      },
    }),
    prisma.user.create({
      data: {
        email: "samira.patel@acme.com",
        name: "Samira Patel",
        passwordHash,
        role: "ADMIN",
        department: "IT Leadership",
        title: "IT Service Lead",
      },
    }),
  ]);

  const [helpdesk, network, hardware] = await Promise.all([
    prisma.team.create({
      data: {
        name: "L1 Helpdesk",
        description: "First-line intake, password resets, and workstation support.",
        members: {
          create: [
            { userId: jordan.id, role: "TEAM_LEAD" },
            { userId: samira.id, role: "MEMBER" },
          ],
        },
      },
    }),
    prisma.team.create({
      data: {
        name: "Network Support",
        description: "WAN, LAN, VPN, and wireless incidents.",
        members: {
          create: [{ userId: riley.id, role: "TEAM_LEAD" }],
        },
      },
    }),
    prisma.team.create({
      data: {
        name: "Hardware Team",
        description: "Laptops, printers, docks, and peripherals.",
        members: {
          create: [
            { userId: riley.id, role: "MEMBER" },
            { userId: jordan.id, role: "MEMBER" },
          ],
        },
      },
    }),
  ]);

  const teamBySlug: Record<string, string> = {
    "access-identity": helpdesk.id,
    "email-collaboration": helpdesk.id,
    "software-applications": helpdesk.id,
    "security-compliance": helpdesk.id,
    "network-connectivity": network.id,
    "infrastructure-servers": network.id,
    "change-release": network.id,
    "hardware-peripherals": hardware.id,
  };

  const categories = await prisma.category.createManyAndReturn({
    data: [
      {
        code: "ACCESS_IDENTITY",
        name: "Access & Identity",
        slug: "access-identity",
        description: "Identity, credentials, and system access requests.",
        examples: "Password Reset, Permissions, Account Access",
        sortOrder: 1,
      },
      {
        code: "SOFTWARE_APPLICATIONS",
        name: "Software & Applications",
        slug: "software-applications",
        description: "Business apps, productivity suites, and application faults.",
        examples: "ERP, Office Suite, App Errors/Crashes",
        sortOrder: 2,
      },
      {
        code: "HARDWARE_PERIPHERALS",
        name: "Hardware & Peripherals",
        slug: "hardware-peripherals",
        description: "Endpoints, printers, scanners, and accessories.",
        examples: "PC, Laptop, Printer, Scanner, Accessories",
        sortOrder: 3,
      },
      {
        code: "NETWORK_CONNECTIVITY",
        name: "Network & Connectivity",
        slug: "network-connectivity",
        description: "LAN, Wi-Fi, internet, and remote access.",
        examples: "Wi-Fi, LAN, Internet, Router, VPN",
        sortOrder: 4,
      },
      {
        code: "EMAIL_COLLABORATION",
        name: "Email & Collaboration",
        slug: "email-collaboration",
        description: "Mail, chat, meetings, and shared storage.",
        examples: "Outlook, Mail Server, Teams, Cloud Storage",
        sortOrder: 5,
      },
      {
        code: "INFRASTRUCTURE_SERVERS",
        name: "Infrastructure & Servers",
        slug: "infrastructure-servers",
        description: "Hosts, storage, virtual machines, and core platforms.",
        examples: "Server Outage, Storage, Virtual Machines",
        sortOrder: 6,
      },
      {
        code: "SECURITY_COMPLIANCE",
        name: "Security & Compliance",
        slug: "security-compliance",
        description: "Threats, endpoint protection, and security alerts.",
        examples: "Antivirus, Malware, Phishing/Security Alerts",
        sortOrder: 7,
      },
      {
        code: "CHANGE_RELEASE",
        name: "Change & Release Management",
        slug: "change-release",
        description: "Planned deployments, upgrades, and schema changes.",
        examples: "System Deployment, Upgrades, Schema Changes",
        sortOrder: 8,
      },
    ],
  });

  const bySlug = Object.fromEntries(categories.map((category) => [category.slug, category]));

  const sla = await prisma.slaPolicy.createManyAndReturn({
    data: [
      { name: "Urgent", priority: "URGENT", firstResponseMinutes: 15, resolutionMinutes: 240, inactivityReminderMinutes: 30, escalationMinutes: 60 },
      { name: "High", priority: "HIGH", firstResponseMinutes: 60, resolutionMinutes: 480, inactivityReminderMinutes: 120, escalationMinutes: 240 },
      { name: "Medium", priority: "MEDIUM", firstResponseMinutes: 240, resolutionMinutes: 1440, inactivityReminderMinutes: 480, escalationMinutes: 960 },
      { name: "Low", priority: "LOW", firstResponseMinutes: 480, resolutionMinutes: 4320, inactivityReminderMinutes: 1440, escalationMinutes: 2880 },
    ],
  });
  const slaByPriority = Object.fromEntries(sla.map((policy) => [policy.priority, policy]));

  await prisma.followUpTemplate.createMany({
    data: [
      {
        name: "Awaiting your reply",
        subject: "{{ticketKey}} needs your input: {{title}}",
        body: "Hi {{requester}},\n\nWe are waiting on additional detail for {{ticketKey}}. Please reply on the ticket so we can continue.\n\nThanks,\n{{sender}}",
        audience: "TECHNICIAN",
        isDefault: true,
      },
      {
        name: "Checking in with IT",
        subject: "Follow-up on {{ticketKey}}",
        body: "Hi {{assignee}},\n\nI wanted to follow up on {{ticketKey}} — {{title}}. Has there been any progress?\n\nThanks,\n{{sender}}",
        audience: "END_USER",
      },
      {
        name: "Status update",
        subject: "Update on {{ticketKey}}",
        body: "Hi {{requester}},\n\nWe are actively working {{ticketKey}}. Current status: {{status}}. We will post the next update on the ticket.\n\n— {{sender}}",
        audience: "TECHNICIAN",
      },
      {
        name: "SLA inactivity reminder",
        subject: "Reminder: {{ticketKey}} has had no recent activity",
        body: "Automated reminder: {{ticketKey}} ({{title}}) is still open and has been inactive. Please respond or update the status.",
        audience: "TECHNICIAN",
      },
      {
        name: "SLA escalation",
        subject: "Escalated: {{ticketKey}}",
        body: "Automated escalation: {{ticketKey}} exceeded the inactivity threshold. IT Lead has been notified. Assignee: {{assignee}}.",
        audience: "ADMIN",
      },
    ],
  });

  const now = new Date();
  const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000);
  const dueFrom = (createdAt: Date, firstHours: number, resolutionHours: number) => ({
    firstResponseDueAt: new Date(createdAt.getTime() + firstHours * 3_600_000),
    resolutionDueAt: new Date(createdAt.getTime() + resolutionHours * 3_600_000),
  });
  const slaWindow = {
    URGENT: { first: 0.25, resolve: 4 },
    HIGH: { first: 1, resolve: 8 },
    MEDIUM: { first: 4, resolve: 24 },
    LOW: { first: 8, resolve: 72 },
  };

  const vpn = await prisma.ticket.create({
    data: {
      key: "INC-1042",
      title: "VPN concentrator dropping remote sessions",
      description:
        "About 40 remote employees cannot stay connected to the corporate VPN for more than a few minutes. Impact started at 07:40 local time.",
      type: "INCIDENT",
      status: "IN_PROGRESS",
      priority: "URGENT",
      categoryId: bySlug["network-connectivity"].id,
      requesterId: avery.id,
      assigneeId: jordan.id,
      teamId: network.id,
      slaPolicyId: slaByPriority.URGENT.id,
      firstResponseDueAt: hoursAgo(-0.2),
      resolutionDueAt: new Date(now.getTime() + 3 * 3_600_000),
      firstRespondedAt: hoursAgo(1.5),
      lastActivityAt: hoursAgo(0.2),
      createdAt: hoursAgo(2),
    },
  });

  const laptop = await prisma.ticket.create({
    data: {
      key: "SR-2018",
      title: "MacBook Pro for new People Ops hire",
      description: "Please provision a 14-inch MacBook Pro, dock, and standard HR software for a start date next Monday.",
      type: "SERVICE_REQUEST",
      status: "OPEN",
      priority: "MEDIUM",
      categoryId: bySlug["hardware-peripherals"].id,
      requesterId: avery.id,
      assigneeId: riley.id,
      teamId: hardware.id,
      slaPolicyId: slaByPriority.MEDIUM.id,
      firstResponseDueAt: new Date(now.getTime() + 3 * 3_600_000),
      resolutionDueAt: new Date(now.getTime() + 20 * 3_600_000),
      lastActivityAt: hoursAgo(5),
      createdAt: hoursAgo(6),
    },
  });

  const outlook = await prisma.ticket.create({
    data: {
      key: "PRB-3104",
      title: "Recurring Outlook send failures after MFA prompt",
      description:
        "Several departments report that Outlook gets stuck on 'Waiting for server' after the MFA round-trip. It recovers after a restart, then returns within an hour.",
      type: "PROBLEM",
      status: "PENDING",
      priority: "HIGH",
      categoryId: bySlug["email-collaboration"].id,
      requesterId: avery.id,
      assigneeId: jordan.id,
      teamId: helpdesk.id,
      slaPolicyId: slaByPriority.HIGH.id,
      firstResponseDueAt: hoursAgo(20),
      resolutionDueAt: hoursAgo(-2),
      firstRespondedAt: hoursAgo(28),
      lastActivityAt: hoursAgo(30),
      createdAt: hoursAgo(36),
    },
  });

  const change = await prisma.ticket.create({
    data: {
      key: "CHG-4401",
      title: "Weekend firewall rule for partner SFTP",
      description: "Open outbound 22/tcp from the DMZ to partners.acme-files.net during Saturday 22:00–02:00 maintenance window.",
      type: "CHANGE_REQUEST",
      status: "NEW",
      priority: "LOW",
      categoryId: bySlug["change-release"].id,
      requesterId: avery.id,
      teamId: network.id,
      slaPolicyId: slaByPriority.LOW.id,
      firstResponseDueAt: new Date(now.getTime() + 7 * 3_600_000),
      resolutionDueAt: new Date(now.getTime() + 70 * 3_600_000),
      lastActivityAt: hoursAgo(1),
      createdAt: hoursAgo(1),
    },
  });

  const printer = await prisma.ticket.create({
    data: {
      key: "INC-1048",
      title: "Floor 12 follow-me print queue stuck",
      description: "Jobs sit in the queue and never release at the Konica device. Workaround: print to Floor 11.",
      type: "INCIDENT",
      status: "RESOLVED",
      priority: "MEDIUM",
      categoryId: bySlug["hardware-peripherals"].id,
      requesterId: avery.id,
      assigneeId: riley.id,
      teamId: hardware.id,
      slaPolicyId: slaByPriority.MEDIUM.id,
      firstResponseDueAt: hoursAgo(10),
      resolutionDueAt: hoursAgo(4),
      firstRespondedAt: hoursAgo(11),
      resolvedAt: hoursAgo(3),
      lastActivityAt: hoursAgo(3),
      createdAt: hoursAgo(12),
    },
  });

  const extraTickets = [
    {
      key: "INC-1050",
      title: "Wi-Fi drops on floor 8 meeting rooms",
      description: "SSID Acme-Corp drops every few minutes in rooms 8A–8D. Wired ports still work.",
      type: "INCIDENT" as const,
      status: "OPEN" as const,
      priority: "HIGH" as const,
      slug: "network-connectivity",
      hours: 20,
    },
    {
      key: "INC-1058",
      title: "Guest VLAN cannot reach floor printers",
      description: "Visitors on the guest SSID cannot release print jobs to the lobby devices.",
      type: "INCIDENT" as const,
      status: "OPEN" as const,
      priority: "MEDIUM" as const,
      slug: "network-connectivity",
      hours: 120,
    },
    {
      key: "SR-2019",
      title: "Password reset for contractor account",
      description: "Vendor account v-liu expired overnight and needs a controlled reset plus 30-day extension.",
      type: "SERVICE_REQUEST" as const,
      status: "RESOLVED" as const,
      priority: "LOW" as const,
      slug: "access-identity",
      hours: 30,
    },
    {
      key: "SR-2020",
      title: "Unlock MFA after phone replacement",
      description: "Avery's authenticator app was on the old handset. Need a break-glass MFA reset.",
      type: "SERVICE_REQUEST" as const,
      status: "OPEN" as const,
      priority: "HIGH" as const,
      slug: "access-identity",
      hours: 192,
    },
    {
      key: "INC-1057",
      title: "AD account locked after overseas travel",
      description: "Repeated lockouts after login attempts from a new country. Confirm it is the user and unlock.",
      type: "INCIDENT" as const,
      status: "CLOSED" as const,
      priority: "MEDIUM" as const,
      slug: "access-identity",
      hours: 960,
    },
    {
      key: "INC-1052",
      title: "Excel 365 crashes on large CSV export",
      description: "Finance workbook (~400k rows) closes without saving when exporting to CSV.",
      type: "INCIDENT" as const,
      status: "IN_PROGRESS" as const,
      priority: "MEDIUM" as const,
      slug: "software-applications",
      hours: 96,
    },
    {
      key: "INC-1053",
      title: "ERP posting timeout during month-end",
      description: "SAP posting jobs abort after 60s. Finance cannot close the period.",
      type: "INCIDENT" as const,
      status: "OPEN" as const,
      priority: "HIGH" as const,
      slug: "software-applications",
      hours: 288,
    },
    {
      key: "PRB-3105",
      title: "Office suite hangs after last patch",
      description: "Word and PowerPoint freeze on open for ~20 seconds after Tuesday's Office channel update.",
      type: "PROBLEM" as const,
      status: "PENDING" as const,
      priority: "MEDIUM" as const,
      slug: "software-applications",
      hours: 600,
    },
    {
      key: "SR-2021",
      title: "Install Adobe Acrobat for Legal",
      description: "Need Acrobat Pro licensed and packaged for the Legal OU.",
      type: "SERVICE_REQUEST" as const,
      status: "NEW" as const,
      priority: "LOW" as const,
      slug: "software-applications",
      hours: 18,
    },
    {
      key: "INC-1056",
      title: "Teams meeting audio failed for all-hands",
      description: "Organizer and attendees had no audio on the quarterly all-hands tenant meeting.",
      type: "INCIDENT" as const,
      status: "OPEN" as const,
      priority: "HIGH" as const,
      slug: "email-collaboration",
      hours: 96,
    },
    {
      key: "INC-1055",
      title: "File server volume at 94% on FS-01",
      description: "\\\\files\\finance is reporting low disk. Snapshots may be holding space.",
      type: "INCIDENT" as const,
      status: "PENDING" as const,
      priority: "HIGH" as const,
      slug: "infrastructure-servers",
      hours: 360,
    },
    {
      key: "INC-1051",
      title: "Phishing report from Finance payroll",
      description: "A fake DocuSign message asked users to re-auth. Two people clicked before reporting.",
      type: "INCIDENT" as const,
      status: "IN_PROGRESS" as const,
      priority: "URGENT" as const,
      slug: "security-compliance",
      hours: 48,
    },
    {
      key: "INC-1054",
      title: "Workstation flagged for malware",
      description: "Defender quarantined a loader on LAP-4412. Need a full reimage check.",
      type: "INCIDENT" as const,
      status: "RESOLVED" as const,
      priority: "HIGH" as const,
      slug: "security-compliance",
      hours: 480,
    },
  ];

  for (const item of extraTickets) {
    const createdAt = hoursAgo(item.hours);
    const window = slaWindow[item.priority];
    const sla = dueFrom(createdAt, window.first, window.resolve);
    await prisma.ticket.create({
      data: {
        key: item.key,
        title: item.title,
        description: item.description,
        type: item.type,
        status: item.status,
        priority: item.priority,
        categoryId: bySlug[item.slug].id,
        requesterId: avery.id,
        assigneeId: item.priority === "LOW" ? null : jordan.id,
        teamId: teamBySlug[item.slug],
        slaPolicyId: slaByPriority[item.priority].id,
        firstResponseDueAt: sla.firstResponseDueAt,
        resolutionDueAt: sla.resolutionDueAt,
        lastActivityAt: createdAt,
        createdAt,
        resolvedAt: item.status === "RESOLVED" || item.status === "CLOSED" ? createdAt : null,
        closedAt: item.status === "CLOSED" ? createdAt : null,
      },
    });
  }

  await prisma.ticketComment.createMany({
    data: [
      {
        ticketId: vpn.id,
        authorId: avery.id,
        visibility: "PUBLIC",
        body: "Started around 07:40. I have tried reconnecting on both GlobalProtect and the fallback portal. @Jordan Hale can you take this?",
        createdAt: hoursAgo(1.9),
      },
      {
        ticketId: vpn.id,
        authorId: jordan.id,
        visibility: "PUBLIC",
        body: "Acknowledged. I can reproduce the drop after ~4 minutes. Checking concentrator CPU and the last config push.",
        createdAt: hoursAgo(1.5),
      },
      {
        ticketId: vpn.id,
        authorId: samira.id,
        visibility: "INTERNAL",
        body: "If this is still failing at 09:00 we escalate to the network on-call. Do **not** reboot prod until Riley confirms the standby node is healthy.",
        createdAt: hoursAgo(0.8),
      },
      {
        ticketId: vpn.id,
        authorId: riley.id,
        visibility: "INTERNAL",
        body: "Standby node is healthy. I suspect the split-tunnel ACL from last night's change. Reviewing syslog now.",
        createdAt: hoursAgo(0.2),
      },
      {
        ticketId: outlook.id,
        authorId: jordan.id,
        visibility: "PUBLIC",
        body: "We have correlated this with Conditional Access prompt timing. Collecting HAR files from two more users.",
        createdAt: hoursAgo(30),
      },
      {
        ticketId: laptop.id,
        authorId: avery.id,
        visibility: "PUBLIC",
        body: "Start date is Monday. Asset tag can go to People Ops on floor 4.",
        createdAt: hoursAgo(5),
      },
    ],
  });

  await prisma.ticketActivity.createMany({
    data: [
      { ticketId: vpn.id, actorId: avery.id, action: "CREATED", toValue: "INC-1042", createdAt: hoursAgo(2) },
      { ticketId: vpn.id, actorId: jordan.id, action: "ASSIGNED", toValue: jordan.id, createdAt: hoursAgo(1.8) },
      { ticketId: vpn.id, actorId: jordan.id, action: "STATUS_CHANGED", fromValue: "NEW", toValue: "IN_PROGRESS", createdAt: hoursAgo(1.6) },
      { ticketId: vpn.id, actorId: jordan.id, action: "COMMENT_ADDED", createdAt: hoursAgo(1.5) },
      { ticketId: vpn.id, actorId: samira.id, action: "INTERNAL_NOTE_ADDED", createdAt: hoursAgo(0.8) },
      { ticketId: outlook.id, actorId: avery.id, action: "CREATED", toValue: "PRB-3104", createdAt: hoursAgo(36) },
      { ticketId: laptop.id, actorId: avery.id, action: "CREATED", toValue: "SR-2018", createdAt: hoursAgo(6) },
      { ticketId: change.id, actorId: avery.id, action: "CREATED", toValue: "CHG-4401", createdAt: hoursAgo(1) },
      { ticketId: printer.id, actorId: riley.id, action: "STATUS_CHANGED", fromValue: "IN_PROGRESS", toValue: "RESOLVED", createdAt: hoursAgo(3) },
    ],
  });

  await prisma.ticketSequence.createMany({
    data: [
      { prefix: "INC", value: 1058 },
      { prefix: "SR", value: 2021 },
      { prefix: "PRB", value: 3105 },
      { prefix: "CHG", value: 4401 },
    ],
  });

  console.log("Seeded Nexus SM demo data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
