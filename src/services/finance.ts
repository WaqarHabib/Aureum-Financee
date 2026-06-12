import { compareAsc, isValid, parseISO } from "date-fns";
import { formatMonthLabel } from "@/lib/format";

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: TransactionType;
}

export interface TransactionForm {
  description: string;
  amount: string;
  date: string;
}

export interface TimelineEntry extends Transaction {
  signedAmount: number;
  runningBalance: number;
  isNegative: boolean;
  isRiskPoint: boolean;
}

export interface MonthlySummary {
  key: string;
  label: string;
  income: number;
  bills: number;
  net: number;
}

export interface ChartPoint {
  label: string;
  balance: number;
  date: string;
}

export interface BalanceProjection {
  timeline: TimelineEntry[];
  chartData: ChartPoint[];
  monthlySummary: MonthlySummary[];
  finalBalance: number;
  minBalance: number;
  overdraftRiskPoints: TimelineEntry[];
}

export function parseAmount(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function isValidTransactionDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== "string") {
    return false;
  }
  const date = parseISO(dateStr);
  return dateStr.trim().length > 0 && isValid(date) && /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

export function parseStartingBalance(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function validateTransactionForm(form: TransactionForm): string | undefined {
  if (!form.description.trim()) {
    return "Description is required.";
  }
  if (!form.amount.trim()) {
    return "Amount is required.";
  }

  const amount = parseAmount(form.amount);
  if (amount === null || amount <= 0) {
    return "Amount must be a positive number.";
  }

  if (!isValidTransactionDate(form.date)) {
    return "Date is required and must be valid.";
  }

  return undefined;
}

function safeTransactions(transactions: Transaction[]): Transaction[] {
  return transactions.filter((transaction) => {
    return (
      transaction.description.trim().length > 0 &&
      Number.isFinite(transaction.amount) &&
      transaction.amount >= 0 &&
      isValidTransactionDate(transaction.date)
    );
  });
}

function compareTransactions(a: Transaction, b: Transaction): number {
  const dateA = parseISO(a.date);
  const dateB = parseISO(b.date);
  const dateComparison = compareAsc(dateA, dateB);

  if (dateComparison !== 0) {
    return dateComparison;
  }

  if (a.type !== b.type) {
    return a.type === "income" ? -1 : 1;
  }

  return a.id.localeCompare(b.id);
}

export function buildTimeline(
  startingBalance: number,
  incomes: Transaction[],
  bills: Transaction[],
): TimelineEntry[] {
  const allTransactions = [
    ...safeTransactions(incomes).map((transaction) => ({ ...transaction, signedAmount: transaction.amount })),
    ...safeTransactions(bills).map((transaction) => ({ ...transaction, signedAmount: -transaction.amount })),
  ];

  const ordered = allTransactions.sort(compareTransactions);
  let runningBalance = startingBalance;

  return ordered.map((transaction) => {
    runningBalance += transaction.signedAmount;
    const isNegative = runningBalance < 0;
    return {
      ...transaction,
      runningBalance,
      isNegative,
      isRiskPoint: isNegative,
    };
  });
}

export function buildChartData(startingBalance: number, timeline: TimelineEntry[]): ChartPoint[] {
  if (timeline.length === 0) {
    return [];
  }

  const points: ChartPoint[] = [{
    label: "Start",
    balance: startingBalance,
    date: timeline[0].date,
  }];

  for (const entry of timeline) {
    points.push({
      label: entry.date,
      balance: entry.runningBalance,
      date: entry.date,
    });
  }

  return points;
}

export function buildMonthlySummary(incomes: Transaction[], bills: Transaction[]): MonthlySummary[] {
  const monthMap = new Map<string, { income: number; bills: number }>();

  for (const income of safeTransactions(incomes)) {
    const key = income.date.slice(0, 7);
    const current = monthMap.get(key) ?? { income: 0, bills: 0 };
    current.income += income.amount;
    monthMap.set(key, current);
  }

  for (const bill of safeTransactions(bills)) {
    const key = bill.date.slice(0, 7);
    const current = monthMap.get(key) ?? { income: 0, bills: 0 };
    current.bills += bill.amount;
    monthMap.set(key, current);
  }

  return Array.from(monthMap.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, summary]) => ({
      key,
      label: formatMonthLabel(key),
      income: summary.income,
      bills: summary.bills,
      net: summary.income - summary.bills,
    }));
}

export function calculateBalanceProjection(
  startingBalance: number,
  incomes: Transaction[],
  bills: Transaction[],
): BalanceProjection {
  const timeline = buildTimeline(startingBalance, incomes, bills);
  const finalBalance = timeline.length > 0 ? timeline[timeline.length - 1].runningBalance : startingBalance;
  const chartData = buildChartData(startingBalance, timeline);
  const monthlySummary = buildMonthlySummary(incomes, bills);
  const minBalance = timeline.length > 0 ? Math.min(...timeline.map((entry) => entry.runningBalance)) : startingBalance;
  const overdraftRiskPoints = timeline.filter((entry) => entry.runningBalance <= 0);

  return {
    timeline,
    chartData,
    monthlySummary,
    finalBalance,
    minBalance,
    overdraftRiskPoints,
  };
}
