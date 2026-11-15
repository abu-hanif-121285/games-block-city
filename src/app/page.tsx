"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import GameCanvas, { type VehicleRow } from "@/components/GameCanvas";
import { BLOCK_DEFS, JOBS, VEHICLES, MISSIONS, DISTRICTS, SHOP_ITEMS, SKIN_COLORS, HAIR_COLORS, SHIRT_COLORS, PANTS_COLORS, districtOf } from "@/lib/game-data";
import { apiFetch, clearSessionToken, setSessionToken } from "@/lib/client-auth";

type User = {
  id: string; username: string; displayName: string; gender: string; skinColor: string; hairColor: string; hairStyle: string;
  shirtColor: string; pantsColor: string; hat: string; accessory: string; level: number; xp: number; balance: number;
  job: string | null; jobLevel: number; isAdmin: boolean;
};
type Block = { x: number; y: number; z: number; type: string };
type ChatMsg = { id: string; username: string; message: string; createdAt: string };
type PresencePlayer = { userId: string; displayName: string; username: string; job: string | null; level: number; x: number; y: number; z: number };

type Panel = null | "job" | "shop" | "inventory" | "property" | "vehicle" | "missions" | "map" | "settings" | "character" | "admin";

function VoxelAvatar({ skin, hair, shirt, pants, hat, gender, size = 64 }: { skin: string; hair: string; shirt: string; pants: string; hat: string; gender: string; size?: number }) {
  const u = size / 64;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="absolute left-1/2 -translate-x-1/2 rounded-sm" style={{ width: 30 * u, height: 30 * u, top: 2 * u, background: skin, border: "2px solid rgba(0,0,0,.3)" }}>
        <div className="absolute w-full" style={{ height: 10 * u, background: hair, top: 0 }} />
        {hat === "cap" && <div className="absolute w-full" style={{ height: 8 * u, background: "#ef4444", top: -4 * u }} />}
        {hat === "helmet" && <div className="absolute w-full" style={{ height: 12 * u, background: "#f59e0b", top: -2 * u }} />}
        {hat === "crown" && <div className="absolute w-full" style={{ height: 10 * u, background: "#facc15", top: -6 * u }} />}
        <div className="absolute flex gap-1" style={{ top: 14 * u, left: 6 * u }}>
          <div className="bg-slate-900" style={{ width: 5 * u, height: 5 * u }} />
          <div className="bg-slate-900" style={{ width: 5 * u, height: 5 * u }} />
        </div>
        {gender === "female" && <div className="absolute" style={{ width: 6 * u, height: 14 * u, background: hair, left: -3 * u, top: 6 * u }} />}
        {gender === "female" && <div className="absolute" style={{ width: 6 * u, height: 14 * u, background: hair, right: -3 * u, top: 6 * u }} />}
      </div>
      <div className="absolute left-1/2 -translate-x-1/2" style={{ width: 36 * u, height: 20 * u, top: 32 * u, background: shirt, border: "2px solid rgba(0,0,0,.3)" }} />
      <div className="absolute" style={{ width: 8 * u, height: 20 * u, top: 32 * u, left: 6 * u, background: shirt, border: "2px solid rgba(0,0,0,.3)" }} />
      <div className="absolute" style={{ width: 8 * u, height: 20 * u, top: 32 * u, right: 6 * u, background: shirt, border: "2px solid rgba(0,0,0,.3)" }} />
      <div className="absolute" style={{ width: 13 * u, height: 12 * u, top: 52 * u, left: 10 * u, background: pants, border: "2px solid rgba(0,0,0,.3)" }} />
      <div className="absolute" style={{ width: 13 * u, height: 12 * u, top: 52 * u, right: 10 * u, background: pants, border: "2px solid rgba(0,0,0,.3)" }} />
    </div>
  );
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({ username: "", password: "", displayName: "", gender: "male", skinColor: "#f2c79b", hairColor: "#3b2f2f", hairStyle: "short", shirtColor: "#2563eb", pantsColor: "#1e293b", hat: "none" });
  const [authError, setAuthError] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [online, setOnline] = useState<PresencePlayer[]>([]);
  const [buildMode, setBuildMode] = useState(false);
  const [buildAction, setBuildAction] = useState<"place" | "remove">("place");
  const [selectedBlock, setSelectedBlock] = useState("brick");
  const [panel, setPanel] = useState<Panel>(null);
  const [toast, setToast] = useState("");
  const [pos, setPos] = useState({ x: 32, y: 2, z: 32 });
  const [weather, setWeather] = useState<"clear" | "rain">("clear");
  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const [inVehicle, setInVehicle] = useState<{ vehicleId: string; vehicleName: string } | null>(null);
  const [cityStats, setCityStats] = useState<any>(null);
  const [adminData, setAdminData] = useState<any>(null);
  const [teleport, setTeleport] = useState<{ x: number; z: number; n: number } | null>(null);
  const [charForm, setCharForm] = useState<any>(null);
  const [shopCat, setShopCat] = useState("Semua");
  const [propForm, setPropForm] = useState({ name: "Rumah Saya", x: 32, z: 32, price: 10000, type: "house" });
  const [workCooldown, setWorkCooldown] = useState(0);
  const [choosingJob, setChoosingJob] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const joyRef = useRef<HTMLDivElement>(null);
  const [joyKnob, setJoyKnob] = useState({ x: 0, y: 0 });
  const joyActive = useRef(false);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3200); };

  const refreshMe = useCallback(async () => {
    const r = await apiFetch("/api/me");
    if (!r.ok) return null;
    const d = await r.json();
    setUser(d.user); setInventory(d.inventory); setTransactions(d.transactions); setProperties(d.properties); setMissions(d.missions);
    setCharForm({ displayName: d.user.displayName, gender: d.user.gender, skinColor: d.user.skinColor, hairColor: d.user.hairColor, hairStyle: d.user.hairStyle, shirtColor: d.user.shirtColor, pantsColor: d.user.pantsColor, hat: d.user.hat, accessory: d.user.accessory });
    return d;
  }, []);

  const refreshWorld = useCallback(async () => {
    try {
      const r = await apiFetch("/api/world");
      if (r.ok) { const d = await r.json(); setBlocks(d.blocks); setCityStats(d.stats); }
    } catch { /* ignore */ }
  }, []);

  const refreshVehicles = useCallback(async () => {
    try { const r = await apiFetch("/api/vehicles"); if (r.ok) setVehicles((await r.json()).vehicles); } catch { /* ignore */ }
  }, []);

  const refreshChat = useCallback(async () => {
    try { const r = await apiFetch("/api/chat"); if (r.ok) setChat((await r.json()).messages); } catch { /* ignore */ }
  }, []);

  const refreshOnline = useCallback(async () => {
    try { const r = await apiFetch("/api/presence"); if (r.ok) setOnline((await r.json()).players); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    (async () => {
      const r = await apiFetch("/api/me");
      if (r.ok) {
        const d = await r.json();
        setUser(d.user); setInventory(d.inventory); setTransactions(d.transactions); setProperties(d.properties); setMissions(d.missions);
        setCharForm({ displayName: d.user.displayName, gender: d.user.gender, skinColor: d.user.skinColor, hairColor: d.user.hairColor, hairStyle: d.user.hairStyle, shirtColor: d.user.shirtColor, pantsColor: d.user.pantsColor, hat: d.user.hat, accessory: d.user.accessory });
        await refreshWorld(); await refreshVehicles(); await refreshChat(); await refreshOnline();
      }
      setLoading(false);
    })();
  }, [refreshWorld, refreshVehicles, refreshChat, refreshOnline]);

  useEffect(() => {
    if (!user) return;
    const t1 = setInterval(refreshWorld, 8000);
    const t2 = setInterval(refreshChat, 3000);
    const t3 = setInterval(refreshOnline, 3000);
    const t4 = setInterval(refreshVehicles, 10000);
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); clearInterval(t4); };
  }, [user, refreshWorld, refreshChat, refreshOnline, refreshVehicles]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  // auto-open Job Center for new players without a job
  const autoJobOpened = useRef(false);
  useEffect(() => {
    if (user && !user.job && !autoJobOpened.current) {
      autoJobOpened.current = true;
      setPanel("job");
    }
    if (user?.job) autoJobOpened.current = false;
  }, [user?.job]);

  // keyboard shortcuts: B build, I inventory, M map, Esc close panel
  useEffect(() => {
    if (!user) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "KeyB") setBuildMode(v => !v);
      else if (e.code === "KeyI") setPanel(p => p === "inventory" ? null : "inventory");
      else if (e.code === "KeyM") setPanel(p => p === "map" ? null : "map");
      else if (e.code === "KeyJ") setPanel(p => p === "job" ? null : "job");
      else if (e.code === "Escape") setPanel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [user]);
  useEffect(() => {
    if (workCooldown <= 0) return;
    const t = setInterval(() => setWorkCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [workCooldown > 0]);

  // minimap draw
  useEffect(() => {
    const cv = minimapRef.current;
    if (!cv || !user) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const S = 160, scale = S / 64;
    ctx.fillStyle = "#166534"; ctx.fillRect(0, 0, S, S);
    const top: Record<string, string> = {};
    for (const b of blocks) {
      const k = `${b.x},${b.z}`;
      if (!top[k] || b.y > (top[k + ",y"] ? Number(top[k + ",y"]) : 0)) { top[k] = b.type; top[k + ",y"] = String(b.y); }
    }
    for (const [k, type] of Object.entries(top)) {
      if (k.endsWith(",y")) continue;
      const [x, z] = k.split(",").map(Number);
      const def = (BLOCK_DEFS as any)[type];
      ctx.fillStyle = def ? `#${def.color.toString(16).padStart(6, "0")}` : "#999";
      ctx.fillRect(x * scale, z * scale, scale + 0.5, scale + 0.5);
    }
    // district grid
    ctx.strokeStyle = "rgba(255,255,255,.25)";
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(i * 16 * scale, 0); ctx.lineTo(i * 16 * scale, S); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * 16 * scale); ctx.lineTo(S, i * 16 * scale); ctx.stroke(); }
    // vehicles
    ctx.fillStyle = "#fde047";
    for (const v of vehicles) ctx.fillRect(v.x * scale - 2, v.z * scale - 2, 4, 4);
    // player
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#000";
    ctx.beginPath(); ctx.arc(pos.x * scale, pos.z * scale, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // online players
    ctx.fillStyle = "#38bdf8";
    for (const p of online) if (p.userId !== user.id) ctx.fillRect(p.x * scale - 2, p.z * scale - 2, 4, 4);
  }, [blocks, pos, vehicles, online, user]);

  const handleAuth = async () => {
    setAuthError("");
    const r = await apiFetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: authTab, ...authForm }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setAuthError(d.error || "Gagal masuk"); return; }
    if (d.token) setSessionToken(d.token);
    setUser(d.user);
    setCharForm({ displayName: d.user.displayName, gender: d.user.gender, skinColor: d.user.skinColor, hairColor: d.user.hairColor, hairStyle: d.user.hairStyle, shirtColor: d.user.shirtColor, pantsColor: d.user.pantsColor, hat: d.user.hat, accessory: d.user.accessory });
    await refreshWorld(); await refreshVehicles(); await refreshChat(); await refreshOnline(); await refreshMe();
    showToast(`Selamat datang di BLOCK CITY, ${d.user.displayName}! 🏙️`);
  };

  const handleLogout = async () => {
    await apiFetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    clearSessionToken();
    setUser(null); setBlocks([]); setVehicles([]);
  };

  const handleBlockChange = useCallback(async (x: number, y: number, z: number, type: string, action: "place" | "remove") => {
    const r = await apiFetch("/api/world", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ x, y, z, type, action }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { showToast(`❌ ${d.error || "Gagal mengubah blok"}`); return; }
    setBlocks(prev => {
      if (action === "remove") return prev.filter(b => !(b.x === x && b.y === y && b.z === z));
      const rest = prev.filter(b => !(b.x === x && b.y === y && b.z === z));
      return [...rest, { x, y, z, type }];
    });
  }, []);

  const handleVehicleMove = useCallback(async (id: string, x: number, z: number) => {
    setVehicles(prev => prev.map(v => v.id === id ? { ...v, x, z } : v));
    apiFetch("/api/vehicles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "move", id, x, z }) }).catch(() => {});
  }, []);

  const handleInteract = useCallback((info: { type: "vehicle" | "none"; vehicleId?: string; vehicleName?: string }) => {
    if (info.type === "vehicle" && info.vehicleId) { setInVehicle({ vehicleId: info.vehicleId, vehicleName: info.vehicleName || "Kendaraan" }); showToast(`🚗 Mengemudikan ${info.vehicleName} — WASD untuk jalan, E untuk turun`); }
    else setInVehicle(null);
  }, []);

  const sendChat = async () => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatInput("");
    const r = await apiFetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: msg }) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); showToast(`❌ ${d.error}`); }
    else await refreshChat();
  };

  const chooseJob = async (jobId: string) => {
    setChoosingJob(jobId);
    try {
      const r = await apiFetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "choose", jobId }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { showToast(`❌ ${d.error || "Gagal memilih pekerjaan"}`); return; }
      // update state directly from server response (guaranteed fresh)
      if (d.user) setUser(d.user);
      refreshMe().catch(() => {});
      showToast(`✅ Pekerjaan: ${d.job.name} — seragam diperbarui! Klik "Kerja Shift" untuk gaji.`);
    } catch {
      showToast("❌ Gagal terhubung ke server. Coba lagi.");
    } finally {
      setChoosingJob(null);
    }
  };

  const doWork = async () => {
    const r = await apiFetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "work" }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { showToast(`❌ ${d.error}`); if (d.error?.includes("Tunggu")) setWorkCooldown(20); return; }
    await refreshMe(); setWorkCooldown(20);
    showToast(`💰 Gaji diterima: +${d.salary} BC, +${d.xpGain} XP!`);
  };

  const buyItem = async (itemId: string) => {
    const r = await apiFetch("/api/shop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { showToast(`❌ ${d.error}`); return; }
    await refreshMe(); showToast(`🛒 Membeli ${d.item.name} — saldo ${d.balance} BC`);
  };

  const buyVehicle = async (vehicleType: string, color: string) => {
    const r = await apiFetch("/api/vehicles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "buy", vehicleType, color }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { showToast(`❌ ${d.error}`); return; }
    await refreshMe(); await refreshVehicles(); showToast(`🚗 ${d.vehicle.name} dibeli & diparkir di garasi!`);
  };

  const buyProperty = async () => {
    const r = await apiFetch("/api/properties", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "buy", ...propForm }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { showToast(`❌ ${d.error}`); return; }
    await refreshMe(); showToast(`🏠 Properti "${d.property.name}" dibeli di ${d.property.district}!`);
  };

  const sellProperty = async (id: string) => {
    const r = await apiFetch("/api/properties", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sell", id }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { showToast(`❌ ${d.error}`); return; }
    await refreshMe(); showToast(`💰 Properti dijual — saldo ${d.balance} BC`);
  };

  const acceptMission = async (missionId: string) => {
    const r = await apiFetch("/api/missions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "accept", missionId }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { showToast(`❌ ${d.error}`); return; }
    await refreshMe(); showToast("📋 Misi diterima! Selesaikan lalu klaim reward.");
  };

  const completeMission = async (missionId: string) => {
    const r = await apiFetch("/api/missions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete", missionId }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { showToast(`❌ ${d.error}`); return; }
    await refreshMe(); showToast(`🎉 Misi selesai! +${d.reward} BC`);
  };

  const saveCharacter = async () => {
    const r = await apiFetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(charForm) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { showToast(`❌ ${d.error}`); return; }
    setUser(d.user); showToast("✅ Karakter disimpan!");
  };

  const loadAdmin = async () => {
    const r = await apiFetch("/api/admin");
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { showToast(`❌ ${d.error}`); return; }
    setAdminData(d);
  };

  const teleportTo = (x: number, z: number, label: string) => {
    setTeleport({ x, z, n: Date.now() });
    showToast(`📍 Teleport ke ${label}`);
    setPanel(null);
  };

  const xpProgress = user ? (user.xp % 200) / 200 : 0;
  const myJob = user?.job ? JOBS.find(j => j.id === user.job) : null;
  const activeMission = missions.find((m: any) => m.status === "active");

  // joystick handlers
  const joyStart = (e: React.PointerEvent) => { joyActive.current = true; (e.target as HTMLElement).setPointerCapture(e.pointerId); joyMove(e); };
  const joyMove = (e: React.PointerEvent) => {
    if (!joyActive.current || !joyRef.current) return;
    const rect = joyRef.current.getBoundingClientRect();
    let dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    let dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    setJoyKnob({ x: dx * 32, y: dy * 32 });
    window.dispatchEvent(new CustomEvent("bc-joystick", { detail: { x: dx, y: dy } }));
  };
  const joyEnd = () => { joyActive.current = false; setJoyKnob({ x: 0, y: 0 }); window.dispatchEvent(new CustomEvent("bc-joystick", { detail: { x: 0, y: 0 } })); };

  if (loading) return <div className="grid h-screen place-items-center bg-slate-950"><div className="text-center"><div className="text-5xl animate-floaty">🏙️</div><p className="mt-4 font-bold text-emerald-400">Memuat BLOCK CITY...</p></div></div>;

  // LANDING (not logged in)
  if (!user) {
    return (
      <div className="h-screen overflow-y-auto bg-gradient-to-b from-sky-900 via-slate-900 to-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-1 text-sm font-bold text-emerald-300">🌐 SHARED MULTIPLAYER WORLD</div>
            <h1 className="mt-4 text-6xl font-black tracking-tight md:text-7xl">BLOCK <span className="text-emerald-400">CITY</span></h1>
            <p className="mt-2 text-xl font-bold text-amber-300">BUILD YOUR DREAM CITY</p>
            <p className="mx-auto mt-4 max-w-2xl text-slate-300">Satu kota virtual untuk semua pemain. Bangun rumah, bekerja sebagai arsitek, dokter, polisi, petani — dan lihat kota berubah bersama pemain lain secara real-time. Semua tersimpan di server.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
              <span className="rounded-xl bg-white/10 px-3 py-2">🖥️ PC Browser</span>
              <span className="rounded-xl bg-white/10 px-3 py-2">📱 Android Browser</span>
              <span className="rounded-xl bg-white/10 px-3 py-2">🧱 Voxel 3D</span>
              <span className="rounded-xl bg-white/10 px-3 py-2">💾 Persistent World</span>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl bg-white/5 p-6 backdrop-blur animate-pop">
              <h2 className="text-2xl font-black">{authTab === "login" ? "Masuk Kota" : "Daftar Warga Baru"}</h2>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setAuthTab("login")} className={`flex-1 rounded-xl py-2 font-bold ${authTab === "login" ? "bg-emerald-500 text-white" : "bg-white/10"}`}>LOGIN</button>
                <button onClick={() => setAuthTab("register")} className={`flex-1 rounded-xl py-2 font-bold ${authTab === "register" ? "bg-emerald-500 text-white" : "bg-white/10"}`}>DAFTAR</button>
              </div>
              <div className="mt-4 space-y-3">
                <input value={authForm.username} onChange={e => setAuthForm({ ...authForm, username: e.target.value })} placeholder="Username (3-20 huruf/angka)" className="w-full rounded-xl bg-slate-800 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-400" />
                <input type="password" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} placeholder="Password" className="w-full rounded-xl bg-slate-800 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-400" />
                {authTab === "register" && (
                  <>
                    <input value={authForm.displayName} onChange={e => setAuthForm({ ...authForm, displayName: e.target.value })} placeholder="Nama tampilan (mis. Budi)" className="w-full rounded-xl bg-slate-800 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-400" />
                    <div className="flex items-center gap-4 rounded-xl bg-slate-800 p-3">
                      <VoxelAvatar skin={authForm.skinColor} hair={authForm.hairColor} shirt={authForm.shirtColor} pants={authForm.pantsColor} hat={authForm.hat} gender={authForm.gender} />
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <button onClick={() => setAuthForm({ ...authForm, gender: "male" })} className={`rounded-lg px-3 py-1 text-sm font-bold ${authForm.gender === "male" ? "bg-sky-500" : "bg-slate-700"}`}>👨 Laki-laki</button>
                          <button onClick={() => setAuthForm({ ...authForm, gender: "female" })} className={`rounded-lg px-3 py-1 text-sm font-bold ${authForm.gender === "female" ? "bg-pink-500" : "bg-slate-700"}`}>👩 Perempuan</button>
                        </div>
                        <div className="flex flex-wrap gap-1">{SKIN_COLORS.map(c => <button key={c} onClick={() => setAuthForm({ ...authForm, skinColor: c })} className="h-7 w-7 rounded-md border-2" style={{ background: c, borderColor: authForm.skinColor === c ? "#fff" : "transparent" }} />)}</div>
                        <div className="flex flex-wrap gap-1">{HAIR_COLORS.map(c => <button key={c} onClick={() => setAuthForm({ ...authForm, hairColor: c })} className="h-7 w-7 rounded-md border-2" style={{ background: c, borderColor: authForm.hairColor === c ? "#fff" : "transparent" }} />)}</div>
                        <div className="flex flex-wrap gap-1">{SHIRT_COLORS.map(c => <button key={c} onClick={() => setAuthForm({ ...authForm, shirtColor: c })} className="h-7 w-7 rounded-md border-2" style={{ background: c, borderColor: authForm.shirtColor === c ? "#fff" : "transparent" }} />)}</div>
                      </div>
                    </div>
                  </>
                )}
                {authError && <p className="rounded-xl bg-red-500/20 px-3 py-2 text-sm text-red-300">❌ {authError}</p>}
                <button onClick={handleAuth} className="voxel-btn w-full rounded-xl bg-emerald-500 py-3 text-lg font-black text-white hover:bg-emerald-400">▶ {authTab === "login" ? "PLAY — Masuk Kota" : "BUAT KARAKTER & MASUK"}</button>
                <p className="text-center text-xs text-slate-400">Akun pertama yang dibuat menjadi <b className="text-amber-300">Admin Kota</b>. Semua data tersimpan di server PostgreSQL.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl bg-white/5 p-6">
                <h3 className="text-lg font-black">🏙️ 8 Distrik Kota</h3>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {DISTRICTS.map(d => <div key={d.id} className="rounded-xl bg-slate-800 p-3"><div className="h-2 w-full rounded" style={{ background: d.color }} /><p className="mt-1 text-sm font-bold">{d.name}</p><p className="text-xs text-slate-400">{d.desc}</p></div>)}
                </div>
              </div>
              <div className="rounded-3xl bg-white/5 p-6">
                <h3 className="text-lg font-black">💼 10 Profesi</h3>
                <div className="mt-3 flex flex-wrap gap-2">{JOBS.map(j => <span key={j.id} className="rounded-full bg-slate-800 px-3 py-1 text-sm">{j.icon} {j.name}</span>)}</div>
                <h3 className="mt-4 text-lg font-black">🚗 12 Kendaraan • 📋 10 Misi • 🏠 Properti</h3>
                <p className="mt-1 text-sm text-slate-400">Kontrol PC: WASD + mouse, Space lompat, Shift lari, E interaksi, B build mode. Android: joystick virtual + tombol sentuh.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // IN GAME
  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-950">
      <GameCanvas user={user} blocks={blocks} vehicles={vehicles} buildMode={buildMode} buildAction={buildAction} selectedBlock={selectedBlock} quality={quality} weather={weather} onBlockChange={handleBlockChange} onVehicleMove={handleVehicleMove} onPosChange={(x, y, z) => setPos({ x, y, z })} onInteract={handleInteract} teleportSignal={teleport} />

      {/* TOP HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2 md:p-3">
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-slate-900/85 p-2 pr-3 backdrop-blur">
          <VoxelAvatar skin={user.skinColor} hair={user.hairColor} shirt={user.shirtColor} pants={user.pantsColor} hat={user.hat} gender={user.gender} size={44} />
          <div className="min-w-[120px]">
            <p className="text-sm font-black leading-tight">{user.displayName} <span className="text-xs font-normal text-slate-400">@{user.username}</span> {user.isAdmin && <span className="rounded bg-amber-500 px-1 text-[10px] text-black">ADMIN</span>}</p>
            <p className="text-xs text-emerald-300">Lv.{user.level} • {myJob ? `${myJob.icon} ${myJob.name} Lv.${user.jobLevel}` : "Belum bekerja"}</p>
            <div className="mt-1 h-2 w-36 overflow-hidden rounded-full bg-slate-700"><div className="h-full bg-emerald-400" style={{ width: `${xpProgress * 100}%` }} /></div>
          </div>
          <div className="rounded-xl bg-amber-500/20 px-3 py-1 text-center">
            <p className="text-[10px] font-bold text-amber-300">BLOCK COIN</p>
            <p className="font-black text-amber-300">🪙 {user.balance.toLocaleString()}</p>
          </div>
        </div>
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="rounded-2xl bg-slate-900/85 p-2 backdrop-blur">
            <canvas ref={minimapRef} width={160} height={160} className="rounded-xl" />
            <p className="mt-1 text-center text-[10px] text-slate-300">{districtOf(Math.floor(pos.x), Math.floor(pos.z))} • {Math.floor(pos.x)},{Math.floor(pos.z)}</p>
          </div>
          <div className="rounded-2xl bg-slate-900/85 px-3 py-2 backdrop-blur">
            <p className="text-xs font-bold">👥 Online ({online.length})</p>
            <div className="scrollbar-thin mt-1 max-h-24 overflow-y-auto text-xs">
              {online.map(p => <p key={p.userId} className="whitespace-nowrap">{p.userId === user.id ? "⭐ " : ""}{p.displayName} <span className="text-slate-400">Lv.{p.level}</span></p>)}
            </div>
          </div>
        </div>
      </div>

      {/* LEFT MENU */}
      <div className="absolute left-2 top-28 flex flex-col gap-1 md:left-3">
        {([
          { id: "job", icon: "💼", label: "Job Center" },
          { id: "shop", icon: "🛒", label: "Shop" },
          { id: "inventory", icon: "🎒", label: "Inventory" },
          { id: "property", icon: "🏠", label: "Property" },
          { id: "vehicle", icon: "🚗", label: "Vehicle" },
          { id: "missions", icon: "📋", label: "Missions" },
          { id: "map", icon: "🗺️", label: "City Map" },
          { id: "character", icon: "🧍", label: "Character" },
          { id: "settings", icon: "⚙️", label: "Settings" },
        ] as const).map(b => (
          <button key={b.id} onClick={() => setPanel(panel === b.id ? null : b.id)} className={`voxel-btn rounded-xl px-3 py-2 text-left text-sm font-bold backdrop-blur ${panel === b.id ? "bg-emerald-500 text-white" : "bg-slate-900/85 text-white hover:bg-slate-800"}`}>{b.icon} <span className="hidden md:inline">{b.label}</span></button>
        ))}
        {user.isAdmin && <button onClick={() => { setPanel("admin"); loadAdmin(); }} className="voxel-btn rounded-xl bg-amber-500 px-3 py-2 text-left text-sm font-black text-black">👑 Admin</button>}
        <button onClick={() => setBuildMode(!buildMode)} className={`voxel-btn rounded-xl px-3 py-2 text-left text-sm font-black ${buildMode ? "bg-orange-500 text-white" : "bg-slate-900/85 text-white"}`}>🧱 Build {buildMode ? "ON" : "OFF"}</button>
        <button onClick={handleLogout} className="voxel-btn rounded-xl bg-red-900/80 px-3 py-2 text-left text-sm font-bold">🚪 Keluar</button>
      </div>

      {/* BUILD PALETTE */}
      {buildMode && (
        <div className="absolute bottom-36 left-1/2 w-[min(94vw,560px)] -translate-x-1/2 rounded-2xl bg-slate-900/90 p-2 backdrop-blur animate-slideup">
          <div className="flex items-center gap-2">
            <button onClick={() => setBuildAction("place")} className={`flex-1 rounded-xl py-1.5 text-sm font-black ${buildAction === "place" ? "bg-emerald-500" : "bg-slate-700"}`}>⛏️ Place</button>
            <button onClick={() => setBuildAction("remove")} className={`flex-1 rounded-xl py-1.5 text-sm font-black ${buildAction === "remove" ? "bg-red-500" : "bg-slate-700"}`}>🗑️ Remove</button>
            <span className="text-xs text-slate-300">Klik blok di dunia</span>
          </div>
          <div className="scrollbar-thin mt-2 flex gap-1 overflow-x-auto pb-1">
            {Object.entries(BLOCK_DEFS).map(([id, def]) => (
              <button key={id} onClick={() => setSelectedBlock(id)} className={`shrink-0 rounded-xl px-2 py-1 text-center ${selectedBlock === id ? "bg-emerald-500" : "bg-slate-800"}`}>
                <div className="mx-auto h-6 w-6 rounded" style={{ background: `#${def.color.toString(16).padStart(6, "0")}` }} />
                <p className="mt-0.5 text-[9px] font-bold">{def.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CHAT */}
      <div className="absolute bottom-2 left-2 w-[min(80vw,340px)] rounded-2xl bg-slate-900/85 p-2 backdrop-blur">
        <div className="scrollbar-thin h-28 overflow-y-auto text-xs md:h-32">
          {chat.map(m => <p key={m.id}><b className="text-emerald-300">{m.username}:</b> <span className="text-slate-200">{m.message}</span></p>)}
          <div ref={chatEndRef} />
        </div>
        <div className="mt-1 flex gap-1">
          <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder="Chat kota... (Enter)" className="flex-1 rounded-lg bg-slate-800 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-400" />
          <button onClick={sendChat} className="voxel-btn rounded-lg bg-emerald-500 px-3 font-bold">Kirim</button>
        </div>
      </div>

      {/* MISSION TRACKER + WORK */}
      <div className="absolute right-2 top-[340px] hidden w-56 flex-col gap-2 md:flex">
        {activeMission && (
          <div className="rounded-2xl bg-slate-900/85 p-3 backdrop-blur">
            <p className="text-xs font-bold text-amber-300">📋 MISI AKTIF</p>
            <p className="text-sm font-bold">{MISSIONS.find(m => m.id === activeMission.missionId)?.title}</p>
            <button onClick={() => completeMission(activeMission.missionId)} className="voxel-btn mt-2 w-full rounded-xl bg-emerald-500 py-1.5 text-sm font-black">✅ Selesaikan & Klaim</button>
          </div>
        )}
        <button onClick={() => myJob ? doWork() : setPanel("job")} disabled={workCooldown > 0} className="voxel-btn rounded-2xl bg-amber-500 px-3 py-2 font-black text-black disabled:opacity-50">
          {workCooldown > 0 ? `⏳ Shift (${workCooldown}s)` : myJob ? `💼 Kerja Shift — ${myJob.name}` : "💼 Pilih Pekerjaan Dulu"}
        </button>
        {inVehicle && <div className="rounded-2xl bg-sky-600 p-3 text-center font-bold">🚗 {inVehicle.vehicleName}<br /><span className="text-xs font-normal">WASD mengemudi • E turun</span></div>}
      </div>

      {/* MOBILE WORK BUTTON */}
      <button onClick={() => myJob ? doWork() : setPanel("job")} className="voxel-btn absolute bottom-[290px] right-3 rounded-full bg-amber-500 px-4 py-3 text-sm font-black text-black md:hidden">
        {myJob ? "💼 Shift" : "💼 Pilih Job"}
      </button>

      {/* MOBILE CONTROLS */}
      <div className="absolute bottom-36 left-3 md:hidden">
        <div ref={joyRef} onPointerDown={joyStart} onPointerMove={joyMove} onPointerUp={joyEnd} onPointerCancel={joyEnd} className="relative h-28 w-28 rounded-full bg-white/10 backdrop-blur">
          <div className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full bg-white/30" style={{ transform: `translate(calc(-50% + ${joyKnob.x}px), calc(-50% + ${joyKnob.y}px))` }} />
        </div>
      </div>
      <div className="absolute bottom-36 right-3 flex flex-col gap-2 md:hidden">
        <button onPointerDown={() => window.dispatchEvent(new CustomEvent("bc-jump"))} className="h-14 w-14 rounded-full bg-emerald-500/90 text-xl font-black">⬆️</button>
        <button onPointerDown={() => window.dispatchEvent(new CustomEvent("bc-interact"))} className="h-14 w-14 rounded-full bg-sky-500/90 text-xl font-black">E</button>
        <button onClick={() => setBuildMode(!buildMode)} className="h-14 w-14 rounded-full bg-orange-500/90 text-xl font-black">🧱</button>
      </div>

      {/* JOB PROMPT — prominent when no job selected */}
      {!user.job && (
        <button onClick={() => setPanel("job")} className="voxel-btn absolute bottom-40 left-1/2 z-10 -translate-x-1/2 animate-pulse rounded-full bg-amber-500 px-6 py-3 text-base font-black text-black shadow-2xl md:bottom-24">
          💼 Pilih Pekerjaanmu!
        </button>
      )}

      {/* DESKTOP HINT */}
      <div className="pointer-events-none absolute bottom-2 right-2 hidden rounded-xl bg-slate-900/70 px-3 py-2 text-[11px] text-slate-300 md:block">
        WASD jalan • Mouse drag kamera • Space lompat • Shift lari • E interaksi • B build • I inventory • M map • J job • Enter chat
      </div>

      {/* PANELS */}
      {panel && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/50 p-3" onClick={() => setPanel(null)}>
          <div className="scrollbar-thin max-h-[86vh] w-[min(94vw,640px)] overflow-y-auto rounded-3xl bg-slate-900 p-5 animate-pop" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">
                {panel === "job" && "💼 Job Center"}
                {panel === "shop" && "🛒 Shop BLOCK CITY"}
                {panel === "inventory" && "🎒 Inventory"}
                {panel === "property" && "🏠 Property"}
                {panel === "vehicle" && "🚗 Vehicle & Garasi"}
                {panel === "missions" && "📋 Missions & Events"}
                {panel === "map" && "🗺️ City Map"}
                {panel === "character" && "🧍 Character Editor"}
                {panel === "settings" && "⚙️ Settings"}
                {panel === "admin" && "👑 City Administration"}
              </h2>
              <button onClick={() => setPanel(null)} className="rounded-full bg-slate-700 px-3 py-1 font-bold">✕</button>
            </div>

            {panel === "job" && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-slate-300">Pilih profesi. Seragam berubah, gaji & XP per shift. Sistem saling terhubung: arsitek → konstruksi → sopir → toko.</p>
                {JOBS.map(j => (
                  <div key={j.id} className={`flex items-center gap-3 rounded-2xl p-3 ${user.job === j.id ? "bg-emerald-500/20 ring-2 ring-emerald-400" : "bg-slate-800"}`}>
                    <div className="grid h-12 w-12 place-items-center rounded-xl text-2xl" style={{ background: j.uniform }}>{j.icon}</div>
                    <div className="flex-1">
                      <p className="font-black">{j.name} {user.job === j.id && "✅"}</p>
                      <p className="text-xs text-slate-300">{j.desc}</p>
                      <p className="text-xs text-amber-300">Gaji {j.salary} BC/shift • +{j.xp} XP • 📍 {j.workplace}</p>
                    </div>
                    <button onClick={() => chooseJob(j.id)} disabled={choosingJob === j.id} className="voxel-btn rounded-xl bg-emerald-500 px-3 py-2 text-sm font-black disabled:opacity-50">{choosingJob === j.id ? "⏳..." : user.job === j.id ? "✅ Aktif" : "Pilih"}</button>
                  </div>
                ))}
                <button onClick={doWork} disabled={workCooldown > 0} className="voxel-btn w-full rounded-xl bg-amber-500 py-3 font-black text-black disabled:opacity-50">{workCooldown > 0 ? `⏳ Tunggu ${workCooldown} detik` : "💼 Kerja Shift Sekarang"}</button>
              </div>
            )}

            {panel === "shop" && (
              <div className="mt-4">
                <div className="flex flex-wrap gap-2">{["Semua", "Material", "Dekorasi", "Pakaian", "Makanan", "Alat"].map(c => <button key={c} onClick={() => setShopCat(c)} className={`rounded-full px-3 py-1 text-sm font-bold ${shopCat === c ? "bg-emerald-500" : "bg-slate-700"}`}>{c}</button>)}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                  {SHOP_ITEMS.filter(i => shopCat === "Semua" || i.cat === shopCat).map(i => (
                    <div key={i.id} className="rounded-2xl bg-slate-800 p-3 text-center">
                      <p className="text-3xl">{i.emoji}</p><p className="text-sm font-bold">{i.name}</p><p className="text-xs text-amber-300">🪙 {i.price} BC</p>
                      <button onClick={() => buyItem(i.id)} className="voxel-btn mt-2 w-full rounded-xl bg-emerald-500 py-1.5 text-sm font-black">Beli</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {panel === "inventory" && (
              <div className="mt-4">
                {inventory.length === 0 ? <p className="text-slate-400">Inventory kosong. Beli di Shop!</p> : (
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">{inventory.map(i => <div key={i.id} className="rounded-2xl bg-slate-800 p-3 text-center"><p className="font-bold">{i.name}</p><p className="text-amber-300">×{i.qty}</p></div>)}</div>
                )}
                <h3 className="mt-5 font-black">Riwayat Transaksi</h3>
                <div className="scrollbar-thin mt-2 max-h-48 overflow-y-auto space-y-1 text-sm">
                  {transactions.map(t => <p key={t.id} className="flex justify-between rounded-lg bg-slate-800 px-2 py-1"><span>{t.description}</span><span className={t.amount >= 0 ? "text-emerald-300" : "text-red-300"}>{t.amount >= 0 ? "+" : ""}{t.amount} BC</span></p>)}
                </div>
              </div>
            )}

            {panel === "property" && (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-slate-800 p-3">
                  <p className="font-black">🏠 Beli Tanah / Rumah</p>
                  <input value={propForm.name} onChange={e => setPropForm({ ...propForm, name: e.target.value })} placeholder="Nama properti" className="mt-2 w-full rounded-xl bg-slate-900 px-3 py-2 outline-none" />
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <label className="text-xs">X <input type="number" value={propForm.x} onChange={e => setPropForm({ ...propForm, x: Number(e.target.value) })} className="w-full rounded-lg bg-slate-900 px-2 py-1.5" /></label>
                    <label className="text-xs">Z <input type="number" value={propForm.z} onChange={e => setPropForm({ ...propForm, z: Number(e.target.value) })} className="w-full rounded-lg bg-slate-900 px-2 py-1.5" /></label>
                    <label className="text-xs">Harga (BC) <input type="number" value={propForm.price} onChange={e => setPropForm({ ...propForm, price: Number(e.target.value) })} className="w-full rounded-lg bg-slate-900 px-2 py-1.5" /></label>
                  </div>
                  <button onClick={() => teleportTo(propForm.x, propForm.z, "lokasi properti")} className="mt-2 w-full rounded-xl bg-sky-600 py-2 text-sm font-bold">📍 Teleport ke Lokasi</button>
                  <button onClick={buyProperty} className="voxel-btn mt-2 w-full rounded-xl bg-emerald-500 py-2.5 font-black">🏠 Beli Properti</button>
                </div>
                <h3 className="font-black">Properti Saya ({properties.length})</h3>
                {properties.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between rounded-2xl bg-slate-800 p-3">
                    <div><p className="font-bold">{p.name}</p><p className="text-xs text-slate-400">{p.district} • {p.x},{p.z} • Nilai {p.value} BC • {p.access}</p></div>
                    <div className="flex gap-1"><button onClick={() => teleportTo(p.x, p.z, p.name)} className="rounded-lg bg-sky-600 px-2 py-1 text-xs font-bold">📍</button><button onClick={() => sellProperty(p.id)} className="rounded-lg bg-red-600 px-2 py-1 text-xs font-bold">Jual</button></div>
                  </div>
                ))}
              </div>
            )}

            {panel === "vehicle" && (
              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="font-black">🛒 Beli Kendaraan</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
                    {VEHICLES.map(v => (
                      <div key={v.id} className="rounded-2xl bg-slate-800 p-3 text-center">
                        <p className="text-3xl">{v.icon}</p><p className="text-sm font-bold">{v.name}</p><p className="text-xs text-slate-400">{v.desc}</p><p className="text-xs text-amber-300">🪙 {v.price.toLocaleString()} BC</p>
                        <button onClick={() => buyVehicle(v.id, "#ef4444")} className="voxel-btn mt-2 w-full rounded-xl bg-emerald-500 py-1.5 text-sm font-black">Beli</button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-black">🚗 Garasi Saya ({vehicles.filter(v => v.userId === user.id).length})</h3>
                  {vehicles.filter(v => v.userId === user.id).map(v => (
                    <div key={v.id} className="mt-2 flex items-center justify-between rounded-2xl bg-slate-800 p-3">
                      <p className="font-bold">{v.name} <span className="text-xs font-normal text-slate-400">({Math.floor(v.x)},{Math.floor(v.z)})</span></p>
                      <button onClick={() => teleportTo(Math.floor(v.x), Math.floor(v.z), v.name)} className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-bold">📍 Ke Kendaraan</button>
                    </div>
                  ))}
                  {vehicles.filter(v => v.userId === user.id).length === 0 && <p className="text-sm text-slate-400">Belum punya kendaraan. Dekati kendaraan lalu tekan E untuk mengemudi.</p>}
                </div>
              </div>
            )}

            {panel === "missions" && (
              <div className="mt-4 space-y-2">
                {MISSIONS.map(m => {
                  const st = missions.find((x: any) => x.missionId === m.id);
                  return (
                    <div key={m.id} className="rounded-2xl bg-slate-800 p-3">
                      <div className="flex items-center justify-between"><p className="font-black">{m.title}</p><span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs">{m.difficulty}</span></div>
                      <p className="text-xs text-slate-300">{m.desc}</p>
                      <p className="text-xs text-amber-300">📍 {m.location} • Reward {m.reward} BC • +{m.xp} XP</p>
                      <div className="mt-2 flex gap-2">
                        {!st && <button onClick={() => acceptMission(m.id)} className="voxel-btn rounded-xl bg-sky-600 px-3 py-1.5 text-sm font-bold">Terima Misi</button>}
                        {st?.status === "active" && <button onClick={() => completeMission(m.id)} className="voxel-btn rounded-xl bg-emerald-500 px-3 py-1.5 text-sm font-black">✅ Klaim Reward</button>}
                        {st?.status === "completed" && <span className="text-sm text-emerald-300">✅ Selesai</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {panel === "map" && (
              <div className="mt-4">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {DISTRICTS.map(d => {
                    const center = { CITY_CENTER: [4, 4], BUSINESS: [20, 4], PUBLIC_SERVICE: [36, 4], INDUSTRIAL: [52, 4], RESIDENTIAL: [4, 20], CONSTRUCTION: [20, 20], RECREATION: [36, 20], AGRICULTURE: [52, 20] }[d.id] || [32, 32];
                    return <button key={d.id} onClick={() => teleportTo(center[0], center[1], d.name)} className="rounded-2xl bg-slate-800 p-3 text-left"><div className="h-2 rounded" style={{ background: d.color }} /><p className="mt-1 font-bold">{d.name}</p><p className="text-xs text-slate-400">{d.desc}</p><p className="text-xs text-sky-300">📍 Teleport</p></button>;
                  })}
                </div>
                <div className="mt-3 rounded-2xl bg-slate-800 p-3 text-sm">
                  <p>🏙️ Kota: <b>{cityStats?.totalBlocks ?? blocks.length} blok</b> • Level Kota {cityStats?.cityLevel ?? 1} • Treasury {(cityStats?.treasury ?? 0).toLocaleString()} BC</p>
                  <p className="text-slate-400">Dunia 64×64 voxel, chunk streaming, autosave server. Blok milik pemain lain dilindungi.</p>
                </div>
              </div>
            )}

            {panel === "character" && charForm && (
              <div className="mt-4">
                <div className="flex items-center gap-4 rounded-2xl bg-slate-800 p-4">
                  <VoxelAvatar skin={charForm.skinColor} hair={charForm.hairColor} shirt={charForm.shirtColor} pants={charForm.pantsColor} hat={charForm.hat} gender={charForm.gender} size={96} />
                  <div className="flex-1 space-y-2">
                    <input value={charForm.displayName} onChange={e => setCharForm({ ...charForm, displayName: e.target.value })} className="w-full rounded-xl bg-slate-900 px-3 py-2" placeholder="Nama tampilan" />
                    <div className="flex gap-2">
                      <button onClick={() => setCharForm({ ...charForm, gender: "male" })} className={`rounded-lg px-3 py-1 text-sm font-bold ${charForm.gender === "male" ? "bg-sky-500" : "bg-slate-700"}`}>👨 Laki-laki</button>
                      <button onClick={() => setCharForm({ ...charForm, gender: "female" })} className={`rounded-lg px-3 py-1 text-sm font-bold ${charForm.gender === "female" ? "bg-pink-500" : "bg-slate-700"}`}>👩 Perempuan</button>
                    </div>
                    <select value={charForm.hairStyle} onChange={e => setCharForm({ ...charForm, hairStyle: e.target.value })} className="w-full rounded-xl bg-slate-900 px-3 py-2"><option value="short">Rambut Pendek</option><option value="long">Rambut Panjang</option><option value="bun">Sanggul</option></select>
                    <select value={charForm.hat} onChange={e => setCharForm({ ...charForm, hat: e.target.value })} className="w-full rounded-xl bg-slate-900 px-3 py-2"><option value="none">Tanpa Topi</option><option value="cap">Topi</option><option value="helmet">Helm</option><option value="crown">Mahkota</option></select>
                  </div>
                </div>
                <p className="mt-3 text-sm font-bold">Kulit</p><div className="flex flex-wrap gap-2">{SKIN_COLORS.map(c => <button key={c} onClick={() => setCharForm({ ...charForm, skinColor: c })} className="h-9 w-9 rounded-lg border-2" style={{ background: c, borderColor: charForm.skinColor === c ? "#fff" : "transparent" }} />)}</div>
                <p className="mt-3 text-sm font-bold">Rambut</p><div className="flex flex-wrap gap-2">{HAIR_COLORS.map(c => <button key={c} onClick={() => setCharForm({ ...charForm, hairColor: c })} className="h-9 w-9 rounded-lg border-2" style={{ background: c, borderColor: charForm.hairColor === c ? "#fff" : "transparent" }} />)}</div>
                <p className="mt-3 text-sm font-bold">Baju</p><div className="flex flex-wrap gap-2">{SHIRT_COLORS.map(c => <button key={c} onClick={() => setCharForm({ ...charForm, shirtColor: c })} className="h-9 w-9 rounded-lg border-2" style={{ background: c, borderColor: charForm.shirtColor === c ? "#fff" : "transparent" }} />)}</div>
                <p className="mt-3 text-sm font-bold">Celana</p><div className="flex flex-wrap gap-2">{PANTS_COLORS.map(c => <button key={c} onClick={() => setCharForm({ ...charForm, pantsColor: c })} className="h-9 w-9 rounded-lg border-2" style={{ background: c, borderColor: charForm.pantsColor === c ? "#fff" : "transparent" }} />)}</div>
                <button onClick={saveCharacter} className="voxel-btn mt-4 w-full rounded-xl bg-emerald-500 py-3 font-black">💾 Simpan Karakter</button>
              </div>
            )}

            {panel === "settings" && (
              <div className="mt-4 space-y-4">
                <div><p className="font-bold">Kualitas Grafis</p><div className="mt-2 flex gap-2">{(["low", "medium", "high"] as const).map(q => <button key={q} onClick={() => setQuality(q)} className={`flex-1 rounded-xl py-2 font-bold capitalize ${quality === q ? "bg-emerald-500" : "bg-slate-700"}`}>{q}</button>)}</div></div>
                <div><p className="font-bold">Cuaca</p><div className="mt-2 flex gap-2"><button onClick={() => setWeather("clear")} className={`flex-1 rounded-xl py-2 font-bold ${weather === "clear" ? "bg-sky-500" : "bg-slate-700"}`}>☀️ Cerah</button><button onClick={() => setWeather("rain")} className={`flex-1 rounded-xl py-2 font-bold ${weather === "rain" ? "bg-sky-500" : "bg-slate-700"}`}>🌧️ Hujan</button></div></div>
                <div className="rounded-2xl bg-slate-800 p-3 text-sm"><p className="font-bold">Kontrol</p><p className="text-slate-300">PC: WASD, mouse drag kamera, Space lompat, Shift lari, E interaksi kendaraan, B build mode. Android: joystick kiri, tombol kanan.</p></div>
                <button onClick={() => teleportTo(32, 32, "City Center")} className="voxel-btn w-full rounded-xl bg-sky-600 py-3 font-black">📍 Teleport ke City Center</button>
              </div>
            )}

            {panel === "admin" && (
              <div className="mt-4 space-y-4">
                {!adminData ? <button onClick={loadAdmin} className="voxel-btn w-full rounded-xl bg-amber-500 py-3 font-black text-black">Muat Data Admin</button> : (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-2xl bg-slate-800 p-3"><p className="text-2xl font-black">{adminData.blockCount}</p><p className="text-xs text-slate-400">Total Blok</p></div>
                      <div className="rounded-2xl bg-slate-800 p-3"><p className="text-2xl font-black">{adminData.users.length}</p><p className="text-xs text-slate-400">Pemain</p></div>
                      <div className="rounded-2xl bg-slate-800 p-3"><p className="text-2xl font-black">{(adminData.stats?.treasury ?? 0).toLocaleString()}</p><p className="text-xs text-slate-400">Treasury BC</p></div>
                    </div>
                    <h3 className="font-black">👥 Daftar Pemain</h3>
                    <div className="scrollbar-thin max-h-40 overflow-y-auto space-y-1 text-sm">{adminData.users.map((u: any) => <p key={u.id} className="flex justify-between rounded-lg bg-slate-800 px-2 py-1"><span>{u.displayName} @{u.username}</span><span>{u.balance} BC • Lv.{u.level}</span></p>)}</div>
                    <h3 className="font-black">📜 Audit Log</h3>
                    <div className="scrollbar-thin max-h-40 overflow-y-auto space-y-1 text-xs">{adminData.logs.map((l: any) => <p key={l.id} className="rounded-lg bg-slate-800 px-2 py-1">{l.action} — {l.details}</p>)}</div>
                    <h3 className="font-black">💰 Ekonomi</h3>
                    <div className="scrollbar-thin max-h-32 overflow-y-auto space-y-1 text-xs">{adminData.transactions.map((t: any) => <p key={t.id} className="rounded-lg bg-slate-800 px-2 py-1">{t.description} • {t.amount} BC</p>)}</div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <div className="pointer-events-none absolute bottom-40 left-1/2 z-30 -translate-x-1/2 rounded-full bg-slate-900/95 px-5 py-2.5 font-bold shadow-2xl animate-pop">{toast}</div>}
    </div>
  );
}
