const fmt = (n) =>
  `${Number(n || 0).toLocaleString("es-ES", { maximumFractionDigits: 2 })} €`;

// A partir del payload de /stats/wrapped construye la lista ordenada de
// slides a mostrar. Cada KPI con datos insuficientes (null en backend) se
// omite en vez de mostrar una tarjeta vacía.
export function buildWrappedSlides(data) {
  if (!data) return [];

  if (!data.numRegistros) {
    return [
      {
        emoji: "🌱",
        title: `Tu ${data.anio} está casi en blanco`,
        body: "Todavía no tienes movimientos registrados este año. ¡Vuelve cuando añadas alguno!",
        isLast: true,
      },
    ];
  }

  const slides = [
    {
      emoji: "🎉",
      title: `Tu ${data.anio} en números`,
      body: "Vamos a repasar cómo te ha ido el año con el dinero.",
    },
    {
      emoji: data.balance >= 0 ? "🚀" : "🫠",
      title: "Balance del año",
      body: `Terminas ${data.anio} con un balance de`,
      big: fmt(data.balance),
    },
    {
      emoji: "💰",
      title: "Ingresos totales",
      body: `Repartidos en ${data.numIngresos} movimiento${data.numIngresos === 1 ? "" : "s"}`,
      big: fmt(data.ingresos),
    },
    {
      emoji: "💸",
      title: "Gastos totales",
      body: `Repartidos en ${data.numGastos} movimiento${data.numGastos === 1 ? "" : "s"}`,
      big: fmt(data.gastos),
    },
  ];

  if (data.mesMasGasto) {
    slides.push({
      emoji: "🔥",
      title: "Tu mes más caro",
      body: `${data.mesMasGasto.nombre} fue cuando más gastaste`,
      big: fmt(data.mesMasGasto.gastos),
    });
  }

  if (data.mesMasIngreso) {
    slides.push({
      emoji: "📈",
      title: "Tu mejor mes de ingresos",
      body: `${data.mesMasIngreso.nombre} fue tu mes más rentable`,
      big: fmt(data.mesMasIngreso.ingresos),
    });
  }

  if (data.mejorMes && data.peorMes && data.mejorMes.mes !== data.peorMes.mes) {
    slides.push({
      emoji: "⚖️",
      title: "Tu mes dorado vs. tu mes duro",
      body: `${data.mejorMes.nombre} (${fmt(data.mejorMes.balance)}) tuvo tu mejor balance, y ${data.peorMes.nombre} (${fmt(data.peorMes.balance)}) el más ajustado.`,
    });
  }

  if (data.gastoMasAlto) {
    slides.push({
      emoji: "🧾",
      title: "El gasto que más dolió",
      body: [data.gastoMasAlto.concepto, data.gastoMasAlto.categoria]
        .filter(Boolean)
        .join(" · ") || "Un gasto sin concepto",
      big: fmt(data.gastoMasAlto.cantidad),
    });
  }

  if (data.categoriaEstrellaGasto) {
    slides.push({
      emoji: "🏆",
      title: "Tu categoría estrella (gastos)",
      body: data.categoriaEstrellaGasto.nombre,
      big: fmt(data.categoriaEstrellaGasto.total),
    });
  }

  if (data.categoriaEstrellaIngreso) {
    slides.push({
      emoji: "⭐",
      title: "Tu categoría estrella (ingresos)",
      body: data.categoriaEstrellaIngreso.nombre,
      big: fmt(data.categoriaEstrellaIngreso.total),
    });
  }

  if (data.diaSemanaFavorito) {
    slides.push({
      emoji: "📅",
      title: "Tu día de la semana",
      body: `Los ${data.diaSemanaFavorito.dia} sueles gastar más de media`,
      big: `${fmt(data.diaSemanaFavorito.media)} / día`,
    });
  }

  const comp = data.comparativaAnioAnterior;
  if (comp && comp.pctBalance !== null) {
    const subiendo = comp.pctBalance >= 0;
    slides.push({
      emoji: subiendo ? "📊" : "📉",
      title: `Comparado con ${comp.anio}`,
      body: `Tu balance ha ${subiendo ? "mejorado" : "caído"} respecto al año anterior`,
      big: `${subiendo ? "+" : ""}${comp.pctBalance.toLocaleString("es-ES")}%`,
    });
  }

  slides.push({
    emoji: "🎊",
    title: "¡Eso es todo!",
    body: `Gracias por cuidar tus finanzas durante todo ${data.anio}.`,
    isLast: true,
  });

  return slides;
}
