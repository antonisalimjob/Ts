"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PriorityBadge, StatusBadge, TypeBadge } from "@/components/ticket/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import type { TicketListItem } from "@/types/ticket";

export default function TicketsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [priority, setPriority] = useState("");

  const query = useQuery({
    queryKey: ["tickets", q, status, type, priority],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      if (type) params.set("type", type);
      if (priority) params.set("priority", priority);
      const response = await fetch(`/api/tickets?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to load tickets");
      return (await response.json()) as TicketListItem[];
    },
  });

  const tickets = query.data ?? [];
  const filteredHint = useMemo(
    () => `${tickets.length} ticket${tickets.length === 1 ? "" : "s"}`,
    [tickets.length],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Tickets</h1>
          <p className="text-sm text-slate-500">{filteredHint} in the current filter set.</p>
        </div>
        <Button asChild>
          <Link href="/tickets/new">New ticket</Link>
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search key or title" value={q} onChange={(event) => setQ(event.target.value)} />
        </div>
        <select className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="">All types</option>
          <option value="INCIDENT">Incident</option>
          <option value="SERVICE_REQUEST">Service Request</option>
          <option value="PROBLEM">Problem</option>
          <option value="CHANGE_REQUEST">Change Request</option>
        </select>
        <select className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option value="NEW">New</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="PENDING">Pending</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm" value={priority} onChange={(event) => setPriority(event.target.value)}>
          <option value="">All priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-5 py-2.5">Key</th>
              <th className="px-3 py-2.5">Title</th>
              <th className="px-3 py-2.5">Type</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Priority</th>
              <th className="px-3 py-2.5">Assignee</th>
              <th className="px-5 py-2.5">Updated</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                <td className="px-5 py-3 font-mono text-xs font-semibold text-teal-700">
                  <Link href={`/tickets/${ticket.key}`}>{ticket.key}</Link>
                </td>
                <td className="px-3 py-3">
                  <Link href={`/tickets/${ticket.key}`} className="font-medium text-slate-900 hover:text-teal-700">
                    {ticket.title}
                  </Link>
                  {ticket.sla.isResolutionBreached ? (
                    <span className="ml-2 text-[11px] font-semibold uppercase text-rose-600">SLA</span>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  <TypeBadge type={ticket.type} />
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={ticket.status} />
                </td>
                <td className="px-3 py-3">
                  <PriorityBadge priority={ticket.priority} />
                </td>
                <td className="px-3 py-3 text-slate-600">{ticket.assignee?.name ?? "Unassigned"}</td>
                <td className="px-5 py-3 text-slate-500">
                  {formatDistanceToNow(new Date(ticket.lastActivityAt), { addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {query.isLoading ? <p className="p-8 text-center text-sm text-slate-500">Loading tickets…</p> : null}
        {!query.isLoading && tickets.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No tickets match these filters.</p>
        ) : null}
      </div>
    </div>
  );
}
