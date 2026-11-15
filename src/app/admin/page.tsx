"use client";
import { useEffect, useState } from "react";
import { apiFetch, clearSessionToken, setSessionToken } from "@/lib/client-auth";

type User = { id: string; username: string; displayName: string; balance: number; level: number; job: string | null; isAdmin: boolean; createdAt: string };

export default function AdminPortal() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("hanif");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);
  const [grantId, setGrantId] = useState("");
  const [grantAmount, setGrantAmount] = useState(1000);
  const [msg, setMsg] = useState("");

  const loadMe = async () => {
    const r = await apiFetch("/api/me");
    if (r.ok) setUser((await r.json()).user);
    setLoading(false);
  };
  const loadAdmin = async () => {
    const r = await apiFetch("/api/admin");
    const d = await r.json().catch(() => ({}));
    if (r.ok) setData(d);
    else setError(d.error || "Gagal memuat data admin");
  };
  useEffect(() => { loadMe(); }, []);
  useEffect(() => { if (user?.isAdmin) loadAdmin(); }, [user]);

  const login = async () => {
    setError("");
    const r = await apiFetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", username, password }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setError(d.error || "Login gagal"); return; }
    if (d.token) setSessionToken(d.token);
    setUser(d.user);
    if (!d.user.isAdmin) setError("Akun ini bukan admin. Gunakan hanif / 29216");
  };

  const logout = async () => {
    await apiFetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    clearSessionToken();
    setUser(null); setData(null);
  };

  const grant = async () => {
    const r = await apiFetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "grant", userId: grantId, amount: grantAmount }) });
    const d = await r.json().catch(() => ({}));
    setMsg(r.ok ? `✅ Berhasil grant ${grantAmount} BC` : `❌ ${d.error}`);
    if (r.ok) loadAdmin();
  };

  if (loading) return <div className="grid h-screen place-items-center bg-slate-950 text-white">Memuat portal admin...</div>;

  if (!user || !user.isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 p-4 text-white">
        <div className="w-full max-w-md rounded-3xl bg-slate-900 p-8 shadow-2xl">
          <div className="text-center">
            <div className="text-5xl">👑</div>
            <h1 className="mt-2 text-2xl font-black">BLOCK CITY — Portal Admin</h1>
            <p className="text-sm text-slate-400">Khusus pengelola kota. Masuk dengan akun admin.</p>
          </div>
          <div className="mt-6 space-y-3">
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className="w-full rounded-xl bg-slate-800 px-4 py-3 outline-none focus:ring-2 focus:ring-amber-400" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} placeholder="Password" className="w-full rounded-xl bg-slate-800 px-4 py-3 outline-none focus:ring-2 focus:ring-amber-400" />
            {error && <p className="rounded-xl bg-red-500/20 px-3 py-2 text-sm text-red-300">❌ {error}</p>}
            <button onClick={login} className="w-full rounded-xl bg-amber-500 py-3 font-black text-black hover:bg-amber-400">Masuk Portal Admin</button>
            <a href="/" className="block text-center text-sm text-slate-400 underline">← Kembali ke Game</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black">👑 Portal Admin — BLOCK CITY</h1>
            <p className="text-slate-400">Halo, <b className="text-amber-300">{user.displayName}</b> (@{user.username}) • Saldo {user.balance} BC</p>
          </div>
          <div className="flex gap-2">
            <a href="/" className="rounded-xl bg-emerald-600 px-4 py-2 font-bold">🎮 Masuk Game</a>
            <button onClick={logout} className="rounded-xl bg-red-600 px-4 py-2 font-bold">Keluar</button>
          </div>
        </div>

        {msg && <p className="mt-4 rounded-xl bg-slate-800 px-4 py-2">{msg}</p>}

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-900 p-4 text-center"><p className="text-3xl font-black">{data?.blockCount ?? "-"}</p><p className="text-xs text-slate-400">Total Blok</p></div>
          <div className="rounded-2xl bg-slate-900 p-4 text-center"><p className="text-3xl font-black">{data?.users?.length ?? "-"}</p><p className="text-xs text-slate-400">Pemain Terdaftar</p></div>
          <div className="rounded-2xl bg-slate-900 p-4 text-center"><p className="text-3xl font-black">{(data?.stats?.treasury ?? 0).toLocaleString()}</p><p className="text-xs text-slate-400">Treasury (BC)</p></div>
          <div className="rounded-2xl bg-slate-900 p-4 text-center"><p className="text-3xl font-black">{data?.logs?.length ?? "-"}</p><p className="text-xs text-slate-400">Audit Log</p></div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-900 p-5">
            <h2 className="font-black">👥 Daftar Pemain</h2>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {(data?.users || []).map((u: User) => (
                <div key={u.id} className="flex items-center justify-between rounded-xl bg-slate-800 px-3 py-2 text-sm">
                  <span>{u.displayName} <span className="text-slate-400">@{u.username}</span> {u.isAdmin && "👑"}</span>
                  <span className="text-amber-300">{u.balance} BC • Lv.{u.level}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-2xl bg-slate-900 p-5">
              <h2 className="font-black">💰 Grant BLOCK COIN</h2>
              <input value={grantId} onChange={e => setGrantId(e.target.value)} placeholder="User ID pemain" className="mt-3 w-full rounded-xl bg-slate-800 px-3 py-2" />
              <input type="number" value={grantAmount} onChange={e => setGrantAmount(Number(e.target.value))} className="mt-2 w-full rounded-xl bg-slate-800 px-3 py-2" />
              <button onClick={grant} className="mt-3 w-full rounded-xl bg-amber-500 py-2.5 font-black text-black">Kirim BC</button>
            </div>
            <div className="rounded-2xl bg-slate-900 p-5">
              <h2 className="font-black">📜 Audit Log</h2>
              <div className="mt-3 max-h-56 space-y-1 overflow-y-auto text-xs">
                {(data?.logs || []).map((l: any) => <p key={l.id} className="rounded-lg bg-slate-800 px-2 py-1">{l.action} — {l.details}</p>)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-900 p-5">
          <h2 className="font-black">💸 Transaksi Ekonomi Terakhir</h2>
          <div className="mt-3 max-h-56 space-y-1 overflow-y-auto text-xs">
            {(data?.transactions || []).map((t: any) => <p key={t.id} className="rounded-lg bg-slate-800 px-2 py-1">{t.description} • {t.amount} BC • saldo akhir {t.balanceAfter}</p>)}
          </div>
        </div>
      </div>
    </div>
  );
}
