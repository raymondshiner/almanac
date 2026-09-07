"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { EntryFields, makeDraft } from "@/components/entry-form";
import { api, type LogTargetInput } from "@/lib/api";
import { MEDIA_META, type EntryDraftInput } from "@/lib/media";

/** Create-entry dialog for a search result (mount fresh per target). */
export function LogDialog({
  target,
  onClose,
}: {
  target: LogTargetInput;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(makeDraft);
  const logItem = useMutation({
    mutationFn: (entry: EntryDraftInput) => api.createEntry(target, entry),
  });

  const title = target.season
    ? `${target.result.title} — ${target.season.title}`
    : target.result.title;
  const typeLabel =
    MEDIA_META[target.season ? "tv_season" : target.result.mediaType].label;

  const save = () => {
    logItem.mutate(draft, {
      onSuccess: () => {
        toast.success(`Logged ${title}`);
        onClose();
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log {title}</DialogTitle>
          <DialogDescription>
            {typeLabel}
            {target.result.year != null && !target.season
              ? ` · ${target.result.year}`
              : ""}
            {target.season?.year != null ? ` · ${target.season.year}` : ""}
          </DialogDescription>
        </DialogHeader>
        <EntryFields draft={draft} onChange={setDraft} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={logItem.isPending}>
            {logItem.isPending ? "Logging…" : "Log it"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
