"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { TicketType, Priority } from "@prisma/client";

interface Meta {
  categories: { id: string; name: string; examples: string | null; description: string | null }[];
  agents: { id: string; name: string }[];
  me: { role: string };
}

export default function NewTicketPage() {
  const router = useRouter();
  const meta = useQuery({
    queryKey: ["meta"],
    queryFn: async () => {
      const response = await fetch("/api/meta");
      return (await response.json()) as Meta;
    },
  });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "INCIDENT" as TicketType,
    priority: "MEDIUM" as Priority,
    categoryId: "",
    assigneeId: "",
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        categoryId: form.categoryId || meta.data?.categories[0]?.id,
        assigneeId: form.assigneeId || null,
      }),
    });
    setSaving(false);
    if (!response.ok) {
      toast.error("Could not create ticket");
      return;
    }
    const payload = (await response.json()) as { key: string };
    toast.success(`Created ${payload.key}`);
    router.push(`/tickets/${payload.key}`);
  }

  const selectedCategory = meta.data?.categories.find((category) => category.id === form.categoryId);

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">New ticket</h1>
        <p className="text-sm text-slate-500">Incidents, service requests, problems, and change requests share the same workflow.</p>
      </div>
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Type">
            <select
              className="h-9 w-full rounded-md border border-slate-200 px-2 text-sm"
              value={form.type}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as TicketType }))}
            >
              <option value="INCIDENT">Incident</option>
              <option value="SERVICE_REQUEST">Service Request</option>
              <option value="PROBLEM">Problem</option>
              <option value="CHANGE_REQUEST">Change Request</option>
            </select>
          </Field>
          <Field label="Priority">
            <select
              className="h-9 w-full rounded-md border border-slate-200 px-2 text-sm"
              value={form.priority}
              onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as Priority }))}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </Field>
        </div>
        <Field label="Category">
          <select
            className="h-9 w-full rounded-md border border-slate-200 px-2 text-sm"
            value={form.categoryId}
            onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
            required
          >
            <option value="">Select issue category</option>
            {(meta.data?.categories ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {selectedCategory ? (
            <p className="mt-1.5 text-xs text-slate-500">
              {selectedCategory.description} Typical items: {selectedCategory.examples}.
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-slate-400">
              Choose the standard IT support category that best matches this request.
            </p>
          )}
        </Field>
        {meta.data?.me.role !== "END_USER" ? (
          <Field label="Assign to">
            <select
              className="h-9 w-full rounded-md border border-slate-200 px-2 text-sm"
              value={form.assigneeId}
              onChange={(event) => setForm((current) => ({ ...current, assigneeId: event.target.value }))}
            >
              <option value="">Unassigned</option>
              {(meta.data?.agents ?? []).map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        <Field label="Title">
          <Input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Short summary of the issue or request"
            required
          />
        </Field>
        <Field label="Description">
          <Textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="What happened, who is impacted, and any workaround already tried."
            required
          />
        </Field>
        <Button disabled={saving}>{saving ? "Creating…" : "Create ticket"}</Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
