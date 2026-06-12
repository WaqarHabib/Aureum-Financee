import type { Transaction, TransactionForm, TransactionType } from "@/services/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Plus, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

interface TransactionSectionProps {
  title: string;
  subtitle: string;
  type: TransactionType;
  form: TransactionForm;
  error?: string;
  transactions: Transaction[];
  onChangeForm: (form: TransactionForm) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}

const typeStyles: Record<
  TransactionType,
  { colorClass: string; backgroundClass: string; buttonClasses: string }
> = {
  income: {
    colorClass: "text-income",
    backgroundClass: "bg-income-muted/40",
    buttonClasses: "w-full border border-income text-income hover:bg-income-muted hover:text-income",
  },
  expense: {
    colorClass: "text-expense",
    backgroundClass: "bg-expense-muted/40",
    buttonClasses: "w-full border border-expense text-expense hover:bg-expense-muted hover:text-expense",
  },
};

export function TransactionSection({
  title,
  subtitle,
  type,
  form,
  error,
  transactions,
  onChangeForm,
  onSubmit,
  onEdit,
  onRemove,
}: TransactionSectionProps) {
  const style = typeStyles[type];
  const buttonText = type === "income" ? "Add Income" : "Add Bill";
  const Icon = type === "income" ? TrendingUp : TrendingDown;

  const updateForm = (patch: Partial<TransactionForm>) => {
    onChangeForm({ ...form, ...patch });
  };

  return (
    <Card className="glass-card rounded-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className={`flex items-center gap-2 font-display text-2xl font-medium ${style.colorClass}`}>
            <Icon className="h-5 w-5" />
            {title}
          </CardTitle>
        </div>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <Label htmlFor={`${type}-desc`} className="text-xs font-medium">
                Description
              </Label>
              <Input
                id={`${type}-desc`}
                placeholder={type === "income" ? "e.g. Paycheck" : "e.g. Rent"}
                value={form.description}
                onChange={(event) => updateForm({ description: event.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor={`${type}-amount`} className="text-xs font-medium">
                Amount
              </Label>
              <Input
                id={`${type}-amount`}
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(event) => updateForm({ amount: event.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor={`${type}-date`} className="text-xs font-medium">
                Date
              </Label>
              <Input
                id={`${type}-date`}
                type="date"
                value={form.date}
                onChange={(event) => updateForm({ date: event.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          {error && <p className="text-sm text-expense">{error}</p>}
          <Button type="submit" variant="outline" className={style.buttonClasses}>
            <Plus className="h-4 w-4 mr-1" />
            {buttonText}
          </Button>
        </form>

        {transactions.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium text-foreground">Added {type === "income" ? "Income" : "Bills"}</p>
            <div className="space-y-2">
              {transactions.map((item) => (
                <div key={item.id} className={`flex items-center justify-between rounded-lg border ${style.backgroundClass} px-3 py-2`}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className={`text-sm font-semibold ${style.colorClass}`}>
                      {formatCurrency(item.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onEdit(item.id)}
                      className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-background hover:text-primary transition-colors"
                      aria-label={`Edit ${type}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:bg-background hover:text-expense transition-colors"
                      aria-label={`Remove ${type}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
