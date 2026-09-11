import { notFound } from "next/navigation";
import { TicketDetail } from "@/components/ticket/ticket-detail";
import { getSession } from "@/lib/auth";
import { getTicketByKey } from "@/lib/tickets";
import { prisma } from "@/lib/prisma";
import { isAgent } from "@/lib/permissions";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const user = await getSession();
  if (!user) notFound();
  const { key } = await params;
  const ticket = await getTicketByKey(key, user);
  if (!ticket) notFound();

  const [templates, agents, mentionables] = await Promise.all([
    prisma.followUpTemplate.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { role: { in: ["TECHNICIAN", "ADMIN"] }, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        department: true,
        title: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: {
        isActive: true,
        ...(isAgent(user.role) ? {} : { id: { in: [ticket.requester.id, ticket.assignee?.id ?? ""] } }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        department: true,
        title: true,
      },
    }),
  ]);

  return (
    <TicketDetail
      ticket={ticket}
      currentUser={user}
      templates={templates}
      agents={agents}
      mentionables={mentionables}
    />
  );
}
