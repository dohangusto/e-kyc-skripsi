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
  requireRejectTypingConfirm?: boolean;
};

export const DecisionDialog = ({
  open,
  decisionType,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
  requireRejectTypingConfirm = true,
}: DecisionDialogProps) => {
  const [reasonCode, setReasonCode] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const options = decisionReasons[decisionType];
  const title = decisionLabels[decisionType];
  const confirmVariant = decisionButtonVariant[decisionType];
  const notesRequired =
    decisionType === "REJECT" || decisionType === "REQUEST_REVERIFY";
  const rejectNeedsTyping =
    decisionType === "REJECT" && requireRejectTypingConfirm;
  const canConfirm =
    Boolean(reasonCode) &&
    (!notesRequired || notes.trim().length > 0) &&
    (!rejectNeedsTyping || confirmText === "REJECT");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {decisionType === "REJECT" ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              {rejectNeedsTyping
                ? "This action rejects the applicant. Type REJECT to confirm."
                : "This action rejects the applicant."}
            </div>
          ) : null}
          {decisionType === "REQUEST_REVERIFY" ? (
            <div className="rounded-md border border-muted bg-muted/40 p-3 text-xs text-muted-foreground">
              Requesting re-verification sends the case back for new evidence.
            </div>
          ) : null}
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
              Notes ({notesRequired ? "required" : "optional, recommended"})
            </label>
            <Textarea
              placeholder="Add supporting notes for audit trail..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          {rejectNeedsTyping ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Type REJECT to confirm
              </label>
              <input
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                placeholder="REJECT"
              />
            </div>
          ) : null}
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
            disabled={!canConfirm || isSubmitting}
            variant={confirmVariant}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
