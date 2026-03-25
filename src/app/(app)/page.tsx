"use client";

import dynamic from "next/dynamic";

import SidePanel from "@/components/SidePanel";

const Map = dynamic(async () => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-zinc-100 text-zinc-600">
      Inicialitzant mapa…
    </div>
  ),
});

export default function Home(): React.ReactElement {
  return (
    <div className="relative min-h-[calc(100dvh-3rem)]">
      <Map />
      <SidePanel />
    </div>
  );
}
