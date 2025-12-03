import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, CreditCard, User, Store, Calendar, Receipt, Trash2 } from "lucide-react";
import type { Payment, Tenant, Lease } from "@shared/schema";
import { formatCurrency, useCurrencyStore } from "@/lib/currency";

interface PaymentWithDetails extends Payment {
  tenant: Tenant;
  lease: Lease & { shop: { shopNumber: string; floor: string } };
}

interface TenantWithLeases extends Tenant {
  leases: (Lease & { shop: { shopNumber: string; floor: string } })[];
  currentDue?: number;
}

const paymentFormSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required"),
  leaseId: z.string().min(1, "Lease is required"),
  amount: z.string().min(1, "Amount is required"),
  paymentDate: z.string().min(1, "Date is required"),
  rentMonth: z.string().min(1, "Rent month is required"),
  receiptNumber: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getAvailableRentMonths() {
  const months: { value: string; label: string }[] = [];
  const currentDate = new Date();
  
  for (let i = -6; i <= 2; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
    const monthValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    months.push({ value: monthValue, label });
  }
  
  return months;
}

function PaymentForm({
  tenants,
  onSuccess,
}: {
  tenants: TenantWithLeases[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { currency, exchangeRate } = useCurrencyStore();
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>("");
  const availableRentMonths = getAvailableRentMonths();
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const selectedTenant = tenants.find(t => t.id.toString() === selectedTenantId);
  const activeLeases = selectedTenant?.leases?.filter(l => l.status === 'active' || l.status === 'expiring_soon') ?? [];
  const selectedLease = activeLeases.find(l => l.id.toString() === selectedLeaseId);
  
  const monthlyRent = selectedLease ? parseFloat(selectedLease.monthlyRent) : 0;
  const currentDue = selectedTenant?.currentDue || 0;
  const suggestedAmount = monthlyRent + currentDue;

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      tenantId: "",
      leaseId: "",
      amount: "",
      paymentDate: new Date().toISOString().split("T")[0],
      rentMonth: currentMonth,
      receiptNumber: "",
      notes: "",
    },
  });
  
  const updateAmountToSuggested = () => {
    form.setValue("amount", suggestedAmount.toString());
  };

  const mutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      return apiRequest("POST", "/api/payments", {
        tenantId: parseInt(data.tenantId),
        leaseId: parseInt(data.leaseId),
        amount: data.amount,
        paymentDate: data.paymentDate,
        rentMonth: data.rentMonth,
        receiptNumber: data.receiptNumber,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Payment recorded successfully" });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: PaymentFormData) => {
    mutation.mutate(data);
  };

  const handleTenantChange = (value: string) => {
    setSelectedTenantId(value);
    setSelectedLeaseId("");
    form.setValue("tenantId", value);
    form.setValue("leaseId", "");
    form.setValue("amount", "");
  };

  const handleLeaseChange = (value: string) => {
    setSelectedLeaseId(value);
    form.setValue("leaseId", value);
  };

  const formatValue = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) || 0 : val;
    return formatCurrency(num, currency, exchangeRate);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="tenantId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tenant *</FormLabel>
              <Select onValueChange={handleTenantChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-payment-tenant">
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id.toString()}>
                      {tenant.name} - {tenant.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="leaseId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lease *</FormLabel>
              <Select 
                onValueChange={handleLeaseChange} 
                defaultValue={field.value}
                disabled={!selectedTenantId}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-payment-lease">
                    <SelectValue placeholder={selectedTenantId ? "Select lease" : "Select a tenant first"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {activeLeases.map((lease) => (
                    <SelectItem key={lease.id} value={lease.id.toString()}>
                      Shop {lease.shop.shopNumber} - {formatValue(parseFloat(lease.monthlyRent))}/month
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedLeaseId && (
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="text-sm font-medium text-muted-foreground mb-2">Payment Calculation</div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Monthly Rent</span>
              <span className="font-medium tabular-nums">{formatValue(monthlyRent)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Outstanding Due</span>
              <span className="font-medium tabular-nums text-amber-600">{formatValue(currentDue)}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Suggested Amount</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg tabular-nums text-primary">{formatValue(suggestedAmount)}</span>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={updateAmountToSuggested}
                    className="text-xs h-7"
                  >
                    Use
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="rentMonth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rent Month *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-rent-month">
                    <SelectValue placeholder="Select rent month" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableRentMonths.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

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
                  placeholder="Enter payment amount"
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
                <Input {...field} placeholder="Additional notes" data-testid="input-payment-notes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={mutation.isPending} data-testid="button-save-payment">
            {mutation.isPending ? "Recording..." : "Record Payment"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function PaymentsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { currency, exchangeRate } = useCurrencyStore();

  const { data: payments = [], isLoading } = useQuery<PaymentWithDetails[]>({
    queryKey: ["/api/payments"],
  });

  const { data: tenants = [] } = useQuery<TenantWithLeases[]>({
    queryKey: ["/api/tenants/with-leases"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Payment deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleDialogClose = () => {
    setIsDialogOpen(false);
  };

  const formatValue = (val: number | string) => {
    const num = typeof val === "string" ? parseFloat(val) || 0 : val;
    return formatCurrency(num, currency, exchangeRate);
  };

  const totalCollected = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-60 mt-2" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <Card>
          <CardContent className="p-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Payments</h1>
          <p className="text-muted-foreground">Record and track rent payments from tenants</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-payment">
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            <PaymentForm tenants={tenants} onSuccess={handleDialogClose} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="overflow-visible">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Collected</p>
              <p className="text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatValue(totalCollected)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <CreditCard className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm">
                          {payment.receiptNumber || `PMT-${payment.id.toString().padStart(4, "0")}`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {payment.tenant?.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        Shop {payment.lease?.shop?.shopNumber}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 tabular-nums">
                        +{formatValue(payment.amount)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate max-w-[150px] block">
                        {payment.notes || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(payment.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-payment-${payment.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold mb-1">No payments recorded</h3>
              <p className="text-muted-foreground text-sm mb-4">Record your first payment from a tenant</p>
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-payment">
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
