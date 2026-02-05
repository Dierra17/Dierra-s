import { signInAdmin } from '@/app/admin/actions';

export default function AdminLoginPage() {
  return (
    <div className="mx-auto max-w-md rounded-xl border bg-white p-6">
      <h1 className="mb-4 text-xl font-semibold">Вход в админку</h1>
      <form action={signInAdmin} className="space-y-3">
        <input name="email" type="email" required placeholder="admin@example.com" className="w-full rounded-lg border px-3 py-2" />
        <button className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-white">Отправить magic link</button>
      </form>
    </div>
  );
}
