import Link from "next/link";
import { AlertTriangle, Clock3, Inbox, Ticket } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { OPEN_STATUSES } from "@/lib/constants";
import { isAgent } from "@/lib/permissions";
import { PriorityBadge, StatusBadge } from "@/components/ticket/badges";
import { CategoryAnalyticsChart } from "@/components/dashboard/category-analytics-chart";

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) return null;

  const scope = user.role === "END_USER" ? { requesterId: user.id } : {};
  const agent = isAgent(user.role);
  const [open, urgent, unassigned, overdue, recent] = await Promise.all([
    prisma.ticket.count({ where: { ...scope, status: { in: OPEN_STATUSES } } }),
    prisma.ticket.count({ where: { ...scope, priority: "URGENT", status: { in: OPEN_STATUSES } } }),
    prisma.ticket.count({
      where: agent ? { assigneeId: null, status: { in: OPEN_STATUSES } } : { id: "none" },
    }),
    prisma.ticket.count({
      where: {
        ...scope,
        status: { in: OPEN_STATUSES },
        resolutionDueAt: { lt: new Date() },
      },
    }),
    prisma.ticket.findMany({
      where: scope,
      include: { requester: true, assignee: true },
      orderBy: { lastActivityAt: "desc" },
      take: 8,
    }),
  ]);

  const cards = [
    { label: "Open tickets", value: open, icon: Ticket },
    { label: "Urgent", value: urgent, icon: AlertTriangle },
    { label: agent ? "Unassigned" : "Awaiting IT", value: unassigned, icon: Inbox },
    { label: "SLA at risk", value: overdue, icon: Clock3 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Good to see you, {user.name.split(" ")[0]}</h1>
        <p className="text-sm text-slate-500">Live queue health across incidents, requests, problems, and changes.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{card.label}</p>
              <card.icon className="h-4 w-4 text-teal-600" />
            </div>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{card.value}</p>
          </div>
        ))}
      </div>

      {agent ? <CategoryAnalyticsChart /> : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          <Link href="/tickets" className="text-sm font-medium text-teal-700 hover:underline">
            View all
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-5 py-2.5">Ticket</th>
              <th className="px-3 py-2.5">Requester</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Priority</th>
              <th className="px-5 py-2.5">Updated</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((ticket) => (
              <tr key={ticket.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                <td className="px-5 py-3">
                  <Link href={`/tickets/${ticket.key}`} className="font-medium text-slate-900 hover:text-teal-700">
                    <span className="mr-2 font-mono text-xs text-teal-700">{ticket.key}</span>
                    {ticket.title}
                  </Link>
                </td>
                <td className="px-3 py-3 text-slate-600">{ticket.requester.name}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={ticket.status} />
                </td>
                <td className="px-3 py-3">
                  <PriorityBadge priority={ticket.priority} />
                </td>
                <td className="px-5 py-3 text-slate-500">
                  {formatDistanceToNow(ticket.lastActivityAt, { addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
