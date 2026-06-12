import { Area, AreaChart, CartesianGrid, ResponsiveContainer, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CalendarDays } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, formatShortDate } from "@/lib/format";
import type { ChartPoint, TimelineEntry, MonthlySummary } from "@/services/finance";

interface BalanceTimelineProps {
  timeline: TimelineEntry[];
  chartData: ChartPoint[];
  monthlySummary: MonthlySummary[];
  finalBalance: number;
  minBalance: number;
}

export function BalanceTimeline({
  timeline,
  chartData,
  monthlySummary,
  finalBalance,
  minBalance,
}: BalanceTimelineProps) {
  const hasData = chartData.length > 0;
  const riskPoints = timeline.filter((entry) => entry.isRiskPoint);
  const firstRisk = riskPoints[0];

  return (
    <div className="space-y-6">
      <Card className="glass-card rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-2xl font-medium">Balance Over Time</CardTitle>
          <CardDescription>Your projected running balance, visualized chronologically.</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Add income or bills to see the chart.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--income)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--income)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
                    stroke="var(--muted-foreground)"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) =>
                      new Intl.NumberFormat("en-US", {
                        notation: "compact",
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 1,
                      }).format(value as number)
                    }
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--popover-foreground)",
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [formatCurrency(value), "Balance"]}
                  />
                  {minBalance < 0 && (
                    <ReferenceLine y={0} stroke="var(--expense)" strokeDasharray="4 4" />
                  )}
                  <Area type="monotone" dataKey="balance" stroke="var(--income)" strokeWidth={2.5} fill="url(#balanceFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          {firstRisk && (
            <div className="mt-4 rounded-2xl border border-expense/25 bg-expense/10 px-4 py-3 text-sm text-expense">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                Potential overdraft risk detected.
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Your balance is projected to reach {formatCurrency(firstRisk.runningBalance)} on {formatDate(firstRisk.date)}.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="font-display text-2xl font-medium">Projected Balance Timeline</CardTitle>
          <CardDescription>Transactions sorted chronologically with running balance.</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <div className="text-center py-10 text-muted-foreground">
              <p>Add income and bills to see your projected balance timeline.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-6 px-3 sm:px-6">
                <Table className="min-w-0">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-2 sm:px-2">Date</TableHead>
                      <TableHead className="px-2 sm:px-2">Description</TableHead>
                      <TableHead className="px-2 sm:px-2 text-right">Amount</TableHead>
                      <TableHead className="px-2 sm:px-2 text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeline.map((row) => (
                      <TableRow key={row.id} className={row.isNegative ? "bg-expense-muted/30" : undefined}>
                        <TableCell className="px-2 sm:px-2 whitespace-nowrap text-xs sm:text-sm text-muted-foreground">
                          <span className="sm:hidden">{formatShortDate(row.date)}</span>
                          <span className="hidden sm:inline">{formatDate(row.date)}</span>
                        </TableCell>
                        <TableCell className="px-2 sm:px-2 max-w-[120px] sm:max-w-none">
                          <div className="flex items-center gap-1.5">
                            <span className={`truncate text-xs sm:text-sm ${row.isNegative ? "font-medium text-expense" : ""}`}>
                              {row.description}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className={`px-2 sm:px-2 text-right whitespace-nowrap text-xs sm:text-sm font-medium ${
                          row.type === "income" ? "text-income" : "text-expense"
                        }`}>
                          {row.type === "income" ? "+" : "-"}
                          {formatCurrency(Math.abs(row.signedAmount))}
                        </TableCell>
                        <TableCell className={`px-2 sm:px-2 text-right whitespace-nowrap text-xs sm:text-sm font-semibold ${
                          row.isNegative ? "text-expense" : "text-foreground"
                        }`}>
                          {formatCurrency(row.runningBalance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-6 flex items-center justify-between rounded-xl border border-[var(--gold)]/25 bg-gradient-to-r from-[var(--gold)]/10 via-transparent to-[var(--gold)]/10 px-5 py-4">
                <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  Final Projected Balance
                </span>
                <span className={`font-display text-3xl font-medium tracking-tight ${finalBalance < 0 ? "text-expense" : "gold-text"}`}>
                  {formatCurrency(finalBalance)}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 font-display text-2xl font-medium">
            <CalendarDays className="h-5 w-5 text-primary" />
            Monthly Summary
          </CardTitle>
          <CardDescription>Total income, bills, and net per month.</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlySummary.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Add entries to see monthly totals.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Income</TableHead>
                    <TableHead className="text-right">Bills</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlySummary.map((month) => (
                    <TableRow key={month.key}>
                      <TableCell className="font-medium">{month.label}</TableCell>
                      <TableCell className="text-right text-income font-medium">{formatCurrency(month.income)}</TableCell>
                      <TableCell className="text-right text-expense font-medium">{formatCurrency(month.bills)}</TableCell>
                      <TableCell className={`text-right font-bold ${month.net < 0 ? "text-expense" : "text-income"}`}>
                        {formatCurrency(month.net)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
