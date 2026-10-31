import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "La course sans gagnant" },
      { name: "description", content: "Faites arriver 3 voiturettes en même temps en jouant sur les délais ou les positions de départ." },
      { property: "og:title", content: "La course sans gagnant" },
      { property: "og:description", content: "Un petit jeu de vitesses : les 3 voiturettes doivent franchir la ligne ensemble." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fredoka:wght@500;700&family=Nunito:wght@400;600;800&display=swap" },
    ],
  }),
  component: Index,
});

// Chaque couleur = une voiturette avec sa propre vitesse (cm/s)
const COLORS = [
  { id: 1, name: "Rouge", v: "var(--car-1)", label: "Voiturette rouge", speed: 2.4 },
  { id: 2, name: "Bleu", v: "var(--car-2)", label: "Voiturette bleue", speed: 0.49 },
  { id: 3, name: "Vert", v: "var(--car-3)", label: "Voiturette verte", speed: 1.22 },
  { id: 4, name: "Jaune", v: "var(--car-4)", label: "Voiturette jaune", speed: 3.2 },
  { id: 5, name: "Violet", v: "var(--car-5)", label: "Voiturette violette", speed: 0.8 },
];
const TOL_BY_GAME = { 1: 0.2, 2: 0.2 } as const; // secondes

function Car({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 60 30" className="h-8 w-16 drop-shadow">
      <rect x="4" y="10" width="50" height="12" rx="5" fill={color} />
      <path d="M16 10 L22 3 H38 L46 10 Z" fill={color} />
      <path d="M24 5 H36 L41 10 H20 Z" fill="oklch(0.9 0.03 230)" />
      <circle cx="16" cy="23" r="5" fill="oklch(0.2 0 0)" />
      <circle cx="44" cy="23" r="5" fill="oklch(0.2 0 0)" />
      <circle cx="16" cy="23" r="2" fill="oklch(0.8 0 0)" />
      <circle cx="44" cy="23" r="2" fill="oklch(0.8 0 0)" />
      <rect x="52" y="12" width="4" height="4" rx="1" fill="oklch(0.95 0.12 95)" />
    </svg>
  );
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 140 }, (_, i) => ({
        left: Math.random() * 100,
        dx: (Math.random() - 0.5) * 300 + "px",
        dur: 2.5 + Math.random() * 2.5 + "s",
        delay: Math.random() * 0.8 + "s",
        color: COLORS[i % 5]!.v,
      })),
    [],
  );
  return (
    <>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{ left: `${p.left}%`, background: p.color, animationDelay: p.delay, ["--dx" as string]: p.dx, ["--dur" as string]: p.dur }}
        />
      ))}
    </>
  );
}

function Index() {
  const [game, setGame] = useState<1 | 2>(1);
  const [length, setLength] = useState(14);
  const [lengthInput, setLengthInput] = useState("14");
  const [editLen, setEditLen] = useState(false);
  const [colors, setColors] = useState<number[]>([1, 2, 3]);
  const [delays, setDelays] = useState([0, 0, 0]);
  const [offsets, setOffsets] = useState([0, 0, 0]);
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [boost, setBoost] = useState(1);
  const raf = useRef<number | null>(null);
  const CARS = colors.map((id) => COLORS.find((c) => c.id === id)!);

  const arrivals = CARS.map((c, i) =>
    game === 1 ? delays[i]! + length / c.speed : Math.max(0, length - offsets[i]!) / c.speed,
  );
  const tMin = Math.min(...arrivals);
  const tMax = Math.max(...arrivals);
  // JEU 1 : la course s'arrête dès qu'une voiturette touche la ligne, sauf si les 3 arrivent ensemble
  const tEnd = tMax - tMin > TOL_BY_GAME[game] ? tMin : tMax;

  const pos = (i: number) => {
    const v = CARS[i]!.speed;
    const p = game === 1 ? Math.max(0, t - delays[i]!) * v : offsets[i]! + t * v;
    return Math.min(length, p);
  };

  // groupes d'arrivées simultanées (parmi les voitures déjà arrivées)
  const tied = new Set<number>();
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++)
      if (Math.abs(arrivals[i]! - arrivals[j]!) <= TOL_BY_GAME[game] && t >= Math.max(arrivals[i]!, arrivals[j]!)) {
        tied.add(i);
        tied.add(j);
      }
  const allTied = tied.size === 3;

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = ((now - last) / 1000) * boost;
      last = now;
      setT((prev) => {
        const n = prev + dt;
        if (n >= tEnd) {
          setRunning(false);
          setDone(true);
          return tEnd;
        }
        return n;
      });
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [running, tEnd, boost]);

  const reset = () => { setRunning(false); setDone(false); setT(0); };
  const start = () => { setT(0); setDone(false); setRunning(true); };
  const idle = !running && t === 0;

  const toggleColor = (id: number) => {
    if (!idle) return;
    setColors((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 3 ? [...c, id] : c));
  };

  const applyLength = () => {
    const v = parseFloat(lengthInput.replace(",", "."));
    if (v > 0 && v <= 200) {
      setLength(v);
      setOffsets((o) => o.map((x) => Math.min(x, v)));
      reset();
      setEditLen(false);
    }
  };

  const tickStep = length <= 20 ? 1 : length <= 50 ? 5 : 10;
  const ticks: number[] = [];
  for (let x = 0; x <= length + 1e-9; x += length <= 20 ? 0.5 : tickStep / 5) ticks.push(+x.toFixed(2));
  const pct = (cm: number) => (cm / length) * 100;
  const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  const ready = colors.length === 3;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {allTied && done && <Confetti />}
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-bold text-primary md:text-5xl">La course sans gagnant</h1>
        <p className="mt-2 text-muted-foreground">Le but : faire arriver les 3 voiturettes en même temps !</p>
      </header>

      <div className="mb-6 flex justify-center gap-3">
        {[1, 2].map((g) => (
          <button
            key={g}
            onClick={() => { setGame(g as 1 | 2); reset(); }}
            className={`rounded-full px-6 py-2 font-display text-lg font-bold transition ${game === g ? "bg-primary text-primary-foreground shadow-lg" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}
          >
            JEU {g}
          </button>
        ))}
      </div>

      <section className="mb-6 rounded-2xl bg-card p-4 shadow-sm">
        <h2 className="mb-2 text-lg font-bold">Choisis 3 couleurs ({colors.length}/3)</h2>
        <div className="flex flex-wrap gap-3">
          {COLORS.map((c) => {
            const idx = colors.indexOf(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleColor(c.id)}
                className={`flex items-center gap-2 rounded-xl border-2 px-3 py-1 transition ${idx >= 0 ? "border-primary bg-secondary" : "border-border opacity-60 hover:opacity-100"}`}
              >
                <span className="h-5 w-5 rounded-full" style={{ background: c.v }} />
                {c.name}
                <span className="text-xs text-muted-foreground">{c.speed.toLocaleString("fr-FR")} cm/s{idx >= 0 ? ` · n°${idx + 1}` : ""}</span>
              </button>
            );
          })}
        </div>
      </section>

      {ready && (
        <section className="rounded-2xl bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Longueur de piste : {fmt(length)} cm</span>
              {editLen ? (
                <>
                  <input
                    value={lengthInput}
                    onChange={(e) => setLengthInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyLength()}
                    className="w-20 rounded-md border bg-background px-2 py-1"
                  />
                  <button onClick={applyLength} className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground">OK</button>
                </>
              ) : (
                <button disabled={!idle} onClick={() => setEditLen(true)} className="rounded-md bg-secondary px-3 py-1 text-sm disabled:opacity-50">Modifier</button>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              Vitesse d'affichage :
              {[1, 2, 5].map((b) => (
                <button key={b} onClick={() => setBoost(b)} className={`rounded-md px-2 py-1 ${boost === b ? "bg-accent font-bold" : "bg-secondary"}`}>×{b}</button>
              ))}
            </div>
          </div>

          {/* Piste */}
          <div className="flex gap-3">
            <div className="w-44 shrink-0 space-y-2 pt-2">
              {CARS.map((c, i) => (
                <div key={i} className="flex h-16 flex-col justify-center text-sm">
                  <span className="font-bold">{c.label}</span>
                  <span className="text-muted-foreground">{fmt(c.speed)} cm/s</span>
                  {game === 1 ? (
                    <label className="flex items-center gap-1">
                      Délai
                      <input
                        type="number" min={0} step={0.1} disabled={!idle}
                        value={delays[i]!}
                        onChange={(e) => setDelays((d) => d.map((x, k) => (k === i ? Math.max(0, +e.target.value || 0) : x)))}
                        className="w-16 rounded border bg-background px-1"
                      /> s
                    </label>
                  ) : (
                    <input
                      type="range" min={0} max={length} step={0.01} disabled={!idle}
                      value={offsets[i]!}
                      onChange={(e) => setOffsets((o) => o.map((x, k) => (k === i ? +e.target.value : x)))}
                      className="accent-primary"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="relative flex-1 pr-16">
              <div className="relative space-y-2 rounded-xl bg-track py-2">
                <div className="finish-line absolute inset-y-0 w-2" style={{ left: `${pct(length)}%` }} />
                <div className="absolute inset-y-0 w-0.5 bg-track-line/60" style={{ left: 0 }} />
                {CARS.map((_, i) => {
                  const color = CARS[i]!.v;
                  const p = pos(i);
                  return (
                    <div key={i} className="relative h-16 border-b border-dashed border-track-line/30 last:border-0">
                      {game === 2 && offsets[i]! > 0 && (
                        <>
                          <div className="absolute top-1 h-0.5 bg-accent" style={{ left: 0, width: `${pct(offsets[i]!)}%` }} />
                          <span className="absolute top-1.5 rounded bg-accent px-1 text-xs font-bold text-accent-foreground" style={{ left: `${pct(offsets[i]!)}%` }}>
                            {fmt(offsets[i]!)} cm
                          </span>
                        </>
                      )}
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 ${tied.has(i) ? "animate-blink" : ""}`}
                        style={{ left: `calc(${pct(p)}% - 64px)` }}
                      >
                        <Car color={color} />
                      </div>
                    </div>
                  );
                })}
                {game === 2 && CARS.map((_, i) =>
                  offsets[i]! > 0 ? (
                    <div key={i} className="pointer-events-none absolute -bottom-10 top-0 w-px border-l-2 border-dotted border-accent" style={{ left: `${pct(offsets[i]!)}%` }} />
                  ) : null,
                )}
              </div>

              {/* Règle */}
              <div className="relative mt-1 h-10 rounded-b-md bg-ruler">
                {ticks.map((x) => {
                  const major = Math.abs(x % tickStep) < 1e-6 || Math.abs((x % tickStep) - tickStep) < 1e-6;
                  return (
                    <div key={x} className="absolute top-0" style={{ left: `${pct(x)}%` }}>
                      <div className={`w-px bg-foreground ${major ? "h-4" : "h-2"}`} />
                      {major && <span className="absolute top-4 -translate-x-1/2 text-[10px] font-semibold">{fmt(x)}</span>}
                    </div>
                  );
                })}
                <span className="absolute -right-14 top-3 text-xs font-bold">cm</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button onClick={start} disabled={running} className="rounded-full bg-primary px-8 py-3 font-display text-xl font-bold text-primary-foreground shadow-lg transition hover:scale-105 disabled:opacity-50">
              Départ !
            </button>
            <button onClick={reset} className="rounded-full bg-secondary px-6 py-3 font-semibold">Remettre en place</button>
            <span className="inline-block w-28 text-left font-display text-lg tabular-nums">⏱ {t.toFixed(2).replace(".", ",")} s</span>
          </div>

          {done && (
            <div className="mt-4 rounded-xl bg-muted p-4 text-center">
              <p className="mb-2 font-display text-xl font-bold">
                {allTied ? "🎉 Bravo ! Les 3 voiturettes arrivent ensemble !" : "Perdu ! Une voiturette a touché la ligne seule… essaie encore !"}
              </p>
              <ul className="text-sm text-muted-foreground">
                {CARS.map((c, i) => <li key={i}>{c.label} : arrivée à {fmt(arrivals[i]!)} s</li>)}
              </ul>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
