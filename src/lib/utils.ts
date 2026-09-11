import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function interpolateTemplate(
  template: string,
  vars: Record<string, string>,
) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderMessageHtml(body: string) {
  const escaped = escapeHtml(body);
  const withCode = escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
  const withBold = withCode.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  const withItalic = withBold.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  const withMentions = withItalic.replace(
    /@([\w.\- ]{1,40})/g,
    '<span class="mention">@$1</span>',
  );
  const withLinks = withMentions.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noreferrer">$1</a>',
  );
  return withLinks.replaceAll("\n", "<br />");
}

export function extractMentions(body: string) {
  return [...body.matchAll(/@([\w.\-]+(?:\s[\w.\-]+)?)/g)].map((match) =>
    match[1].trim(),
  );
}
