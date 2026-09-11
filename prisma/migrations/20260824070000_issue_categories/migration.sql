-- CreateEnum
CREATE TYPE "IssueCategory" AS ENUM (
  'ACCESS_IDENTITY',
  'SOFTWARE_APPLICATIONS',
  'HARDWARE_PERIPHERALS',
  'NETWORK_CONNECTIVITY',
  'EMAIL_COLLABORATION',
  'INFRASTRUCTURE_SERVERS',
  'SECURITY_COMPLIANCE',
  'CHANGE_RELEASE'
);

-- AlterTable
ALTER TABLE "Category" ADD COLUMN "code" "IssueCategory",
ADD COLUMN "examples" TEXT,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Map existing categories
UPDATE "Category"
SET
  "code" = 'ACCESS_IDENTITY',
  "name" = 'Access & Identity',
  "slug" = 'access-identity',
  "description" = 'Identity, credentials, and system access requests.',
  "examples" = 'Password Reset, Permissions, Account Access',
  "sortOrder" = 1
WHERE "slug" IN ('access', 'access-identity');

UPDATE "Category"
SET
  "code" = 'HARDWARE_PERIPHERALS',
  "name" = 'Hardware & Peripherals',
  "slug" = 'hardware-peripherals',
  "description" = 'Endpoints, printers, scanners, and accessories.',
  "examples" = 'PC, Laptop, Printer, Scanner, Accessories',
  "sortOrder" = 3
WHERE "slug" IN ('hardware', 'hardware-peripherals');

UPDATE "Category"
SET
  "code" = 'NETWORK_CONNECTIVITY',
  "name" = 'Network & Connectivity',
  "slug" = 'network-connectivity',
  "description" = 'LAN, Wi-Fi, internet, and remote access.',
  "examples" = 'Wi-Fi, LAN, Internet, Router, VPN',
  "sortOrder" = 4
WHERE "slug" IN ('network', 'network-connectivity');

UPDATE "Category"
SET
  "code" = 'EMAIL_COLLABORATION',
  "name" = 'Email & Collaboration',
  "slug" = 'email-collaboration',
  "description" = 'Mail, chat, meetings, and shared storage.',
  "examples" = 'Outlook, Mail Server, Teams, Cloud Storage',
  "sortOrder" = 5
WHERE "slug" IN ('email', 'email-collaboration');

UPDATE "Category"
SET
  "code" = 'CHANGE_RELEASE',
  "name" = 'Change & Release Management',
  "slug" = 'change-release',
  "description" = 'Planned deployments, upgrades, and schema changes.',
  "examples" = 'System Deployment, Upgrades, Schema Changes',
  "sortOrder" = 8
WHERE "slug" IN ('change', 'change-release');

-- Insert missing standard categories
INSERT INTO "Category" ("id", "code", "name", "slug", "description", "examples", "sortOrder")
SELECT 'cm_software_applications', 'SOFTWARE_APPLICATIONS', 'Software & Applications', 'software-applications', 'Business apps, productivity suites, and application faults.', 'ERP, Office Suite, App Errors/Crashes', 2
WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'software-applications');

INSERT INTO "Category" ("id", "code", "name", "slug", "description", "examples", "sortOrder")
SELECT 'cm_infrastructure_servers', 'INFRASTRUCTURE_SERVERS', 'Infrastructure & Servers', 'infrastructure-servers', 'Hosts, storage, virtual machines, and core platforms.', 'Server Outage, Storage, Virtual Machines', 6
WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'infrastructure-servers');

INSERT INTO "Category" ("id", "code", "name", "slug", "description", "examples", "sortOrder")
SELECT 'cm_security_compliance', 'SECURITY_COMPLIANCE', 'Security & Compliance', 'security-compliance', 'Threats, endpoint protection, and security alerts.', 'Antivirus, Malware, Phishing/Security Alerts', 7
WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'security-compliance');

-- Enforce required unique code
UPDATE "Category" SET "code" = 'SOFTWARE_APPLICATIONS' WHERE "code" IS NULL AND "slug" = 'software-applications';
ALTER TABLE "Category" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "Category_code_key" ON "Category"("code");
