"use client";

import { Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = { sm: "size-4", md: "size-6" } as const;

/**
 * 5-star rating with half steps. Interactive when `onChange` is given (each
 * star is two half-width radio buttons), static display otherwise.
 */
export function StarRating({
  value,
  onChange,
  size = "md",
}: {
  value: number | null;
  onChange?: (v: number | null) => void;
  size?: keyof typeof SIZES;
}) {
  const current = value ?? 0;
  const starCls = SIZES[size];

  return (
    <div
      role={onChange ? "radiogroup" : undefined}
      aria-label={onChange ? "Rating" : undefined}
      className="flex items-center gap-0.5"
    >
      {!onChange && (
        <span className="sr-only">
          {value != null ? `Rated ${value} out of 5` : "Not rated"}
        </span>
      )}
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.max(0, Math.min(1, current - (star - 1)));
        return (
          <span
            key={star}
            className={cn("relative inline-block", starCls)}
            aria-hidden={!onChange}
          >
            <Star
              className={cn("absolute inset-0 text-muted-foreground/40", starCls)}
            />
            <span
              className="absolute inset-y-0 left-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star className={cn("fill-amber-400 text-amber-400", starCls)} />
            </span>
            {onChange && (
              <>
                <button
                  type="button"
                  role="radio"
                  aria-checked={current === star - 0.5}
                  aria-label={`Rate ${star - 0.5} stars`}
                  className="absolute top-0 left-0 h-full w-1/2 cursor-pointer"
                  onClick={() => onChange(star - 0.5)}
                />
                <button
                  type="button"
                  role="radio"
                  aria-checked={current === star}
                  aria-label={`Rate ${star} stars`}
                  className="absolute top-0 right-0 h-full w-1/2 cursor-pointer"
                  onClick={() => onChange(star)}
                />
              </>
            )}
          </span>
        );
      })}
      {onChange && value != null && (
        <button
          type="button"
          aria-label="Clear rating"
          className="ml-1 cursor-pointer text-muted-foreground hover:text-foreground"
          onClick={() => onChange(null)}
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
