import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EditPaymentDialog } from "@/components/edit-payment-dialog";
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
import { Plus, CreditCard, User, Store, Calendar, Receipt, Trash2, Search, Building2, CheckCircle2, Circle, X, Filter, ChevronDown, ChevronUp, AlertCircle, Info, Pencil } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Payment, Tenant, Lease, Owner } from "@shared/schema";
import { formatCurrency, useCurrencyStore } from "@/lib/currency";

interface PaymentWithDetails extends Payment {
  tenant: Tenant;
  lease: Lease & { shop: { shopNumber: string; floor: string; subedariCategory?: string | null; ownerId?: number | null; ownershipType?: string | null } };
}

export interface TenantWithLeases extends Tenant {
  leases: (Lease & { shop: { shopNumber: string; floor: string; subedariCategory?: string | null } })[];
  currentDue?: number;
}

interface PaymentFormMonth {
  year: number;
  month: number;
  label: string;
  rent: number;
  isPaid: boolean;
  paidAmount: number;
  remainingBalance: number;
  paymentDates: string[];
  isPast: boolean;
  isCurrent: boolean;
  isFuture: boolean;
}

interface PaymentFormData {
  leaseId: number;
  tenantId: number;
  tenantName: string;
  currentRent: number;
  openingBalance: number;
  openingBalanceRemaining: number;
  outstandingBalance: number;
  totalPaid: number;
  months: PaymentFormMonth[];
}

const paymentFormSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required"),
  leaseId: z.string().min(1, "Lease is required"),
  amount: z.string().min(1, "Amount is required"),
  paymentDate: z.string().min(1, "Date is required"),
  rentMonths: z.array(z.string()).min(1, "At least one rent month is required"),
  receiptNumber: z.string().optional(),
  notes: z.string().optional(),
  includeArrears: z.boolean().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

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

export function PaymentForm({
  tenants,
  onSuccess,
}: {
  tenants: TenantWithLeases[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { currency } = useCurrencyStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SearchableItem | null>(null);
  const [selectedRentMonths, setSelectedRentMonths] = useState<string[]>([]);
  const [showFutureMonths, setShowFutureMonths] = useState(false);
  const [includeArrears, setIncludeArrears] = useState(false);

  const searchableItems: SearchableItem[] = useMemo(() => {
    const items: SearchableItem[] = [];
    tenants.forEach(tenant => {
      const activeLeases = tenant.leases?.filter(l => l.status === 'active' || l.status === 'expiring_soon' || l.status === 'expired') ?? [];
      activeLeases.forEach(lease => {
        items.push({
          id: `${tenant.id}-${lease.id}`,
          tenantName: tenant.name,
          tenantPhone: tenant.phone,
          shopNumber: lease.shop?.shopNumber || 'N/A',
          floor: lease.shop?.floor || 'Ground',
          subedariCategory: lease.shop?.subedariCategory,
          monthlyRent: lease.monthlyRent,
          leaseId: lease.id,
          tenantId: tenant.id,
        });
      });
    });
    const floorOrder: Record<string, number> = { ground: 1, first: 2, second: 3, subedari: 4 };
    const prefixOrder: Record<string, number> = { E: 1, M: 2, W: 3 };
    const extractShopPrefix = (shopNumber: string): string => {
      const match = shopNumber.match(/^([EMW])/i);
      return match ? match[1].toUpperCase() : 'Z';
    };
    const extractShopNumber = (shopNumber: string): number => {
      const match = shopNumber.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 999;
    };
    items.sort((a, b) => {
      const floorOrderA = floorOrder[a.floor] || 999;
      const floorOrderB = floorOrder[b.floor] || 999;
      if (floorOrderA !== floorOrderB) return floorOrderA - floorOrderB;
      const prefixA = extractShopPrefix(a.shopNumber || '');
      const prefixB = extractShopPrefix(b.shopNumber || '');
      const prefixOrderA = prefixOrder[prefixA] || 999;
      const prefixOrderB = prefixOrder[prefixB] || 999;
      if (prefixOrderA !== prefixOrderB) return prefixOrderA - prefixOrderB;
      const numA = extractShopNumber(a.shopNumber || '');
      const numB = extractShopNumber(b.shopNumber || '');
      return numA - numB;
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

  const { data: paymentFormData, isLoading: isLoadingFormData } = useQuery<PaymentFormData>({
    queryKey: ["/api/leases", selectedItem?.leaseId, "payment-form-data"],
    queryFn: async () => {
      const response = await fetch(`/api/leases/${selectedItem?.leaseId}/payment-form-data`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch payment form data');
      return response.json();
    },
    enabled: !!selectedItem?.leaseId,
    staleTime: 30000,
  });

  const visibleMonths = useMemo(() => {
    if (!paymentFormData?.months) return [];
    const months = paymentFormData.months;

    if (showFutureMonths) {
      return months.filter(m => !m.isPaid);
    }

    return months.filter(m => {
      if (m.isPaid) return false;
      if (m.isFuture) return false;
      return true;
    });
  }, [paymentFormData?.months, showFutureMonths]);

  const futureMonths = useMemo(() => {
    if (!paymentFormData?.months) return [];
    return paymentFormData.months.filter(m => m.isFuture && !m.isPaid);
  }, [paymentFormData?.months]);

  const selectedMonthsRent = useMemo(() => {
    if (!paymentFormData?.months) return 0;
    return selectedRentMonths.reduce((sum, monthValue) => {
      const [year, month] = monthValue.split('-').map(Number);
      const monthData = paymentFormData.months.find(m => m.year === year && m.month === month);
      // Use remainingBalance for partial payments, otherwise full rent
      return sum + (monthData?.remainingBalance ?? monthData?.rent ?? 0);
    }, 0);
  }, [selectedRentMonths, paymentFormData?.months]);

  const openingBalanceRemaining = paymentFormData?.openingBalanceRemaining || 0;
  const arrearsAmount = includeArrears ? openingBalanceRemaining : 0;
  const suggestedAmount = selectedMonthsRent + arrearsAmount;

  // Check if any selected months have partial payments
  const hasPartialPayments = useMemo(() => {
    if (!paymentFormData?.months) return false;
    return selectedRentMonths.some(monthValue => {
      const [year, month] = monthValue.split('-').map(Number);
      const monthData = paymentFormData.months.find(m => m.year === year && m.month === month);
      return monthData && monthData.paidAmount > 0 && !monthData.isPaid;
    });
  }, [selectedRentMonths, paymentFormData?.months]);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      tenantId: "",
      leaseId: "",
      amount: "",
      paymentDate: new Date().toISOString().split("T")[0],
      rentMonths: [],
      receiptNumber: "",
      notes: "",
      includeArrears: false,
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

  const selectAllVisibleMonths = () => {
    const allMonths = visibleMonths.map(m => `${m.year}-${String(m.month).padStart(2, '0')}`);
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
    setShowFutureMonths(false);
    setIncludeArrears(false);
    form.setValue("tenantId", item.tenantId.toString());
    form.setValue("leaseId", item.leaseId.toString());
    form.setValue("rentMonths", []);
    form.setValue("amount", "");
    form.setValue("includeArrears", false);
  };

  const handleClearSelection = () => {
    setSelectedItem(null);
    setSearchQuery("");
    setSelectedRentMonths([]);
    setShowFutureMonths(false);
    setIncludeArrears(false);
    form.reset();
  };

  const mutation = useMutation({
    mutationFn: async (data: PaymentFormValues) => {
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
      queryClient.invalidateQueries({ queryKey: ["/api/leases", selectedItem?.leaseId, "payment-form-data"] });
      toast({ title: "Payment recorded successfully" });
      handleClearSelection();
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: PaymentFormValues) => {
    mutation.mutate(data);
  };

  const formatValue = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) || 0 : val;
    return formatCurrency(num);
  };

  const floorLabels: Record<string, string> = {
    ground: "Ground Floor",
    first: "1st Floor",
    second: "2nd Floor",
    subedari: "Subedari",
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
                        <Link href={`/tenants/${item.tenantId}`} className="font-medium truncate hover:underline hover:text-primary">{item.tenantName}</Link>
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
                          {floorLabels[item.floor] || item.floor}
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
                      <Link href={`/tenants/${selectedItem.tenantId}`} className="font-semibold text-lg hover:underline hover:text-primary">{selectedItem.tenantName}</Link>
                      <p className="text-sm text-muted-foreground">{selectedItem.tenantPhone}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="gap-1">
                          <Building2 className="h-3 w-3" />
                          Shop {selectedItem.shopNumber}
                        </Badge>
                        <Badge variant="outline">
                          {floorLabels[selectedItem.floor] || selectedItem.floor}
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
                  <span className="text-sm text-muted-foreground">Current Monthly Rent</span>
                  <span className="font-bold text-lg">{formatValue(paymentFormData?.currentRent || 0)}</span>
                </div>
                {openingBalanceRemaining > 0 && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-amber-600" />
                      Opening Balance Due
                    </span>
                    <span className="font-bold text-amber-600">{formatValue(openingBalanceRemaining)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {isLoadingFormData ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <>
                {openingBalanceRemaining > 0 && (
                  <div className="flex items-center space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <Checkbox
                      id="includeArrears"
                      checked={includeArrears}
                      onCheckedChange={(checked) => {
                        setIncludeArrears(checked === true);
                        form.setValue("includeArrears", checked === true);
                      }}
                    />
                    <label
                      htmlFor="includeArrears"
                      className="text-sm font-medium cursor-pointer flex-1"
                    >
                      Include opening balance due ({formatValue(openingBalanceRemaining)})
                    </label>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Select Rent Month(s)</label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={selectAllVisibleMonths}
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
                    {visibleMonths.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <p className="text-sm">No unpaid months available</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-2">
                        {visibleMonths.map((month) => {
                          const monthValue = `${month.year}-${String(month.month).padStart(2, '0')}`;
                          const isSelected = selectedRentMonths.includes(monthValue);
                          return (
                            <button
                              key={monthValue}
                              type="button"
                              onClick={() => toggleMonth(monthValue)}
                              className={`flex items-center justify-between gap-2 p-2 rounded-lg border transition-all text-left ${isSelected
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-transparent hover:border-muted-foreground/20 hover:bg-muted/50'
                                }`}
                            >
                              <div className="flex items-center gap-2">
                                {isSelected ? (
                                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                                ) : (
                                  <Circle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                )}
                                <span className="text-sm font-medium">{month.label}</span>
                                {month.isPast && !month.isPaid && (
                                  <Badge variant="destructive" className="text-[10px] px-1 py-0">Overdue</Badge>
                                )}
                                {month.isCurrent && (
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0">Current</Badge>
                                )}
                                {month.isFuture && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">Advance</Badge>
                                )}
                                {month.paidAmount > 0 && !month.isPaid && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-500 text-amber-600">Partial</Badge>
                                )}
                              </div>
                              <div className="text-right">
                                {month.paidAmount > 0 && !month.isPaid ? (
                                  <div className="flex flex-col items-end">
                                    <span className="text-sm font-semibold tabular-nums text-amber-600">{formatValue(month.remainingBalance)}</span>
                                    <span className="text-[10px] text-muted-foreground tabular-nums">{formatValue(month.paidAmount)} / {formatValue(month.rent)} paid</span>
                                  </div>
                                ) : (
                                  <span className="text-sm font-semibold tabular-nums">{formatValue(month.rent)}</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {futureMonths.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFutureMonths(!showFutureMonths)}
                      className="w-full text-xs gap-1"
                    >
                      {showFutureMonths ? (
                        <>
                          <ChevronUp className="h-3 w-3" />
                          Hide Future Months
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" />
                          Show {futureMonths.length} Future Month(s) for Advance Payment
                        </>
                      )}
                    </Button>
                  )}

                  {selectedRentMonths.length > 0 && (
                    <div className="text-sm text-muted-foreground text-center">
                      {selectedRentMonths.length} month(s) selected
                    </div>
                  )}
                </div>

                {(selectedRentMonths.length > 0 || includeArrears) && (
                  <Card className="bg-muted/50">
                    <CardContent className="p-4 space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground">Payment Summary</h4>
                      <div className="space-y-2">
                        {selectedRentMonths.length > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>
                              {hasPartialPayments
                                ? `Remaining balance for ${selectedRentMonths.length} month(s)`
                                : `Rent for ${selectedRentMonths.length} month(s)`
                              }
                            </span>
                            <span className="tabular-nums">{formatValue(selectedMonthsRent)}</span>
                          </div>
                        )}
                        {includeArrears && openingBalanceRemaining > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Opening Balance Due</span>
                            <span className="tabular-nums text-amber-600">+ {formatValue(openingBalanceRemaining)}</span>
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
              </>
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
              disabled={mutation.isPending || (selectedRentMonths.length === 0 && !includeArrears)}
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<PaymentWithDetails | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deletionDate, setDeletionDate] = useState(new Date().toISOString().split("T")[0]);
  const { toast } = useToast();
  const { currency } = useCurrencyStore();

  const { data: payments = [], isLoading, isError, error } = useQuery<PaymentWithDetails[]>({
    queryKey: ["/api/payments"],
  });

  const { data: tenants = [] } = useQuery<TenantWithLeases[]>({
    queryKey: ["/api/tenants/with-leases"],
  });

  const { data: owners = [] } = useQuery<Owner[]>({
    queryKey: ["/api/owners"],
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, reason, deletionDate }: { id: number; reason: string; deletionDate?: string; tenantId: number; leaseId: number; ownerId?: number | null }) => {
      return apiRequest("DELETE", `/api/payments/${id}`, { reason, deletionDate });
    },
    onSuccess: (_, variables) => {
      // Helper function to check if query key matches a base path
      const queryKeyMatchesPath = (queryKey: readonly unknown[], basePath: string): boolean => {
        const firstKey = queryKey[0];
        if (typeof firstKey !== 'string') return false;
        // Match both "/api/owners" and "/api/owners/..." style keys
        return firstKey === basePath || firstKey.startsWith(basePath + '/');
      };

      // Force immediate refetch with refetchType: 'all' since staleTime is Infinity
      // Invalidate all payment-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/payments"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["/api/rent-invoices"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"], refetchType: 'all' });

      // Invalidate all owner-related queries (list, detail, top-outstandings, etc.)
      queryClient.invalidateQueries({
        predicate: (query) => queryKeyMatchesPath(query.queryKey, '/api/owners'),
        refetchType: 'all'
      });

      // Invalidate all tenant-related queries (list, detail, ledger, etc.)
      queryClient.invalidateQueries({
        predicate: (query) => queryKeyMatchesPath(query.queryKey, '/api/tenants'),
        refetchType: 'all'
      });

      // Invalidate all lease-related queries (list, detail, breakdown, etc.)
      queryClient.invalidateQueries({
        predicate: (query) => queryKeyMatchesPath(query.queryKey, '/api/leases'),
        refetchType: 'all'
      });

      toast({ title: "Payment deleted successfully" });
      setDeleteDialogOpen(false);
      setPaymentToDelete(null);
      setDeleteReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleDeleteClick = (payment: PaymentWithDetails) => {
    setPaymentToDelete(payment);
    setDeleteReason("");
    setDeletionDate(new Date().toISOString().split("T")[0]);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (paymentToDelete && deleteReason.trim()) {
      deleteMutation.mutate({
        id: paymentToDelete.id,
        reason: deleteReason.trim(),
        deletionDate: deletionDate,
        tenantId: paymentToDelete.tenantId,
        leaseId: paymentToDelete.leaseId,
      });
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
  };

  const formatValue = (val: number | string) => {
    const num = typeof val === "string" ? parseFloat(val) || 0 : val;
    return formatCurrency(num);
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedOwnerId("all");
    setSearchQuery("");
  };

  const hasActiveFilters = startDate || endDate || selectedOwnerId !== "all" || searchQuery;

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const paymentDate = new Date(payment.paymentDate);

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const tenantName = payment.tenant?.name?.toLowerCase() || "";
        const shopNumber = payment.lease?.shop?.shopNumber?.toLowerCase() || "";
        if (!tenantName.includes(query) && !shopNumber.includes(query)) {
          return false;
        }
      }

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (paymentDate < start) return false;
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (paymentDate > end) return false;
      }

      if (selectedOwnerId !== "all") {
        const shop = payment.lease?.shop;
        if (!shop) return false;

        if (shop.ownershipType === "common") {
          return true;
        }

        if (shop.ownerId !== parseInt(selectedOwnerId)) {
          return false;
        }
      }

      return true;
    });
  }, [payments, startDate, endDate, selectedOwnerId, searchQuery]);

  const activePayments = filteredPayments.filter(p => !p.isDeleted);
  const totalCollected = activePayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

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

  if (isError) {
    return (
      <div className="p-6">
        <div className="bg-destructive/15 text-destructive p-4 rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <div>
            <p className="font-medium">Failed to load payments</p>
            <p className="text-sm">{error instanceof Error ? error.message : "Checking authentication..."}</p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex bg-background border rounded-md overflow-hidden max-w-sm w-full md:w-auto">
          <div className="pl-3 flex items-center justify-center text-muted-foreground">
            <Search className="h-4 w-4" />
          </div>
          <Input
            placeholder="Search payments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 focus-visible:ring-0"
          />
        </div>
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
            <PaymentForm tenants={tenants} onSuccess={() => { }} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">From:</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[140px] h-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">To:</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[140px] h-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">Owner:</label>
              <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="All Owners" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Owners</SelectItem>
                  {owners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id.toString()}>
                      {owner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-visible">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Total Collected {hasActiveFilters && "(Filtered)"}
              </p>
              <p className="text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatValue(totalCollected)}
              </p>
              {hasActiveFilters && (
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredPayments.length} of {payments.length} payments
                </p>
              )}
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <CreditCard className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filteredPayments.length > 0 ? (
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
                {filteredPayments.map((payment) => {
                  const isDeleted = payment.isDeleted;
                  const rowClasses = isDeleted
                    ? "opacity-60 bg-muted/30"
                    : "";
                  const textClasses = isDeleted
                    ? "line-through text-muted-foreground"
                    : "";

                  return (
                    <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`} className={rowClasses}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Receipt className={`h-4 w-4 ${isDeleted ? 'text-muted-foreground/50' : 'text-muted-foreground'}`} />
                          <span className={`font-mono text-sm ${textClasses}`}>
                            {payment.receiptNumber || `PMT-${payment.id.toString().padStart(4, "0")}`}
                          </span>
                          {isDeleted && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1">
                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                      Voided
                                    </Badge>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-[300px]">
                                  <div className="space-y-1 text-xs">
                                    <p><strong>Deleted:</strong> {payment.deletedAt ? new Date(payment.deletedAt).toLocaleString() : 'Unknown'}</p>
                                    <p><strong>Reason:</strong> {payment.deletionReason || 'No reason provided'}</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 text-sm ${textClasses}`}>
                          <Calendar className={`h-4 w-4 ${isDeleted ? 'text-muted-foreground/50' : 'text-muted-foreground'}`} />
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-2 ${textClasses}`}>
                          <User className={`h-4 w-4 ${isDeleted ? 'text-muted-foreground/50' : 'text-muted-foreground'}`} />
                          {payment.tenant?.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-2 ${textClasses}`}>
                          <Store className={`h-4 w-4 ${isDeleted ? 'text-muted-foreground/50' : 'text-muted-foreground'}`} />
                          Shop {payment.lease?.shop?.shopNumber}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className={isDeleted
                          ? "bg-gray-100 text-gray-500 dark:bg-gray-800/30 dark:text-gray-500 tabular-nums line-through"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 tabular-nums"
                        }>
                          {isDeleted ? '' : '+'}{formatValue(payment.amount)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm truncate max-w-[150px] block ${isDeleted ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                          {payment.notes || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {!isDeleted && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(payment)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-payment-${payment.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                        {!isDeleted && (
                          <div className="inline-block">
                            <EditPaymentDialog
                              payment={{
                                id: payment.id,
                                amount: parseFloat(payment.amount),
                                paymentDate: payment.paymentDate,
                                rentMonths: payment.rentMonths || null,
                                notes: payment.notes || "",
                                receiptNumber: payment.receiptNumber || "",
                              }}
                              trigger={
                                <Button variant="ghost" size="icon">
                                  <Pencil className="h-4 w-4 text-primary" />
                                </Button>
                              }
                            />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : hasActiveFilters ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Filter className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold mb-1">No matching payments</h3>
              <p className="text-muted-foreground text-sm mb-4">Try adjusting your filters</p>
              <Button variant="outline" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Record</AlertDialogTitle>
            <AlertDialogDescription>
              {paymentToDelete && (
                <div className="space-y-2 mt-2">
                  <p>Are you sure you want to delete this payment?</p>
                  <div className="bg-muted p-3 rounded-md text-sm">
                    <p><strong>Receipt:</strong> {paymentToDelete.receiptNumber || `PMT-${paymentToDelete.id.toString().padStart(4, "0")}`}</p>
                    <p><strong>Amount:</strong> {formatValue(paymentToDelete.amount)}</p>
                    <p><strong>Date:</strong> {new Date(paymentToDelete.paymentDate).toLocaleDateString()}</p>
                    <p><strong>Tenant:</strong> {paymentToDelete.tenant?.name}</p>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Deletion Date</label>
              <Input
                type="date"
                value={deletionDate}
                onChange={(e) => setDeletionDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for deletion <span className="text-destructive">*</span></label>
              <Textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Please provide a reason for deleting this payment record..."
                className="min-h-[80px]"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={!deleteReason.trim() || deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Payment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
