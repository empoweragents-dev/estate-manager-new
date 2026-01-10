
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Pencil } from "lucide-react";
import { format } from "date-fns";

interface EditPaymentDialogProps {
    payment: {
        id: number;
        amount: number;
        paymentDate: string;
        rentMonths: string[] | null;
        notes?: string;
        receiptNumber?: string;
    };
    trigger?: React.ReactNode;
}

export function EditPaymentDialog({ payment, trigger }: EditPaymentDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        amount: payment.amount.toString(),
        paymentDate: payment.paymentDate.split('T')[0],
        notes: payment.notes || "",
        receiptNumber: payment.receiptNumber || "",
        rentMonthsText: (payment.rentMonths || []).join(", "),
    });

    const mutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            // Parse rent months from text
            const rentMonths = data.rentMonthsText
                .split(",")
                .map((s) => s.trim())
                .filter((s) => /^\d{4}-\d{2}$/.test(s));

            const payload = {
                amount: data.amount,
                paymentDate: data.paymentDate,
                notes: data.notes,
                receiptNumber: data.receiptNumber,
                rentMonths: rentMonths.length > 0 ? rentMonths : null,
            };

            const res = await apiRequest("PATCH", `/api/payments/${payment.id}`, payload);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/owners"] }); // overly broad invalidation to be safe
            queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
            // Also invalidate specific report queries if possible, but they are nested under owners
            toast({
                title: "Success",
                description: "Payment updated successfully",
            });
            setOpen(false);
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                        <Pencil className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Payment</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="grid gap-2">
                        <Label htmlFor="date">Payment Date</Label>
                        <Input
                            id="date"
                            type="date"
                            required
                            value={formData.paymentDate}
                            onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            required
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="rentMonths">Rent Months (YYYY-MM, comma separated)</Label>
                        <Input
                            id="rentMonths"
                            value={formData.rentMonthsText}
                            onChange={(e) => setFormData({ ...formData, rentMonthsText: e.target.value })}
                            placeholder="2024-01, 2024-02"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="receipt">Receipt Number</Label>
                        <Input
                            id="receipt"
                            value={formData.receiptNumber}
                            onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
