"use client";

import { useEffect, useState } from "react";
import { warmUp } from "@/lib/warmup";

export default function WarmUp() {
  const [waking, setWaking] = useState(false);

  useEffect(() => {
    let done = false;
    const timer = setTimeout(() => !done && setWaking(true), 2500);
    warmUp().finally(() => {
      done = true;
      clearTimeout(timer);
      setWaking(false);
    });
    return () => clearTimeout(timer);
  }, []);

  if (!waking) return null;
  return (
    <div role="status" className="bg-brand-soft px-4 py-1.5 text-center text-xs text-brand">
      Despertando los servicios del servidor. La primera carga puede tardar hasta un minuto.
    </div>
  );
}
