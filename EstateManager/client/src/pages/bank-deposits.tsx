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
import { Plus, Wallet, Calendar, User, Building2, Trash2, FileText } from "lucide-react";
import type { BankDeposit, Owner } from "@shared/schema";
import { formatCurrency, useCurrencyStore } from "@/lib/currency";

interface BankDepositWithOwner extends BankDeposit {
  owner: Owner;
}

const bankDepositFormSchema = z.object({
  ownerId: z.string().min(1, "Owner is required"),
  amount: z.string().min(1, "Amount is required"),
  depositDate: z.string().min(1, "Date is required"),
  bankName: z.string().min(1, "Bank name is required"),
  depositSlipRef: z.string().optional(),
  notes: z.string().optional(),
});

type BankDepositFormData = z.infer<typeof bankDepositFormSchema>;

function BankDepositForm({
  owners,
  onSuccess,
}: {
  owners: Owner[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();

  const form = useForm<BankDepositFormData>({
    resolver: zodResolver(bankDepositFormSchema),
    defaultValues: {
      ownerId: "",
      amount: "",
      depositDate: new Date().toISOString().split("T")[0],
      bankName: "",
      depositSlipRef: "",
      notes: "",
    },
  });

  const selectedOwnerId = form.watch("ownerId");
  const selectedOwner = owners.find(o => o.id.toString() === selectedOwnerId);

  const mutation = useMutation({
    mutationFn: async (data: BankDepositFormData) => {
      return apiRequest("POST", "/api/bank-deposits", {
        ...data,
        ownerId: parseInt(data.ownerId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-deposits"] });
      toast({ title: "Bank deposit recorded successfully" });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: BankDepositFormData) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="ownerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-deposit-owner">
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

        {selectedOwner?.bankName && (
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="font-medium">Owner's Bank Account</p>
            <p className="text-muted-foreground">
              {selectedOwner.bankName} - {selectedOwner.bankBranch}
            </p>
            {selectedOwner.bankAccountNumber && (
              <p className="font-mono text-muted-foreground">{selectedOwner.bankAccountNumber}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (BDT) *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    placeholder="Enter amount"
                    className="text-lg font-semibold"
                    data-testid="input-deposit-amount"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="depositDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deposit Date *</FormLabel>
                <FormControl>
                  <Input {...field} type="date" data-testid="input-deposit-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="bankName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bank Name *</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder="e.g., Dutch Bangla Bank"
                  data-testid="input-deposit-bank" 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="depositSlipRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deposit Slip / Reference ID</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Deposit slip or transaction reference" data-testid="input-deposit-ref" />
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
                <Input {...field} placeholder="Additional notes" data-testid="input-deposit-notes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={mutation.isPending} data-testid="button-save-deposit">
            {mutation.isPending ? "Recording..." : "Record Deposit"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function BankDepositsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [depositToDelete, setDepositToDelete] = useState<BankDepositWithOwner | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const { toast } = useToast();
  const { currency, exchangeRate } = useCurrencyStore();

  const { data: deposits = [], isLoading } = useQuery<BankDepositWithOwner[]>({
    queryKey: ["/api/bank-deposits"],
  });

  const { data: owners = [] } = useQuery<Owner[]>({
    queryKey: ["/api/owners"],
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      return apiRequest("DELETE", `/api/bank-deposits/${id}`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bank-deposits"] });
      toast({ title: "Bank deposit deleted successfully" });
      setDeleteDialogOpen(false);
      setDepositToDelete(null);
      setDeleteReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleDeleteClick = (deposit: BankDepositWithOwner) => {
    setDepositToDelete(deposit);
    setDeleteReason("");
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (depositToDelete && deleteReason.trim()) {
      deleteMutation.mutate({ id: depositToDelete.id, reason: deleteReason.trim() });
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
  };

  const formatValue = (val: number | string) => {
    const num = typeof val === "string" ? parseFloat(val) || 0 : val;
    return formatCurrency(num, currency, exchangeRate);
  };

  const totalDeposits = deposits.reduce((sum, d) => sum + parseFloat(d.amount), 0);

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
        <Skeleton className="h-24" />
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
          <h1 className="text-2xl font-semibold">Bank Deposits</h1>
          <p className="text-muted-foreground">Track deposits made to owner bank accounts</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-deposit">
              <Plus className="h-4 w-4 mr-2" />
              Record Deposit
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Record Bank Deposit</DialogTitle>
            </DialogHeader>
            <BankDepositForm owners={owners} onSuccess={handleDialogClose} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="overflow-visible">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Deposited</p>
              <p className="text-2xl font-semibold tabular-nums text-primary">
                {formatValue(totalDeposits)}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {deposits.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Deposit Slip/Ref</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deposits.map((deposit) => (
                  <TableRow key={deposit.id} data-testid={`row-deposit-${deposit.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(deposit.depositDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {deposit.owner?.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {deposit.bankName}
                      </div>
                    </TableCell>
                    <TableCell>
                      {deposit.depositSlipRef ? (
                        <div className="flex items-center gap-1 text-sm">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono">{deposit.depositSlipRef}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-primary/10 text-primary tabular-nums">
                        {formatValue(deposit.amount)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate max-w-[150px] block">
                        {deposit.notes || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(deposit)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-deposit-${deposit.id}`}
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
              <Wallet className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold mb-1">No deposits recorded</h3>
              <p className="text-muted-foreground text-sm mb-4">Track deposits made to owner bank accounts</p>
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-deposit">
                <Plus className="h-4 w-4 mr-2" />
                Record Deposit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bank Deposit Record</AlertDialogTitle>
            <AlertDialogDescription>
              {depositToDelete && (
                <div className="space-y-2 mt-2">
                  <p>Are you sure you want to delete this bank deposit?</p>
                  <div className="bg-muted p-3 rounded-md text-sm">
                    <p><strong>Owner:</strong> {depositToDelete.owner?.name}</p>
                    <p><strong>Amount:</strong> {formatValue(depositToDelete.amount)}</p>
                    <p><strong>Date:</strong> {new Date(depositToDelete.depositDate).toLocaleDateString()}</p>
                    <p><strong>Bank:</strong> {depositToDelete.bankName}</p>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason for deletion <span className="text-destructive">*</span></label>
            <Textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Please provide a reason for deleting this bank deposit record..."
              className="min-h-[80px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={!deleteReason.trim() || deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Deposit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
