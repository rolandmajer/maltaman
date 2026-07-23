import { LoginForm } from "./login-form";
import { ensureAdminBootstrapped } from "@/lib/bootstrap-admin";

// Rendered per request so the admin bootstrap below runs on a real server (not at build time).
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Create the first admin from ADMIN_* secrets the moment the app is opened (idempotent,
  // best-effort, at most once per process). See src/lib/bootstrap-admin.ts.
  await ensureAdminBootstrapped();

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-900 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-brand-800 bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-brand-800">MALTAMAN</h1>
          <p className="mt-1 text-sm text-slate-500">Protokol z obhliadky nehnuteľnosti</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
