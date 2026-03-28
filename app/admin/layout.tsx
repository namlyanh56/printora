import Link from "next/link";
import { ReactNode } from "react";
import { requireAdminAuth } from "@/lib/admin";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/admin" className="text-lg font-semibold tracking-tight text-gray-900">
            Printora Admin
          </Link>
          <nav className="flex items-center gap-4 text-sm text-gray-600">
            <Link href="/admin" className="hover:text-gray-900">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
