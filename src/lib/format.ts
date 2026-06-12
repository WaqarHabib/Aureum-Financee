export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function safeDate(value: string): Date {
  return new Date(value + "T00:00:00");
}

export function formatDate(dateStr: string): string {
  const date = safeDate(dateStr);
  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatShortDate(dateStr: string): string {
  const date = safeDate(dateStr);
  if (Number.isNaN(date.getTime())) {
    return dateStr;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) {
    return key;
  }
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}
