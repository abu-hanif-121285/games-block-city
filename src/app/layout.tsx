import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "BLOCK CITY — Build Your Dream City",
  description: "Game simulasi kota 3D voxel multiplayer. Bangun kota bersama, bekerja, dan hidup di dunia virtual yang sama.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-slate-950 text-white antialiased">{children}</body>
    </html>
  );
}
