import { createContext, useMemo, useState } from "react";
import { monthRange, yearRange } from "../utils/dateRange";

export const HomeFilterContext = createContext();

/**
 * Filtro de fechas de la home. Modos:
 *  - "mes"    → mes actual (por defecto)
 *  - "anio"   → año actual
 *  - "custom" → rango elegido a mano
 *
 * `range` ({ from, to } en ISO YYYY-MM-DD) es lo que consumen la home, las
 * gráficas y las llamadas a /stats.
 */
export function HomeFilterProvider({ children }) {
  const [mode, setMode] = useState("mes");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range = useMemo(() => {
    if (mode === "anio") return yearRange();
    if (mode === "custom") {
      return { from: customFrom || undefined, to: customTo || undefined };
    }
    return monthRange();
  }, [mode, customFrom, customTo]);

  const setCustom = (from, to) => {
    setCustomFrom(from || "");
    setCustomTo(to || "");
    setMode("custom");
  };

  return (
    <HomeFilterContext.Provider
      value={{ mode, setMode, customFrom, customTo, setCustom, range }}
    >
      {children}
    </HomeFilterContext.Provider>
  );
}
