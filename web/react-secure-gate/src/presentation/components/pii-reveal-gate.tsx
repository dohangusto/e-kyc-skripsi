import { useState } from "react";
import { auditUsecases } from "@/shared/lib/usecases";
import { piiJustifications } from "@/shared/constants/pii-justifications";
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
import { toast } from "sonner";
import type { Role } from "@/domain/types";
import type { AuditEvent } from "@/domain/entities/audit-event";

type PiiRevealGateProps = {
  label: string;
  maskedValue: string;
  fullValue: string;
  caseId: string;
  fieldKey: string;
  actor: { role: Role; name: string };
  allowReveal: boolean;
  policyDisabled?: boolean;
};

const getSessionKey = (caseId: string, fieldKey: string) =>
  `pii_reveal::${caseId}::${fieldKey}`;

export const PiiRevealGate = ({
  label,
  maskedValue,
  fullValue,
  caseId,
  fieldKey,
  actor,
  allowReveal,
  policyDisabled = false,
}: PiiRevealGateProps) => {
  const [open, setOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState("");
  const [notes, setNotes] = useState("");
  const [revealed, setRevealed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(getSessionKey(caseId, fieldKey)) === "true";
  });

  const handleConfirm = async () => {
    const event: AuditEvent = {
      id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      caseId,
      actorRole: actor.role,
      actorName: actor.name,
      action: "PII_REVEALED",
      reasonCode,
      notes: notes.trim()
        ? `field=${fieldKey}; ${notes.trim()}`
        : `field=${fieldKey}`,
      createdAt: new Date().toISOString(),
    };

    await auditUsecases.recordAuditEvent(event);
    sessionStorage.setItem(getSessionKey(caseId, fieldKey), "true");
    setRevealed(true);
    setOpen(false);
    setReasonCode("");
    setNotes("");
    toast.success("PII revealed (logged)");
  };

  const canReveal = allowReveal && !policyDisabled;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-sm">
        {canReveal && revealed ? fullValue : maskedValue}
      </span>
      {allowReveal ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => (canReveal ? setOpen(true) : null)}
          disabled={!canReveal}
          title={!canReveal ? "Disabled by policy" : undefined}
        >
          Reveal
        </Button>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reveal PII</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Select a justification for revealing sensitive data.
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Justification</label>
              <Select value={reasonCode} onValueChange={setReasonCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {piiJustifications.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                placeholder="Add context for audit trail"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!reasonCode}>
              Confirm reveal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
