import Link from "next/link";
import { NotebookText, Plus } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";
import { getSession } from "@/lib/auth";

export async function SiteHeader() {
  const admin = await getSession();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <NotebookText className="size-5" />
          Almanac
        </Link>
        <nav className="ml-auto flex items-center gap-1">
          <Link
            href="/"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Diary
          </Link>
          {admin && (
            <>
              <Link
                href="/admin"
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Plus className="size-4" />
                Log
              </Link>
              <SignOutButton />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
