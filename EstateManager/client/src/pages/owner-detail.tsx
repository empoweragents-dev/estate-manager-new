import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { 
  ArrowLeft, 
  Building2, 
  Users, 
  DollarSign, 
  AlertCircle,
  Phone,
  Calendar,
  TrendingUp,
  TrendingDown,
  Banknote,
  Receipt,
  FileText,
  ChevronDown,
  ChevronRight,
  Download,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatCurrency } from "@/lib/currency";
import { useState } from "react";
import type { Owner, BankDeposit, Expense } from "@shared/schema";

interface TenantInfo {
  id: number;
  leaseId: number;
  name: string;
  phone: string;
  shopNumber: string;
  shopLocation: string;
  securityDeposit: number;
  monthlyRent: number;
  currentDues: number;
  lastPaymentDate: string | null;
  leaseStatus: string;
}

interface DepositWithMonth extends BankDeposit {
  month: number;
  year: number;
  monthName: string;
}

interface ExpenseWithAllocation extends Expense {
  allocatedAmount: number;
  isCommon: boolean;
}

interface MonthlyReport {
  month: string;
  rentCollection: number;
  bankDeposits: number;
  expenses: number;
  netIncome: number;
}

interface YearlyReport {
  year: number;
  rentCollection: number;
  bankDeposits: number;
  expenses: number;
  netIncome: number;
}

interface OwnerDetailData {
  owner: Owner;
  summary: {
    totalSecurityDeposit: number;
    totalOutstandingDues: number;
    totalTenants: number;
    totalShops: number;
  };
  tenants: TenantInfo[];
  bankDeposits: DepositWithMonth[];
  depositsByMonth: Record<string, DepositWithMonth[]>;
  expenses: ExpenseWithAllocation[];
  monthlyReports: MonthlyReport[];
  yearlyReports: YearlyReport[];
}

export default function OwnerDetailPage() {
  const [, params] = useRoute("/owners/:id");
  const ownerId = params?.id;

  const formatValue = (val: number | string) => {
    const numVal = typeof val === 'string' ? parseFloat(val) : val;
    return formatCurrency(numVal);
  };

  const { data: ownerData, isLoading, error } = useQuery<OwnerDetailData>({
    queryKey: [`/api/owners/${ownerId}/details`],
    enabled: !!ownerId,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !ownerData) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>Failed to load owner details. Please try again.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { owner, summary, tenants, bankDeposits, depositsByMonth, expenses, monthlyReports, yearlyReports } = ownerData;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/owners">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">{owner.name}</h1>
          <div className="flex items-center gap-4 text-muted-foreground text-sm">
            {owner.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {owner.phone}
              </span>
            )}
            {owner.email && <span>{owner.email}</span>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Security Deposit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatValue(summary.totalSecurityDeposit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Held from {summary.totalTenants} tenant(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Total Outstanding Dues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.totalOutstandingDues > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatValue(summary.totalOutstandingDues)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pending rent collection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalTenants}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {summary.totalShops} shop(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Total Shops
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.totalShops}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Sole ownership
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tenants" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tenants">Tenants ({tenants.length})</TabsTrigger>
          <TabsTrigger value="deposits">Bank Deposits ({bankDeposits.length})</TabsTrigger>
          <TabsTrigger value="expenses">Expenses ({expenses.length})</TabsTrigger>
          <TabsTrigger value="reports">Income Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="mt-4">
          <TenantsTab tenants={tenants} formatValue={formatValue} ownerName={owner.name} />
        </TabsContent>

        <TabsContent value="deposits" className="mt-4">
          <BankDepositsTab 
            bankDeposits={bankDeposits} 
            depositsByMonth={depositsByMonth} 
            formatValue={formatValue} 
          />
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <ExpensesTab expenses={expenses} formatValue={formatValue} />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <IncomeReportsTab 
            ownerName={owner.name}
            monthlyReports={monthlyReports} 
            yearlyReports={yearlyReports}
            formatValue={formatValue} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TenantsTab({ tenants, formatValue, ownerName }: { tenants: TenantInfo[]; formatValue: (val: number) => string; ownerName: string }) {
  const formatNumber = (val: number) => {
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const exportTenantsPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('Tenant List', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Owner: ${ownerName}`, pageWidth / 2, 24, { align: 'center' });
    
    doc.setFontSize(9);
    doc.text(`Generated: ${currentDate}`, pageWidth / 2, 31, { align: 'center' });

    doc.setTextColor(0, 0, 0);

    const totals = tenants.reduce((acc, t) => ({
      securityDeposit: acc.securityDeposit + t.securityDeposit,
      monthlyRent: acc.monthlyRent + t.monthlyRent,
      currentDues: acc.currentDues + t.currentDues
    }), { securityDeposit: 0, monthlyRent: 0, currentDues: 0 });

    autoTable(doc, {
      startY: 42,
      head: [['Tenant Name', 'Phone', 'Shop', 'Security Deposit', 'Monthly Rent', 'Current Dues', 'Last Payment', 'Status']],
      body: tenants.map(tenant => [
        tenant.name,
        tenant.phone || '-',
        tenant.shopLocation,
        formatNumber(tenant.securityDeposit),
        formatNumber(tenant.monthlyRent),
        formatNumber(tenant.currentDues),
        tenant.lastPaymentDate ? new Date(tenant.lastPaymentDate).toLocaleDateString() : '-',
        tenant.leaseStatus === 'expiring_soon' ? 'Expiring Soon' : tenant.leaseStatus
      ]),
      foot: [[
        'TOTAL',
        '',
        `${tenants.length} Tenants`,
        formatNumber(totals.securityDeposit),
        formatNumber(totals.monthlyRent),
        formatNumber(totals.currentDues),
        '',
        ''
      ]],
      theme: 'striped',
      headStyles: { 
        fillColor: [37, 99, 235], 
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 9
      },
      footStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 30 },
        2: { cellWidth: 40 },
        3: { halign: 'right', cellWidth: 35 },
        4: { halign: 'right', cellWidth: 30 },
        5: { halign: 'right', cellWidth: 30 },
        6: { cellWidth: 30 },
        7: { cellWidth: 30 }
      },
      margin: { left: 10, right: 10 }
    });

    doc.save(`${ownerName.replace(/\s+/g, '_')}_Tenants_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Tenants
          </CardTitle>
          {tenants.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportTenantsPDF} className="gap-2">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant Name</TableHead>
              <TableHead>Shop Location</TableHead>
              <TableHead className="text-right">Security Deposit</TableHead>
              <TableHead className="text-right">Monthly Rent</TableHead>
              <TableHead className="text-right">Current Dues</TableHead>
              <TableHead>Last Payment</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.leaseId}>
                <TableCell>
                  <Link href={`/tenants/${tenant.id}`}>
                    <span className="font-medium text-primary hover:underline cursor-pointer">
                      {tenant.name}
                    </span>
                  </Link>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {tenant.phone}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{tenant.shopLocation}</Badge>
                </TableCell>
                <TableCell className="text-right font-medium text-blue-600">
                  {formatValue(tenant.securityDeposit)}
                </TableCell>
                <TableCell className="text-right">
                  {formatValue(tenant.monthlyRent)}
                </TableCell>
                <TableCell className={`text-right font-medium ${tenant.currentDues > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatValue(tenant.currentDues)}
                </TableCell>
                <TableCell>
                  {tenant.lastPaymentDate ? (
                    <span className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3" />
                      {new Date(tenant.lastPaymentDate).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">No payments</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={tenant.leaseStatus === 'active' ? 'default' : 
                            tenant.leaseStatus === 'expiring_soon' ? 'secondary' : 'destructive'}
                  >
                    {tenant.leaseStatus === 'expiring_soon' ? 'Expiring Soon' : tenant.leaseStatus}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {tenants.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No tenants found for this owner
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function BankDepositsTab({ 
  bankDeposits, 
  depositsByMonth, 
  formatValue 
}: { 
  bankDeposits: DepositWithMonth[]; 
  depositsByMonth: Record<string, DepositWithMonth[]>;
  formatValue: (val: number | string) => string;
}) {
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => ({ ...prev, [month]: !prev[month] }));
  };

  const monthGroups = Object.entries(depositsByMonth);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Bank Deposits by Month
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {monthGroups.map(([monthName, deposits]) => {
            const monthTotal = deposits.reduce((sum, d) => sum + parseFloat(d.amount), 0);
            const isExpanded = expandedMonths[monthName] ?? false;

            return (
              <Collapsible key={monthName} open={isExpanded} onOpenChange={() => toggleMonth(monthName)}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="font-medium">{monthName}</span>
                      <Badge variant="secondary">{deposits.length} deposit(s)</Badge>
                    </div>
                    <span className="font-semibold text-green-600">{formatValue(monthTotal)}</span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-6 mt-2 space-y-2">
                    {deposits.map((deposit) => (
                      <div key={deposit.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{new Date(deposit.depositDate).toLocaleDateString()}</p>
                          <p className="text-sm text-muted-foreground">{deposit.bankName}</p>
                          {deposit.depositSlipRef && (
                            <p className="text-xs text-muted-foreground">Ref: {deposit.depositSlipRef}</p>
                          )}
                        </div>
                        <span className="font-semibold text-green-600">{formatValue(deposit.amount)}</span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
          {monthGroups.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No bank deposits recorded</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            All Deposits (Chronological)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bankDeposits.map((deposit) => (
                <TableRow key={deposit.id}>
                  <TableCell>{new Date(deposit.depositDate).toLocaleDateString()}</TableCell>
                  <TableCell>{deposit.bankName}</TableCell>
                  <TableCell>{deposit.depositSlipRef || '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{deposit.notes || '-'}</TableCell>
                  <TableCell className="text-right font-medium text-green-600">
                    {formatValue(deposit.amount)}
                  </TableCell>
                </TableRow>
              ))}
              {bankDeposits.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No bank deposits recorded
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ExpensesTab({ expenses, formatValue }: { expenses: ExpenseWithAllocation[]; formatValue: (val: number | string) => string }) {
  const totalExpenses = expenses.reduce((sum, e) => sum + e.allocatedAmount, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Expenses
          </CardTitle>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total (Allocated)</p>
            <p className="text-lg font-semibold text-red-600">{formatValue(totalExpenses)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Allocation</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Your Share</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>{new Date(expense.expenseDate).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">{expense.expenseType}</Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">{expense.description}</TableCell>
                <TableCell>
                  <Badge variant={expense.isCommon ? 'secondary' : 'default'}>
                    {expense.isCommon ? 'Common' : 'Direct'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {formatValue(expense.amount)}
                </TableCell>
                <TableCell className="text-right font-medium text-red-600">
                  {formatValue(expense.allocatedAmount)}
                  {expense.isCommon && <span className="text-xs text-muted-foreground ml-1">(shared)</span>}
                </TableCell>
              </TableRow>
            ))}
            {expenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No expenses recorded
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function IncomeReportsTab({ 
  ownerName,
  monthlyReports, 
  yearlyReports,
  formatValue 
}: { 
  ownerName: string;
  monthlyReports: MonthlyReport[];
  yearlyReports: YearlyReport[];
  formatValue: (val: number) => string;
}) {
  const formatNumberForPdf = (val: number) => {
    return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 45, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('Income & Expense Report', pageWidth / 2, 18, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text(ownerName, pageWidth / 2, 28, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Generated: ${currentDate}`, pageWidth / 2, 38, { align: 'center' });

    doc.setTextColor(0, 0, 0);

    let yPos = 55;

    if (yearlyReports.length > 0) {
      doc.setFontSize(13);
      doc.setTextColor(37, 99, 235);
      doc.text('Yearly Summary', 14, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 6;

      autoTable(doc, {
        startY: yPos,
        head: [['Year', 'Rent Collection', 'Bank Deposits', 'Expenses', 'Net Income']],
        body: yearlyReports.map(report => [
          report.year.toString(),
          formatNumberForPdf(report.rentCollection),
          formatNumberForPdf(report.bankDeposits),
          formatNumberForPdf(report.expenses),
          (report.netIncome >= 0 ? '' : '-') + formatNumberForPdf(Math.abs(report.netIncome))
        ]),
        theme: 'striped',
        headStyles: { 
          fillColor: [37, 99, 235], 
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: {
          fontSize: 10
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { halign: 'right', cellWidth: 40 },
          2: { halign: 'right', cellWidth: 40 },
          3: { halign: 'right', cellWidth: 35 },
          4: { halign: 'right', cellWidth: 40, fontStyle: 'bold' }
        },
        margin: { left: 14, right: 14 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 18;
    }

    if (monthlyReports.length > 0) {
      doc.setFontSize(13);
      doc.setTextColor(37, 99, 235);
      doc.text('Monthly Breakdown (Last 12 Months)', 14, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 6;

      autoTable(doc, {
        startY: yPos,
        head: [['Month', 'Rent Collection', 'Bank Deposits', 'Expenses', 'Net Income']],
        body: monthlyReports.map(report => [
          report.month,
          formatNumberForPdf(report.rentCollection),
          formatNumberForPdf(report.bankDeposits),
          formatNumberForPdf(report.expenses),
          (report.netIncome >= 0 ? '' : '-') + formatNumberForPdf(Math.abs(report.netIncome))
        ]),
        theme: 'striped',
        headStyles: { 
          fillColor: [37, 99, 235], 
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: {
          fontSize: 10
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { halign: 'right', cellWidth: 38 },
          2: { halign: 'right', cellWidth: 38 },
          3: { halign: 'right', cellWidth: 30 },
          4: { halign: 'right', cellWidth: 35, fontStyle: 'bold' }
        },
        margin: { left: 14, right: 14 }
      });
    }

    const totalRentCollection = monthlyReports.reduce((sum, r) => sum + r.rentCollection, 0);
    const totalBankDeposits = monthlyReports.reduce((sum, r) => sum + r.bankDeposits, 0);
    const totalExpenses = monthlyReports.reduce((sum, r) => sum + r.expenses, 0);
    const totalNetIncome = monthlyReports.reduce((sum, r) => sum + r.netIncome, 0);

    yPos = (doc as any).lastAutoTable.finalY + 12;
    
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, yPos - 4, pageWidth - 28, 38, 3, 3, 'F');
    
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text('Summary Totals', 20, yPos + 4);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Rent Collection:`, 20, yPos + 14);
    doc.text(formatNumberForPdf(totalRentCollection), pageWidth - 20, yPos + 14, { align: 'right' });
    
    doc.text(`Bank Deposits:`, 20, yPos + 21);
    doc.text(formatNumberForPdf(totalBankDeposits), pageWidth - 20, yPos + 21, { align: 'right' });
    
    doc.text(`Expenses:`, 20, yPos + 28);
    doc.text(formatNumberForPdf(totalExpenses), pageWidth - 20, yPos + 28, { align: 'right' });
    
    yPos += 42;
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(14, yPos - 4, pageWidth - 28, 14, 3, 3, 'F');
    
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('Net Income:', 20, yPos + 5);
    doc.setFontSize(12);
    doc.text((totalNetIncome >= 0 ? '' : '-') + formatNumberForPdf(Math.abs(totalNetIncome)), pageWidth - 20, yPos + 5, { align: 'right' });

    const fileName = `${ownerName.replace(/\s+/g, '_')}_Income_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={exportPDF} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Yearly Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead className="text-right">Rent Collection</TableHead>
                <TableHead className="text-right">Bank Deposits</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Net Income</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {yearlyReports.map((report) => (
                <TableRow key={report.year}>
                  <TableCell className="font-medium">{report.year}</TableCell>
                  <TableCell className="text-right text-green-600">{formatValue(report.rentCollection)}</TableCell>
                  <TableCell className="text-right text-blue-600">{formatValue(report.bankDeposits)}</TableCell>
                  <TableCell className="text-right text-red-600">{formatValue(report.expenses)}</TableCell>
                  <TableCell className={`text-right font-bold ${report.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {report.netIncome >= 0 ? '' : '-'}{formatValue(Math.abs(report.netIncome))}
                  </TableCell>
                </TableRow>
              ))}
              {yearlyReports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Monthly Breakdown (Last 12 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Rent Collection</TableHead>
                <TableHead className="text-right">Bank Deposits</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Net Income</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyReports.map((report, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{report.month}</TableCell>
                  <TableCell className="text-right text-green-600">{formatValue(report.rentCollection)}</TableCell>
                  <TableCell className="text-right text-blue-600">{formatValue(report.bankDeposits)}</TableCell>
                  <TableCell className="text-right text-red-600">{formatValue(report.expenses)}</TableCell>
                  <TableCell className={`text-right font-bold ${report.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <span className="flex items-center justify-end gap-1">
                      {report.netIncome >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {report.netIncome >= 0 ? '' : '-'}{formatValue(Math.abs(report.netIncome))}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {monthlyReports.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
