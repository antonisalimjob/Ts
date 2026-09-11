import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { isAgent } from "@/lib/permissions";
import { ISSUE_CATEGORY_CATALOG } from "@/lib/categories";
import type { AnalyticsRange, CategoryVolume } from "@/types/analytics";

const rangeSchema = z.enum(["7d", "30d", "all"]).default("30d");

export async function GET(request: Request) {
  try {
    const user = await requireSession();
    if (!isAgent(user.role)) return jsonError("Forbidden", 403);

    const { searchParams } = new URL(request.url);
    const parsed = rangeSchema.safeParse(searchParams.get("range") ?? "30d");
    if (!parsed.success) return jsonError("Use range=7d, 30d, or all.");
    const range = parsed.data as AnalyticsRange;
    const from = rangeStart(range);

    const [categories, grouped] = await Promise.all([
      prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.ticket.groupBy({
        by: ["categoryId"],
        where: from ? { createdAt: { gte: from } } : undefined,
        _count: { _all: true },
      }),
    ]);

    const countById = new Map(grouped.map((row) => [row.categoryId, row._count._all]));
    const total = [...countById.values()].reduce((sum, count) => sum + count, 0);

    const catalogColor = Object.fromEntries(
      ISSUE_CATEGORY_CATALOG.map((item) => [item.code, item.color]),
    );

    const volumes: CategoryVolume[] = categories.map((category) => {
      const count = countById.get(category.id) ?? 0;
      return {
        id: category.id,
        code: category.code,
        name: category.name,
        examples: category.examples,
        count,
        percentage: total === 0 ? 0 : Math.round((count / total) * 1000) / 10,
        color: catalogColor[category.code] ?? "#0f766e",
      };
    });

    const ranked = [...volumes].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    const highest = total === 0 ? null : ranked[0] ?? null;
    const lowest = total === 0 ? null : [...ranked].sort((a, b) => a.count - b.count || a.name.localeCompare(b.name))[0] ?? null;

    return NextResponse.json({
      range,
      from: from?.toISOString() ?? null,
      total,
      categories: volumes,
      highest,
      lowest,
    });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}

function rangeStart(range: AnalyticsRange) {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
