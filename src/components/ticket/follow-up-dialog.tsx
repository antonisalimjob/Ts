"use client";

import { BellRing, Mail } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label, Textarea } from "@/components/ui/input";
import { interpolateTemplate } from "@/lib/utils";
import type { FollowUpTemplate, Ticket } from "@/types/ticket";
import type { SessionUser } from "@/lib/auth";

interface FollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Ticket;
  currentUser: SessionUser;
  templates: FollowUpTemplate[];
  onSend: (input: { templateId?: string; subject: string; message: string; channel: "EMAIL" | "IN_APP" | "BOTH" }) => Promise<void>;
}

export function FollowUpDialog({
  open,
  onOpenChange,
  ticket,
  currentUser,
  templates,
  onSend,
}: FollowUpDialogProps) {
  const audience = currentUser.role === "END_USER" ? "END_USER" : undefined;
  const available = templates.filter((template) =>
    currentUser.role === "END_USER" ? template.audience === "END_USER" : true,
  );
  const [templateId, setTemplateId] = useState(available[0]?.id ?? "");
  const [channel, setChannel] = useState<"EMAIL" | "IN_APP" | "BOTH">("BOTH");
  const [sending, setSending] = useState(false);

  const vars = useMemo(
    () => ({
      ticketKey: ticket.key,
      title: ticket.title,
      requester: ticket.requester.name,
      assignee: ticket.assignee?.name ?? "Unassigned",
      sender: currentUser.name,
      status: ticket.status,
    }),
    [ticket, currentUser.name],
  );

  const selected = available.find((template) => template.id === templateId) ?? available[0];
  const [subject, setSubject] = useState(selected ? interpolateTemplate(selected.subject, vars) : "");
  const [message, setMessage] = useState(selected ? interpolateTemplate(selected.body, vars) : "");

  function applyTemplate(id: string) {
    const next = available.find((template) => template.id === id);
    setTemplateId(id);
    if (!next) return;
    setSubject(interpolateTemplate(next.subject, vars));
    setMessage(interpolateTemplate(next.body, vars));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="flex items-center gap-2">
          <BellRing className="h-4 w-4 text-teal-600" />
          Send follow-up
        </DialogTitle>
        <DialogDescription>
          Nudge {currentUser.role === "END_USER" ? "the assigned technician" : "the requester or assignee"} with a templated email and in-app notification.
        </DialogDescription>

        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="template">Template</Label>
            <select
              id="template"
              className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
              value={templateId}
              onChange={(event) => applyTemplate(event.target.value)}
            >
              {available.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="channel">Channel</Label>
            <select
              id="channel"
              className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
              value={channel}
              onChange={(event) => setChannel(event.target.value as typeof channel)}
            >
              <option value="BOTH">Email + in-app</option>
              <option value="EMAIL">Email only</option>
              <option value="IN_APP">In-app only</option>
            </select>
          </div>
          <div>
            <Label htmlFor="subject">Subject</Label>
            <input
              id="subject"
              className="mt-1 h-9 w-full rounded-md border border-slate-200 px-3 text-sm"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              className="mt-1"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </div>
          <Button
            className="w-full"
            disabled={sending || !message.trim()}
            onClick={async () => {
              setSending(true);
              try {
                await onSend({ templateId: selected?.id, subject, message, channel });
                onOpenChange(false);
              } finally {
                setSending(false);
              }
            }}
          >
            <Mail />
            Send follow-up
          </Button>
          <p className="text-[11px] text-slate-400">
            {audience === "END_USER"
              ? "End users can ping the assigned agent without changing ticket status."
              : "A record is written to the audit log with your user ID and timestamp."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
