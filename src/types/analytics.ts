import type { IssueCategory } from "@prisma/client";

export type AnalyticsRange = "7d" | "30d" | "all";

export interface CategoryVolume {
  id: string;
  code: IssueCategory;
  name: string;
  examples: string | null;
  count: number;
  percentage: number;
  color: string;
}

export interface CategoryAnalytics {
  range: AnalyticsRange;
  from: string | null;
  total: number;
  categories: CategoryVolume[];
  highest: CategoryVolume | null;
  lowest: CategoryVolume | null;
}
