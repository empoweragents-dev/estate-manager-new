import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FormDescription,
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
import {
  Plus,
  FileText,
  Calendar,
  Store,
  User,
  AlertTriangle,
  Eye,
} from "lucide-react";
import type { LeaseWithDetails, Tenant, ShopWithOwner } from "@shared/schema";
import { formatCurrency, useCurrencyStore, getLeaseStatusColor, formatFloor } from "@/lib/currency";

const leaseFormSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required"),
  shopId: z.string().min(1, "Shop is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  securityDeposit: z.string().min(1, "Security deposit is required"),
  monthlyRent: z.string().min(1, "Monthly rent is required"),
  openingDueBalance: z.string().default("0"),
  notes: z.string().optional(),
});

type LeaseFormData = z.infer<typeof leaseFormSchema>;

function LeaseForm({
  tenants,
  shops,
  onSuccess,
}: {
  tenants: Tenant[];
  shops: ShopWithOwner[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const { currency } = useCurrencyStore();

  const vacantShops = shops.filter((s) => s.status === "vacant");

  const form = useForm<LeaseFormData>({
    resolver: zodResolver(leaseFormSchema),
    defaultValues: {
      tenantId: "",
      shopId: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      securityDeposit: "",
      monthlyRent: "",
      openingDueBalance: "0",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: LeaseFormData) => {
      return apiRequest("POST", "/api/leases", {
        tenantId: parseInt(data.tenantId),
        shopId: parseInt(data.shopId),
        startDate: data.startDate,
        endDate: data.endDate,
        securityDeposit: data.securityDeposit,
        monthlyRent: data.monthlyRent,
        openingDueBalance: data.openingDueBalance,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shops"] });
      toast({ title: "Lease created successfully" });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: LeaseFormData) => {
    mutation.mutate(data);
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-lease-tenant">
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
          name="shopId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Shop *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-lease-shop">
                    <SelectValue placeholder="Select shop" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {vacantShops.length > 0 ? (
                    vacantShops.map((shop) => (
                      <SelectItem key={shop.id} value={shop.id.toString()}>
                        Shop {shop.shopNumber} - {formatFloor(shop.floor)}
                        {shop.squareFeet && ` (${shop.squareFeet} sq ft)`}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No vacant shops available
                    </div>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date *</FormLabel>
                <FormControl>
                  <Input {...field} type="date" data-testid="input-lease-start" />
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
                  <Input {...field} type="date" data-testid="input-lease-end" />
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
                    data-testid="input-lease-deposit"
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
                    data-testid="input-lease-rent"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
          <FormField
            control={form.control}
            name="openingDueBalance"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  Opening Due Balance (BDT)
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="text-lg font-semibold"
                    data-testid="input-lease-opening-balance"
                  />
                </FormControl>
                <FormDescription className="text-amber-600 dark:text-amber-500">
                  Enter any pre-existing debt for this specific shop/lease from before using this system.
                </FormDescription>
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
                <Input {...field} placeholder="Additional notes" data-testid="input-lease-notes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={mutation.isPending} data-testid="button-save-lease">
            {mutation.isPending ? "Creating..." : "Create Lease"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function LeasesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const { currency } = useCurrencyStore();

  const { data: leases = [], isLoading } = useQuery<LeaseWithDetails[]>({
    queryKey: ["/api/leases"],
  });

  const { data: tenants = [] } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
  });

  const { data: shops = [] } = useQuery<ShopWithOwner[]>({
    queryKey: ["/api/shops"],
  });

  const terminateMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PATCH", `/api/leases/${id}/terminate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shops"] });
      toast({ title: "Lease terminated successfully" });
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
    return formatCurrency(num);
  };

  const filteredLeases =
    statusFilter === "all"
      ? leases
      : leases.filter((lease) => lease.status === statusFilter);

  const statusCounts = {
    all: leases.length,
    active: leases.filter((l) => l.status === "active").length,
    expiring_soon: leases.filter((l) => l.status === "expiring_soon").length,
    expired: leases.filter((l) => l.status === "expired").length,
    terminated: leases.filter((l) => l.status === "terminated").length,
  };

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
        <Skeleton className="h-10 w-96" />
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
          <h1 className="text-2xl font-semibold">Leases</h1>
          <p className="text-muted-foreground">Manage lease agreements and track expiration dates</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-lease">
              <Plus className="h-4 w-4 mr-2" />
              New Lease
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Lease</DialogTitle>
            </DialogHeader>
            <LeaseForm tenants={tenants} shops={shops} onSuccess={handleDialogClose} />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all-leases">
            All ({statusCounts.all})
          </TabsTrigger>
          <TabsTrigger value="active" data-testid="tab-active-leases">
            Active ({statusCounts.active})
          </TabsTrigger>
          <TabsTrigger value="expiring_soon" data-testid="tab-expiring-leases">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Expiring Soon ({statusCounts.expiring_soon})
          </TabsTrigger>
          <TabsTrigger value="expired" data-testid="tab-expired-leases">
            Expired ({statusCounts.expired})
          </TabsTrigger>
          <TabsTrigger value="terminated" data-testid="tab-terminated-leases">
            Terminated ({statusCounts.terminated})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {filteredLeases.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agreement</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Monthly Rent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeases.map((lease) => (
                  <TableRow key={lease.id} data-testid={`row-lease-${lease.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm">LSE-{lease.id.toString().padStart(4, "0")}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{lease.tenant?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">Shop {lease.shop?.shopNumber}</span>
                          <span className="text-muted-foreground ml-2 text-sm">
                            {formatFloor(lease.shop?.floor || "")}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {new Date(lease.startDate).toLocaleDateString()} -{" "}
                          {new Date(lease.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatValue(lease.monthlyRent)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getLeaseStatusColor(lease.status)} variant="secondary">
                        {lease.status === "expiring_soon" && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {lease.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/leases/${lease.id}`}>
                          <Button variant="ghost" size="icon" data-testid={`button-view-lease-${lease.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold mb-1">No leases found</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {statusFilter === "all"
                  ? "Create your first lease agreement"
                  : `No ${statusFilter.replace("_", " ")} leases`}
              </p>
              {statusFilter === "all" && (
                <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-lease">
                  <Plus className="h-4 w-4 mr-2" />
                  New Lease
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
