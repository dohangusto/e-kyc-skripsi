import { useState } from "react";
import type { DecisionType } from "@/domain/types";
import { decisionReasons } from "@/shared/constants/decision-reasons";
import { Button } from "@/presentation/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/presentation/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/presentation/components/ui/select";
import { Textarea } from "@/presentation/components/ui/textarea";

const decisionLabels: Record<DecisionType, string> = {
  APPROVE_MANUAL: "Approve Manual",
  REJECT: "Reject",
  REQUEST_REVERIFY: "Request Re-Verification",
};

const decisionButtonVariant: Record<
  DecisionType,
  "default" | "destructive" | "secondary"
> = {
  APPROVE_MANUAL: "default",
  REJECT: "destructive",
  REQUEST_REVERIFY: "secondary",
};

type DecisionDialogProps = {
  open: boolean;
  decisionType: DecisionType;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: { reasonCode: string; notes?: string }) => void;
  isSubmitting?: boolean;
};

export const DecisionDialog = ({
  open,
  decisionType,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
}: DecisionDialogProps) => {
  const [reasonCode, setReasonCode] = useState("");
  const [notes, setNotes] = useState("");

  const options = decisionReasons[decisionType];
  const title = decisionLabels[decisionType];
  const confirmVariant = decisionButtonVariant[decisionType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason code</label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Notes (optional, recommended)
            </label>
            <Textarea
              placeholder="Add supporting notes for audit trail..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={() =>
              onConfirm({ reasonCode, notes: notes.trim() || undefined })
            }
            disabled={!reasonCode || isSubmitting}
            variant={confirmVariant}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
