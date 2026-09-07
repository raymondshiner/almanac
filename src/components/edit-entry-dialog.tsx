"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EntryFields } from "@/components/entry-form";
import { api } from "@/lib/api";
import type { DiaryRowData, EntryDraftInput } from "@/lib/media";

/** Edit/delete dialog for an existing entry (mount fresh per entry). */
export function EditEntryDialog({
  row,
  onClose,
}: {
  row: DiaryRowData;
  onClose: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<EntryDraftInput>({
    loggedAt: row.loggedAt,
    rating: row.rating,
    review: row.review,
    status: row.status,
    isPrivate: row.isPrivate,
  });
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, setPending] = useState(false);

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setPending(true);
    try {
      await fn();
      toast.success(done);
      onClose();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setPending(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit entry</DialogTitle>
          <DialogDescription>{row.title}</DialogDescription>
        </DialogHeader>
        <EntryFields draft={draft} onChange={setDraft} />
        <DialogFooter className="sm:justify-between">
          <Button
            variant={confirmingDelete ? "destructive" : "ghost"}
            disabled={pending}
            onClick={() =>
              confirmingDelete
                ? run(() => api.deleteEntry(row.entryId), `Deleted ${row.title}`)
                : setConfirmingDelete(true)
            }
          >
            {confirmingDelete ? "Confirm delete" : "Delete"}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" disabled={pending} onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(() => api.updateEntry(row.entryId, draft), "Entry updated")
              }
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
