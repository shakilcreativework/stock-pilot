"use client";

import { AppHeader } from "@/components/layout/app-header";
import { SessionUser } from "@/lib/auth/session";

interface HeaderProps {
  user: SessionUser;
}

export function Header({ user }: HeaderProps) {
  return <AppHeader user={user} variant="dashboard" />;
}
