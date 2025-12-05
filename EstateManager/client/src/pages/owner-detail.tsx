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
  Filter,
  X,
  ClipboardList,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatCurrency } from "@/lib/currency";
import { useState, useMemo } from "react";
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
  isCommon?: boolean;
  fullSecurityDeposit?: number;
  fullMonthlyRent?: number;
  fullCurrentDues?: number;
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
    commonSecurityDeposit: number;
    commonOutstandingDues: number;
    commonTenants: number;
    commonShops: number;
    totalCommonExpenseShare: number;
    totalPrivateExpense: number;
    totalOwners: number;
  };
  tenants: TenantInfo[];
  commonTenants: TenantInfo[];
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

  const { owner, summary, tenants, commonTenants, bankDeposits, depositsByMonth, expenses, monthlyReports, yearlyReports } = ownerData;
  
  const hasCommonData = summary.commonShops > 0 || summary.commonTenants > 0;
  const combinedSecurityDeposit = summary.totalSecurityDeposit + summary.commonSecurityDeposit;
  const combinedOutstandingDues = summary.totalOutstandingDues + summary.commonOutstandingDues;

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center gap-3 md:gap-4">
        <Link href="/owners">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-semibold truncate">{owner.name}</h1>
          <div className="flex flex-wrap items-center gap-2 md:gap-4 text-muted-foreground text-xs md:text-sm">
            {owner.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {owner.phone}
              </span>
            )}
            {owner.email && <span className="truncate">{owner.email}</span>}
          </div>
        </div>
      </div>

      <div className="space-y-3 md:space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-blue-600 text-xs md:text-sm">My Private Properties</Badge>
          <span className="text-xs md:text-sm text-muted-foreground">Sole ownership</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card className="border-l-4 border-l-blue-600">
            <CardHeader className="p-3 md:pb-2 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1 md:gap-2">
                <DollarSign className="h-3 w-3 md:h-4 md:w-4" />
                <span className="truncate">Security Deposit</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-lg md:text-2xl font-bold text-blue-600">
                {formatValue(summary.totalSecurityDeposit)}
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                From {summary.totalTenants} tenant(s)
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-600">
            <CardHeader className="p-3 md:pb-2 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1 md:gap-2">
                <AlertCircle className="h-3 w-3 md:h-4 md:w-4" />
                <span className="truncate">Outstanding Dues</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className={`text-lg md:text-2xl font-bold ${summary.totalOutstandingDues > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatValue(summary.totalOutstandingDues)}
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                Pending collection
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-600">
            <CardHeader className="p-3 md:pb-2 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1 md:gap-2">
                <Users className="h-3 w-3 md:h-4 md:w-4" />
                Tenants
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-lg md:text-2xl font-bold">
                {summary.totalTenants}
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                In {summary.totalShops} shop(s)
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-600">
            <CardHeader className="p-3 md:pb-2 md:p-6">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1 md:gap-2">
                <Building2 className="h-3 w-3 md:h-4 md:w-4" />
                Shops
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-lg md:text-2xl font-bold">
                {summary.totalShops}
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                Sole ownership
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {hasCommonData && (
        <div className="space-y-3 md:space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 text-xs md:text-sm">Common/Shared Properties</Badge>
            <span className="text-xs md:text-sm text-muted-foreground">Shared among {summary.totalOwners} owner(s)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="p-3 md:pb-2 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1 md:gap-2">
                  <DollarSign className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="truncate">Your Share of Deposit</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-lg md:text-2xl font-bold text-purple-600">
                  {formatValue(summary.commonSecurityDeposit)}
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                  From {summary.commonTenants} common tenant(s)
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="p-3 md:pb-2 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1 md:gap-2">
                  <AlertCircle className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="truncate">Your Share of Dues</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className={`text-lg md:text-2xl font-bold ${summary.commonOutstandingDues > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatValue(summary.commonOutstandingDues)}
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                  Pending collection
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="p-3 md:pb-2 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1 md:gap-2">
                  <Users className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="truncate">Common Tenants</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-lg md:text-2xl font-bold">
                  {summary.commonTenants}
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                  In {summary.commonShops} common shop(s)
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="p-3 md:pb-2 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-1 md:gap-2">
                  <Building2 className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="truncate">Common Shops</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                <div className="text-lg md:text-2xl font-bold">
                  {summary.commonShops}
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                  Shared ownership
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Card className="bg-muted/30">
        <CardHeader className="p-3 md:p-6 pb-2">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
            Combined Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            <div className="text-center">
              <p className="text-[10px] md:text-sm text-muted-foreground">Total Security Deposit</p>
              <p className="text-sm md:text-xl font-bold text-blue-600">{formatValue(combinedSecurityDeposit)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] md:text-sm text-muted-foreground">Total Outstanding Dues</p>
              <p className={`text-sm md:text-xl font-bold ${combinedOutstandingDues > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatValue(combinedOutstandingDues)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] md:text-sm text-muted-foreground">Total Tenants</p>
              <p className="text-sm md:text-xl font-bold">{summary.totalTenants + summary.commonTenants}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="tenants" className="w-full">
        <div className="overflow-x-auto -mx-3 md:mx-0 px-3 md:px-0">
          <TabsList className="inline-flex w-max md:grid md:w-full md:grid-cols-6 min-w-full">
            <TabsTrigger value="tenants" className="text-xs md:text-sm whitespace-nowrap">
              My Tenants ({tenants.length})
            </TabsTrigger>
            {hasCommonData && (
              <TabsTrigger value="common-tenants" className="text-xs md:text-sm whitespace-nowrap">
                Common ({commonTenants.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="deposits" className="text-xs md:text-sm whitespace-nowrap">
              Deposits ({bankDeposits.length})
            </TabsTrigger>
            <TabsTrigger value="expenses" className="text-xs md:text-sm whitespace-nowrap">
              Expenses ({expenses.length})
            </TabsTrigger>
            <TabsTrigger value="income-reports" className="text-xs md:text-sm whitespace-nowrap">
              Income Summary
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-xs md:text-sm whitespace-nowrap">
              <ClipboardList className="h-3 w-3 mr-1 md:hidden" />
              <span>Reports</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="tenants" className="mt-4">
          <TenantsTab tenants={tenants} formatValue={formatValue} ownerName={owner.name} isCommon={false} />
        </TabsContent>
        
        {hasCommonData && (
          <TabsContent value="common-tenants" className="mt-4">
            <TenantsTab tenants={commonTenants} formatValue={formatValue} ownerName={owner.name} isCommon={true} totalOwners={summary.totalOwners} />
          </TabsContent>
        )}

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

        <TabsContent value="income-reports" className="mt-4">
          <IncomeReportsTab 
            ownerName={owner.name}
            monthlyReports={monthlyReports} 
            yearlyReports={yearlyReports}
            formatValue={formatValue} 
          />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <OwnerReportsTab ownerId={owner.id} ownerName={owner.name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TenantsTab({ tenants, formatValue, ownerName, isCommon = false, totalOwners = 1 }: { tenants: TenantInfo[]; formatValue: (val: number) => string; ownerName: string; isCommon?: boolean; totalOwners?: number }) {
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
    <Card className={isCommon ? 'border-purple-200' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5" />
            {isCommon ? 'Common/Shared Tenants' : 'My Tenants'}
            {isCommon && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">
                1/{totalOwners} share
              </Badge>
            )}
          </CardTitle>
          {tenants.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportTenantsPDF} className="gap-2">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          )}
        </div>
        {isCommon && (
          <p className="text-sm text-muted-foreground mt-1">
            Showing your share of values. Full amounts are shown in parentheses.
          </p>
        )}
      </CardHeader>
      <CardContent className="p-0 md:p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Tenant Name</TableHead>
                <TableHead className="whitespace-nowrap">Shop Location</TableHead>
                <TableHead className="text-right whitespace-nowrap">{isCommon ? 'Your Share of Deposit' : 'Security Deposit'}</TableHead>
                <TableHead className="text-right whitespace-nowrap">{isCommon ? 'Your Share of Rent' : 'Monthly Rent'}</TableHead>
                <TableHead className="text-right whitespace-nowrap">{isCommon ? 'Your Share of Dues' : 'Current Dues'}</TableHead>
                <TableHead className="whitespace-nowrap">Last Payment</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.leaseId} className={isCommon ? 'bg-purple-50/30' : ''}>
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
                  <Badge variant={isCommon ? 'secondary' : 'outline'} className={isCommon ? 'bg-purple-100 text-purple-700' : ''}>
                    {tenant.shopLocation}
                  </Badge>
                </TableCell>
                <TableCell className={`text-right font-medium ${isCommon ? 'text-purple-600' : 'text-blue-600'}`}>
                  {formatValue(tenant.securityDeposit)}
                  {isCommon && tenant.fullSecurityDeposit !== undefined && (
                    <div className="text-xs text-muted-foreground">({formatValue(tenant.fullSecurityDeposit)})</div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {formatValue(tenant.monthlyRent)}
                  {isCommon && tenant.fullMonthlyRent !== undefined && (
                    <div className="text-xs text-muted-foreground">({formatValue(tenant.fullMonthlyRent)})</div>
                  )}
                </TableCell>
                <TableCell className={`text-right font-medium ${tenant.currentDues > 0 ? (isCommon ? 'text-orange-600' : 'text-red-600') : 'text-green-600'}`}>
                  {formatValue(tenant.currentDues)}
                  {isCommon && tenant.fullCurrentDues !== undefined && (
                    <div className="text-xs text-muted-foreground">({formatValue(tenant.fullCurrentDues)})</div>
                  )}
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
                  {isCommon ? 'No common/shared tenants found' : 'No tenants found for this owner'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          </Table>
        </div>
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

const EXPENSE_TYPES = ["guard", "cleaner", "electricity", "maintenance", "other"] as const;

function generateMonthOptions() {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    months.push({ value, label });
  }
  return months;
}

function ExpensesTab({ expenses, formatValue }: { expenses: ExpenseWithAllocation[]; formatValue: (val: number | string) => string }) {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      if (filterCategory !== "all" && expense.expenseType !== filterCategory) return false;
      if (filterMonth !== "all") {
        const expenseMonth = expense.expenseDate.substring(0, 7);
        if (expenseMonth !== filterMonth) return false;
      }
      if (filterDateFrom && expense.expenseDate < filterDateFrom) return false;
      if (filterDateTo && expense.expenseDate > filterDateTo) return false;
      return true;
    });
  }, [expenses, filterCategory, filterMonth, filterDateFrom, filterDateTo]);

  const hasActiveFilters = filterCategory !== "all" || filterMonth !== "all" || filterDateFrom || filterDateTo;

  const clearAllFilters = () => {
    setFilterCategory("all");
    setFilterMonth("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.allocatedAmount, 0);

  return (
    <div className="space-y-4">
      <Card className="overflow-visible">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 px-2 text-xs ml-auto">
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Category</label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {EXPENSE_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Month</label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {monthOptions.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">From Date</label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">To Date</label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Expenses {hasActiveFilters && "(Filtered)"}
            </CardTitle>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total (Allocated){hasActiveFilters && " - Filtered"}</p>
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
              {filteredExpenses.map((expense) => (
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
              {filteredExpenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {hasActiveFilters ? "No expenses match the current filters" : "No expenses recorded"}
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

interface RentPaymentData {
  leaseId: number;
  tenantId: number;
  tenantName: string;
  phone: string;
  shopLocation: string;
  monthlyRent: number;
  recentPaymentAmount: number;
  recentPaymentDate: string | null;
  currentOutstanding: number;
  isCommon: boolean;
}

interface FinancialTransaction {
  id: number;
  date: string;
  type: 'deposit' | 'expense';
  category: string;
  description: string;
  amount: number;
  isCommon: boolean;
}

interface TenantLedgerEntry {
  id: number;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function OwnerReportsTab({ ownerId, ownerName }: { ownerId: number; ownerName: string }) {
  const [reportType, setReportType] = useState<'rent' | 'financial' | 'ledger'>('rent');
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [financialStartDate, setFinancialStartDate] = useState<string>('');
  const [financialEndDate, setFinancialEndDate] = useState<string>('');
  
  const formatValue = (val: number) => formatCurrency(val);
  const formatNumber = (val: number) => val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const years = useMemo(() => {
    const startYear = 2020;
    const endYear = new Date().getFullYear() + 1;
    return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
  }, []);

  // Rent Payment Report Query
  const { data: rentData, isLoading: rentLoading } = useQuery<{
    data: RentPaymentData[];
    totals: { totalMonthlyRent: number; totalRecentPayments: number; totalOutstanding: number };
  }>({
    queryKey: [`/api/owners/${ownerId}/reports/rent-payments`, selectedMonth, selectedYear],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('month', selectedMonth);
      params.append('year', selectedYear);
      const response = await fetch(`/api/owners/${ownerId}/reports/rent-payments?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    enabled: reportType === 'rent',
  });

  // Financial Transaction Report Query
  const { data: financialData, isLoading: financialLoading } = useQuery<{
    data: FinancialTransaction[];
    totals: { totalDeposits: number; totalExpenses: number; netBalance: number };
  }>({
    queryKey: [`/api/owners/${ownerId}/reports/financial-transactions`, financialStartDate, financialEndDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (financialStartDate) params.append('startDate', financialStartDate);
      if (financialEndDate) params.append('endDate', financialEndDate);
      const response = await fetch(`/api/owners/${ownerId}/reports/financial-transactions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    enabled: reportType === 'financial',
  });

  // Tenant Ledger Query
  const { data: ledgerData, isLoading: ledgerLoading } = useQuery<{
    tenants: { id: number; name: string; phone: string }[];
    ledger: { tenant: { id: number; name: string }; entries: TenantLedgerEntry[]; totals: { totalDebit: number; totalCredit: number; currentBalance: number } } | null;
  }>({
    queryKey: [`/api/owners/${ownerId}/reports/tenant-ledger`, selectedTenantId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedTenantId) params.append('tenantId', selectedTenantId);
      const response = await fetch(`/api/owners/${ownerId}/reports/tenant-ledger?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    enabled: reportType === 'ledger',
  });

  const exportRentPDF = () => {
    if (!rentData?.data?.length) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('Rent Payment Report', pageWidth / 2, 12, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`${ownerName} - ${monthNames[parseInt(selectedMonth) - 1]} ${selectedYear}`, pageWidth / 2, 22, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    autoTable(doc, {
      startY: 38,
      head: [['SL', 'Tenant Name', 'Phone', 'Shop Location', 'Monthly Rent', 'Recent Payment', 'Payment Date', 'Outstanding']],
      body: rentData.data.map((row, idx) => [
        (idx + 1).toString(),
        row.tenantName,
        row.phone,
        row.shopLocation,
        formatNumber(row.monthlyRent),
        row.recentPaymentAmount > 0 ? formatNumber(row.recentPaymentAmount) : '-',
        row.recentPaymentDate || '-',
        formatNumber(row.currentOutstanding),
      ]),
      foot: [[
        '', 'TOTAL', `${rentData.data.length} Tenants`, '',
        formatNumber(rentData.totals.totalMonthlyRent),
        formatNumber(rentData.totals.totalRecentPayments),
        '',
        formatNumber(rentData.totals.totalOutstanding),
      ]],
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      footStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    });

    doc.save(`${ownerName.replace(/\s+/g, '_')}_Rent_Report_${monthNames[parseInt(selectedMonth) - 1]}_${selectedYear}.pdf`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Report Type:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={reportType === 'rent' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setReportType('rent')}
                className="text-xs md:text-sm"
              >
                Rent Payments
              </Button>
              <Button 
                variant={reportType === 'financial' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setReportType('financial')}
                className="text-xs md:text-sm"
              >
                Financial Transactions
              </Button>
              <Button 
                variant={reportType === 'ledger' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setReportType('ledger')}
                className="text-xs md:text-sm"
              >
                Tenant Ledger
              </Button>
            </div>
          </div>
          
          {reportType === 'rent' && (
            <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs md:text-sm">Filter:</span>
              </div>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-28 md:w-32 h-8 text-xs md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((month, idx) => (
                    <SelectItem key={idx} value={(idx + 1).toString()}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-20 md:w-24 h-8 text-xs md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {rentData?.data?.length ? (
                <Button size="sm" variant="outline" onClick={exportRentPDF} className="h-8 text-xs md:text-sm ml-auto">
                  <Download className="h-3 w-3 mr-1" />
                  PDF
                </Button>
              ) : null}
            </div>
          )}

          {reportType === 'financial' && (
            <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs md:text-sm">Date Range:</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={financialStartDate}
                  onChange={(e) => setFinancialStartDate(e.target.value)}
                  className="w-32 md:w-36 h-8 text-xs md:text-sm"
                  placeholder="Start Date"
                />
                <span className="text-muted-foreground text-xs">to</span>
                <Input
                  type="date"
                  value={financialEndDate}
                  onChange={(e) => setFinancialEndDate(e.target.value)}
                  className="w-32 md:w-36 h-8 text-xs md:text-sm"
                  placeholder="End Date"
                />
              </div>
              {(financialStartDate || financialEndDate) && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => { setFinancialStartDate(''); setFinancialEndDate(''); }}
                  className="h-8 text-xs text-muted-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
          )}

          {reportType === 'ledger' && ledgerData?.tenants && (
            <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs md:text-sm">Select Tenant:</span>
              </div>
              <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                <SelectTrigger className="w-48 md:w-64 h-8 text-xs md:text-sm">
                  <SelectValue placeholder="Choose a tenant" />
                </SelectTrigger>
                <SelectContent>
                  {ledgerData.tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>{t.name} - {t.phone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {reportType === 'rent' && (
        <Card>
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 md:h-5 md:w-5" />
              Rent Payment Report - {monthNames[parseInt(selectedMonth) - 1]} {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 md:p-6">
            {rentLoading ? (
              <div className="p-6"><Skeleton className="h-64" /></div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 text-center whitespace-nowrap">SL</TableHead>
                      <TableHead className="whitespace-nowrap">Tenant Name</TableHead>
                      <TableHead className="whitespace-nowrap">Phone</TableHead>
                      <TableHead className="whitespace-nowrap">Shop Location</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Monthly Rent</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Recent Payment</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Payment Date</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rentData?.data?.map((row, idx) => (
                      <TableRow key={row.leaseId} className={row.isCommon ? 'bg-purple-50/30' : ''}>
                        <TableCell className="text-center">{idx + 1}</TableCell>
                        <TableCell className="font-medium">{row.tenantName}</TableCell>
                        <TableCell>{row.phone}</TableCell>
                        <TableCell>
                          <Badge variant={row.isCommon ? 'secondary' : 'outline'} className={row.isCommon ? 'bg-purple-100 text-purple-700' : ''}>
                            {row.shopLocation}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatValue(row.monthlyRent)}</TableCell>
                        <TableCell className="text-right text-green-600">{row.recentPaymentAmount > 0 ? formatValue(row.recentPaymentAmount) : '-'}</TableCell>
                        <TableCell className="text-center">{row.recentPaymentDate || '-'}</TableCell>
                        <TableCell className={`text-right font-medium ${row.currentOutstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatValue(row.currentOutstanding)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!rentData?.data?.length && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No data available</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  {rentData?.data?.length ? (
                    <tfoot>
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell></TableCell>
                        <TableCell>TOTAL</TableCell>
                        <TableCell>{rentData.data.length} Tenants</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right">{formatValue(rentData.totals.totalMonthlyRent)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatValue(rentData.totals.totalRecentPayments)}</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right text-red-600">{formatValue(rentData.totals.totalOutstanding)}</TableCell>
                      </TableRow>
                    </tfoot>
                  ) : null}
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {reportType === 'financial' && (
        <Card>
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <Banknote className="h-4 w-4 md:h-5 md:w-5" />
              Financial Transactions
              {(financialStartDate || financialEndDate) && (
                <span className="text-muted-foreground font-normal">
                  {financialStartDate && financialEndDate 
                    ? ` (${new Date(financialStartDate).toLocaleDateString()} - ${new Date(financialEndDate).toLocaleDateString()})`
                    : financialStartDate 
                      ? ` (From ${new Date(financialStartDate).toLocaleDateString()})`
                      : ` (Until ${new Date(financialEndDate).toLocaleDateString()})`
                  }
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 md:p-6">
            {financialLoading ? (
              <div className="p-6"><Skeleton className="h-64" /></div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">Type</TableHead>
                      <TableHead className="whitespace-nowrap">Category</TableHead>
                      <TableHead className="whitespace-nowrap">Description</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financialData?.data?.map((tx) => (
                      <TableRow key={tx.id} className={tx.isCommon ? 'bg-purple-50/30' : ''}>
                        <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={tx.type === 'deposit' ? 'default' : 'secondary'} className={tx.type === 'deposit' ? 'bg-green-600' : 'bg-red-600 text-white'}>
                            {tx.type === 'deposit' ? 'Deposit' : 'Expense'}
                          </Badge>
                        </TableCell>
                        <TableCell>{tx.category}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{tx.description}</TableCell>
                        <TableCell className={`text-right font-medium ${tx.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'deposit' ? '+' : '-'}{formatValue(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!financialData?.data?.length && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No transactions found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  {financialData?.data?.length ? (
                    <tfoot>
                      <TableRow className="bg-green-50 font-semibold">
                        <TableCell colSpan={4}>Total Deposits</TableCell>
                        <TableCell className="text-right text-green-600">+{formatValue(financialData.totals.totalDeposits)}</TableCell>
                      </TableRow>
                      <TableRow className="bg-red-50 font-semibold">
                        <TableCell colSpan={4}>Total Expenses</TableCell>
                        <TableCell className="text-right text-red-600">-{formatValue(financialData.totals.totalExpenses)}</TableCell>
                      </TableRow>
                    </tfoot>
                  ) : null}
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {reportType === 'ledger' && (
        <Card>
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <FileText className="h-4 w-4 md:h-5 md:w-5" />
              Tenant Ledger {ledgerData?.ledger?.tenant?.name ? `- ${ledgerData.ledger.tenant.name}` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 md:p-6">
            {ledgerLoading ? (
              <div className="p-6"><Skeleton className="h-64" /></div>
            ) : !selectedTenantId ? (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a tenant to view their ledger</p>
              </div>
            ) : ledgerData?.ledger?.entries?.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">Description</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Debit</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Credit</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerData.ledger.entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell className="text-right text-red-600">{entry.debit > 0 ? formatValue(entry.debit) : '-'}</TableCell>
                        <TableCell className="text-right text-green-600">{entry.credit > 0 ? formatValue(entry.credit) : '-'}</TableCell>
                        <TableCell className={`text-right font-medium ${entry.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatValue(entry.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <tfoot>
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={2}>TOTAL</TableCell>
                      <TableCell className="text-right text-red-600">{formatValue(ledgerData.ledger.totals.totalDebit)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatValue(ledgerData.ledger.totals.totalCredit)}</TableCell>
                      <TableCell className={`text-right font-bold ${ledgerData.ledger.totals.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatValue(ledgerData.ledger.totals.currentBalance)}
                      </TableCell>
                    </TableRow>
                  </tfoot>
                </Table>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No ledger entries found for this tenant</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
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
