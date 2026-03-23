export const DEFAULT_CATEGORY_SUGGESTIONS = ["daily", "travel"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  daily: "日常",
  travel: "旅行",
};

export function uniqueNonEmpty(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  );
}

export function getCategoryLabel(category: string) {
  const key = category.trim().toLowerCase();
  return CATEGORY_LABELS[key] ?? category.trim();
}

export function getCategoryTone(category: string) {
  const key = category.trim().toLowerCase();

  switch (key) {
    case "travel":
      return "bg-sky-100 text-sky-700 ring-1 ring-sky-200";
    case "daily":
      return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
    default:
      return "bg-rose-100 text-rose-700 ring-1 ring-rose-200";
  }
}

export function normalizeTextInput(value: string) {
  return value.trim();
}
