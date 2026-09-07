"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Sign out"
      onClick={async () => {
        await api.logout();
        router.push("/");
        router.refresh();
      }}
    >
      <LogOut />
    </Button>
  );
}
