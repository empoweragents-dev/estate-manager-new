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
  FormDescription,
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
  Receipt,
  Calendar,
  User,
  Users,
  Trash2,
  Shield,
  Zap,
  Sparkles,
  Wrench,
} from "lucide-react";
import type { Expense, Owner } from "@shared/schema";
import { formatCurrency, useCurrencyStore } from "@/lib/currency";

interface ExpenseWithOwner extends Expense {
  owner?: Owner;
}

const expenseFormSchema = z.object({
  expenseType: z.enum(["guard", "cleaner", "electricity", "maintenance", "other"]),
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required"),
  expenseDate: z.string().min(1, "Date is required"),
  allocation: z.enum(["owner", "common"]),
  ownerId: z.string().optional(),
  receiptRef: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

const expenseTypeIcons: Record<string, React.ElementType> = {
  guard: Shield,
  cleaner: Sparkles,
  electricity: Zap,
  maintenance: Wrench,
  other: Receipt,
};

const expenseTypeColors: Record<string, string> = {
  guard: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  cleaner: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  electricity: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  maintenance: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

function ExpenseForm({
  owners,
  onSuccess,
}: {
  owners: Owner[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      expenseType: "guard",
      description: "",
      amount: "",
      expenseDate: new Date().toISOString().split("T")[0],
      allocation: "common",
      ownerId: "",
      receiptRef: "",
    },
  });

  const allocation = form.watch("allocation");

  const mutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      return apiRequest("POST", "/api/expenses", {
        ...data,
        ownerId: data.allocation === "owner" && data.ownerId ? parseInt(data.ownerId) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Expense recorded successfully" });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: ExpenseFormData) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="expenseType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expense Type *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-expense-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="guard">Guard</SelectItem>
                  <SelectItem value="cleaner">Cleaner</SelectItem>
                  <SelectItem value="electricity">Electricity</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Describe the expense" data-testid="input-expense-description" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                    data-testid="input-expense-amount"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expenseDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date *</FormLabel>
                <FormControl>
                  <Input {...field} type="date" data-testid="input-expense-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="allocation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Allocation *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-expense-allocation">
                    <SelectValue placeholder="Select allocation" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="common">Common (Shared by all owners)</SelectItem>
                  <SelectItem value="owner">Specific Owner</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                {field.value === "common"
                  ? "This expense will be deducted from common revenue (split equally)"
                  : "This expense will be charged to a specific owner"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {allocation === "owner" && (
          <FormField
            control={form.control}
            name="ownerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Owner *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-expense-owner">
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
          name="receiptRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Receipt Reference</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Optional receipt/invoice number" data-testid="input-expense-receipt" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={mutation.isPending} data-testid="button-save-expense">
            {mutation.isPending ? "Recording..." : "Record Expense"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function ExpensesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { currency, exchangeRate } = useCurrencyStore();

  const { data: expenses = [], isLoading } = useQuery<ExpenseWithOwner[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: owners = [] } = useQuery<Owner[]>({
    queryKey: ["/api/owners"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Expense deleted successfully" });
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

  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const commonExpenses = expenses.filter(e => e.allocation === "common").reduce((sum, e) => sum + parseFloat(e.amount), 0);

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
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
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
          <h1 className="text-2xl font-semibold">Expenses</h1>
          <p className="text-muted-foreground">Track operational costs and allocate to owners</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-expense">
              <Plus className="h-4 w-4 mr-2" />
              Record Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Record Expense</DialogTitle>
            </DialogHeader>
            <ExpenseForm owners={owners} onSuccess={handleDialogClose} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="overflow-visible">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-semibold tabular-nums text-destructive">
                  {formatValue(totalExpenses)}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <Receipt className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-visible">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Common Expenses</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {formatValue(commonExpenses)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Shared by all owners (20% each)</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {expenses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Allocation</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => {
                  const Icon = expenseTypeIcons[expense.expenseType] || Receipt;
                  return (
                    <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                      <TableCell>
                        <Badge className={expenseTypeColors[expense.expenseType]} variant="secondary">
                          <Icon className="h-3 w-3 mr-1" />
                          {expense.expenseType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(expense.expenseDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="truncate max-w-[200px] block">{expense.description}</span>
                      </TableCell>
                      <TableCell>
                        {expense.allocation === "common" ? (
                          <Badge variant="outline">
                            <Users className="h-3 w-3 mr-1" />
                            Common
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <User className="h-3 w-3 mr-1" />
                            {expense.owner?.name || "Owner"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-destructive">
                        -{formatValue(expense.amount)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {expense.receiptRef || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(expense.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-expense-${expense.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold mb-1">No expenses recorded</h3>
              <p className="text-muted-foreground text-sm mb-4">Track your operational costs</p>
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-expense">
                <Plus className="h-4 w-4 mr-2" />
                Record Expense
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
