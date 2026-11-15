"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { BLOCK_DEFS, WORLD_SIZE } from "@/lib/game-data";
import { apiFetch } from "@/lib/client-auth";

export interface RemotePlayer {
  userId: string; displayName: string; username: string;
  skinColor: string; hairColor: string; hairStyle: string; shirtColor: string; pantsColor: string; hat: string; gender: string;
  job: string | null; level: number;
  x: number; y: number; z: number; rot: number; inVehicle: boolean;
}

export interface VehicleRow { id: string; userId: string; vehicleType: string; name: string; color: string; x: number; z: number; }

interface Props {
  user: { id: string; displayName: string; skinColor: string; hairColor: string; hairStyle: string; shirtColor: string; pantsColor: string; hat: string; gender: string; job: string | null };
  blocks: { x: number; y: number; z: number; type: string }[];
  vehicles: VehicleRow[];
  buildMode: boolean;
  buildAction: "place" | "remove";
  selectedBlock: string;
  quality: "low" | "medium" | "high";
  weather: "clear" | "rain";
  onBlockChange: (x: number, y: number, z: number, type: string, action: "place" | "remove") => Promise<void>;
  onVehicleMove: (id: string, x: number, z: number) => void;
  onPosChange: (x: number, y: number, z: number) => void;
  onInteract: (info: { type: "vehicle" | "none"; vehicleId?: string; vehicleName?: string }) => void;
  teleportSignal: { x: number; z: number; n: number } | null;
}

function makeLabel(text: string, color = "#ffffff") {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.beginPath(); ctx.roundRect(8, 8, 240, 48, 12); ctx.fill();
  ctx.fillStyle = color; ctx.font = "bold 26px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text.slice(0, 18), 128, 33);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(2.4, 0.6, 1);
  return sp;
}

function buildCharacter(opts: { skin: string; hair: string; hairStyle: string; shirt: string; pants: string; hat: string; gender: string; name: string }) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: opts.skin });
  const shirt = new THREE.MeshStandardMaterial({ color: opts.shirt });
  const pants = new THREE.MeshStandardMaterial({ color: opts.pants });
  const hairM = new THREE.MeshStandardMaterial({ color: opts.hair });
  const dark = new THREE.MeshStandardMaterial({ color: 0x111827 });
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z); mesh.castShadow = true; return mesh;
  };
  const legL = box(0.28, 0.7, 0.3, pants, -0.18, 0.35, 0);
  const legR = box(0.28, 0.7, 0.3, pants, 0.18, 0.35, 0);
  const torso = box(0.7, 0.75, 0.4, shirt, 0, 1.08, 0);
  const armL = box(0.22, 0.65, 0.24, shirt, -0.48, 1.1, 0);
  const armR = box(0.22, 0.65, 0.24, shirt, 0.48, 1.1, 0);
  const head = box(0.55, 0.55, 0.55, skin, 0, 1.75, 0);
  const eyeL = box(0.08, 0.08, 0.02, dark, -0.12, 1.78, 0.29);
  const eyeR = box(0.08, 0.08, 0.02, dark, 0.12, 1.78, 0.29);
  g.add(legL, legR, torso, armL, armR, head, eyeL, eyeR);
  // hair
  if (opts.hairStyle === "long") {
    g.add(box(0.6, 0.5, 0.6, hairM, 0, 1.95, -0.05));
    g.add(box(0.12, 0.6, 0.12, hairM, -0.3, 1.6, -0.1));
    g.add(box(0.12, 0.6, 0.12, hairM, 0.3, 1.6, -0.1));
  } else if (opts.hairStyle === "bun") {
    g.add(box(0.6, 0.3, 0.6, hairM, 0, 2.0, 0));
    g.add(box(0.25, 0.25, 0.25, hairM, 0, 2.2, -0.1));
  } else {
    g.add(box(0.6, 0.22, 0.6, hairM, 0, 2.02, 0));
  }
  if (opts.hat === "cap") g.add(box(0.62, 0.15, 0.62, new THREE.MeshStandardMaterial({ color: 0xef4444 }), 0, 2.08, 0));
  if (opts.hat === "helmet") g.add(box(0.66, 0.3, 0.66, new THREE.MeshStandardMaterial({ color: 0xf59e0b }), 0, 2.02, 0));
  if (opts.hat === "crown") g.add(box(0.5, 0.25, 0.5, new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.6, roughness: 0.3 }), 0, 2.15, 0));
  const label = makeLabel(opts.name);
  label.position.set(0, 2.7, 0);
  g.add(label);
  g.userData = { legL, legR, armL, armR, head, label };
  return g;
}

function buildVehicle(type: string, color: string, name: string) {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1f2937 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.8 });
  const wheel = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z); mesh.castShadow = true; g.add(mesh); return mesh;
  };
  const wheels: THREE.Mesh[] = [];
  const addWheel = (x: number, z: number) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.25, 12), wheel);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.32, z); g.add(w); wheels.push(w);
  };
  if (type === "sepeda") {
    box(1.4, 0.15, 0.2, body, 0, 0.6, 0);
    box(0.15, 0.7, 0.15, body, 0.5, 0.45, 0);
    box(0.15, 0.7, 0.15, body, -0.5, 0.45, 0);
    addWheel(0.6, 0); addWheel(-0.6, 0);
  } else if (type === "motor") {
    box(1.6, 0.5, 0.5, body, 0, 0.55, 0);
    box(0.5, 0.5, 0.45, dark, -0.5, 0.75, 0);
    addWheel(0.7, 0); addWheel(-0.7, 0);
  } else if (type === "bus" || type === "truk") {
    box(4.2, 1.4, 1.6, body, 0, 1.1, 0);
    box(4.0, 0.6, 1.62, glass, 0, 1.5, 0);
    if (type === "truk") box(1.6, 1.2, 1.5, dark, 1.6, 0.9, 0);
    addWheel(1.5, 0.85); addWheel(1.5, -0.85); addWheel(-1.5, 0.85); addWheel(-1.5, -0.85);
  } else if (type === "excavator" || type === "bulldozer" || type === "crane") {
    box(2.6, 1.0, 1.4, body, 0, 0.9, 0);
    box(1.0, 0.9, 1.0, glass, 0.3, 1.7, 0);
    box(2.2, 0.5, 0.3, dark, 1.8, 1.2, 0);
    box(0.8, 0.8, 0.3, dark, 2.8, 0.7, 0);
    addWheel(1.0, 0.8); addWheel(1.0, -0.8); addWheel(-1.0, 0.8); addWheel(-1.0, -0.8);
  } else {
    // car variants
    box(2.2, 0.6, 1.1, body, 0, 0.6, 0);
    box(1.2, 0.55, 1.0, glass, -0.1, 1.1, 0);
    box(0.15, 0.2, 0.9, new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xfde047, emissiveIntensity: 0.4 }), 1.12, 0.6, 0);
    addWheel(0.75, 0.6); addWheel(0.75, -0.6); addWheel(-0.75, 0.6); addWheel(-0.75, -0.6);
    if (type === "ambulans") box(2.0, 0.7, 1.05, new THREE.MeshStandardMaterial({ color: 0xf8fafc }), 0, 1.35, 0);
    if (type === "polisi") box(1.0, 0.25, 0.9, new THREE.MeshStandardMaterial({ color: 0x1d4ed8 }), 0, 1.45, 0);
    if (type === "pemadam") { box(2.0, 0.8, 1.05, new THREE.MeshStandardMaterial({ color: 0xdc2626 }), 0, 1.35, 0); }
  }
  const label = makeLabel(name, "#fde047");
  label.position.set(0, 2.6, 0);
  g.add(label);
  g.userData.wheels = wheels;
  return g;
}

export default function GameCanvas(props: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<any>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const W = mount.clientWidth || 800, H = mount.clientHeight || 600;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 30, 90);

    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 300);
    camera.position.set(32, 8, 44);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x4ade80, 0.9);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(40, 60, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -50; sun.shadow.camera.right = 50; sun.shadow.camera.top = 50; sun.shadow.camera.bottom = -50;
    scene.add(sun);
    const moon = new THREE.DirectionalLight(0x93c5fd, 0);
    moon.position.set(-30, 40, -20);
    scene.add(moon);

    // ground
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_SIZE + 40, WORLD_SIZE + 40), new THREE.MeshStandardMaterial({ color: 0x4ade80 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(WORLD_SIZE / 2, -0.51, WORLD_SIZE / 2);
    ground.receiveShadow = true;
    scene.add(ground);

    // clouds
    const clouds: THREE.Mesh[] = [];
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    for (let i = 0; i < 12; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(4 + Math.random() * 4, 1, 3 + Math.random() * 3), cloudMat);
      c.position.set(Math.random() * WORLD_SIZE, 22 + Math.random() * 6, Math.random() * WORLD_SIZE);
      scene.add(c); clouds.push(c);
    }

    // rain
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) { rainPos[i * 3] = Math.random() * WORLD_SIZE; rainPos[i * 3 + 1] = Math.random() * 20; rainPos[i * 3 + 2] = Math.random() * WORLD_SIZE; }
    rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
    const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0x7dd3fc, size: 0.15 }));
    rain.visible = false;
    scene.add(rain);

    // blocks
    const blockGeo = new THREE.BoxGeometry(1, 1, 1);
    const matCache = new Map<string, THREE.MeshStandardMaterial>();
    const getMat = (type: string) => {
      if (!matCache.has(type)) {
        const def = BLOCK_DEFS[type as keyof typeof BLOCK_DEFS];
        const color = def ? def.color : 0xff00ff;
        const transparent = type === "glass" || type === "water";
        const emissive = type === "lamp" ? new THREE.Color(0xfde047) : new THREE.Color(0x000000);
        matCache.set(type, new THREE.MeshStandardMaterial({ color, transparent, opacity: transparent ? 0.65 : 1, emissive, emissiveIntensity: type === "lamp" ? 0.8 : 0 }));
      }
      return matCache.get(type)!;
    };
    const blockMap = new Map<string, THREE.Mesh>();
    const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
    const addBlockMesh = (x: number, y: number, z: number, type: string) => {
      const k = key(x, y, z);
      if (blockMap.has(k)) scene.remove(blockMap.get(k)!);
      const mesh = new THREE.Mesh(blockGeo, getMat(type));
      mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData = { x, y, z, type };
      scene.add(mesh); blockMap.set(k, mesh);
    };
    const removeBlockMesh = (x: number, y: number, z: number) => {
      const k = key(x, y, z);
      const m = blockMap.get(k);
      if (m) { scene.remove(m); blockMap.delete(k); }
    };
    const heightAt = (x: number, z: number) => {
      let h = 0;
      for (let y = 18; y >= 0; y--) if (blockMap.has(key(x, y, z))) return y + 1;
      return h;
    };

    // player
    let playerGroup = buildCharacter({
      skin: propsRef.current.user.skinColor, hair: propsRef.current.user.hairColor, hairStyle: propsRef.current.user.hairStyle,
      shirt: propsRef.current.user.shirtColor, pants: propsRef.current.user.pantsColor, hat: propsRef.current.user.hat,
      gender: propsRef.current.user.gender, name: propsRef.current.user.displayName,
    });
    scene.add(playerGroup);

    // NPCs
    const npcs: { g: THREE.Group; target: THREE.Vector3; speed: number }[] = [];
    const npcNames = ["Warga Budi", "Warga Siti", "Pak RT", "Bu Guru", "Pak Dokter", "Ibu Kasir", "Pak Sopir", "Mbak Petani"];
    const npcColors = ["#ef4444", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6", "#f97316", "#84cc16"];
    for (let i = 0; i < 8; i++) {
      const g = buildCharacter({ skin: "#f2c79b", hair: "#3b2f2f", hairStyle: "short", shirt: npcColors[i], pants: "#374151", hat: "none", gender: "male", name: npcNames[i] });
      g.position.set(8 + Math.random() * 48, 1, 8 + Math.random() * 48);
      scene.add(g);
      npcs.push({ g, target: new THREE.Vector3(8 + Math.random() * 48, 1, 8 + Math.random() * 48), speed: 1 + Math.random() });
    }

    // remote players
    const remoteMap = new Map<string, { g: THREE.Group; target: THREE.Vector3; rot: number }>();
    // vehicles
    const vehicleMap = new Map<string, THREE.Group>();

    // ghost preview
    const ghost = new THREE.Mesh(blockGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 }));
    ghost.visible = false;
    scene.add(ghost);

    const S = {
      renderer, scene, camera, sun, moon, hemi, rain, clouds, blockMap, addBlockMesh, removeBlockMesh, heightAt,
      playerGroup, npcs, remoteMap, vehicleMap, ghost,
      pos: new THREE.Vector3(32.5, 2, 32.5),
      vel: new THREE.Vector3(),
      yaw: Math.PI, pitch: 0.35, camDist: 9,
      keys: new Set<string>(),
      joy: { x: 0, y: 0 },
      grounded: false,
      inVehicle: null as string | null,
      vehicleSpeed: 0,
      vehicleRot: 0,
      walkPhase: 0,
      time: 10, // hours
      lastPresence: 0,
      lastVehicleSync: 0,
      lastPosCb: 0,
      disposed: false,
    };
    (S as any).rebuildPlayer = (u: Props["user"]) => {
      scene.remove(playerGroup);
      playerGroup = buildCharacter({
        skin: u.skinColor, hair: u.hairColor, hairStyle: u.hairStyle,
        shirt: u.shirtColor, pants: u.pantsColor, hat: u.hat,
        gender: u.gender, name: u.displayName,
      });
      scene.add(playerGroup);
      S.playerGroup = playerGroup;
    };
    stateRef.current = S;

    // initial blocks
    for (const b of propsRef.current.blocks) addBlockMesh(b.x, b.y, b.z, b.type);
    // initial vehicles
    for (const v of propsRef.current.vehicles) {
      const g = buildVehicle(v.vehicleType, v.color, v.name);
      g.position.set(v.x, heightAt(Math.floor(v.x), Math.floor(v.z)) + 0.5, v.z);
      scene.add(g); vehicleMap.set(v.id, g);
    }

    // input
    const onKeyDown = (e: KeyboardEvent) => { S.keys.add(e.code); if (e.code === "Space") e.preventDefault(); };
    const onKeyUp = (e: KeyboardEvent) => S.keys.delete(e.code);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let dragging = false, lastX = 0, lastY = 0;
    const el = renderer.domElement;
    const onPointerDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; };
    const onPointerUp = (e: PointerEvent) => {
      dragging = false;
      // click = build if in build mode (only if not dragged much)
      if (propsRef.current.buildMode) {
        const rect = el.getBoundingClientRect();
        const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(mx, my), camera);
        const meshes = Array.from(blockMap.values());
        const hits = ray.intersectObjects(meshes);
        if (hits.length) {
          const h = hits[0];
          const ud = h.object.userData;
          if (propsRef.current.buildAction === "remove") {
            propsRef.current.onBlockChange(ud.x, ud.y, ud.z, ud.type, "remove");
          } else {
            const n = h.face?.normal;
            if (n) {
              const wx = Math.floor(h.point.x - n.x * 0.5);
              const wy = Math.floor(h.point.y - n.y * 0.5);
              const wz = Math.floor(h.point.z - n.z * 0.5);
              propsRef.current.onBlockChange(wx, wy, wz, propsRef.current.selectedBlock, "place");
            }
          }
        } else {
          // place on ground
          const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1);
          const pt = new THREE.Vector3();
          ray.ray.intersectPlane(plane, pt);
          if (pt && propsRef.current.buildAction === "place") {
            const wx = Math.floor(pt.x), wz = Math.floor(pt.z);
            const wy = heightAt(wx, wz);
            propsRef.current.onBlockChange(wx, wy, wz, propsRef.current.selectedBlock, "place");
          }
        }
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      S.yaw -= dx * 0.005;
      S.pitch = Math.max(0.05, Math.min(1.4, S.pitch + dy * 0.005));
    };
    const onWheel = (e: WheelEvent) => { S.camDist = Math.max(4, Math.min(20, S.camDist + e.deltaY * 0.02)); };
    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointermove", onPointerMove);
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("contextmenu", (e) => { if (propsRef.current.buildMode) e.preventDefault(); });

    const onJoystick = (e: Event) => { const d = (e as CustomEvent).detail; S.joy.x = d.x; S.joy.y = d.y; };
    const onJump = () => { if (S.grounded && !S.inVehicle) { S.vel.y = 8; S.grounded = false; } };
    const onInteractKey = () => {
      if (S.inVehicle) {
        const vid = S.inVehicle;
        S.inVehicle = null;
        playerGroup.visible = true;
        propsRef.current.onInteract({ type: "none" });
        // sync vehicle pos
        const vg = vehicleMap.get(vid);
        if (vg) propsRef.current.onVehicleMove(vid, vg.position.x, vg.position.z);
      } else {
        // find nearest vehicle within 3
        let best: string | null = null, bestD = 3.5;
        for (const [id, g] of vehicleMap) {
          const d = g.position.distanceTo(S.pos);
          if (d < bestD) { bestD = d; best = id; }
        }
        if (best) {
          S.inVehicle = best;
          S.vehicleRot = vehicleMap.get(best)!.rotation.y;
          playerGroup.visible = false;
          const vg = vehicleMap.get(best)!;
          propsRef.current.onInteract({ type: "vehicle", vehicleId: best, vehicleName: vg.userData.name || "Kendaraan" });
        }
      }
    };
    const onTeleport = (e: Event) => { const d = (e as CustomEvent).detail; S.pos.set(d.x, heightAt(Math.floor(d.x), Math.floor(d.z)) + 1, d.z); };
    window.addEventListener("bc-joystick", onJoystick);
    window.addEventListener("bc-jump", onJump);
    window.addEventListener("bc-interact", onInteractKey);
    window.addEventListener("bc-teleport", onTeleport);

    // presence polling
    const pollPresence = async () => {
      if (S.disposed) return;
      try {
        const r = await apiFetch("/api/presence");
        if (!r.ok) return;
        const data = await r.json();
        const seen = new Set<string>();
        for (const p of data.players as RemotePlayer[]) {
          if (p.userId === propsRef.current.user.id) continue;
          seen.add(p.userId);
          if (!remoteMap.has(p.userId)) {
            const g = buildCharacter({ skin: p.skinColor, hair: p.hairColor, hairStyle: p.hairStyle, shirt: p.shirtColor, pants: p.pantsColor, hat: p.hat, gender: p.gender, name: p.displayName });
            g.position.set(p.x, p.y, p.z);
            scene.add(g);
            remoteMap.set(p.userId, { g, target: new THREE.Vector3(p.x, p.y, p.z), rot: p.rot });
          } else {
            const e = remoteMap.get(p.userId)!;
            e.target.set(p.x, p.y, p.z); e.rot = p.rot;
          }
        }
        for (const [id] of remoteMap) if (!seen.has(id)) { scene.remove(remoteMap.get(id)!.g); remoteMap.delete(id); }
      } catch { /* ignore */ }
    };
    pollPresence();
    const pollTimer = setInterval(pollPresence, 2000);

    const clock = new THREE.Clock();
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const P = propsRef.current;
      // quality
      renderer.shadowMap.enabled = P.quality !== "low";
      renderer.setPixelRatio(P.quality === "high" ? Math.min(window.devicePixelRatio, 2) : P.quality === "medium" ? 1.5 : 1);

      // day/night
      S.time = (S.time + dt * 0.02) % 24;
      const sunAngle = ((S.time - 6) / 12) * Math.PI;
      const dayFactor = Math.max(0, Math.sin(sunAngle));
      const isNight = dayFactor < 0.15;
      sun.intensity = 0.2 + dayFactor * 1.6;
      moon.intensity = isNight ? 0.5 : 0;
      hemi.intensity = 0.25 + dayFactor * 0.7;
      sun.position.set(32 + Math.cos(sunAngle) * 50, Math.max(5, Math.sin(sunAngle) * 50), 32 + 20);
      const sky = isNight ? new THREE.Color(0x0f172a) : new THREE.Color().setHSL(0.58, 0.7, 0.5 + dayFactor * 0.2);
      scene.background = sky; scene.fog!.color = sky;
      // lamp glow at night
      for (const [, m] of matCache) if (m.emissiveIntensity !== undefined) m.emissiveIntensity = isNight ? 1.2 : 0.3;

      // weather
      rain.visible = P.weather === "rain";
      if (rain.visible) {
        const pos = rainGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < 600; i++) {
          let y = pos.getY(i) - dt * 18;
          if (y < 0) y = 20;
          pos.setY(i, y);
        }
        pos.needsUpdate = true;
      }
      for (const c of clouds) { c.position.x += dt * 0.6; if (c.position.x > WORLD_SIZE + 10) c.position.x = -10; }

      // movement input
      let ix = 0, iz = 0;
      if (S.keys.has("KeyW") || S.keys.has("ArrowUp")) iz -= 1;
      if (S.keys.has("KeyS") || S.keys.has("ArrowDown")) iz += 1;
      if (S.keys.has("KeyA") || S.keys.has("ArrowLeft")) ix -= 1;
      if (S.keys.has("KeyD") || S.keys.has("ArrowRight")) ix += 1;
      ix += S.joy.x; iz += S.joy.y;
      const len = Math.hypot(ix, iz);
      if (len > 1) { ix /= len; iz /= len; }
      const run = S.keys.has("ShiftLeft") || S.keys.has("ShiftRight");
      const speed = run ? 9 : 5;

      if (S.inVehicle) {
        const vg = vehicleMap.get(S.inVehicle)!;
        const maxSpeed = 12;
        if (iz < -0.1) S.vehicleSpeed = Math.min(maxSpeed, S.vehicleSpeed + dt * 10);
        else if (iz > 0.1) S.vehicleSpeed = Math.max(-6, S.vehicleSpeed - dt * 10);
        else S.vehicleSpeed *= 0.92;
        if (ix !== 0) S.vehicleRot += ix * dt * 1.8 * (S.vehicleSpeed >= 0 ? 1 : -1);
        vg.rotation.y = S.vehicleRot;
        const dir = new THREE.Vector3(Math.sin(S.vehicleRot), 0, Math.cos(S.vehicleRot));
        // vehicle forward is -Z in build? use sin/cos consistent
        const nx = vg.position.x + dir.x * S.vehicleSpeed * dt;
        const nz = vg.position.z + dir.z * S.vehicleSpeed * dt;
        const gx = Math.floor(nx), gz = Math.floor(nz);
        // simple collision: don't enter blocks taller than ground+1
        const groundH = heightAt(gx, gz);
        if (groundH <= 1) { vg.position.x = nx; vg.position.z = nz; }
        vg.position.y = heightAt(Math.floor(vg.position.x), Math.floor(vg.position.z)) + 0.5;
        S.pos.copy(vg.position).add(new THREE.Vector3(0, 1.5, 0));
        // wheels spin
        for (const w of (vg.userData.wheels || [])) w.rotation.x += S.vehicleSpeed * dt * 2;
        if (performance.now() - S.lastVehicleSync > 1500) {
          S.lastVehicleSync = performance.now();
          P.onVehicleMove(S.inVehicle, vg.position.x, vg.position.z);
        }
      } else {
        // rotate input by camera yaw
        const sin = Math.sin(S.yaw), cos = Math.cos(S.yaw);
        const wx = ix * cos - iz * sin;
        const wz = ix * sin + iz * cos;
        S.vel.x = wx * speed;
        S.vel.z = wz * speed;
        if (S.keys.has("Space") && S.grounded) { S.vel.y = 8; S.grounded = false; }
        S.vel.y -= 22 * dt;
        const nx = S.pos.x + S.vel.x * dt;
        const nz = S.pos.z + S.vel.z * dt;
        // collision: check block at new xz at feet height
        const feetY = S.pos.y - 1;
        const canStand = (x: number, z: number) => {
          const bx = Math.floor(x), bz = Math.floor(z);
          const h = heightAt(bx, bz);
          return h <= feetY + 0.6 || S.pos.y >= h + 0.9;
        };
        if (canStand(nx, S.pos.z)) S.pos.x = nx;
        if (canStand(S.pos.x, nz)) S.pos.z = nz;
        S.pos.x = Math.max(0.5, Math.min(WORLD_SIZE - 0.5, S.pos.x));
        S.pos.z = Math.max(0.5, Math.min(WORLD_SIZE - 0.5, S.pos.z));
        S.pos.y += S.vel.y * dt;
        const groundY = heightAt(Math.floor(S.pos.x), Math.floor(S.pos.z)) + 1;
        if (S.pos.y <= groundY) { S.pos.y = groundY; S.vel.y = 0; S.grounded = true; }
        // face movement
        if (Math.abs(wx) > 0.1 || Math.abs(wz) > 0.1) {
          const targetRot = Math.atan2(wx, wz);
          playerGroup.rotation.y = targetRot;
        }
      }

      // player mesh + animation
      playerGroup.position.copy(S.pos).add(new THREE.Vector3(0, -1, 0));
      const moving = Math.abs(S.vel.x) > 0.5 || Math.abs(S.vel.z) > 0.5;
      if (moving && S.grounded) {
        S.walkPhase += dt * (run ? 14 : 9);
        const s = Math.sin(S.walkPhase) * 0.6;
        playerGroup.userData.legL.rotation.x = s;
        playerGroup.userData.legR.rotation.x = -s;
        playerGroup.userData.armL.rotation.x = -s;
        playerGroup.userData.armR.rotation.x = s;
      } else {
        playerGroup.userData.legL.rotation.x *= 0.8; playerGroup.userData.legR.rotation.x *= 0.8;
        playerGroup.userData.armL.rotation.x *= 0.8; playerGroup.userData.armR.rotation.x *= 0.8;
      }
      if (!S.grounded && !S.inVehicle) {
        playerGroup.userData.armL.rotation.x = -2.4; playerGroup.userData.armR.rotation.x = -2.4;
      }

      // NPC wander
      for (const n of npcs) {
        const to = n.target.clone().sub(n.g.position); to.y = 0;
        if (to.length() < 1) n.target.set(4 + Math.random() * 56, 1, 4 + Math.random() * 56);
        else {
          to.normalize();
          n.g.position.add(to.multiplyScalar(n.speed * dt));
          n.g.position.y = heightAt(Math.floor(n.g.position.x), Math.floor(n.g.position.z)) + 0.0;
          n.g.rotation.y = Math.atan2(to.x, to.z);
          S.walkPhase += 0;
        }
      }

      // remote lerp
      for (const [, e] of remoteMap) {
        e.g.position.lerp(e.target, 0.25);
        e.g.rotation.y = e.rot;
      }

      // camera
      const focus = S.inVehicle ? vehicleMap.get(S.inVehicle)!.position.clone().add(new THREE.Vector3(0, 2, 0)) : S.pos.clone();
      camera.position.set(
        focus.x + Math.sin(S.yaw) * Math.cos(S.pitch) * S.camDist,
        focus.y + Math.sin(S.pitch) * S.camDist,
        focus.z + Math.cos(S.yaw) * Math.cos(S.pitch) * S.camDist,
      );
      camera.lookAt(focus.x, focus.y + 0.5, focus.z);

      // ghost preview in build mode
      if (P.buildMode && P.buildAction === "place") {
        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(0, 0), camera);
        const hits = ray.intersectObjects(Array.from(blockMap.values()));
        if (hits.length) {
          const h = hits[0]; const n = h.face?.normal;
          if (n) {
            ghost.visible = true;
            ghost.position.set(Math.floor(h.point.x - n.x * 0.5) + 0.5, Math.floor(h.point.y - n.y * 0.5) + 0.5, Math.floor(h.point.z - n.z * 0.5) + 0.5);
          }
        } else ghost.visible = false;
      } else ghost.visible = false;

      // presence sync
      if (performance.now() - S.lastPresence > 2000) {
        S.lastPresence = performance.now();
        apiFetch("/api/presence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ x: S.pos.x, y: S.pos.y, z: S.pos.z, rot: playerGroup.rotation.y, inVehicle: !!S.inVehicle, vehicleId: S.inVehicle }) }).catch(() => {});
      }
      if (performance.now() - S.lastPosCb > 500) {
        S.lastPosCb = performance.now();
        P.onPosChange(S.pos.x, S.pos.y, S.pos.z);
      }

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth || 800, h = mount.clientHeight || 600;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      S.disposed = true;
      cancelAnimationFrame(raf);
      clearInterval(pollTimer);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("bc-joystick", onJoystick);
      window.removeEventListener("bc-jump", onJump);
      window.removeEventListener("bc-interact", onInteractKey);
      window.removeEventListener("bc-teleport", onTeleport);
      renderer.dispose();
      mount.removeChild(el);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sync blocks when parent updates (e.g. after place/remove or poll)
  useEffect(() => {
    const S = stateRef.current;
    if (!S) return;
    const seen = new Set<string>();
    for (const b of props.blocks) {
      const k = `${b.x},${b.y},${b.z}`;
      seen.add(k);
      const existing = S.blockMap.get(k);
      if (!existing || existing.userData.type !== b.type) S.addBlockMesh(b.x, b.y, b.z, b.type);
    }
    for (const [k, m] of S.blockMap) if (!seen.has(k)) S.removeBlockMesh(m.userData.x, m.userData.y, m.userData.z);
  }, [props.blocks]);

  // sync vehicles
  useEffect(() => {
    const S = stateRef.current;
    if (!S) return;
    const seen = new Set<string>();
    for (const v of props.vehicles) {
      seen.add(v.id);
      if (!S.vehicleMap.has(v.id)) {
        const g = buildVehicle(v.vehicleType, v.color, v.name);
        g.position.set(v.x, S.heightAt(Math.floor(v.x), Math.floor(v.z)) + 0.5, v.z);
        S.scene.add(g); S.vehicleMap.set(v.id, g);
      } else {
        const g = S.vehicleMap.get(v.id)!;
        // only move if not currently driving it
        if (S.inVehicle !== v.id) {
          g.position.x = v.x; g.position.z = v.z;
          g.position.y = S.heightAt(Math.floor(v.x), Math.floor(v.z)) + 0.5;
        }
      }
    }
    for (const [id, g] of S.vehicleMap) if (!seen.has(id)) { S.scene.remove(g); S.vehicleMap.delete(id); }
  }, [props.vehicles]);

  // teleport signal
  useEffect(() => {
    if (props.teleportSignal) window.dispatchEvent(new CustomEvent("bc-teleport", { detail: props.teleportSignal }));
  }, [props.teleportSignal]);

  // rebuild player character when appearance changes (e.g. job uniform)
  const u = props.user;
  useEffect(() => {
    const S = stateRef.current;
    if (S?.rebuildPlayer) S.rebuildPlayer(u);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [u.skinColor, u.hairColor, u.hairStyle, u.shirtColor, u.pantsColor, u.hat, u.gender, u.displayName]);

  return <div ref={mountRef} className="h-full w-full" />;
}
