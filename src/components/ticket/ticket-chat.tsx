"use client";

import { formatDistanceToNow } from "date-fns";
import {
  AtSign,
  Bold,
  CheckCheck,
  Italic,
  Lock,
  MessageSquare,
  Paperclip,
  Send,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatBytes, renderMessageHtml } from "@/lib/utils";
import { isAgent } from "@/lib/permissions";
import type { SessionUser } from "@/lib/auth";
import type { ChatMessage, TypingUser } from "@/types/chat";
import type { TicketUser } from "@/types/ticket";
import type { CommentVisibility } from "@prisma/client";

interface TicketChatProps {
  ticketId: string;
  currentUser: SessionUser;
  messages: ChatMessage[];
  channel: CommentVisibility;
  onChannelChange: (channel: CommentVisibility) => void;
  typingUsers: TypingUser[];
  mentionables: TicketUser[];
  onSend: (input: {
    body: string;
    visibility: CommentVisibility;
    mentionedUserIds: string[];
    files: File[];
  }) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
}

export function TicketChat({
  ticketId,
  currentUser,
  messages,
  channel,
  onChannelChange,
  typingUsers,
  mentionables,
  onSend,
  onTyping,
}: TicketChatProps) {
  const canInternal = isAgent(currentUser.role);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const visibleMessages = messages.filter((message) => message.visibility === channel);
  const publicCount = messages.filter((message) => message.visibility === "PUBLIC").length;
  const internalCount = messages.filter((message) => message.visibility === "INTERNAL").length;

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [visibleMessages.length, ticketId, channel]);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Conversation</h2>
          <p className="text-xs text-slate-500">
            {channel === "PUBLIC"
              ? "Visible to the requester and assigned agents"
              : "Private notes for IT support only"}
          </p>
        </div>
        <div className="flex rounded-lg bg-slate-100 p-1">
          <ChannelTab
            active={channel === "PUBLIC"}
            onClick={() => onChannelChange("PUBLIC")}
            icon={<MessageSquare className="h-3.5 w-3.5" />}
            label="Public"
            count={publicCount}
          />
          {canInternal ? (
            <ChannelTab
              active={channel === "INTERNAL"}
              onClick={() => onChannelChange("INTERNAL")}
              icon={<Lock className="h-3.5 w-3.5" />}
              label="Internal note"
              count={internalCount}
            />
          ) : null}
        </div>
      </div>

      <div ref={scrollerRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50/70 px-4 py-4">
        {visibleMessages.length === 0 ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center text-center text-sm text-slate-500">
            {channel === "PUBLIC"
              ? "No public comments yet. Start the conversation with the requester."
              : "No internal notes yet. Add context that only agents should see."}
          </div>
        ) : (
          visibleMessages.map((message) => (
            <ChatBubble key={message.id} message={message} currentUserId={currentUser.id} />
          ))
        )}
        <TypingIndicator users={typingUsers.filter((user) => user.visibility === channel)} />
      </div>

      <Composer
        channel={channel}
        mentionables={mentionables}
        onSend={onSend}
        onTyping={onTyping}
      />
    </section>
  );
}

function ChannelTab({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
      }`}
    >
      {icon}
      {label}
      <span className="rounded-full bg-slate-200 px-1.5 text-[10px] text-slate-600">{count}</span>
    </button>
  );
}

function ChatBubble({
  message,
  currentUserId,
}: {
  message: ChatMessage;
  currentUserId: string;
}) {
  const mine = message.author.id === currentUserId;
  const isInternal = message.visibility === "INTERNAL";
  const html = message.bodyHtml ?? renderMessageHtml(message.body);

  return (
    <article className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
      <Avatar name={message.author.name} src={message.author.avatarUrl} />
      <div className={`max-w-[78%] ${mine ? "items-end text-right" : ""}`}>
        <div className={`mb-1 flex items-center gap-2 text-xs ${mine ? "justify-end" : ""}`}>
          <span className="font-semibold text-slate-800">{message.author.name}</span>
          <span className="text-slate-400">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </span>
          {isInternal ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
              <Lock className="h-3 w-3" /> Internal
            </span>
          ) : null}
        </div>
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
            isInternal
              ? "border border-amber-200 bg-amber-50 text-slate-800"
              : mine
                ? "bg-teal-600 text-white"
                : "border border-slate-200 bg-white text-slate-800"
          } ${mine ? "rounded-tr-sm" : "rounded-tl-sm"}`}
        >
          <div
            className={`prose-chat ${mine && !isInternal ? "prose-chat-invert" : ""}`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {message.attachments.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {message.attachments.map((file) => (
                <li key={file.id}>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center gap-1.5 text-xs underline ${
                      mine && !isInternal ? "text-teal-50" : "text-teal-700"
                    }`}
                  >
                    <Paperclip className="h-3 w-3" />
                    {file.filename} ({formatBytes(file.sizeBytes)})
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {message.receipts.length > 0 ? (
          <div className={`mt-1 flex items-center gap-1 text-[10px] text-slate-400 ${mine ? "justify-end" : ""}`}>
            <CheckCheck className="h-3 w-3 text-teal-600" />
            Seen by {message.receipts.map((receipt) => receipt.user.name.split(" ")[0]).join(", ")}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function TypingIndicator({ users }: { users: TypingUser[] }) {
  if (users.length === 0) return null;
  const names = users.map((user) => user.name.split(" ")[0]).join(", ");
  return (
    <p className="text-xs italic text-slate-500">
      {names} {users.length === 1 ? "is" : "are"} typing…
    </p>
  );
}

function Composer({
  channel,
  mentionables,
  onSend,
  onTyping,
}: {
  channel: CommentVisibility;
  mentionables: TicketUser[];
  onSend: TicketChatProps["onSend"];
  onTyping: (isTyping: boolean) => void;
}) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const query = useMemo(() => {
    const at = body.lastIndexOf("@");
    if (at < 0) return "";
    const fragment = body.slice(at + 1);
    if (fragment.includes(" ") || fragment.includes("\n")) return "";
    return fragment.toLowerCase();
  }, [body]);

  const suggestions = mentionables.filter((user) =>
    user.name.toLowerCase().includes(query),
  );

  const mentionOpen = body.includes("@") && Boolean(query || body.endsWith("@"));

  function wrap(token: string) {
    const textarea = document.getElementById("composer-body") as HTMLTextAreaElement | null;
    if (!textarea) {
      setBody((value) => `${token}${value}${token}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = body.slice(start, end) || "text";
    const next = `${body.slice(0, start)}${token}${selected}${token}${body.slice(end)}`;
    setBody(next);
  }

  async function submit() {
    if (!body.trim() && files.length === 0) return;
    setSending(true);
    try {
      const mentionedUserIds = mentionables
        .filter((user) => body.toLowerCase().includes(`@${user.name.toLowerCase()}`))
        .map((user) => user.id);
      await onSend({ body: body.trim(), visibility: channel, mentionedUserIds, files });
      setBody("");
      setFiles([]);
      onTyping(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      className={`border-t px-3 py-3 ${channel === "INTERNAL" ? "border-amber-200 bg-amber-50/60" : "border-slate-200 bg-white"}`}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="relative">
        {mentionOpen && suggestions.length > 0 ? (
          <div className="absolute bottom-full mb-2 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
            {suggestions.slice(0, 6).map((user) => (
              <button
                key={user.id}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => {
                  setBody((value) => value.replace(/@[\w.\- ]*$/, `@${user.name} `));
                }}
              >
                <Avatar name={user.name} src={user.avatarUrl} className="h-6 w-6" />
                <span>
                  {user.name}
                  <span className="ml-2 text-xs text-slate-400">{user.role}</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
        <textarea
          id="composer-body"
          value={body}
          rows={3}
          placeholder={
            channel === "INTERNAL"
              ? "Write an internal note. Use @ to mention an agent…"
              : "Write a public reply. **bold**, *italic*, @mentions, and attachments supported."
          }
          className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          onChange={(event) => {
            setBody(event.target.value);
            onTyping(true);
            if (typingTimer.current) clearTimeout(typingTimer.current);
            typingTimer.current = setTimeout(() => onTyping(false), 1200);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void submit();
            }
          }}
        />
      </div>
      {files.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {files.map((file) => (
            <li key={file.name} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
              {file.name}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button type="button" size="icon" variant="ghost" onClick={() => wrap("**")} title="Bold">
            <Bold />
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={() => wrap("*")} title="Italic">
            <Italic />
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={() => setBody((value) => `${value}@`)} title="Mention">
            <AtSign />
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={() => fileRef.current?.click()} title="Attach">
            <Paperclip />
          </Button>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
        </div>
        <Button type="submit" disabled={sending}>
          <Send />
          {channel === "INTERNAL" ? "Add note" : "Send reply"}
        </Button>
      </div>
    </form>
  );
}
