import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, User, Phone, MapPin, CreditCard, Eye, Edit2, Trash2, AlertTriangle, FileText, AlertCircle, Calendar, X, Building, Upload, FileSpreadsheet, Download, CheckCircle, XCircle } from "lucide-react";
import type { TenantWithDues, Owner } from "@shared/schema";
import { formatCurrency, useCurrencyStore } from "@/lib/currency";

interface MonthlyDuesModalProps {
  tenant: TenantWithDues | null;
  isOpen: boolean;
  onClose: () => void;
}

function MonthlyDuesModal({ tenant, isOpen, onClose }: MonthlyDuesModalProps) {
  const { currency, exchangeRate } = useCurrencyStore();
  
  const formatValue = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) || 0 : val;
    return formatCurrency(num, currency, exchangeRate);
  };

  if (!tenant) return null;

  const monthlyDues = (tenant as any).monthlyDues || {};
  const sortedMonths = Object.entries(monthlyDues).sort((a, b) => b[0].localeCompare(a[0]));
  const totalMonthlyDue = sortedMonths.reduce((sum, [_, due]) => sum + (due as number), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Monthly Dues - {tenant.name}
          </DialogTitle>
          <DialogDescription>
            Detailed breakdown of rent dues by month
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {sortedMonths.length > 0 ? (
            <>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {sortedMonths.map(([month, due]) => (
                  <div key={month} className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{month}</span>
                    </div>
                    <span className="font-semibold tabular-nums text-right">{formatValue(due as number)}</span>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-3 flex items-center justify-between">
                <span className="font-semibold">Total Monthly Due</span>
                <span className="font-bold text-lg tabular-nums">{formatValue(totalMonthlyDue)}</span>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No monthly dues recorded
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const tenantFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email().optional().or(z.literal("")),
  businessName: z.string().optional(),
  nidPassport: z.string().optional(),
  permanentAddress: z.string().optional(),
  photoUrl: z.string().optional(),
  openingDueBalance: z.string().default("0"),
});

type TenantFormData = z.infer<typeof tenantFormSchema>;

function TenantForm({
  tenant,
  onSuccess,
}: {
  tenant?: TenantWithDues;
  onSuccess: () => void;
}) {
  const { toast } = useToast();

  const form = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      name: tenant?.name ?? "",
      phone: tenant?.phone ?? "",
      email: tenant?.email ?? "",
      businessName: (tenant as any)?.businessName ?? "",
      nidPassport: tenant?.nidPassport ?? "",
      permanentAddress: tenant?.permanentAddress ?? "",
      photoUrl: tenant?.photoUrl ?? "",
      openingDueBalance: tenant?.openingDueBalance ?? "0",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TenantFormData) => {
      return apiRequest("POST", "/api/tenants", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      toast({ title: "Tenant added successfully" });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: TenantFormData) => {
      return apiRequest("PATCH", `/api/tenants/${tenant?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      toast({ title: "Tenant updated successfully" });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: TenantFormData) => {
    if (tenant) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Tenant's full name" data-testid="input-tenant-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="+880 1XXX-XXXXXX" data-testid="input-tenant-phone" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="email@example.com" data-testid="input-tenant-email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="businessName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business / Shop Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. Rahman Electronics, ABC Trading" data-testid="input-tenant-business" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="nidPassport"
          render={({ field }) => (
            <FormItem>
              <FormLabel>NID / Passport Number</FormLabel>
              <FormControl>
                <Input {...field} placeholder="National ID or Passport number" data-testid="input-tenant-nid" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="permanentAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Permanent Address</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Full permanent address" className="resize-none" data-testid="input-tenant-address" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="photoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Photo URL</FormLabel>
              <FormControl>
                <Input {...field} placeholder="https://..." data-testid="input-tenant-photo" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                    data-testid="input-tenant-opening-balance"
                  />
                </FormControl>
                <FormDescription className="text-amber-600 dark:text-amber-500">
                  Enter any pre-existing debt this tenant owes from before using this system. This amount will be included in their total outstanding dues.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isPending} data-testid="button-save-tenant">
            {isPending ? "Saving..." : tenant ? "Update Tenant" : "Add Tenant"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

interface ImportResult {
  message: string;
  success: number;
  failed: number;
  errors: string[];
}

function BulkImportDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
        toast({ title: "Invalid file type", description: "Please upload an Excel file (.xlsx, .xls) or CSV", variant: "destructive" });
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/tenants/bulk-import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Import failed');
      }

      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/tenants/by-owner"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });

      if (data.success > 0) {
        toast({ title: "Import successful", description: `${data.success} tenants imported` });
      }
    } catch (error: any) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  const downloadTemplate = () => {
    const headers = ['Name', 'Phone', 'Outstanding Balance', 'Email', 'NID/Passport', 'Address'];
    const sampleData = [
      ['John Doe', '01712345678', '5000', 'john@example.com', '1234567890123', 'Dhaka, Bangladesh'],
      ['Jane Smith', '01898765432', '0', '', '', ''],
    ];
    
    const csvContent = [headers.join(','), ...sampleData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tenant_import_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Import Tenants
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file with tenant data. Required columns: Name, Phone. Optional: Outstanding Balance, Email, NID/Passport, Address.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>

          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Excel (.xlsx, .xls) or CSV files
                  </p>
                </div>
              )}
            </label>
          </div>

          {result && (
            <div className="space-y-3 p-4 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">{result.success} imported</span>
                </div>
                {result.failed > 0 && (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-4 w-4" />
                    <span className="font-medium">{result.failed} failed</span>
                  </div>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto text-sm">
                  {result.errors.map((error, i) => (
                    <p key={i} className="text-red-600">{error}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              {result ? 'Close' : 'Cancel'}
            </Button>
            {!result && (
              <Button onClick={handleUpload} disabled={!file || isUploading}>
                {isUploading ? 'Importing...' : 'Import Tenants'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TenantsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantWithDues | null>(null);
  const [monthlyDuesModalOpen, setMonthlyDuesModalOpen] = useState(false);
  const [selectedTenantForMonthly, setSelectedTenantForMonthly] = useState<TenantWithDues | null>(null);
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<number[]>([]);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { currency, exchangeRate } = useCurrencyStore();

  const { data: owners = [] } = useQuery<Owner[]>({
    queryKey: ["/api/owners"],
  });

  const ownerFilterParam = selectedOwnerIds.length > 0 ? selectedOwnerIds.join(',') : 'all';
  
  const { data: tenants = [], isLoading } = useQuery<TenantWithDues[]>({
    queryKey: ["/api/tenants/by-owner", ownerFilterParam],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/by-owner?ownerIds=${ownerFilterParam}`);
      if (!response.ok) throw new Error("Failed to fetch tenants");
      return response.json();
    },
  });

  const handleOwnerToggle = (ownerId: number) => {
    setSelectedOwnerIds(prev => 
      prev.includes(ownerId) 
        ? prev.filter(id => id !== ownerId) 
        : [...prev, ownerId]
    );
  };

  const clearOwnerFilters = () => {
    setSelectedOwnerIds([]);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/tenants/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants/by-owner"] });
      toast({ title: "Tenant deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (tenant: TenantWithDues) => {
    setEditingTenant(tenant);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingTenant(null);
  };

  const formatValue = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) || 0 : val;
    return formatCurrency(num, currency, exchangeRate);
  };

  const getDueSeverity = (currentDue: number, totalDue: number) => {
    if (currentDue === 0) return 'cleared';
    const percentage = (currentDue / totalDue) * 100;
    if (percentage >= 75) return 'critical'; // Red
    if (percentage >= 50) return 'high'; // Orange
    return 'normal'; // Yellow
  };

  const getMonthsDueCount = (monthlyDues: any) => {
    return Object.keys(monthlyDues || {}).length;
  };

  const handleViewMonthlyDues = (tenant: TenantWithDues) => {
    setSelectedTenantForMonthly(tenant);
    setMonthlyDuesModalOpen(true);
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
        <Card>
          <CardContent className="p-0">
            <div className="space-y-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Tenants</h1>
          <p className="text-muted-foreground">Manage tenant profiles and track their dues</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import Excel
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingTenant(null)} data-testid="button-add-tenant">
                <Plus className="h-4 w-4 mr-2" />
                Add Tenant
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTenant ? "Edit Tenant" : "Add New Tenant"}</DialogTitle>
                <DialogDescription>
                  {!editingTenant && "Add a new tenant profile. Don't forget to record any existing debt in the Opening Due Balance field."}
                </DialogDescription>
              </DialogHeader>
              <TenantForm tenant={editingTenant ?? undefined} onSuccess={handleDialogClose} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <BulkImportDialog isOpen={isImportDialogOpen} onClose={() => setIsImportDialogOpen(false)} />

      {/* Owner Filter Tabs - Horizontal */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={selectedOwnerIds.length === 0 ? "default" : "outline"}
          size="sm"
          onClick={clearOwnerFilters}
          className="flex items-center gap-1.5"
        >
          <Building className="h-3.5 w-3.5" />
          All Owners
        </Button>
        {owners.map((owner) => (
          <Button
            key={owner.id}
            variant={selectedOwnerIds.includes(owner.id) ? "default" : "outline"}
            size="sm"
            onClick={() => handleOwnerToggle(owner.id)}
            className="flex items-center gap-1.5"
          >
            <Building className="h-3.5 w-3.5" />
            {owner.name}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {tenants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Tenant Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Business / Shop Name</TableHead>
                  <TableHead className="text-center">Months Due</TableHead>
                  <TableHead className="text-right">Current Due</TableHead>
                  <TableHead className="w-[120px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => {
                  const severity = getDueSeverity(tenant.currentDue, tenant.totalDue);
                  const monthlyDues = (tenant as any).monthlyDues || {};
                  const monthsDueCount = getMonthsDueCount(monthlyDues);
                  
                  return (
                  <TableRow key={tenant.id} data-testid={`row-tenant-${tenant.id}`} className={severity === 'critical' ? 'bg-red-50 dark:bg-red-950/20' : severity === 'high' ? 'bg-orange-50 dark:bg-orange-950/20' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{tenant.name}</p>
                          {severity === 'critical' && <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {tenant.phone}
                      </span>
                    </TableCell>
                    <TableCell>
                      {(tenant as any).businessName ? (
                        <span className="text-sm font-medium">{(tenant as any).businessName}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {monthsDueCount > 0 ? (
                        <Badge variant="secondary" className="tabular-nums">
                          {monthsDueCount} {monthsDueCount === 1 ? 'month' : 'months'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {tenant.currentDue > 0 ? (
                        <Badge 
                          variant="destructive" 
                          className={`tabular-nums ${severity === 'critical' ? 'bg-red-600 hover:bg-red-700' : severity === 'high' ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                        >
                          {formatValue(tenant.currentDue)}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                          Cleared
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {monthsDueCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewMonthlyDues(tenant)}
                            data-testid={`button-view-monthly-dues-${tenant.id}`}
                            title="View monthly dues breakdown"
                            className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                          >
                            <Calendar className="h-4 w-4" />
                          </Button>
                        )}
                        <Link href={`/tenants/${tenant.id}`}>
                          <Button variant="ghost" size="icon" data-testid={`button-view-tenant-${tenant.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(tenant)}
                          data-testid={`button-edit-tenant-${tenant.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-delete-tenant-${tenant.id}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Tenant?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete {tenant.name}'s profile and all associated data. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(tenant.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold mb-1">No tenants yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Add your first tenant to get started</p>
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-tenant">
                <Plus className="h-4 w-4 mr-2" />
                Add Tenant
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <MonthlyDuesModal 
        tenant={selectedTenantForMonthly}
        isOpen={monthlyDuesModalOpen}
        onClose={() => {
          setMonthlyDuesModalOpen(false);
          setSelectedTenantForMonthly(null);
        }}
      />
    </div>
  );
}
