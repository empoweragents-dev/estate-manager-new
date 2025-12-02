import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "lucide-react";
import type { Owner, TenantWithDues } from "@shared/schema";
import { formatCurrency, useCurrencyStore, formatFloor, getShopStatusColor } from "@/lib/currency";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

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

      <Tabs defaultValue="owner-statement">
        <TabsList className="grid w-full grid-cols-4">
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
