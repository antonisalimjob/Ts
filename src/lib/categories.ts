import type { IssueCategory } from "@prisma/client";

export const ISSUE_CATEGORY_CATALOG: {
  code: IssueCategory;
  slug: string;
  name: string;
  description: string;
  examples: string;
  sortOrder: number;
  color: string;
}[] = [
  {
    code: "ACCESS_IDENTITY",
    slug: "access-identity",
    name: "Access & Identity",
    description: "Identity, credentials, and system access requests.",
    examples: "Password Reset, Permissions, Account Access",
    sortOrder: 1,
    color: "#0f766e",
  },
  {
    code: "SOFTWARE_APPLICATIONS",
    slug: "software-applications",
    name: "Software & Applications",
    description: "Business apps, productivity suites, and application faults.",
    examples: "ERP, Office Suite, App Errors/Crashes",
    sortOrder: 2,
    color: "#2563eb",
  },
  {
    code: "HARDWARE_PERIPHERALS",
    slug: "hardware-peripherals",
    name: "Hardware & Peripherals",
    description: "Endpoints, printers, scanners, and accessories.",
    examples: "PC, Laptop, Printer, Scanner, Accessories",
    sortOrder: 3,
    color: "#7c3aed",
  },
  {
    code: "NETWORK_CONNECTIVITY",
    slug: "network-connectivity",
    name: "Network & Connectivity",
    description: "LAN, Wi-Fi, internet, and remote access.",
    examples: "Wi-Fi, LAN, Internet, Router, VPN",
    sortOrder: 4,
    color: "#0891b2",
  },
  {
    code: "EMAIL_COLLABORATION",
    slug: "email-collaboration",
    name: "Email & Collaboration",
    description: "Mail, chat, meetings, and shared storage.",
    examples: "Outlook, Mail Server, Teams, Cloud Storage",
    sortOrder: 5,
    color: "#d97706",
  },
  {
    code: "INFRASTRUCTURE_SERVERS",
    slug: "infrastructure-servers",
    name: "Infrastructure & Servers",
    description: "Hosts, storage, virtual machines, and core platforms.",
    examples: "Server Outage, Storage, Virtual Machines",
    sortOrder: 6,
    color: "#4f46e5",
  },
  {
    code: "SECURITY_COMPLIANCE",
    slug: "security-compliance",
    name: "Security & Compliance",
    description: "Threats, endpoint protection, and security alerts.",
    examples: "Antivirus, Malware, Phishing/Security Alerts",
    sortOrder: 7,
    color: "#e11d48",
  },
  {
    code: "CHANGE_RELEASE",
    slug: "change-release",
    name: "Change & Release Management",
    description: "Planned deployments, upgrades, and schema changes.",
    examples: "System Deployment, Upgrades, Schema Changes",
    sortOrder: 8,
    color: "#64748b",
  },
];

export const ISSUE_CATEGORY_LABEL: Record<IssueCategory, string> = Object.fromEntries(
  ISSUE_CATEGORY_CATALOG.map((category) => [category.code, category.name]),
) as Record<IssueCategory, string>;
