import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
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
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Store, Edit2, Trash2, Users, Building2, Layers } from "lucide-react";
import type { Owner, ShopWithOwner } from "@shared/schema";
import { formatFloor, getShopStatusColor } from "@/lib/currency";

const shopFormSchema = z.object({
  shopNumber: z.string().min(1, "Shop number is required"),
  floor: z.enum(["ground", "first", "second"]),
  status: z.enum(["vacant", "occupied"]),
  ownershipType: z.enum(["sole", "common"]),
  ownerId: z.string().optional(),
  description: z.string().optional(),
});

type ShopFormData = z.infer<typeof shopFormSchema>;

function ShopForm({
  shop,
  owners,
  onSuccess,
}: {
  shop?: ShopWithOwner;
  owners: Owner[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();

  const form = useForm<ShopFormData>({
    resolver: zodResolver(shopFormSchema),
    defaultValues: {
      shopNumber: shop?.shopNumber ?? "",
      floor: (shop?.floor as "ground" | "first" | "second") ?? "ground",
      status: (shop?.status as "vacant" | "occupied") ?? "vacant",
      ownershipType: (shop?.ownershipType as "sole" | "common") ?? "sole",
      ownerId: shop?.ownerId?.toString() ?? "",
      description: shop?.description ?? "",
    },
  });

  const ownershipType = form.watch("ownershipType");

  const createMutation = useMutation({
    mutationFn: async (data: ShopFormData) => {
      const payload = {
        ...data,
        ownerId: data.ownershipType === "common" ? null : data.ownerId ? parseInt(data.ownerId) : null,
      };
      return apiRequest("POST", "/api/shops", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shops"] });
      toast({ title: "Shop created successfully" });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ShopFormData) => {
      const payload = {
        ...data,
        ownerId: data.ownershipType === "common" ? null : data.ownerId ? parseInt(data.ownerId) : null,
      };
      return apiRequest("PATCH", `/api/shops/${shop?.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shops"] });
      toast({ title: "Shop updated successfully" });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: ShopFormData) => {
    if (shop) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="shopNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Shop Number *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., G-01" data-testid="input-shop-number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="floor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Floor *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-shop-floor">
                      <SelectValue placeholder="Select floor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ground">Ground Floor</SelectItem>
                    <SelectItem value="first">1st Floor</SelectItem>
                    <SelectItem value="second">2nd Floor</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-shop-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="vacant">Vacant</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ownershipType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ownership Type *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-ownership-type">
                    <SelectValue placeholder="Select ownership type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="sole">Sole Owner</SelectItem>
                  <SelectItem value="common">Common (Shared)</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                {field.value === "common" ? "Revenue will be shared among all owners (20% each)" : "Linked to a single owner"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {ownershipType === "sole" && (
          <FormField
            control={form.control}
            name="ownerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Owner *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-shop-owner">
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {owners.map((owner) => (
                      <SelectItem key={owner.id} value={owner.id.toString()}>
                        {owner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Additional notes about the shop" data-testid="input-shop-description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isPending} data-testid="button-save-shop">
            {isPending ? "Saving..." : shop ? "Update Shop" : "Add Shop"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function ShopCard({
  shop,
  onEdit,
  onDelete,
}: {
  shop: ShopWithOwner;
  onEdit: (shop: ShopWithOwner) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <Card className="overflow-visible hover-elevate" data-testid={`card-shop-${shop.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold">Shop {shop.shopNumber}</h3>
              <p className="text-sm text-muted-foreground">{formatFloor(shop.floor)}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(shop)} data-testid={`button-edit-shop-${shop.id}`}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(shop.id)} data-testid={`button-delete-shop-${shop.id}`}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <Badge className={getShopStatusColor(shop.status)}>
            {shop.status === "occupied" ? "Occupied" : "Vacant"}
          </Badge>
          <Badge variant="outline">
            {shop.ownershipType === "common" ? "Common" : "Sole Owner"}
          </Badge>
        </div>

        {shop.ownershipType === "sole" && shop.owner && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{shop.owner.name}</span>
          </div>
        )}

        {shop.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{shop.description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ShopsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<ShopWithOwner | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string>("all");
  const [selectedOwner, setSelectedOwner] = useState<string>("all");
  const { toast } = useToast();

  const { data: shops = [], isLoading } = useQuery<ShopWithOwner[]>({
    queryKey: ["/api/shops"],
  });

  const { data: owners = [] } = useQuery<Owner[]>({
    queryKey: ["/api/owners"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/shops/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shops"] });
      toast({ title: "Shop deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEdit = (shop: ShopWithOwner) => {
    setEditingShop(shop);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingShop(null);
  };

  const filteredShops = shops.filter(shop => {
    const floorMatch = selectedFloor === "all" || shop.floor === selectedFloor;
    const ownerMatch = selectedOwner === "all" || 
      (selectedOwner === "common" && shop.ownershipType === "common") ||
      (shop.ownerId?.toString() === selectedOwner);
    return floorMatch && ownerMatch;
  });

  const floorStats = {
    ground: shops.filter(s => s.floor === "ground"),
    first: shops.filter(s => s.floor === "first"),
    second: shops.filter(s => s.floor === "second"),
  };

  const getOwnerShopCount = (ownerId: number) => {
    return shops.filter(s => s.ownerId === ownerId).length;
  };

  const commonShopCount = shops.filter(s => s.ownershipType === "common").length;

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Shops</h1>
          <p className="text-muted-foreground">Manage all shop units across the building</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingShop(null)} data-testid="button-add-shop">
              <Plus className="h-4 w-4 mr-2" />
              Add Shop
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingShop ? "Edit Shop" : "Add New Shop"}</DialogTitle>
            </DialogHeader>
            <ShopForm shop={editingShop ?? undefined} owners={owners} onSuccess={handleDialogClose} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {Object.entries(floorStats).map(([floor, floorShops]) => {
          const occupied = floorShops.filter(s => s.status === "occupied").length;
          const vacant = floorShops.filter(s => s.status === "vacant").length;
          return (
            <Card key={floor} className="overflow-visible">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{formatFloor(floor)}</p>
                    <p className="text-2xl font-semibold">{floorShops.length}</p>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-emerald-600 dark:text-emerald-400">{occupied} occupied</div>
                    <div className="text-blue-600 dark:text-blue-400">{vacant} vacant</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-visible">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Floor</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedFloor === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedFloor("all")}
                  className="h-8"
                  data-testid="filter-all-floors"
                >
                  All
                  <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs">
                    {shops.length}
                  </Badge>
                </Button>
                <Button
                  variant={selectedFloor === "ground" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedFloor("ground")}
                  className="h-8"
                  data-testid="filter-ground-floor"
                >
                  Ground
                  <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs">
                    {floorStats.ground.length}
                  </Badge>
                </Button>
                <Button
                  variant={selectedFloor === "first" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedFloor("first")}
                  className="h-8"
                  data-testid="filter-first-floor"
                >
                  1st
                  <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs">
                    {floorStats.first.length}
                  </Badge>
                </Button>
                <Button
                  variant={selectedFloor === "second" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedFloor("second")}
                  className="h-8"
                  data-testid="filter-second-floor"
                >
                  2nd
                  <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs">
                    {floorStats.second.length}
                  </Badge>
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Owner</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedOwner === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedOwner("all")}
                  className="h-8"
                  data-testid="filter-all-owners"
                >
                  All
                  <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs">
                    {shops.length}
                  </Badge>
                </Button>
                {owners.map((owner) => (
                  <Button
                    key={owner.id}
                    variant={selectedOwner === owner.id.toString() ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedOwner(owner.id.toString())}
                    className="h-8"
                    data-testid={`filter-owner-${owner.id}`}
                  >
                    {owner.name}
                    <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs">
                      {getOwnerShopCount(owner.id)}
                    </Badge>
                  </Button>
                ))}
                {commonShopCount > 0 && (
                  <Button
                    variant={selectedOwner === "common" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedOwner("common")}
                    className="h-8"
                    data-testid="filter-common-shops"
                  >
                    Common
                    <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs">
                      {commonShopCount}
                    </Badge>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredShops.map((shop) => (
          <ShopCard
            key={shop.id}
            shop={shop}
            onEdit={handleEdit}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))}

        {filteredShops.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Store className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold mb-1">No shops found</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {selectedFloor === "all" && selectedOwner === "all" 
                  ? "Add your first shop to get started" 
                  : `No shops matching the selected filters`}
              </p>
              {selectedFloor === "all" && selectedOwner === "all" && (
                <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-shop">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Shop
                </Button>
              )}
              {(selectedFloor !== "all" || selectedOwner !== "all") && (
                <Button 
                  variant="outline" 
                  onClick={() => { setSelectedFloor("all"); setSelectedOwner("all"); }}
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
