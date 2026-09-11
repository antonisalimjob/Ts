"use client";

import { formatDistanceToNow } from "date-fns";
import { BellRing, Clock3 } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket-client";
import { PriorityBadge, StatusBadge, TypeBadge } from "@/components/ticket/badges";
import { FollowUpDialog } from "@/components/ticket/follow-up-dialog";
import { TicketChat } from "@/components/ticket/ticket-chat";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { isAgent } from "@/lib/permissions";
import { STATUS_LABEL } from "@/lib/constants";
import type { SessionUser } from "@/lib/auth";
import type { ChatMessage, TypingUser } from "@/types/chat";
import type { FollowUpTemplate, Ticket, TicketUser } from "@/types/ticket";
import type { CommentVisibility, Priority, TicketStatus } from "@prisma/client";
import { useChatUiStore } from "@/store/chat-ui";

interface TicketDetailProps {
  ticket: Ticket;
  currentUser: SessionUser;
  templates: FollowUpTemplate[];
  agents: TicketUser[];
  mentionables: TicketUser[];
}

export function TicketDetail({
  ticket: initialTicket,
  currentUser,
  templates,
  agents,
  mentionables,
}: TicketDetailProps) {
  const [ticket, setTicket] = useState(initialTicket);
  const channel = useChatUiStore((state) => state.channelByTicket[initialTicket.id] ?? "PUBLIC");
  const setChannel = (next: CommentVisibility) =>
    useChatUiStore.getState().setChannel(initialTicket.id, next);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const messages = ticket.comments ?? [];

  useEffect(() => {
    const socket = getSocket();
    socket.emit("ticket:join", initialTicket.id);

    const onComment = (message: ChatMessage) => {
      setTicket((current) => {
        if (current.comments?.some((item) => item.id === message.id)) return current;
        return { ...current, comments: [...(current.comments ?? []), message] };
      });
    };
    const onTyping = (payload: TypingUser) => {
      setTypingUsers((current) => {
        const without = current.filter((item) => item.userId !== payload.userId);
        if (!payload.isTyping) return without;
        return [...without, payload];
      });
    };
    const onRefresh = () => {
      void refreshTicket(initialTicket.key, setTicket);
    };

    socket.on("comment:new", onComment);
    socket.on("typing", onTyping);
    socket.on("follow-up:sent", onRefresh);
    socket.on("ticket:updated", onRefresh);

    return () => {
      socket.emit("ticket:leave", initialTicket.id);
      socket.off("comment:new", onComment);
      socket.off("typing", onTyping);
      socket.off("follow-up:sent", onRefresh);
      socket.off("ticket:updated", onRefresh);
    };
  }, [initialTicket.id, initialTicket.key]);

  async function updateTicket(patch: Partial<{ status: TicketStatus; priority: Priority; assigneeId: string | null }>) {
    setSaving(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) throw new Error("Update failed");
      const next = (await response.json()) as Ticket;
      setTicket(next);
      toast.success("Ticket updated");
    } catch {
      toast.error("Could not update ticket");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold text-teal-700">{ticket.key}</span>
              <TypeBadge type={ticket.type} />
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              {ticket.escalatedAt ? (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-rose-700">
                  Escalated
                </span>
              ) : null}
            </div>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{ticket.title}</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{ticket.description}</p>
          </div>
          <Button onClick={() => setFollowUpOpen(true)} variant="secondary">
            <BellRing />
            Send follow-up
          </Button>
        </div>
        <SlaRow ticket={ticket} />
      </header>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <TicketChat
          ticketId={ticket.id}
          currentUser={currentUser}
          messages={messages}
          channel={channel}
          onChannelChange={setChannel}
          typingUsers={typingUsers}
          mentionables={mentionables}
          onTyping={(isTyping) => {
            getSocket().emit("typing", { ticketId: ticket.id, visibility: channel, isTyping });
          }}
          onSend={async ({ body, visibility, mentionedUserIds, files }) => {
            const attachmentIds = await uploadFiles(files, ticket.id);
            const response = await fetch(`/api/tickets/${ticket.key}/comments`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ body, visibility, mentionedUserIds, attachmentIds }),
            });
            if (!response.ok) {
              toast.error("Message failed to send");
              throw new Error("send failed");
            }
            const message = (await response.json()) as ChatMessage;
            setTicket((current) => ({
              ...current,
              comments: [...(current.comments ?? []).filter((item) => item.id !== message.id), message],
            }));
          }}
        />

        <aside className="flex min-h-0 flex-col gap-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Properties</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <Field label="Requester">
                <Person user={ticket.requester} />
              </Field>
              <Field label="Assignee">
                {isAgent(currentUser.role) ? (
                  <select
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
                    disabled={saving}
                    value={ticket.assignee?.id ?? ""}
                    onChange={(event) =>
                      void updateTicket({ assigneeId: event.target.value || null })
                    }
                  >
                    <option value="">Unassigned</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Person user={ticket.assignee} empty="Unassigned" />
                )}
              </Field>
              <Field label="Status">
                {isAgent(currentUser.role) ? (
                  <select
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
                    disabled={saving}
                    value={ticket.status}
                    onChange={(event) =>
                      void updateTicket({ status: event.target.value as TicketStatus })
                    }
                  >
                    {Object.entries(STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <StatusBadge status={ticket.status} />
                )}
              </Field>
              <Field label="Priority">
                {isAgent(currentUser.role) ? (
                  <select
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
                    disabled={saving}
                    value={ticket.priority}
                    onChange={(event) =>
                      void updateTicket({ priority: event.target.value as Priority })
                    }
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                ) : (
                  <PriorityBadge priority={ticket.priority} />
                )}
              </Field>
              <Field label="Category">{ticket.category.name}</Field>
              <Field label="Updated">
                {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}
              </Field>
            </dl>
          </section>

          <section className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Audit log</h2>
            <ol className="mt-3 max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {(ticket.activities ?? []).map((activity) => (
                <li key={activity.id} className="relative border-l border-slate-200 pl-3">
                  <span className="absolute -left-1 top-1.5 h-2 w-2 rounded-full bg-teal-500" />
                  <p className="text-xs font-medium text-slate-800">
                    {activityLabel(activity.action)}
                    {activity.toValue ? `: ${activity.toValue}` : ""}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {activity.actor?.name ?? "System"} ·{" "}
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      <FollowUpDialog
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
        ticket={ticket}
        currentUser={currentUser}
        templates={templates}
        onSend={async (input) => {
          const response = await fetch(`/api/tickets/${ticket.key}/follow-ups`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          });
          if (!response.ok) {
            toast.error("Follow-up failed");
            throw new Error("follow-up failed");
          }
          toast.success("Follow-up sent");
          await refreshTicket(ticket.key, setTicket);
        }}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-slate-800">{children}</dd>
    </div>
  );
}

function Person({ user, empty = "—" }: { user: TicketUser | null; empty?: string }) {
  if (!user) return <span className="text-slate-400">{empty}</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <Avatar name={user.name} src={user.avatarUrl} className="h-6 w-6" />
      <span>
        {user.name}
        <span className="block text-[11px] text-slate-400">{user.title ?? user.email}</span>
      </span>
    </span>
  );
}

function SlaRow({ ticket }: { ticket: Ticket }) {
  const first = useDueCountdown(ticket.firstResponseDueAt, Boolean(ticket.firstRespondedAt));
  const resolve = useDueCountdown(ticket.resolutionDueAt, Boolean(ticket.resolvedAt));

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <SlaCard
        label="First response"
        remaining={ticket.firstRespondedAt ? "Met" : first.label}
        breached={!ticket.firstRespondedAt && first.breached}
        met={Boolean(ticket.firstRespondedAt)}
      />
      <SlaCard
        label="Resolution"
        remaining={ticket.resolvedAt ? "Resolved" : resolve.label}
        breached={!ticket.resolvedAt && resolve.breached}
        met={Boolean(ticket.resolvedAt)}
      />
    </div>
  );
}

function SlaCard({
  label,
  remaining,
  breached,
  met,
}: {
  label: string;
  remaining: string;
  breached: boolean;
  met: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
        met
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : breached
            ? "border-rose-200 bg-rose-50 text-rose-800"
            : "border-slate-200 bg-slate-50 text-slate-700"
      }`}
    >
      <Clock3 className="h-4 w-4" />
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
        <p className="font-semibold">{remaining}</p>
      </div>
    </div>
  );
}

function subscribeNow(onStoreChange: () => void) {
  const id = window.setInterval(onStoreChange, 1000);
  return () => window.clearInterval(id);
}

function useDueCountdown(dueAt: string | null, met: boolean) {
  const now = useSyncExternalStore(subscribeNow, () => Date.now(), () => 0);
  return useMemo(() => {
    if (met) return { label: "Met", breached: false };
    if (!dueAt) return { label: "No SLA", breached: false };
    const remainingMs = new Date(dueAt).getTime() - now;
    return { label: formatRemaining(remainingMs), breached: remainingMs < 0 };
  }, [dueAt, met, now]);
}

function formatRemaining(remainingMs: number | null) {
  if (remainingMs === null) return "No SLA";
  const abs = Math.abs(remainingMs);
  const hours = Math.floor(abs / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  const label = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  return remainingMs < 0 ? `${label} overdue` : `${label} remaining`;
}

function activityLabel(action: string) {
  return action.replaceAll("_", " ").toLowerCase();
}

async function refreshTicket(key: string, setTicket: (ticket: Ticket) => void) {
  const response = await fetch(`/api/tickets/${key}`);
  if (!response.ok) return;
  setTicket((await response.json()) as Ticket);
}

async function uploadFiles(files: File[], ticketId: string) {
  const ids: string[] = [];
  for (const file of files) {
    const data = new FormData();
    data.append("file", file);
    data.append("ticketId", ticketId);
    const response = await fetch("/api/uploads", { method: "POST", body: data });
    if (!response.ok) continue;
    const payload = (await response.json()) as { id: string };
    ids.push(payload.id);
  }
  return ids;
}
