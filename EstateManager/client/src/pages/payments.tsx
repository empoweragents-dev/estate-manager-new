import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
import { Plus, CreditCard, User, Store, Calendar, Receipt, Trash2, Search, Building2, CheckCircle2, Circle, X } from "lucide-react";
import type { Payment, Tenant, Lease } from "@shared/schema";
import { formatCurrency, useCurrencyStore, formatShopLocation } from "@/lib/currency";

interface PaymentWithDetails extends Payment {
  tenant: Tenant;
  lease: Lease & { shop: { shopNumber: string; floor: string; subedariCategory?: string | null } };
}

interface TenantWithLeases extends Tenant {
  leases: (Lease & { shop: { shopNumber: string; floor: string; subedariCategory?: string | null } })[];
  currentDue?: number;
}

const paymentFormSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required"),
  leaseId: z.string().min(1, "Lease is required"),
  amount: z.string().min(1, "Amount is required"),
  paymentDate: z.string().min(1, "Date is required"),
  rentMonths: z.array(z.string()).min(1, "At least one rent month is required"),
  receiptNumber: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getLeaseRentMonths(leaseStartDate: string | undefined) {
  const months: { value: string; label: string }[] = [];
  if (!leaseStartDate) return months;
  
  const startDate = new Date(leaseStartDate);
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  let date = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endDate = new Date(currentYear, currentMonth, 1);
  
  while (date <= endDate) {
    const monthValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    months.push({ value: monthValue, label });
    date.setMonth(date.getMonth() + 1);
  }
  
  return months;
}

interface SearchableItem {
  id: string;
  tenantName: string;
  tenantPhone: string;
  shopNumber: string;
  floor: string;
  subedariCategory?: string | null;
  monthlyRent: string;
  leaseId: number;
  tenantId: number;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SearchableItem | null>(null);
  const [selectedRentMonths, setSelectedRentMonths] = useState<string[]>([]);

  const searchableItems: SearchableItem[] = useMemo(() => {
    const items: SearchableItem[] = [];
    tenants.forEach(tenant => {
      const activeLeases = tenant.leases?.filter(l => l.status === 'active' || l.status === 'expiring_soon') ?? [];
      activeLeases.forEach(lease => {
        items.push({
          id: `${tenant.id}-${lease.id}`,
          tenantName: tenant.name,
          tenantPhone: tenant.phone,
          shopNumber: lease.shop.shopNumber,
          floor: lease.shop.floor,
          subedariCategory: lease.shop.subedariCategory,
          monthlyRent: lease.monthlyRent,
          leaseId: lease.id,
          tenantId: tenant.id,
        });
      });
    });
    return items;
  }, [tenants]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return searchableItems.slice(0, 10);
    const query = searchQuery.toLowerCase();
    return searchableItems.filter(item =>
      item.tenantName.toLowerCase().includes(query) ||
      item.tenantPhone.includes(query) ||
      item.shopNumber.toLowerCase().includes(query) ||
      item.floor.toLowerCase().includes(query)
    ).slice(0, 10);
  }, [searchableItems, searchQuery]);

  const selectedTenant = selectedItem ? tenants.find(t => t.id === selectedItem.tenantId) : null;
  const selectedLease = selectedTenant?.leases?.find(l => l.id === selectedItem?.leaseId);
  
  const availableRentMonths = getLeaseRentMonths(selectedLease?.startDate);
  const monthlyRent = selectedLease ? parseFloat(selectedLease.monthlyRent) : 0;
  const currentDue = selectedTenant?.currentDue || 0;
  const selectedMonthsCount = selectedRentMonths.length;
  const rentForSelectedMonths = monthlyRent * selectedMonthsCount;
  const suggestedAmount = rentForSelectedMonths + currentDue;

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      tenantId: "",
      leaseId: "",
      amount: "",
      paymentDate: new Date().toISOString().split("T")[0],
      rentMonths: [],
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

  const handleSelectItem = (item: SearchableItem) => {
    setSelectedItem(item);
    setSearchQuery("");
    setShowSearchResults(false);
    setSelectedRentMonths([]);
    form.setValue("tenantId", item.tenantId.toString());
    form.setValue("leaseId", item.leaseId.toString());
    form.setValue("rentMonths", []);
    form.setValue("amount", "");
  };

  const handleClearSelection = () => {
    setSelectedItem(null);
    setSearchQuery("");
    setSelectedRentMonths([]);
    form.reset();
  };

  const mutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      return apiRequest("POST", "/api/payments", {
        tenantId: parseInt(data.tenantId),
        leaseId: parseInt(data.leaseId),
        amount: data.amount,
        paymentDate: data.paymentDate,
        rentMonths: data.rentMonths,
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

  const formatValue = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) || 0 : val;
    return formatCurrency(num, currency, exchangeRate);
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {!selectedItem ? (
          <div className="space-y-3">
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
                <Search className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">Find Tenant or Shop</h3>
              <p className="text-sm text-muted-foreground">Search by tenant name, phone, or shop number</p>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tenant name, phone, or shop number..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                className="pl-10 h-12 text-base"
              />
            </div>

            {showSearchResults && (
              <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto bg-background shadow-lg">
                {filteredItems.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <p>No results found</p>
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectItem(item)}
                      className="w-full p-3 hover:bg-muted/50 text-left transition-colors flex items-center gap-3"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.tenantName}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <span>{item.tenantPhone}</span>
                          <span className="text-muted-foreground/50">|</span>
                          <span className="flex items-center gap-1">
                            <Store className="h-3 w-3" />
                            Shop {item.shopNumber}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {formatShopLocation(item.floor, item.shopNumber, item.subedariCategory)}
                        </Badge>
                        <div className="text-sm font-medium text-primary mt-1">
                          {formatValue(parseFloat(item.monthlyRent))}/mo
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{selectedItem.tenantName}</h3>
                      <p className="text-sm text-muted-foreground">{selectedItem.tenantPhone}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="gap-1">
                          <Building2 className="h-3 w-3" />
                          {formatShopLocation(selectedItem.floor, selectedItem.shopNumber, selectedItem.subedariCategory)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelection}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Separator className="my-3" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Monthly Rent</span>
                  <span className="font-bold text-lg">{formatValue(monthlyRent)}</span>
                </div>
                {currentDue > 0 && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-muted-foreground">Outstanding Due</span>
                    <span className="font-bold text-amber-600">{formatValue(currentDue)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Select Rent Month(s)</label>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={selectAllMonths}
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
              
              <div className="border rounded-lg max-h-[200px] overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 p-2">
                  {availableRentMonths.map((month) => {
                    const isSelected = selectedRentMonths.includes(month.value);
                    return (
                      <button
                        key={month.value}
                        type="button"
                        onClick={() => toggleMonth(month.value)}
                        className={`flex items-center gap-2 p-2 rounded-lg border transition-all text-left ${
                          isSelected 
                            ? 'border-primary bg-primary/10 text-primary' 
                            : 'border-transparent hover:border-muted-foreground/20 hover:bg-muted/50'
                        }`}
                      >
                        {isSelected ? (
                          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium truncate">{month.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {selectedMonthsCount > 0 && (
                <div className="text-sm text-muted-foreground text-center">
                  {selectedMonthsCount} month(s) selected
                </div>
              )}
            </div>

            {selectedMonthsCount > 0 && (
              <Card className="bg-muted/50">
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Payment Summary</h4>
                  <div className="space-y-2">
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
                        <span className="font-bold text-xl tabular-nums text-primary">
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
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Amount (BDT)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="text-lg font-semibold h-12"
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
                    <FormLabel>Payment Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" className="h-12" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="receiptNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receipt Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Optional" />
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
                      <Input {...field} placeholder="Optional notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button 
              type="submit" 
              disabled={mutation.isPending || selectedMonthsCount === 0} 
              className="w-full h-12 text-base"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              {mutation.isPending ? "Recording Payment..." : "Record Payment"}
            </Button>
          </>
        )}
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
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Receive Payment
              </DialogTitle>
              <DialogDescription>
                Search for a tenant or shop to record a payment
              </DialogDescription>
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
