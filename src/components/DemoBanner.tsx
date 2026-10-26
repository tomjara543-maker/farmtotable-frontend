"use client";

import { useRouter } from "next/navigation";
import { DEMO_MODE } from "@/lib/api";
import { setSession } from "@/lib/session";

export default function DemoBanner() {
  const router = useRouter();
  if (!DEMO_MODE) return null;

  async function reset() {
    if (!confirm("¿Borrar los datos del modo demo y volver a los de ejemplo?")) return;
    const { resetDemo } = await import("@/lib/mock/server");
    resetDemo();
    setSession(null);
    router.push("/login");
  }

  return (
    <div className="bg-warn-soft px-4 py-1.5 text-center text-xs text-warn">
      Modo demo: el backend se simula en tu navegador.{" "}
      <button onClick={reset} className="font-semibold underline">
        Reiniciar datos
      </button>
    </div>
  );
}
