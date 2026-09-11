"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, PieChart } from "lucide-react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsRange, CategoryAnalytics } from "@/types/analytics";

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

export function CategoryAnalyticsChart() {
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const query = useQuery({
    queryKey: ["analytics", "categories", range],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/categories?range=${range}`);
      if (!response.ok) throw new Error("Could not load category analytics");
      return (await response.json()) as CategoryAnalytics;
    },
  });

  if (query.isLoading) return <AnalyticsSkeleton />;
  if (query.isError || !query.data) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Issue category analytics</h2>
        <p className="mt-3 text-sm text-slate-500">Category volume could not be loaded. Try refreshing the dashboard.</p>
      </section>
    );
  }

  const data = query.data;
  const empty = data.total === 0;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Issue category analytics</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ticket volume by standard IT support category
            {empty ? "" : ` · ${data.total} ticket${data.total === 1 ? "" : "s"}`}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Period
          <select
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm font-medium normal-case tracking-normal text-slate-800"
            value={range}
            onChange={(event) => setRange(event.target.value as AnalyticsRange)}
          >
            {RANGES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <MetricCard
          tone="high"
          label="Highest issue category"
          item={data.highest}
          empty={empty}
        />
        <MetricCard
          tone="low"
          label="Lowest issue category"
          item={data.lowest}
          empty={empty}
        />
      </div>

      <div className="mt-5 h-[320px]">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center">
            <PieChart className="h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-600">No tickets in this period</p>
            <p className="mt-1 max-w-sm text-xs text-slate-400">
              Create tickets or widen the date range to see volume by category.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.categories}
              layout="vertical"
              margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis
                type="category"
                dataKey="name"
                width={168}
                tick={{ fontSize: 11, fill: "#334155" }}
              />
              <Tooltip
                cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
                content={({ payload }) => {
                  const item = payload?.[0]?.payload as CategoryAnalytics["categories"][number] | undefined;
                  if (!item) return null;
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      {item.examples ? <p className="mt-0.5 text-slate-500">{item.examples}</p> : null}
                      <p className="mt-1 text-slate-700">
                        {item.count} ticket{item.count === 1 ? "" : "s"} · {item.percentage}%
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={22}>
                {data.categories.map((entry) => (
                  <Cell
                    key={entry.id}
                    fill={
                      entry.id === data.highest?.id
                        ? "#e11d48"
                        : entry.id === data.lowest?.id
                          ? "#059669"
                          : entry.color
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

function MetricCard({
  tone,
  label,
  item,
  empty,
}: {
  tone: "high" | "low";
  label: string;
  item: CategoryAnalytics["highest"];
  empty: boolean;
}) {
  const high = tone === "high";
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        high ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"
      }`}
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
        {high ? (
          <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />
        ) : (
          <ArrowDownRight className="h-3.5 w-3.5 text-emerald-700" />
        )}
        <span className={high ? "text-rose-700" : "text-emerald-800"}>{label}</span>
      </div>
      {empty || !item ? (
        <p className="mt-2 text-sm text-slate-500">No volume to rank yet.</p>
      ) : (
        <>
          <p className={`mt-1.5 text-sm font-semibold ${high ? "text-rose-950" : "text-emerald-950"}`}>
            {item.name}
          </p>
          <p className={`mt-1 text-xs ${high ? "text-rose-700" : "text-emerald-800"}`}>
            {item.count} ticket{item.count === 1 ? "" : "s"} · {item.percentage}% of volume
          </p>
        </>
      )}
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-72 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-9 w-36 animate-pulse rounded-md bg-slate-100" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="h-24 animate-pulse rounded-lg bg-rose-50" />
        <div className="h-24 animate-pulse rounded-lg bg-emerald-50" />
      </div>
      <div className="mt-5 h-[320px] animate-pulse rounded-lg bg-slate-100" />
    </section>
  );
}
