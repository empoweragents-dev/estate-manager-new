import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Calendar,
  Store,
  User,
  CreditCard,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  DollarSign,
  LogOut,
  Building2,
  Pencil,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { Tenant, Lease, Payment, RentInvoice, Expense, Shop, Owner } from "@shared/schema";
import { formatCurrency, useCurrencyStore, getLeaseStatusColor, formatFloor } from "@/lib/currency";

interface MonthlyBreakdown {
  month: number;
  year: number;
  dueDate: string;
  rentAmount: number;
  paidAmount: number;
  outstanding: number;
  isPaid: boolean;
}

interface LeaseDetailData extends Lease {
  tenant: Tenant;
  shop: Shop & { owner: Owner | null };
  invoices: RentInvoice[];
  payments: Payment[];
  expenses: Expense[];
  monthlyBreakdown: MonthlyBreakdown[];
  summary: {
    totalInvoiced: number;
    totalPaid: number;
    totalExpenses: number;
    totalOutstanding: number;
    grandTotalOutstanding: number;
  };
}

interface SettlementDetails {
  leaseId: number;
  tenantName: string;
  shopNumber: string;
  floor: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  openingBalance: number;
  totalInvoices: number;
  totalPaid: number;
  totalDue: number;
  currentDue: number;
  securityDeposit: number;
  securityDepositUsed: number;
  finalSettledAmount: number;
  remainingSecurityDeposit: number;
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function TerminationDialog({
  lease,
  onSuccess,
}: {
  lease: LeaseDetailData;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { currency } = useCurrencyStore();
  const [isOpen, setIsOpen] = useState(false);
  const [settlement, setSettlement] = useState<SettlementDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tenantAdjustment, setTenantAdjustment] = useState<number>(0);
  const [ownerAdjustment, setOwnerAdjustment] = useState<number>(0);
  const [useSecurityDeposit, setUseSecurityDeposit] = useState(false);

  const formatValue = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) || 0 : val;
    return formatCurrency(num);
  };

  const loadSettlement = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest("GET", `/api/leases/${lease.id}/settlement`);
      const data = await response.json();
      setSettlement(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    loadSettlement();
  };

  const terminateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/leases/${lease.id}/terminate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leases/${lease.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/leases"] });
      toast({ title: "Lease terminated successfully" });
      setIsOpen(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const calculateFinalAmount = () => {
    if (!settlement) return 0;
    let amount = settlement.currentDue;
    amount += tenantAdjustment;
    amount -= ownerAdjustment;
    if (useSecurityDeposit) {
      amount = Math.max(0, amount - settlement.securityDeposit);
    }
    return amount;
  };

  const getTenantCredit = () => {
    if (!settlement) return 0;
    const finalAmount = calculateFinalAmount();
    if (finalAmount < 0) return Math.abs(finalAmount);
    return 0;
  };

  return (
    <>
      <Button
        variant="destructive"
        onClick={handleOpen}
        disabled={lease.status === 'terminated'}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Terminate Lease
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Lease Settlement & Termination
            </DialogTitle>
            <DialogDescription>
              Review the settlement summary before terminating this lease.
            </DialogDescription>
          </DialogHeader>

          {isLoading || !settlement ? (
            <div className="py-8 text-center">Loading settlement details...</div>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Lease Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tenant:</span>
                    <p className="font-medium">{settlement.tenantName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Shop:</span>
                    <p className="font-medium">{settlement.shopNumber} - {formatFloor(settlement.floor)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Period:</span>
                    <p className="font-medium">{settlement.startDate} to {settlement.endDate}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Monthly Rent:</span>
                    <p className="font-medium">{formatValue(settlement.monthlyRent)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Outstanding Dues</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Opening Balance:</span>
                    <span>{formatValue(settlement.openingBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Rent Invoiced:</span>
                    <span>{formatValue(settlement.totalInvoices)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Paid:</span>
                    <span className="text-green-600">-{formatValue(settlement.totalPaid)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Current Due (Before Adjustments):</span>
                    <span className="text-red-600">{formatValue(settlement.currentDue)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Adjustments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tenant Adjustment (Add to Due)</Label>
                      <Input
                        type="number"
                        value={tenantAdjustment}
                        onChange={(e) => setTenantAdjustment(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Owner Adjustment (Deduct from Due)</Label>
                      <Input
                        type="number"
                        value={ownerAdjustment}
                        onChange={(e) => setOwnerAdjustment(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <input
                      type="checkbox"
                      id="useSecurityDeposit"
                      checked={useSecurityDeposit}
                      onChange={(e) => setUseSecurityDeposit(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="useSecurityDeposit" className="cursor-pointer">
                      Use Security Deposit ({formatValue(settlement.securityDeposit)}) to settle dues
                    </Label>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Settlement Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Current Due:</span>
                    <span>{formatValue(settlement.currentDue)}</span>
                  </div>
                  {tenantAdjustment !== 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Tenant Adjustment:</span>
                      <span className="text-red-600">+{formatValue(tenantAdjustment)}</span>
                    </div>
                  )}
                  {ownerAdjustment !== 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Owner Adjustment:</span>
                      <span className="text-green-600">-{formatValue(ownerAdjustment)}</span>
                    </div>
                  )}
                  {useSecurityDeposit && (
                    <div className="flex justify-between text-sm">
                      <span>Security Deposit Applied:</span>
                      <span className="text-green-600">-{formatValue(Math.min(settlement.securityDeposit, settlement.currentDue + tenantAdjustment - ownerAdjustment))}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Final Settlement Amount:</span>
                    <span className={calculateFinalAmount() > 0 ? "text-red-600" : "text-green-600"}>
                      {formatValue(calculateFinalAmount())}
                    </span>
                  </div>
                  {getTenantCredit() > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Tenant Credit Balance:</span>
                      <span>{formatValue(getTenantCredit())}</span>
                    </div>
                  )}
                  {useSecurityDeposit && settlement.securityDeposit > (settlement.currentDue + tenantAdjustment - ownerAdjustment) && (
                    <div className="flex justify-between text-sm">
                      <span>Remaining Security Deposit to Return:</span>
                      <span className="text-blue-600">
                        {formatValue(settlement.securityDeposit - Math.min(settlement.securityDeposit, settlement.currentDue + tenantAdjustment - ownerAdjustment))}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => terminateMutation.mutate()}
              disabled={terminateMutation.isPending || isLoading}
            >
              {terminateMutation.isPending ? "Terminating..." : "Confirm Termination"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const editLeaseFormSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  securityDeposit: z.string().min(1, "Security deposit is required"),
  monthlyRent: z.string().min(1, "Monthly rent is required"),
  notes: z.string().optional(),
});

type EditLeaseFormData = z.infer<typeof editLeaseFormSchema>;

function EditLeaseDialog({
  lease,
  onSuccess,
}: {
  lease: LeaseDetailData;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<EditLeaseFormData>({
    resolver: zodResolver(editLeaseFormSchema),
    defaultValues: {
      startDate: lease.startDate,
      endDate: lease.endDate,
      securityDeposit: lease.securityDeposit,
      monthlyRent: lease.monthlyRent,
      notes: lease.notes || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: EditLeaseFormData) => {
      return apiRequest("PUT", `/api/leases/${lease.id}`, {
        startDate: data.startDate,
        endDate: data.endDate,
        securityDeposit: data.securityDeposit,
        monthlyRent: data.monthlyRent,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/leases/${lease.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/leases"] });
      toast({ title: "Lease updated successfully" });
      setIsOpen(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: EditLeaseFormData) => {
    mutation.mutate(data);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        disabled={lease.status === 'terminated'}
      >
        <Pencil className="h-4 w-4 mr-2" />
        Edit Lease
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Lease
            </DialogTitle>
            <DialogDescription>
              Update lease details for Shop {lease.shop?.shopNumber}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date *</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date *</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="securityDeposit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Security Deposit (BDT) *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="Advance amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="monthlyRent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Rent (BDT) *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="Monthly rent amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Additional notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function LeaseDetailPage() {
  const [, params] = useRoute("/leases/:id");
  const leaseId = params?.id;
  const { toast } = useToast();
  const { currency } = useCurrencyStore();

  const formatValue = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) || 0 : val;
    return formatCurrency(num);
  };

  const { data: lease, isLoading, error } = useQuery<LeaseDetailData>({
    queryKey: [`/api/leases/${leaseId}`],
    enabled: !!leaseId,
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
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !lease) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="font-semibold mb-2">Lease not found</h3>
            <p className="text-muted-foreground mb-4">The lease you're looking for doesn't exist.</p>
            <Link href="/leases">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Leases
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'expiring_soon': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'expired': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'terminated': return <XCircle className="h-4 w-4 text-gray-500" />;
      default: return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/leases">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">
                Lease: Shop {lease.shop?.shopNumber}
              </h1>
              <Badge className={getLeaseStatusColor(lease.status)}>
                {getStatusIcon(lease.status)}
                <span className="ml-1 capitalize">{lease.status.replace('_', ' ')}</span>
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {lease.tenant?.name} - {formatFloor(lease.shop?.floor || '')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {lease.status !== 'terminated' && (
            <>
              <EditLeaseDialog
                lease={lease}
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: [`/api/leases/${leaseId}`] });
                }}
              />
              <TerminationDialog
                lease={lease}
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: [`/api/leases/${leaseId}`] });
                }}
              />
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Lease Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{lease.startDate} to {lease.endDate}</p>
            <p className="text-sm text-muted-foreground">
              Monthly Rent: {formatValue(lease.monthlyRent)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Security Deposit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{formatValue(lease.securityDeposit)}</p>
            <p className="text-sm text-muted-foreground">
              Used: {formatValue(lease.securityDepositUsed || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-lg font-semibold ${(lease.summary?.totalOutstanding || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatValue(lease.summary?.totalOutstanding || 0)}
            </p>
            <p className="text-sm text-muted-foreground">
              Paid: {formatValue(lease.summary?.totalPaid || 0)} / {formatValue(lease.summary?.totalInvoiced || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Tenant Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <Link href={`/tenants/${lease.tenant?.id}`} className="font-medium text-primary hover:underline">
                {lease.tenant?.name}
              </Link>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone:</span>
              <span>{lease.tenant?.phone}</span>
            </div>
            {lease.tenant?.email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span>{lease.tenant?.email}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Shop Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shop:</span>
              <span className="font-medium">{lease.shop?.shopNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Floor:</span>
              <span>{formatFloor(lease.shop?.floor || '')}</span>
            </div>
            {lease.shop?.owner && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Owner:</span>
                <span>{lease.shop.owner.name}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="monthly" className="w-full">
        <TabsList>
          <TabsTrigger value="monthly">Monthly Rent Breakdown</TabsTrigger>
          <TabsTrigger value="payments">Payment History ({lease.payments.length})</TabsTrigger>
          <TabsTrigger value="expenses">Tenant Expenses ({lease.expenses.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Monthly Rent Dues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Rent Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lease.monthlyBreakdown.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {monthNames[item.month - 1]} {item.year}
                      </TableCell>
                      <TableCell>{item.dueDate}</TableCell>
                      <TableCell className="text-right">{formatValue(item.rentAmount)}</TableCell>
                      <TableCell className="text-right text-green-600">
                        {item.paidAmount > 0 ? formatValue(item.paidAmount) : '-'}
                      </TableCell>
                      <TableCell className={`text-right ${item.outstanding > 0 ? 'text-red-600 font-medium' : ''}`}>
                        {item.outstanding > 0 ? formatValue(item.outstanding) : '-'}
                      </TableCell>
                      <TableCell>
                        {item.outstanding === 0 ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Paid
                          </Badge>
                        ) : item.paidAmount > 0 ? (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            <Clock className="h-3 w-3 mr-1" />
                            Partial
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Due
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {lease.monthlyBreakdown.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No rent dues found for this lease
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lease.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.paymentDate}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {formatValue(payment.amount)}
                      </TableCell>
                      <TableCell>{payment.receiptNumber || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{payment.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {lease.payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No payments recorded for this lease
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Tenant-Related Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lease.expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{expense.expenseDate}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {expense.expenseType}
                        </Badge>
                      </TableCell>
                      <TableCell>{expense.description || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatValue(expense.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {lease.expenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No expenses recorded for this tenant
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {lease.expenses.length > 0 && (
                <div className="flex justify-end mt-4 pt-4 border-t">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Expenses</p>
                    <p className="text-lg font-semibold">{formatValue(lease.summary?.totalExpenses || 0)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {(lease.summary?.grandTotalOutstanding || 0) > 0 && (
        <Card className="border-2 border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-orange-600" />
                <div>
                  <p className="font-medium">Total Outstanding (Rent + Expenses)</p>
                  <p className="text-sm text-muted-foreground">Security deposit not applied</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {formatValue(lease.summary?.grandTotalOutstanding || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
