import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Pencil, Wallet } from "lucide-react";
import { BalanceTimeline } from "@/components/BalanceTimeline";
import { TransactionSection } from "@/components/TransactionSection";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  calculateBalanceProjection,
  generateId,
  parseAmount,
  parseStartingBalance,
  Transaction,
  TransactionForm,
  TransactionType,
  validateTransactionForm,
} from "@/services/finance";

const STORAGE_KEY = "aureum.state.v1";

type EditTarget = { kind: "income" | "bill"; id: string } | null;

function csvEscape(value: string | number) {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function FutureBalanceCalculator() {
  const [hydrated, setHydrated] = useState(false);
  const [startingBalance, setStartingBalance] = useState("");
  const [incomes, setIncomes] = useState<Transaction[]>([]);
  const [bills, setBills] = useState<Transaction[]>([]);

  const [incomeForm, setIncomeForm] = useState<TransactionForm>({ description: "", amount: "", date: "" });
  const [billForm, setBillForm] = useState<TransactionForm>({ description: "", amount: "", date: "" });
  const [editForm, setEditForm] = useState<TransactionForm>({ description: "", amount: "", date: "" });
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [errors, setErrors] = useState<{ income?: string; bill?: string; edit?: string }>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setHydrated(true);
        return;
      }

      const parsed = JSON.parse(raw);
      if (typeof parsed.startingBalance === "string") {
        setStartingBalance(parsed.startingBalance);
      }
      if (Array.isArray(parsed.incomes)) {
        setIncomes(parsed.incomes);
      }
      if (Array.isArray(parsed.bills)) {
        setBills(parsed.bills);
      }
    } catch {
      /* ignore parse failures */
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ startingBalance, incomes, bills }),
      );
    } catch {
      /* ignore storage failures */
    }
  }, [hydrated, startingBalance, incomes, bills]);

  const parsedStartingBalance = useMemo(
    () => parseStartingBalance(startingBalance),
    [startingBalance],
  );

  const projection = useMemo(
    () => calculateBalanceProjection(parsedStartingBalance, incomes, bills),
    [parsedStartingBalance, incomes, bills],
  );

  const { timeline, chartData, monthlySummary, finalBalance, minBalance, overdraftRiskPoints } = projection;

  const hasAnyData = startingBalance.trim() !== "" || incomes.length > 0 || bills.length > 0;

  function clearError(kind: "income" | "bill" | "edit") {
    setErrors((current) => ({ ...current, [kind]: undefined }));
  }

  function addIncome(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateTransactionForm(incomeForm);
    if (error) {
      setErrors((current) => ({ ...current, income: error }));
      return;
    }

    const amount = parseAmount(incomeForm.amount);
    if (amount === null) {
      setErrors((current) => ({ ...current, income: "Amount must be a number." }));
      return;
    }

    setIncomes((current) => [
      ...current,
      {
        id: generateId(),
        description: incomeForm.description.trim(),
        amount,
        date: incomeForm.date,
        type: "income",
      },
    ]);

    setIncomeForm({ description: "", amount: "", date: "" });
    clearError("income");
  }

  function addBill(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateTransactionForm(billForm);
    if (error) {
      setErrors((current) => ({ ...current, bill: error }));
      return;
    }

    const amount = parseAmount(billForm.amount);
    if (amount === null) {
      setErrors((current) => ({ ...current, bill: "Amount must be a number." }));
      return;
    }

    setBills((current) => [
      ...current,
      {
        id: generateId(),
        description: billForm.description.trim(),
        amount,
        date: billForm.date,
        type: "expense",
      },
    ]);

    setBillForm({ description: "", amount: "", date: "" });
    clearError("bill");
  }

  function removeIncome(id: string) {
    setIncomes((current) => current.filter((item) => item.id !== id));
  }

  function removeBill(id: string) {
    setBills((current) => current.filter((item) => item.id !== id));
  }

  function openEdit(kind: TransactionType, id: string) {
    const list = kind === "income" ? incomes : bills;
    const item = list.find((transaction) => transaction.id === id);
    if (!item) {
      return;
    }

    setEditTarget({ kind, id });
    setEditForm({
      description: item.description,
      amount: String(item.amount),
      date: item.date,
    });
    clearError("edit");
  }

  function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editTarget) {
      return;
    }

    const error = validateTransactionForm(editForm);
    if (error) {
      setErrors((current) => ({ ...current, edit: error }));
      return;
    }

    const amount = parseAmount(editForm.amount);
    if (amount === null) {
      setErrors((current) => ({ ...current, edit: "Amount must be a number." }));
      return;
    }

    const updateList = (list: Transaction[]) =>
      list.map((transaction) =>
        transaction.id === editTarget.id
          ? {
              ...transaction,
              description: editForm.description.trim(),
              amount,
              date: editForm.date,
            }
          : transaction,
      );

    if (editTarget.kind === "income") {
      setIncomes(updateList);
    } else {
      setBills(updateList);
    }

    setEditTarget(null);
    clearError("edit");
  }

  function handleExportStatement() {
    const rows = [
      ["Date", "Description", "Type", "Amount", "Running balance"],
      ...timeline.map((entry) => [
        formatDate(entry.date),
        entry.description,
        entry.type,
        entry.signedAmount.toFixed(2),
        entry.runningBalance.toFixed(2),
      ]),
    ];

    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    downloadCsv("aureum-projection.csv", csv);
  }

  return (
    <div className="relative min-h-screen py-10 px-4 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-[var(--gold)]/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-[var(--chart-4)]/15 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl space-y-10">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/[0.06] px-3.5 py-1 text-[10px] font-medium uppercase tracking-[0.32em] text-[var(--gold-soft)]">
              <span className="h-3 w-3 rounded-full bg-[var(--gold)]" />
              Aureum · Private Wealth Horizon
            </div>
            <div className="flex items-center gap-4">
              <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[var(--gold)]/50 bg-gradient-to-br from-[var(--gold)]/25 via-transparent to-transparent shadow-[var(--shadow-gold)]">
                <span className="font-display text-3xl font-semibold italic gold-text leading-none">A</span>
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-5xl">
                  <span className="gold-text italic">Aureum</span> Future Balance
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Forecast and manage your future cash flow with a clear, date-driven view.
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleExportStatement}
            disabled={!hasAnyData}
            className="shrink-0 border border-[var(--gold)]/40 bg-transparent text-[var(--gold)] hover:bg-[var(--gold)]/10 hover:text-[var(--gold)] shadow-none"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export Statement
          </Button>
        </header>

        <div className="hairline" />

        <div className="grid gap-5 md:grid-cols-3">
          <Card className="glass-card md:col-span-2 overflow-hidden rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  Starting Balance
                </span>
                <Wallet className="h-4 w-4 text-[var(--gold-soft)]" />
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="font-display text-5xl font-medium tracking-tight gold-text sm:text-6xl">
                {formatCurrency(parsedStartingBalance)}
              </div>
              <div>
                <Label htmlFor="starting-balance" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Adjust opening figure
                </Label>
                <Input
                  id="starting-balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={startingBalance}
                  onChange={(event) => setStartingBalance(event.target.value)}
                  className="mt-2 h-11 border-[var(--gold)]/20 bg-background/40 text-lg focus-visible:ring-[var(--gold)]/40"
                />
              </div>
            </CardContent>
          </Card>

          <Card className={`glass-card overflow-hidden rounded-2xl ${finalBalance < 0 ? "ring-1 ring-expense/40" : "ring-1 ring-[var(--gold)]/25"}`}>
            <CardHeader className="pb-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Final Projection
              </span>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className={`font-display text-4xl font-medium tracking-tight ${finalBalance < 0 ? "text-expense" : "gold-text"}`}>
                {formatCurrency(finalBalance)}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-[var(--gold)]" />
                  {timeline.length} entr{timeline.length === 1 ? "y" : "ies"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-[var(--gold)]" />
                  {monthlySummary.length} month{monthlySummary.length === 1 ? "" : "s"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <TransactionSection
            title="Income"
            subtitle="Add income sources with expected dates."
            type="income"
            form={incomeForm}
            error={errors.income}
            transactions={incomes}
            onChangeForm={setIncomeForm}
            onSubmit={addIncome}
            onEdit={(id) => openEdit("income", id)}
            onRemove={removeIncome}
          />
          <TransactionSection
            title="Bills & Expenses"
            subtitle="Add upcoming bills and expenses."
            type="expense"
            form={billForm}
            error={errors.bill}
            transactions={bills}
            onChangeForm={setBillForm}
            onSubmit={addBill}
            onEdit={(id) => openEdit("bill", id)}
            onRemove={removeBill}
          />
        </div>

        <BalanceTimeline
          timeline={timeline}
          chartData={chartData}
          monthlySummary={monthlySummary}
          finalBalance={finalBalance}
          minBalance={minBalance}
        />
      </div>

      <Dialog open={editTarget !== null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editTarget?.kind === "income" ? "Income" : "Bill"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEdit} className="space-y-4">
            <div>
              <Label htmlFor="edit-desc" className="text-xs font-medium">
                Description
              </Label>
              <Input
                id="edit-desc"
                value={editForm.description}
                onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-amount" className="text-xs font-medium">
                  Amount
                </Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editForm.amount}
                  onChange={(event) => setEditForm((current) => ({ ...current, amount: event.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-date" className="text-xs font-medium">
                  Date
                </Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editForm.date}
                  onChange={(event) => setEditForm((current) => ({ ...current, date: event.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            {errors.edit && <p className="text-sm text-expense">{errors.edit}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditTarget(null)}>
                Cancel
              </Button>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FutureBalanceCalculator;
