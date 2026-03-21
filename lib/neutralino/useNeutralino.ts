"use client";

import { useState, useEffect } from "react";

export function useNeutralino() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const check = () => {
      if (typeof window !== "undefined" && window.Neutralino) {
        setAvailable(true);
      }
    };

    check();
    // Neutralino may initialize after React mounts
    const timer = setTimeout(check, 1000);
    return () => clearTimeout(timer);
  }, []);

  return {
    available,
    neutralino: available ? window.Neutralino! : null,
  };
}
