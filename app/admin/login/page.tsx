import { redirect } from "next/navigation";
import { adminLogin, isAdminAuthenticated } from "@/lib/admin";

async function loginAction(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  const ok = await adminLogin(password);
  if (ok) redirect("/admin");
  redirect("/admin/login?error=1");
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdminAuthenticated()) redirect("/admin");
  const params = await searchParams;
  const hasError = params.error === "1";

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">Printora</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">Admin Login</h1>
        <p className="mt-1 text-sm text-gray-500">Masuk untuk memantau order dan status WhatsApp.</p>

        {hasError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Password salah.
          </div>
        )}

        <form action={loginAction} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              name="password"
              required
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none ring-brand-600 focus:ring"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
