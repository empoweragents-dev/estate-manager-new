import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateFilter, DateRangeFilter } from "@/components/date-filter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  Users,
  Store,
  TrendingUp,
  TrendingDown,
  Calendar,
  FileText,
  Download,
  User,
  CreditCard,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  DollarSign,
  FileSpreadsheet,
  Printer,
} from "lucide-react";
import type { Owner, TenantWithDues } from "@shared/schema";
import { formatCurrency, useCurrencyStore, formatFloor, getShopStatusColor } from "@/lib/currency";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

function exportToExcel(data: any[], filename: string, headers: string[]) {
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const key = h.toLowerCase().replace(/ /g, '');
      const value = row[key] ?? row[h] ?? '';
      return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
}

function exportToPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${filename}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f4f4f4; }
          .header { margin-bottom: 20px; }
          .summary { display: flex; gap: 20px; margin-bottom: 20px; }
          .summary-item { padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
          .credit { color: green; }
          .debit { color: red; }
          @media print { body { -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

interface OwnerStatement {
  owner: Owner;
  totalRentCollected: number;
  shareFromCommonShops: number;
  allocatedExpenses: number;
  netPayout: number;
  bankDeposits: { id: number; date: string; amount: string; bankName: string; ref: string }[];
}

interface CollectionReport {
  month: string;
  expected: number;
  collected: number;
  pending: number;
}

interface ShopAvailability {
  floor: string;
  shops: { id: number; shopNumber: string; status: string; ownershipType: string; ownerName?: string }[];
}

function OwnerStatementReport() {
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const { currency, exchangeRate } = useCurrencyStore();

  const { data: owners = [] } = useQuery<Owner[]>({
    queryKey: ["/api/owners"],
  });

  const { data: statement, isLoading } = useQuery<OwnerStatement>({
    queryKey: ["/api/reports/owner-statement", selectedOwnerId, startDate, endDate],
    enabled: !!selectedOwnerId,
  });

  const formatValue = (val: number | string) => {
    const num = typeof val === "string" ? parseFloat(val) || 0 : val;
    return formatCurrency(num, currency, exchangeRate);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Owner</label>
              <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
                <SelectTrigger data-testid="select-report-owner">
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  {owners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id.toString()}>
                      {owner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-report-start-date"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-report-end-date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedOwnerId && (
        <>
          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-40 w-full" />
                </div>
              </CardContent>
            </Card>
          ) : statement ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{statement.owner.name}</CardTitle>
                    <CardDescription>
                      Statement Period: {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-export-owner-statement">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Rent from Owned Shops</p>
                        <p className="text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatValue(statement.totalRentCollected)}
                        </p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Share from Common Shops</p>
                        <p className="text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          +{formatValue(statement.shareFromCommonShops)}
                        </p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Allocated Expenses</p>
                        <p className="text-xl font-semibold tabular-nums text-destructive">
                          -{formatValue(statement.allocatedExpenses)}
                        </p>
                      </div>
                      <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
                        <p className="text-sm font-medium text-primary">Net Payout</p>
                        <p className="text-2xl font-bold tabular-nums text-primary">
                          {formatValue(statement.netPayout)}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        Bank Deposits Made
                      </h4>
                      {statement.bankDeposits && statement.bankDeposits.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Bank</TableHead>
                              <TableHead>Reference</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {statement.bankDeposits.map((deposit) => (
                              <TableRow key={deposit.id}>
                                <TableCell>{new Date(deposit.date).toLocaleDateString()}</TableCell>
                                <TableCell>{deposit.bankName}</TableCell>
                                <TableCell className="font-mono text-sm">{deposit.ref || "-"}</TableCell>
                                <TableCell className="text-right tabular-nums font-medium">
                                  {formatValue(deposit.amount)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No deposits recorded in this period</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">No data available for the selected period</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function TenantLedgerReport() {
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const { currency, exchangeRate } = useCurrencyStore();

  const { data: tenants = [] } = useQuery<TenantWithDues[]>({
    queryKey: ["/api/tenants"],
  });

  const { data: ledger, isLoading } = useQuery<{
    tenant: TenantWithDues;
    entries: { id: number; date: string; description: string; debit: number; credit: number; balance: number }[];
  }>({
    queryKey: ["/api/reports/tenant-ledger", selectedTenantId],
    enabled: !!selectedTenantId,
  });

  const formatValue = (val: number | string) => {
    const num = typeof val === "string" ? parseFloat(val) || 0 : val;
    return formatCurrency(num, currency, exchangeRate);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Tenant</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
            <SelectTrigger className="max-w-sm" data-testid="select-report-tenant">
              <SelectValue placeholder="Select tenant" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id.toString()}>
                  {tenant.name} - {tenant.phone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedTenantId && (
        <>
          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ) : ledger ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{ledger.tenant.name}</CardTitle>
                  <CardDescription>Complete transaction history</CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Current Due</p>
                  <p className={`text-xl font-bold tabular-nums ${ledger.tenant.currentDue > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {formatValue(ledger.tenant.currentDue)}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {ledger.entries && ledger.entries.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Debit (+)</TableHead>
                        <TableHead className="text-right">Credit (-)</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledger.entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                          <TableCell>{entry.description}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {entry.debit > 0 ? (
                              <span className="text-amber-600 dark:text-amber-400">{formatValue(entry.debit)}</span>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {entry.credit > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400">{formatValue(entry.credit)}</span>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">{formatValue(entry.balance)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground">No ledger entries</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}

function CollectionReportView() {
  const { currency, exchangeRate } = useCurrencyStore();

  const { data: report, isLoading } = useQuery<CollectionReport[]>({
    queryKey: ["/api/reports/collection"],
  });

  const formatValue = (val: number | string) => {
    const num = typeof val === "string" ? parseFloat(val) || 0 : val;
    return formatCurrency(num, currency, exchangeRate);
  };

  const chartColors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totals = report?.reduce(
    (acc, r) => ({
      expected: acc.expected + r.expected,
      collected: acc.collected + r.collected,
      pending: acc.pending + r.pending,
    }),
    { expected: 0, collected: 0, pending: 0 }
  ) || { expected: 0, collected: 0, pending: 0 };

  const collectionRate = totals.expected > 0 ? ((totals.collected / totals.expected) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="overflow-visible">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Expected</p>
            <p className="text-xl font-semibold tabular-nums">{formatValue(totals.expected)}</p>
          </CardContent>
        </Card>
        <Card className="overflow-visible">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Collected</p>
            <p className="text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatValue(totals.collected)}
            </p>
          </CardContent>
        </Card>
        <Card className="overflow-visible">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-xl font-semibold tabular-nums text-amber-600 dark:text-amber-400">
              {formatValue(totals.pending)}
            </p>
          </CardContent>
        </Card>
        <Card className="overflow-visible">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Collection Rate</p>
            <p className="text-xl font-semibold">{collectionRate}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Collection Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                  formatter={(value: number) => [formatValue(value), ""]}
                />
                <Bar dataKey="expected" fill={chartColors[0]} name="Expected" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" fill={chartColors[1]} name="Collected" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" fill={chartColors[2]} name="Pending" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Collected</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(report || []).map((row) => (
                <TableRow key={row.month}>
                  <TableCell className="font-medium">{row.month}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatValue(row.expected)}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatValue(row.collected)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-amber-600 dark:text-amber-400">
                    {formatValue(row.pending)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">
                      {row.expected > 0 ? ((row.collected / row.expected) * 100).toFixed(0) : 0}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

interface MonthlyDepositSummary {
  ownerId: number;
  ownerName: string;
  year: number;
  month: number;
  monthName: string;
  rentPayments: number;
  securityDeposits: number;
  totalDeposit: number;
}

interface OwnerTransaction {
  id: number;
  date: string;
  description: string;
  type: 'credit' | 'debit';
  category: string;
  amount: number;
  balance: number;
  shopNumber?: string;
  tenantName?: string;
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function MonthlyDepositSummaryReport() {
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const { currency, exchangeRate } = useCurrencyStore();

  const { data, isLoading } = useQuery<{
    data: MonthlyDepositSummary[];
    availableYears: number[];
    owners: { id: number; name: string }[];
  }>({
    queryKey: ["/api/reports/monthly-deposit-summary", selectedOwnerId, selectedYear, selectedMonth, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedOwnerId !== "all") params.append("ownerId", selectedOwnerId);
      if (selectedYear !== "all") params.append("year", selectedYear);
      if (selectedMonth !== "all") params.append("month", selectedMonth);
      if (startDate) params.append("startDate", format(startDate, "yyyy-MM-dd"));
      if (endDate) params.append("endDate", format(endDate, "yyyy-MM-dd"));
      const response = await fetch(`/api/reports/monthly-deposit-summary?${params}`);
      if (!response.ok) throw new Error("Failed to fetch report");
      return response.json();
    },
  });

  const formatValue = (val: number | string) => {
    const num = typeof val === "string" ? parseFloat(val) || 0 : val;
    return formatCurrency(num, currency, exchangeRate);
  };

  const totals = data?.data?.reduce(
    (acc, row) => ({
      rentPayments: acc.rentPayments + row.rentPayments,
      securityDeposits: acc.securityDeposits + row.securityDeposits,
      totalDeposit: acc.totalDeposit + row.totalDeposit,
    }),
    { rentPayments: 0, securityDeposits: 0, totalDeposit: 0 }
  ) || { rentPayments: 0, securityDeposits: 0, totalDeposit: 0 };

  const handleExportExcel = () => {
    if (!data?.data) return;
    const exportData = data.data.map(row => ({
      'Owner Name': row.ownerName,
      'Year': row.year,
      'Month': row.monthName,
      'Rent Payments': row.rentPayments.toFixed(2),
      'Security Deposits': row.securityDeposits.toFixed(2),
      'Total Deposit': row.totalDeposit.toFixed(2),
    }));
    exportToExcel(exportData, 'monthly-deposit-summary', ['Owner Name', 'Year', 'Month', 'Rent Payments', 'Security Deposits', 'Total Deposit']);
  };

  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Owner</label>
              <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Owners" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Owners</SelectItem>
                  {data?.owners?.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id.toString()}>
                      {owner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {data?.availableYears?.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Month</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {monthNames.map((name, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={handleExportExcel} disabled={!data?.data?.length}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" onClick={() => exportToPDF('monthly-deposit-report', 'monthly-deposit-summary')} disabled={!data?.data?.length}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>

          <Separator />

          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date Range Filter
            </label>
            <div className="flex gap-2 items-center">
              <DateRangeFilter
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                className="flex-1"
              />
              {(startDate || endDate) && (
                <Button variant="ghost" size="sm" onClick={clearDateFilters}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Rent Payments</p>
                <p className="text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatValue(totals.rentPayments)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Security Deposits</p>
                <p className="text-xl font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                  {formatValue(totals.securityDeposits)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Grand Total</p>
                <p className="text-xl font-semibold tabular-nums text-primary">
                  {formatValue(totals.totalDeposit)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card id="monthly-deposit-report">
            <CardHeader>
              <CardTitle className="text-base">Monthly Deposit Summary</CardTitle>
              <CardDescription>
                Rent payments and security deposits grouped by owner, year, and month
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {data?.data && data.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Owner Name</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Rent Payments</TableHead>
                      <TableHead className="text-right">Security Deposits</TableHead>
                      <TableHead className="text-right">Total Deposit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((row, idx) => (
                      <TableRow key={`${row.ownerId}-${row.year}-${row.month}`}>
                        <TableCell className="font-medium">{row.ownerName}</TableCell>
                        <TableCell>{row.year}</TableCell>
                        <TableCell>{row.monthName}</TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatValue(row.rentPayments)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-blue-600 dark:text-blue-400">
                          {formatValue(row.securityDeposits)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatValue(row.totalDeposit)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No deposit data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function OwnerTransactionDetailsReport() {
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const { currency, exchangeRate } = useCurrencyStore();

  const { data: owners = [] } = useQuery<Owner[]>({
    queryKey: ["/api/owners"],
  });

  const { data, isLoading } = useQuery<{
    owner: Owner;
    transactions: OwnerTransaction[];
    summary: {
      totalCredits: number;
      totalDebits: number;
      netBalance: number;
      rentPayments: number;
      securityDeposits: number;
      commonShopShare: number;
      totalExpenses: number;
    };
  }>({
    queryKey: ["/api/reports/owner-transactions", selectedOwnerId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("ownerId", selectedOwnerId);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const response = await fetch(`/api/reports/owner-transactions?${params}`);
      if (!response.ok) throw new Error("Failed to fetch report");
      return response.json();
    },
    enabled: !!selectedOwnerId,
  });

  const formatValue = (val: number | string) => {
    const num = typeof val === "string" ? parseFloat(val) || 0 : val;
    return formatCurrency(num, currency, exchangeRate);
  };

  const handleExportExcel = () => {
    if (!data?.transactions) return;
    const exportData = data.transactions.map(tx => ({
      'Date': new Date(tx.date).toLocaleDateString(),
      'Description': tx.description,
      'Type': tx.type,
      'Category': tx.category,
      'Amount': tx.amount.toFixed(2),
      'Balance': tx.balance.toFixed(2),
      'Shop': tx.shopNumber || '',
      'Tenant': tx.tenantName || '',
    }));
    exportToExcel(exportData, `owner-transactions-${data.owner.name}`, ['Date', 'Description', 'Type', 'Category', 'Amount', 'Balance', 'Shop', 'Tenant']);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Owner</label>
              <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  {owners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id.toString()}>
                      {owner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={handleExportExcel} disabled={!data?.transactions?.length}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline" onClick={() => exportToPDF('owner-transactions-report', `owner-transactions-${data?.owner?.name || 'report'}`)} disabled={!data?.transactions?.length}>
                <Printer className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedOwnerId ? (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">Select an owner to view transaction details</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ) : data?.summary ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <ArrowUpCircle className="h-5 w-5 text-emerald-600" />
                  <p className="text-sm text-muted-foreground">Total Credits</p>
                </div>
                <p className="text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatValue(data.summary.totalCredits)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <ArrowDownCircle className="h-5 w-5 text-red-600" />
                  <p className="text-sm text-muted-foreground">Total Debits</p>
                </div>
                <p className="text-xl font-semibold tabular-nums text-red-600 dark:text-red-400 mt-1">
                  {formatValue(data.summary.totalDebits)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <p className="text-sm text-muted-foreground">Net Balance</p>
                </div>
                <p className={`text-xl font-semibold tabular-nums mt-1 ${data.summary.netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatValue(data.summary.netBalance)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-xl font-semibold tabular-nums mt-1">
                  {data.transactions?.length || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-muted/50">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Rent Payments</p>
                <p className="font-semibold tabular-nums">{formatValue(data.summary.rentPayments)}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Security Deposits</p>
                <p className="font-semibold tabular-nums">{formatValue(data.summary.securityDeposits)}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Common Shop Share</p>
                <p className="font-semibold tabular-nums">{formatValue(data.summary.commonShopShare)}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Total Expenses</p>
                <p className="font-semibold tabular-nums text-red-600">{formatValue(data.summary.totalExpenses)}</p>
              </CardContent>
            </Card>
          </div>

          <Card id="owner-transactions-report">
            <CardHeader>
              <CardTitle className="text-base">{data.owner?.name} - Transaction Details</CardTitle>
              <CardDescription>
                Period: {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {data.transactions && data.transactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(tx.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>{tx.description}</p>
                            {tx.tenantName && (
                              <p className="text-xs text-muted-foreground">Tenant: {tx.tenantName}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {tx.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {tx.type === 'credit' ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {formatValue(tx.amount)}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {tx.type === 'debit' ? (
                            <span className="text-red-600 dark:text-red-400">
                              {formatValue(tx.amount)}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatValue(tx.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">No transactions found in this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function ShopAvailabilityReport() {
  const { data: availability, isLoading } = useQuery<ShopAvailability[]>({
    queryKey: ["/api/reports/shop-availability"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totals = availability?.reduce(
    (acc, floor) => ({
      total: acc.total + floor.shops.length,
      occupied: acc.occupied + floor.shops.filter(s => s.status === "occupied").length,
      vacant: acc.vacant + floor.shops.filter(s => s.status === "vacant").length,
    }),
    { total: 0, occupied: 0, vacant: 0 }
  ) || { total: 0, occupied: 0, vacant: 0 };

  const pieData = [
    { name: "Occupied", value: totals.occupied, color: "hsl(142, 76%, 36%)" },
    { name: "Vacant", value: totals.vacant, color: "hsl(221, 83%, 53%)" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="overflow-visible">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Shops</p>
            <p className="text-2xl font-semibold">{totals.total}</p>
          </CardContent>
        </Card>
        <Card className="overflow-visible">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Occupied</p>
            <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{totals.occupied}</p>
          </CardContent>
        </Card>
        <Card className="overflow-visible">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Vacant</p>
            <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{totals.vacant}</p>
          </CardContent>
        </Card>
        <Card className="overflow-visible">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Occupancy Rate</p>
            <p className="text-2xl font-semibold">
              {totals.total > 0 ? ((totals.occupied / totals.total) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Occupancy Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Shops by Floor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {(availability || []).map((floor) => (
                <div key={floor.floor}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{formatFloor(floor.floor)}</span>
                    <span className="text-sm text-muted-foreground">
                      {floor.shops.filter(s => s.status === "occupied").length}/{floor.shops.length} occupied
                    </span>
                  </div>
                  <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                    {floor.shops.map((shop) => (
                      <div
                        key={shop.id}
                        className={`aspect-square rounded-md flex items-center justify-center text-xs font-medium cursor-default ${
                          shop.status === "occupied"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}
                        title={`Shop ${shop.shopNumber} - ${shop.status}${shop.ownerName ? ` (${shop.ownerName})` : " (Common)"}`}
                        data-testid={`shop-availability-${shop.id}`}
                      >
                        {shop.shopNumber}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-muted-foreground">Comprehensive financial and operational reports</p>
      </div>

      <Tabs defaultValue="monthly-deposit">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="monthly-deposit" data-testid="tab-monthly-deposit">
              <Calendar className="h-4 w-4 mr-2" />
              Monthly Deposits
            </TabsTrigger>
            <TabsTrigger value="owner-transactions" data-testid="tab-owner-transactions">
              <Wallet className="h-4 w-4 mr-2" />
              Owner Transactions
            </TabsTrigger>
            <TabsTrigger value="owner-statement" data-testid="tab-owner-statement">
              <User className="h-4 w-4 mr-2" />
              Owner Statement
            </TabsTrigger>
            <TabsTrigger value="tenant-ledger" data-testid="tab-tenant-ledger">
              <FileText className="h-4 w-4 mr-2" />
              Tenant Ledger
            </TabsTrigger>
            <TabsTrigger value="collection" data-testid="tab-collection">
              <CreditCard className="h-4 w-4 mr-2" />
              Collection Report
            </TabsTrigger>
            <TabsTrigger value="availability" data-testid="tab-availability">
              <Store className="h-4 w-4 mr-2" />
              Shop Availability
            </TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="monthly-deposit" className="mt-6">
          <MonthlyDepositSummaryReport />
        </TabsContent>

        <TabsContent value="owner-transactions" className="mt-6">
          <OwnerTransactionDetailsReport />
        </TabsContent>

        <TabsContent value="owner-statement" className="mt-6">
          <OwnerStatementReport />
        </TabsContent>

        <TabsContent value="tenant-ledger" className="mt-6">
          <TenantLedgerReport />
        </TabsContent>

        <TabsContent value="collection" className="mt-6">
          <CollectionReportView />
        </TabsContent>

        <TabsContent value="availability" className="mt-6">
          <ShopAvailabilityReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
