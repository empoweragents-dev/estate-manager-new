import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  Calendar,
  Receipt,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Store,
  AlertCircle,
  LogOut,
} from "lucide-react";
import type { TenantWithDues, Lease, Payment } from "@shared/schema";
import { formatCurrency, useCurrencyStore, getLeaseStatusColor, formatFloor } from "@/lib/currency";
import { useState, useEffect } from "react";

interface TenantDetailData extends TenantWithDues {
  leases: (Lease & { shop: { shopNumber: string; floor: string } })[];
  payments: Payment[];
  ledgerEntries: LedgerEntry[];
  monthlyDues?: Record<string, number>;
}

interface LedgerEntry {
  id: number;
  date: string;
  type: 'opening' | 'rent' | 'payment';
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

const paymentFormSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  paymentDate: z.string().min(1, "Date is required"),
  rentMonths: z.array(z.string()).min(1, "Please select at least one rent month"),
  leaseId: z.string().min(1, "Please select a lease"),
  receiptNumber: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getLeaseRentMonths(startDate: string | undefined) {
  if (!startDate) return [];
  
  const months: { value: string; label: string }[] = [];
  const start = new Date(startDate);
  const currentDate = new Date();
  
  let date = new Date(start.getFullYear(), start.getMonth(), 1);
  
  while (date <= currentDate) {
    const monthValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    months.push({ value: monthValue, label });
    date.setMonth(date.getMonth() + 1);
  }
  
  return months;
}

interface SettlementDetails {
  leaseId: number;
  tenantName: string;
  shopNumber: string;
  floor: string;
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

function TerminateLeaseDialog({
  lease,
  tenant,
  onSuccess,
}: {
  lease: Lease & { shop: { shopNumber: string; floor: string } };
  tenant: TenantWithDues;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { currency } = useCurrencyStore();
  const [isOpen, setIsOpen] = useState(false);
  const [settlement, setSettlement] = useState<SettlementDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [terminationNotes, setTerminationNotes] = useState('');

  const formatValue = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) || 0 : val;
    return formatCurrency(num);
  };

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setTerminationNotes('');
      apiRequest("GET", `/api/leases/${lease.id}/settlement`)
        .then((res) => res.json())
        .then((data) => {
          setSettlement(data);
          setIsLoading(false);
        })
        .catch((err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
          setIsLoading(false);
        });
    }
  }, [isOpen, lease.id]);

  const terminateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/leases/${lease.id}/terminate`, { terminationNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenant.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/leases"] });
      toast({ title: "Lease terminated successfully" });
      setIsOpen(false);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-red-600 dark:text-red-400"
        data-testid={`button-terminate-lease-${lease.id}`}
      >
        <LogOut className="h-4 w-4 mr-1" />
        Terminate
      </Button>

      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {isLoading || !settlement ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Lease Settlement & Termination
              </DialogTitle>
            </DialogHeader>
            <div className="py-8 text-center">Loading settlement details...</div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Lease Settlement & Termination
              </DialogTitle>
            </DialogHeader>
          <div className="space-y-6">
            <div className="bg-muted p-4 rounded-lg">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tenant:</span>
                  <span className="font-medium">{settlement.tenantName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shop:</span>
                  <span className="font-medium">{settlement.shopNumber} - {settlement.floor}</span>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold mb-4">Settlement Calculation</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Opening Balance</span>
                  <span className="font-medium tabular-nums">{formatValue(settlement.openingBalance)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Total Rent Invoices</span>
                  <span className="font-medium tabular-nums">{formatValue(settlement.totalInvoices)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Total Paid</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">-{formatValue(settlement.totalPaid)}</span>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md my-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Outstanding Due</span>
                  <span className={`text-lg font-bold tabular-nums ${settlement.currentDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {formatValue(settlement.currentDue)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Security Deposit Adjustment
                </h4>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-muted-foreground">Security Deposit</span>
                  <span className="tabular-nums">{formatValue(settlement.securityDeposit)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm border-t pt-1">
                  <span className="text-muted-foreground">Amount to Deduct</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">-{formatValue(settlement.securityDepositUsed)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-muted-foreground">Remaining Deposit</span>
                  <span className="font-medium tabular-nums">{formatValue(settlement.remainingSecurityDeposit)}</span>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-md">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Final Settlement Amount</span>
                  <span className={`text-lg font-bold tabular-nums ${settlement.finalSettledAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {formatValue(settlement.finalSettledAmount)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Settlement Notes</label>
                <Textarea
                  value={terminationNotes}
                  onChange={(e) => setTerminationNotes(e.target.value)}
                  placeholder="Document how both parties agreed to settle the amount (e.g., security deposit adjustment, waiver of dues, payment plan, etc.)"
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Record details of any agreements made between owner and tenant regarding final settlement.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => terminateMutation.mutate()}
                disabled={terminateMutation.isPending}
              >
                {terminateMutation.isPending ? "Terminating..." : "Confirm Termination"}
              </Button>
            </div>
          </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReceivePaymentDialog({
  tenant,
  leases,
  onSuccess,
}: {
  tenant: TenantWithDues;
  leases: (Lease & { shop: { shopNumber: string; floor: string } })[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { currency } = useCurrencyStore();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRentMonths, setSelectedRentMonths] = useState<string[]>([]);

  const activeLeases = leases.filter((l) => l.status === 'active' || l.status === 'expiring_soon');
  
  const defaultLeaseId = activeLeases.length === 1 ? activeLeases[0].id.toString() : "";
  const [currentLeaseId, setCurrentLeaseId] = useState(defaultLeaseId);
  
  const selectedLease = activeLeases.find(l => l.id.toString() === currentLeaseId);
  const availableRentMonths = getLeaseRentMonths(selectedLease?.startDate);
  
  const monthlyRent = selectedLease ? parseFloat(selectedLease.monthlyRent) : 0;
  const currentDue = tenant.currentDue || 0;
  const selectedMonthsCount = selectedRentMonths.length;
  const rentForSelectedMonths = monthlyRent * selectedMonthsCount;
  const suggestedAmount = rentForSelectedMonths + currentDue;

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: "",
      paymentDate: new Date().toISOString().split("T")[0],
      rentMonths: [],
      leaseId: defaultLeaseId,
      receiptNumber: "",
      notes: "",
    },
  });

  const updateAmountToSuggested = () => {
    form.setValue("amount", suggestedAmount.toString());
  };
  
  const toggleMonth = (monthValue: string) => {
    setSelectedRentMonths(prev => {
      const newMonths = prev.includes(monthValue)
        ? prev.filter(m => m !== monthValue)
        : [...prev, monthValue].sort();
      form.setValue("rentMonths", newMonths);
      return newMonths;
    });
  };
  
  const selectAllMonths = () => {
    const allMonths = availableRentMonths.map(m => m.value);
    setSelectedRentMonths(allMonths);
    form.setValue("rentMonths", allMonths);
  };
  
  const clearAllMonths = () => {
    setSelectedRentMonths([]);
    form.setValue("rentMonths", []);
  };

  const handleLeaseChange = (leaseId: string) => {
    setCurrentLeaseId(leaseId);
    form.setValue("leaseId", leaseId);
    setSelectedRentMonths([]);
    form.setValue("rentMonths", []);
    form.setValue("amount", "");
  };

  const mutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      return apiRequest("POST", "/api/payments", {
        tenantId: tenant.id,
        leaseId: parseInt(data.leaseId),
        amount: data.amount,
        paymentDate: data.paymentDate,
        rentMonths: data.rentMonths,
        receiptNumber: data.receiptNumber,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenant.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Payment recorded successfully" });
      setIsOpen(false);
      form.reset();
      setSelectedRentMonths([]);
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: PaymentFormData) => {
    mutation.mutate(data);
  };

  const formatValue = (val: number) => formatCurrency(val);

  if (activeLeases.length === 0) {
    return (
      <Button disabled variant="secondary">
        <CreditCard className="h-4 w-4 mr-2" />
        No Active Lease
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-receive-payment">
          <CreditCard className="h-4 w-4 mr-2" />
          Receive Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receive Payment from {tenant.name}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {activeLeases.length > 1 && (
              <FormField
                control={form.control}
                name="leaseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lease *</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        onChange={(e) => handleLeaseChange(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                        data-testid="select-payment-lease"
                      >
                        <option value="">Select lease</option>
                        {activeLeases.map((lease) => (
                          <option key={lease.id} value={lease.id}>
                            Shop {lease.shop.shopNumber} - {formatValue(parseFloat(lease.monthlyRent))}/month
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Select Rent Month(s) *</label>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={selectAllMonths}
                    disabled={!selectedLease}
                  >
                    Select All
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={clearAllMonths}
                  >
                    Clear
                  </Button>
                </div>
              </div>
              
              <div className="border rounded-lg max-h-[160px] overflow-y-auto">
                {!selectedLease ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Select a lease first
                  </div>
                ) : availableRentMonths.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No months available
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1 p-2">
                    {availableRentMonths.map((month) => {
                      const isSelected = selectedRentMonths.includes(month.value);
                      return (
                        <button
                          key={month.value}
                          type="button"
                          onClick={() => toggleMonth(month.value)}
                          className={`flex items-center gap-2 p-2 rounded-lg border transition-all text-left text-sm ${
                            isSelected 
                              ? 'border-primary bg-primary/10 text-primary' 
                              : 'border-transparent hover:border-muted-foreground/20 hover:bg-muted/50'
                          }`}
                        >
                          <span className={`h-4 w-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                          }`}>
                            {isSelected && <span className="text-white text-xs">✓</span>}
                          </span>
                          <span className="font-medium truncate">{month.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {selectedMonthsCount > 0 && (
                <div className="text-sm text-muted-foreground text-center">
                  {selectedMonthsCount} month(s) selected
                </div>
              )}
            </div>

            {selectedMonthsCount > 0 && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Payment Calculation</div>
                <div className="flex justify-between text-sm">
                  <span>Monthly Rent × {selectedMonthsCount}</span>
                  <span className="tabular-nums">{formatValue(rentForSelectedMonths)}</span>
                </div>
                {currentDue > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Outstanding Due</span>
                    <span className="tabular-nums text-amber-600">+ {formatValue(currentDue)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Amount</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg tabular-nums text-primary">
                      {formatValue(suggestedAmount)}
                    </span>
                    <Button 
                      type="button" 
                      variant="secondary" 
                      size="sm"
                      onClick={updateAmountToSuggested}
                      className="text-xs"
                    >
                      Use Amount
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Amount (BDT) *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      placeholder="Enter amount"
                      className="text-lg font-semibold"
                      data-testid="input-payment-amount"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date *</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" data-testid="input-payment-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receiptNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receipt Number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Optional receipt reference" data-testid="input-payment-receipt" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Optional notes" data-testid="input-payment-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-payment">
                {mutation.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function TenantDetailPage() {
  const [, params] = useRoute("/tenants/:id");
  const tenantId = params?.id;
  const { currency } = useCurrencyStore();

  const { data: tenant, isLoading } = useQuery<TenantDetailData>({
    queryKey: ["/api/tenants", tenantId],
    enabled: !!tenantId,
  });

  const formatValue = (val: number | string) => {
    const num = typeof val === "string" ? parseFloat(val) || 0 : val;
    return formatCurrency(num);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-8 w-60" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-semibold mb-2">Tenant not found</h2>
          <Link href="/tenants">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tenants
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link href="/tenants">
            <Button variant="ghost" size="icon" data-testid="button-back-tenants">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={tenant.photoUrl || undefined} alt={tenant.name} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {tenant.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-semibold">{tenant.name}</h1>
              <p className="text-muted-foreground">{tenant.phone}</p>
            </div>
          </div>
        </div>
        <ReceivePaymentDialog
          tenant={tenant}
          leases={tenant.leases}
          onSuccess={() => {}}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{tenant.phone}</span>
              </div>
              {tenant.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{tenant.email}</span>
                </div>
              )}
              {tenant.permanentAddress && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{tenant.permanentAddress}</span>
                </div>
              )}
              {tenant.nidPassport && (
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm">{tenant.nidPassport}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Opening Balance</span>
                <span className="font-medium tabular-nums">{formatValue(tenant.openingDueBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Rent Generated</span>
                <span className="font-medium tabular-nums">{formatValue(tenant.totalDue - parseFloat(tenant.openingDueBalance))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Paid</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                  -{formatValue(tenant.totalPaid)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="font-semibold">Current Outstanding</span>
                <span className={`text-xl font-bold tabular-nums ${tenant.currentDue > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatValue(tenant.currentDue)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Dues Breakdown - FIFO Display */}
          {(() => {
            const monthlyDues = tenant.monthlyDues || {};
            const sortedMonths = Object.entries(monthlyDues)
              .sort(([a], [b]) => {
                const [yearA, monthA] = a.split('-').map(Number);
                const [yearB, monthB] = b.split('-').map(Number);
                if (yearA !== yearB) return yearA - yearB;
                return monthA - monthB;
              });
            
            if (sortedMonths.length === 0) return null;
            
            const openingBalance = parseFloat(tenant.openingDueBalance || '0');
            let remainingPayment = tenant.totalPaid;
            
            remainingPayment -= openingBalance;
            if (remainingPayment < 0) remainingPayment = 0;
            
            const monthsWithStatus = sortedMonths.map(([monthKey, amount]) => {
              const [year, month] = monthKey.split('-').map(Number);
              const monthAmount = amount as number;
              const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
              
              let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
              let paidAmount = 0;
              
              if (remainingPayment >= monthAmount) {
                status = 'paid';
                paidAmount = monthAmount;
                remainingPayment -= monthAmount;
              } else if (remainingPayment > 0) {
                status = 'partial';
                paidAmount = remainingPayment;
                remainingPayment = 0;
              }
              
              return { monthKey, monthName, amount: monthAmount, status, paidAmount, dueAmount: monthAmount - paidAmount };
            });
            
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Monthly Dues (FIFO)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {openingBalance > 0 && (
                    <div className="mb-3 p-2 rounded bg-muted/50 flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Opening Balance</span>
                      <Badge variant={tenant.totalPaid >= openingBalance ? "default" : "destructive"} className={tenant.totalPaid >= openingBalance ? "bg-emerald-500" : ""}>
                        {tenant.totalPaid >= openingBalance ? 'Paid' : formatValue(openingBalance)}
                      </Badge>
                    </div>
                  )}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {monthsWithStatus.map(({ monthKey, monthName, amount, status, paidAmount, dueAmount }) => (
                      <div key={monthKey} className="flex justify-between items-center p-2 rounded bg-muted/30">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{monthName}</span>
                          <span className="text-xs text-muted-foreground">{formatValue(amount)}</span>
                        </div>
                        {status === 'paid' && (
                          <Badge className="bg-emerald-500 text-white">Paid</Badge>
                        )}
                        {status === 'partial' && (
                          <Badge variant="outline" className="text-amber-600 border-amber-400">
                            Due: {formatValue(dueAmount)}
                          </Badge>
                        )}
                        {status === 'unpaid' && (
                          <Badge variant="destructive">Due: {formatValue(dueAmount)}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="h-4 w-4" />
                Active Leases
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tenant.leases && tenant.leases.length > 0 ? (
                <div className="space-y-3">
                  {tenant.leases.map((lease) => (
                    <Link key={lease.id} href={`/leases/${lease.id}`}>
                      <div className="p-3 rounded-md bg-muted/50 hover-elevate cursor-pointer transition-all duration-200 hover:bg-muted/80 hover:shadow-md" data-testid={`lease-card-${lease.id}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-primary hover:underline">Shop {lease.shop.shopNumber}</span>
                          <Badge className={getLeaseStatusColor(lease.status)} variant="secondary">
                            {lease.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span>{formatFloor(lease.shop.floor)}</span>
                          <span className="mx-2">|</span>
                          <span>{formatValue(parseFloat(lease.monthlyRent))}/month</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(lease.startDate).toLocaleDateString()} - {new Date(lease.endDate).toLocaleDateString()}
                        </div>
                        {(lease.status === 'active' || lease.status === 'expiring_soon' || lease.status === 'expired') && (
                          <div className="mt-3 pt-3 border-t flex justify-end" onClick={(e) => e.preventDefault()}>
                            <TerminateLeaseDialog lease={lease} tenant={tenant} onSuccess={() => {}} />
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No active leases</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Tenant Ledger
              </CardTitle>
              <Badge variant="outline">
                {tenant.ledgerEntries?.length ?? 0} entries
              </Badge>
            </CardHeader>
            <CardContent>
              {tenant.ledgerEntries && tenant.ledgerEntries.length > 0 ? (
                <div className="space-y-1">
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider py-2 border-b">
                    <div className="col-span-2">Date</div>
                    <div className="col-span-5">Description</div>
                    <div className="col-span-2 text-right">Debit</div>
                    <div className="col-span-2 text-right">Credit</div>
                    <div className="col-span-1 text-right">Balance</div>
                  </div>
                  {tenant.ledgerEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="grid grid-cols-12 gap-2 py-3 border-b border-dashed last:border-0 items-center text-sm"
                      data-testid={`ledger-entry-${entry.id}`}
                    >
                      <div className="col-span-2 text-muted-foreground">
                        {new Date(entry.date).toLocaleDateString()}
                      </div>
                      <div className="col-span-5 flex items-center gap-2">
                        {entry.type === "rent" && <ArrowUpRight className="h-4 w-4 text-amber-500" />}
                        {entry.type === "payment" && <ArrowDownRight className="h-4 w-4 text-emerald-500" />}
                        {entry.type === "opening" && <FileText className="h-4 w-4 text-blue-500" />}
                        <span className="truncate">{entry.description}</span>
                      </div>
                      <div className="col-span-2 text-right tabular-nums">
                        {entry.debit > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            {formatValue(entry.debit)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </div>
                      <div className="col-span-2 text-right tabular-nums">
                        {entry.credit > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {formatValue(entry.credit)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </div>
                      <div className="col-span-1 text-right font-medium tabular-nums">
                        {formatValue(entry.balance)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No ledger entries yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
