import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

interface SoftDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, deletionDate: string) => void;
  entityType: string;
  entityDescription: string;
  isPending?: boolean;
}

export function SoftDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  entityType,
  entityDescription,
  isPending = false,
}: SoftDeleteModalProps) {
  const [reason, setReason] = useState("");
  const [deletionDate, setDeletionDate] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError("Please provide a reason for removal");
      return;
    }
    setError("");
    onConfirm(reason.trim(), deletionDate);
  };

  const handleClose = () => {
    setReason("");
    setDeletionDate(new Date().toISOString().split("T")[0]);
    setError("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Remove {entityType}
          </DialogTitle>
          <DialogDescription>
            You are about to remove <strong>{entityDescription}</strong>. This record will be marked as deleted but will remain visible for historical reference.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="deletionReason" className="text-sm font-medium">
              Reason for Removal <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="deletionReason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError("");
              }}
              placeholder="Please provide a reason for removing this record..."
              className={error ? "border-red-500" : ""}
              rows={3}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="deletionDate" className="text-sm font-medium">
              Date of Removal
            </Label>
            <Input
              id="deletionDate"
              type="date"
              value={deletionDate}
              onChange={(e) => setDeletionDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? "Removing..." : "Confirm Removal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeletedRowTooltipProps {
  deletedAt: string | Date | null;
  deletionReason: string | null;
  deletedBy?: string | null;
}

export function DeletedRowTooltip({ deletedAt, deletionReason, deletedBy }: DeletedRowTooltipProps) {
  if (!deletedAt) return null;
  
  const formattedDate = new Date(deletedAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
      <p><strong>Removed on:</strong> {formattedDate}</p>
      {deletedBy && <p><strong>By:</strong> {deletedBy}</p>}
      <p><strong>Reason:</strong> {deletionReason || "No reason provided"}</p>
    </div>
  );
}

export function getDeletedRowStyles(isDeleted: boolean) {
  if (!isDeleted) return {};
  return {
    textDecoration: "line-through",
    opacity: 0.6,
  };
}

export function DeletedBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
      Voided
    </span>
  );
}
