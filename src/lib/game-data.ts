export const WORLD_SIZE = 64;
export const WORLD_HEIGHT = 18;

export type BlockType =
  | "grass" | "dirt" | "stone" | "wood" | "plank" | "brick" | "concrete"
  | "glass" | "iron" | "roof" | "door" | "window" | "lamp" | "furniture"
  | "road" | "sidewalk" | "tree" | "leaf" | "water" | "sand" | "flower"
  | "hospital" | "police" | "fire" | "school" | "bank" | "shop" | "house_wall" | "factory";

export const BLOCK_DEFS: Record<BlockType, { name: string; color: number; price: number; emoji: string }> = {
  grass: { name: "Rumput", color: 0x4ade80, price: 2, emoji: "🟩" },
  dirt: { name: "Tanah", color: 0x92400e, price: 1, emoji: "🟫" },
  stone: { name: "Batu", color: 0x9ca3af, price: 4, emoji: "⬜" },
  wood: { name: "Kayu", color: 0xb45309, price: 5, emoji: "🪵" },
  plank: { name: "Papan", color: 0xd97706, price: 6, emoji: "🟨" },
  brick: { name: "Bata", color: 0xb91c1c, price: 8, emoji: "🧱" },
  concrete: { name: "Beton", color: 0xd1d5db, price: 7, emoji: "⬛" },
  glass: { name: "Kaca", color: 0x7dd3fc, price: 10, emoji: "🔷" },
  iron: { name: "Besi", color: 0x64748b, price: 12, emoji: "🔩" },
  roof: { name: "Atap", color: 0x7f1d1d, price: 9, emoji: "🔺" },
  door: { name: "Pintu", color: 0x78350f, price: 15, emoji: "🚪" },
  window: { name: "Jendela", color: 0x93c5fd, price: 14, emoji: "🪟" },
  lamp: { name: "Lampu", color: 0xfde047, price: 20, emoji: "💡" },
  furniture: { name: "Furnitur", color: 0xa16207, price: 25, emoji: "🪑" },
  road: { name: "Jalan", color: 0x374151, price: 3, emoji: "🛣️" },
  sidewalk: { name: "Trotoar", color: 0xe5e7eb, price: 3, emoji: "⬜" },
  tree: { name: "Batang Pohon", color: 0x713f12, price: 5, emoji: "🌳" },
  leaf: { name: "Daun", color: 0x16a34a, price: 4, emoji: "🍃" },
  water: { name: "Air", color: 0x38bdf8, price: 2, emoji: "💧" },
  sand: { name: "Pasir", color: 0xfde68a, price: 2, emoji: "🏖️" },
  flower: { name: "Bunga", color: 0xec4899, price: 6, emoji: "🌸" },
  hospital: { name: "Rumah Sakit", color: 0xf8fafc, price: 30, emoji: "🏥" },
  police: { name: "Kantor Polisi", color: 0x1d4ed8, price: 30, emoji: "🚔" },
  fire: { name: "Pemadam", color: 0xdc2626, price: 30, emoji: "🚒" },
  school: { name: "Sekolah", color: 0xf59e0b, price: 30, emoji: "🏫" },
  bank: { name: "Bank", color: 0x0f766e, price: 35, emoji: "🏦" },
  shop: { name: "Toko", color: 0x7c3aed, price: 28, emoji: "🏪" },
  house_wall: { name: "Dinding Rumah", color: 0xfef3c7, price: 8, emoji: "🏠" },
  factory: { name: "Pabrik", color: 0x57534e, price: 25, emoji: "🏭" },
};

export interface JobDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  uniform: string;
  salary: number;
  xp: number;
  workplace: string;
  tasks: string[];
}

export const JOBS: JobDef[] = [
  { id: "arsitek", name: "Arsitek", icon: "📐", desc: "Merancang rumah & gedung, membuat blueprint, menentukan material.", uniform: "#0ea5e9", salary: 350, xp: 40, workplace: "City Center", tasks: ["Desain rumah", "Blueprint gedung", "Pilih material"] },
  { id: "konstruksi", name: "Konstruksi", icon: "🏗️", desc: "Tukang bangunan, mandor, operator excavator & crane, pekerja jalan.", uniform: "#f59e0b", salary: 300, xp: 35, workplace: "Construction Area", tasks: ["Bangun dinding", "Operasikan crane", "Angkut material"] },
  { id: "polisi", name: "Polisi", icon: "🚔", desc: "Patroli, mengatur lalu lintas, menangani laporan, menjaga keamanan.", uniform: "#1d4ed8", salary: 320, xp: 38, workplace: "Public Service", tasks: ["Patroli", "Atur lalu lintas", "Tangani laporan"] },
  { id: "dokter", name: "Dokter & Medis", icon: "🏥", desc: "Dokter, perawat, ambulans, penanganan pasien.", uniform: "#f8fafc", salary: 400, xp: 45, workplace: "Rumah Sakit", tasks: ["Periksa pasien", "Bawa ambulans", "Rawat warga"] },
  { id: "pemadam", name: "Pemadam Kebakaran", icon: "🚒", desc: "Menerima laporan, mengendarai mobil pemadam, memadamkan api.", uniform: "#dc2626", salary: 330, xp: 40, workplace: "Pemadam", tasks: ["Padamkan api", "Selamatkan warga", "Patroli kebakaran"] },
  { id: "pertanian", name: "Pertanian", icon: "🌾", desc: "Petani, peternak, nelayan, pedagang hasil pertanian.", uniform: "#16a34a", salary: 250, xp: 30, workplace: "Agriculture Area", tasks: ["Tanam sayuran", "Panen", "Jual hasil"] },
  { id: "bisnis", name: "Bisnis", icon: "💼", desc: "Pemilik toko, pengusaha, koki, kasir, manajer.", uniform: "#7c3aed", salary: 380, xp: 42, workplace: "Business District", tasks: ["Kelola toko", "Masak makanan", "Layani pelanggan"] },
  { id: "transportasi", name: "Transportasi", icon: "🚌", desc: "Sopir bus, taksi, truk, pilot, kurir.", uniform: "#0891b2", salary: 310, xp: 36, workplace: "Terminal", tasks: ["Antar penumpang", "Kirim barang", "Jemput pelanggan"] },
  { id: "pendidikan", name: "Pendidikan", icon: "🎓", desc: "Guru, kepala sekolah, pengelola sekolah.", uniform: "#db2777", salary: 340, xp: 40, workplace: "Sekolah", tasks: ["Mengajar", "Kelola kelas", "Ujian siswa"] },
  { id: "teknisi", name: "Teknisi & Lainnya", icon: "🔧", desc: "Mekanik, petugas kebersihan, tukang listrik, desainer interior.", uniform: "#475569", salary: 290, xp: 34, workplace: "Industrial Area", tasks: ["Perbaiki kendaraan", "Perbaiki listrik", "Desain interior"] },
];

export interface VehicleDef {
  id: string;
  name: string;
  icon: string;
  price: number;
  speed: number;
  desc: string;
}

export const VEHICLES: VehicleDef[] = [
  { id: "sepeda", name: "Sepeda", icon: "🚲", price: 500, speed: 6, desc: "Hemat & ramah lingkungan" },
  { id: "motor", name: "Motor", icon: "🏍️", price: 2500, speed: 12, desc: "Lincah untuk kota" },
  { id: "mobil", name: "Mobil Pribadi", icon: "🚗", price: 8000, speed: 14, desc: "Nyaman untuk keluarga" },
  { id: "taksi", name: "Taksi", icon: "🚕", price: 9000, speed: 14, desc: "Siap antar penumpang" },
  { id: "bus", name: "Bus Kota", icon: "🚌", price: 20000, speed: 10, desc: "Angkut banyak penumpang" },
  { id: "truk", name: "Truk", icon: "🚚", price: 18000, speed: 9, desc: "Kirim material konstruksi" },
  { id: "ambulans", name: "Ambulans", icon: "🚑", price: 15000, speed: 13, desc: "Untuk tenaga medis" },
  { id: "polisi", name: "Mobil Polisi", icon: "🚔", price: 16000, speed: 15, desc: "Patroli keamanan" },
  { id: "pemadam", name: "Mobil Pemadam", icon: "🚒", price: 17000, speed: 12, desc: "Padamkan kebakaran" },
  { id: "excavator", name: "Excavator", icon: "🚜", price: 25000, speed: 7, desc: "Alat berat konstruksi" },
  { id: "bulldozer", name: "Bulldozer", icon: "🚧", price: 28000, speed: 7, desc: "Ratakan tanah" },
  { id: "crane", name: "Crane", icon: "🏗️", price: 30000, speed: 6, desc: "Angkat material tinggi" },
];

export interface MissionDef {
  id: string;
  title: string;
  desc: string;
  location: string;
  difficulty: "Mudah" | "Sedang" | "Sulit";
  reward: number;
  xp: number;
  job: string;
}

export const MISSIONS: MissionDef[] = [
  { id: "m1", title: "Bangun Rumah untuk Warga", desc: "Tempatkan 10 blok di area Residential untuk warga baru.", location: "Residential Area", difficulty: "Mudah", reward: 500, xp: 50, job: "konstruksi" },
  { id: "m2", title: "Perbaiki Jalan Rusak", desc: "Perbaiki 8 blok jalan di City Center.", location: "City Center", difficulty: "Mudah", reward: 400, xp: 40, job: "konstruksi" },
  { id: "m3", title: "Antar Material", desc: "Antar material ke Construction Area dengan truk.", location: "Construction Area", difficulty: "Sedang", reward: 650, xp: 60, job: "transportasi" },
  { id: "m4", title: "Padamkan Kebakaran", desc: "Padamkan api di Industrial Area bersama tim.", location: "Industrial Area", difficulty: "Sulit", reward: 900, xp: 90, job: "pemadam" },
  { id: "m5", title: "Antar Pasien ke Rumah Sakit", desc: "Bawa pasien dengan ambulans ke Rumah Sakit.", location: "Public Service", difficulty: "Sedang", reward: 700, xp: 65, job: "dokter" },
  { id: "m6", title: "Patroli Keamanan", desc: "Patroli keliling Business District selama 1 shift.", location: "Business District", difficulty: "Mudah", reward: 450, xp: 45, job: "polisi" },
  { id: "m7", title: "Tanam & Panen Sayuran", desc: "Tanam 10 blok bunga/sayuran di Agriculture Area.", location: "Agriculture Area", difficulty: "Mudah", reward: 380, xp: 38, job: "pertanian" },
  { id: "m8", title: "Kirim Barang ke Toko", desc: "Kirim barang ke Business District dengan motor.", location: "Business District", difficulty: "Sedang", reward: 550, xp: 55, job: "transportasi" },
  { id: "m9", title: "Perbaiki Kendaraan Warga", desc: "Perbaiki kendaraan rusak di Bengkel Industrial.", location: "Industrial Area", difficulty: "Sedang", reward: 600, xp: 58, job: "teknisi" },
  { id: "m10", title: "Desain Taman Kota", desc: "Buat taman dengan 12 blok dekorasi di Recreation Area.", location: "Recreation Area", difficulty: "Sulit", reward: 850, xp: 85, job: "arsitek" },
];

export const DISTRICTS = [
  { id: "CITY_CENTER", name: "City Center", color: "#0ea5e9", desc: "Balai kota, kantor, bank, mal" },
  { id: "RESIDENTIAL", name: "Residential Area", color: "#22c55e", desc: "Perumahan & apartemen" },
  { id: "CONSTRUCTION", name: "Construction Area", color: "#f59e0b", desc: "Proyek gedung & gudang" },
  { id: "PUBLIC_SERVICE", name: "Public Service", color: "#ef4444", desc: "RS, polisi, pemadam, sekolah" },
  { id: "BUSINESS", name: "Business District", color: "#a855f7", desc: "Toko, resto, pasar, supermarket" },
  { id: "INDUSTRIAL", name: "Industrial Area", color: "#78716c", desc: "Pabrik, gudang, bengkel" },
  { id: "AGRICULTURE", name: "Agriculture Area", color: "#84cc16", desc: "Sawah, kebun, peternakan" },
  { id: "RECREATION", name: "Recreation Area", color: "#ec4899", desc: "Taman, stadion, wisata" },
];

export const SHOP_ITEMS = [
  { id: "grass", name: "Rumput", price: 2, cat: "Material", emoji: "🟩" },
  { id: "stone", name: "Batu", price: 4, cat: "Material", emoji: "⬜" },
  { id: "wood", name: "Kayu", price: 5, cat: "Material", emoji: "🪵" },
  { id: "brick", name: "Bata", price: 8, cat: "Material", emoji: "🧱" },
  { id: "concrete", name: "Beton", price: 7, cat: "Material", emoji: "⬛" },
  { id: "glass", name: "Kaca", price: 10, cat: "Material", emoji: "🔷" },
  { id: "lamp", name: "Lampu Jalan", price: 20, cat: "Dekorasi", emoji: "💡" },
  { id: "furniture", name: "Furnitur", price: 25, cat: "Dekorasi", emoji: "🪑" },
  { id: "flower", name: "Bunga", price: 6, cat: "Dekorasi", emoji: "🌸" },
  { id: "shirt_red", name: "Kaos Merah", price: 300, cat: "Pakaian", emoji: "👕" },
  { id: "shirt_blue", name: "Kaos Biru", price: 300, cat: "Pakaian", emoji: "👕" },
  { id: "hat_cap", name: "Topi", price: 250, cat: "Pakaian", emoji: "🧢" },
  { id: "food_burger", name: "Burger", price: 50, cat: "Makanan", emoji: "🍔" },
  { id: "food_coffee", name: "Kopi", price: 30, cat: "Makanan", emoji: "☕" },
  { id: "tool_hammer", name: "Palu", price: 400, cat: "Alat", emoji: "🔨" },
  { id: "tool_wrench", name: "Kunci Pas", price: 350, cat: "Alat", emoji: "🔧" },
];

export const SKIN_COLORS = ["#f2c79b", "#e8b88a", "#c68642", "#8d5524", "#ffdbac", "#f1c27d"];
export const HAIR_COLORS = ["#3b2f2f", "#000000", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#22c55e"];
export const SHIRT_COLORS = ["#2563eb", "#ef4444", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6", "#f8fafc", "#1e293b"];
export const PANTS_COLORS = ["#1e293b", "#374151", "#1d4ed8", "#7c2d12", "#14532d", "#4c1d95"];

export function districtOf(x: number, z: number): string {
  const cx = Math.floor(x / 16);
  const cz = Math.floor(z / 16);
  const map: Record<string, string> = {
    "0,0": "CITY_CENTER", "1,0": "BUSINESS", "2,0": "PUBLIC_SERVICE", "3,0": "INDUSTRIAL",
    "0,1": "RESIDENTIAL", "1,1": "CONSTRUCTION", "2,1": "RECREATION", "3,1": "AGRICULTURE",
    "0,2": "RESIDENTIAL", "1,2": "BUSINESS", "2,2": "CITY_CENTER", "3,2": "INDUSTRIAL",
    "0,3": "AGRICULTURE", "1,3": "RECREATION", "2,3": "RESIDENTIAL", "3,3": "CONSTRUCTION",
  };
  return map[`${cx},${cz}`] ?? "RESIDENTIAL";
}
