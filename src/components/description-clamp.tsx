"use client";

import { useState } from "react";

/** Long descriptions clamp to 6 lines with a show-more toggle. */
export function DescriptionClamp({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = text.length > 500;
  return (
    <div className="grid gap-1">
      <p
        className={
          long && !expanded
            ? "line-clamp-6 text-sm leading-relaxed text-muted-foreground"
            : "text-sm leading-relaxed text-muted-foreground"
        }
      >
        {text}
      </p>
      {long && (
        <button
          type="button"
          className="justify-self-start text-sm font-medium text-foreground underline-offset-4 hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
