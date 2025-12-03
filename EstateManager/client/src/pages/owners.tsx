import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Users, Building2, Phone, Mail, CreditCard, Edit2 } from "lucide-react";
import type { Owner } from "@shared/schema";
import { formatCurrency, useCurrencyStore } from "@/lib/currency";

const ownerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankBranch: z.string().optional(),
});

type OwnerFormData = z.infer<typeof ownerFormSchema>;

interface OwnerWithStats extends Owner {
  shopCount: number;
  totalCollected: number;
}

function OwnerForm({
  owner,
  onSuccess,
}: {
  owner?: Owner;
  onSuccess: () => void;
}) {
  const { toast } = useToast();

  const form = useForm<OwnerFormData>({
    resolver: zodResolver(ownerFormSchema),
    defaultValues: {
      name: owner?.name ?? "",
      phone: owner?.phone ?? "",
      email: owner?.email ?? "",
      address: owner?.address ?? "",
      bankName: owner?.bankName ?? "",
      bankAccountNumber: owner?.bankAccountNumber ?? "",
      bankBranch: owner?.bankBranch ?? "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: OwnerFormData) => {
      return apiRequest("POST", "/api/owners", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owners"] });
      toast({ title: "Owner created successfully" });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: OwnerFormData) => {
      return apiRequest("PATCH", `/api/owners/${owner?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owners"] });
      toast({ title: "Owner updated successfully" });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: OwnerFormData) => {
    if (owner) {
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
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Owner name" data-testid="input-owner-name" />
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
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="+880 1XXX-XXXXXX" data-testid="input-owner-phone" />
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
                  <Input {...field} type="email" placeholder="email@example.com" data-testid="input-owner-email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Full address" data-testid="input-owner-address" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border-t pt-4 mt-4">
          <h4 className="text-sm font-medium mb-4">Bank Information</h4>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Bank name" data-testid="input-owner-bank-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bankBranch"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Branch name" data-testid="input-owner-bank-branch" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="bankAccountNumber"
            render={({ field }) => (
              <FormItem className="mt-4">
                <FormLabel>Account Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Account number" data-testid="input-owner-account-number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isPending} data-testid="button-save-owner">
            {isPending ? "Saving..." : owner ? "Update Owner" : "Add Owner"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function OwnersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const { toast } = useToast();
  const { currency, exchangeRate } = useCurrencyStore();

  const { data: owners = [], isLoading } = useQuery<OwnerWithStats[]>({
    queryKey: ["/api/owners"],
  });

  const handleEdit = (owner: Owner) => {
    setEditingOwner(owner);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingOwner(null);
  };

  const formatValue = (val: number) => formatCurrency(val, currency, exchangeRate);

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
          <CardContent className="p-6">
            <div className="space-y-4">
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
          <h1 className="text-2xl font-semibold">Owners</h1>
          <p className="text-muted-foreground">Manage property owners and their bank details</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingOwner(null)} data-testid="button-add-owner">
              <Plus className="h-4 w-4 mr-2" />
              Add Owner
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingOwner ? "Edit Owner" : "Add New Owner"}</DialogTitle>
            </DialogHeader>
            <OwnerForm owner={editingOwner ?? undefined} onSuccess={handleDialogClose} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {owners.map((owner) => (
          <Card key={owner.id} className="overflow-visible" data-testid={`card-owner-${owner.id}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    {owner.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <Link href={`/owners/${owner.id}`}>
                      <h3 className="font-semibold truncate text-primary hover:underline cursor-pointer">
                        {owner.name}
                      </h3>
                    </Link>
                    {owner.phone && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{owner.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(owner)}
                  data-testid={`button-edit-owner-${owner.id}`}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3">
                {owner.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{owner.email}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Building2 className="h-3 w-3" />
                    {owner.shopCount ?? 0} Shops
                  </Badge>
                </div>

                {owner.bankName && (
                  <div className="pt-3 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span>{owner.bankName}</span>
                      {owner.bankBranch && <span className="text-muted-foreground">- {owner.bankBranch}</span>}
                    </div>
                    {owner.bankAccountNumber && (
                      <p className="text-sm text-muted-foreground mt-1 ml-6 font-mono">
                        {owner.bankAccountNumber}
                      </p>
                    )}
                  </div>
                )}

                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Collected</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatValue(owner.totalCollected ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {owners.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold mb-1">No owners yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Add your first property owner to get started</p>
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-owner">
                <Plus className="h-4 w-4 mr-2" />
                Add Owner
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
