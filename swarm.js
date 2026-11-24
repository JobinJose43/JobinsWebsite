// Every dot is one earnings report, placed by how far the stock moved.
(async () => {
  const canvas = document.getElementById("swarm");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const tip = document.getElementById("tip");
  const readout = document.getElementById("readout");
  const picker = document.getElementById("ticker");
  const css = getComputedStyle(document.documentElement);
  const color = (n) => css.getPropertyValue(n).trim();
  const UP = color("--up"), DOWN = color("--down"), SOFT = color("--deep-soft");
  const LIMIT = 25;
  let data;
  try {
    const res = await fetch("data/reactions.json");
    if (!res.ok) throw new Error(res.status);
    data = await res.json();
  } catch {
    readout.textContent = "The chart data could not load. Please refresh to try again.";
    return;
  }
  const dots = data.rows.map(([symbol, date, move, beat]) => ({ symbol, date, move, beat }));
  let filter = "all", ticker = "", width = 0, height = 0, radius = 4, frame = 0;

  for (const s of Object.keys(data.names).sort()) {
    if (!dots.some((d) => d.symbol === s)) continue;
    const o = document.createElement("option");
    o.value = s;
    o.textContent = `${s}  ${data.names[s]}`;
    picker.append(o);
  }

  const shown = () => dots.filter((d) => filter === "all" || d.beat === (filter === "beat" ? 1 : 0));
  const pad = 12;
  const xOf = (m) => pad + ((Math.max(-LIMIT, Math.min(LIMIT, m)) + LIMIT) / (2 * LIMIT)) * (width - 2 * pad);

  function layout() {
    const list = shown();
    const usable = height - 40;
    for (radius = 6; radius > 1.2; radius -= 0.2) {
      const bins = new Map();
      for (const d of list) {
        const k = Math.round(xOf(d.move) / (radius * 2));
        if (!bins.has(k)) bins.set(k, []);
        bins.get(k).push(d);
      }
      const tallest = Math.max(...[...bins.values()].map((b) => b.length));
      if (tallest * radius * 2 > usable && radius > 1.4) continue;
      for (const [k, b] of bins) {
        b.sort((p, q) => p.move - q.move);
        b.forEach((d, i) => {
          d.tx = k * radius * 2;
          d.ty = usable / 2 + (i - (b.length - 1) / 2) * radius * 2;
        });
      }
      break;
    }
  }

  function paint() {
    ctx.clearRect(0, 0, width, height);
    ctx.font = "13px Archivo, 'Segoe UI', sans-serif";
    ctx.fillStyle = SOFT;
    ctx.textAlign = "center";
    const ticks = width < 520 ? [-20, 0, 20] : [-20, -10, 0, 10, 20];
    for (const t of ticks) {
      ctx.globalAlpha = 0.25;
      ctx.fillRect(xOf(t), 0, 1, height - 30);
      ctx.globalAlpha = 1;
      ctx.fillText(t === 0 ? "No change" : `${t > 0 ? "+" : "−"}${Math.abs(t)}%`, xOf(t), height - 8);
    }
    const list = shown();
    for (const d of list) {
      const hit = !ticker || d.symbol === ticker;
      ctx.globalAlpha = hit ? 1 : 0.16;
      ctx.fillStyle = d.move < 0 ? DOWN : d.move > 0 ? UP : SOFT;
      ctx.beginPath();
      ctx.arc(d.x, d.y, Math.max(0.8, radius - 0.5) * (ticker && hit ? 1.5 : 1), 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function settle(animate) {
    cancelAnimationFrame(frame);
    const list = shown();
    const still = !animate || document.hidden || matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) {
      for (const d of list) { d.x = d.tx; d.y = d.ty; }
      return paint();
    }
    for (const d of list) { d.x0 = d.x ?? d.tx; d.y0 = d.y ?? d.ty; }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / 700);
      const e = 1 - (1 - t) ** 3;
      for (const d of list) { d.x = d.x0 + (d.tx - d.x0) * e; d.y = d.y0 + (d.ty - d.y0) * e; }
      paint();
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  }

  function describe() {
    const list = shown().filter((d) => !ticker || d.symbol === ticker);
    const fell = list.filter((d) => d.move < 0).length;
    const kind = filter === "beat" ? "earnings beats" : filter === "miss" ? "earnings misses" : "reports";
    const who = ticker ? `${data.names[ticker]}: ` : "";
    readout.textContent = list.length
      ? `${who}${ticker ? "after" : "After"} ${list.length.toLocaleString("en-US")} ${kind}, the stock fell ${fell.toLocaleString("en-US")} times (${Math.round((fell / list.length) * 100)}%).`
      : `${who}${ticker ? "no" : "No"} ${kind} in this data.`;
  }

  function resize() {
    const box = canvas.getBoundingClientRect();
    if (box.width === width && box.height === height) return;
    width = box.width; height = box.height;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio; canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    layout(); settle(false);
  }

  const buttons = [...document.querySelectorAll("[data-filter]")];
  for (const b of buttons) b.addEventListener("click", () => {
    filter = b.dataset.filter;
    buttons.forEach((x) => x.setAttribute("aria-pressed", x === b));
    layout(); settle(true); describe();
  });
  picker.addEventListener("change", () => { ticker = picker.value; paint(); describe(); });

  function hover(e) {
    const box = canvas.getBoundingClientRect();
    const mx = e.clientX - box.left, my = e.clientY - box.top;
    let best = null, dist = 14 * 14;
    for (const d of shown()) {
      if (ticker && d.symbol !== ticker) continue;
      const q = (d.x - mx) ** 2 + (d.y - my) ** 2;
      if (q < dist) { dist = q; best = d; }
    }
    tip.hidden = !best;
    if (!best) return;
    const when = new Date(`${best.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    tip.textContent = `${best.symbol}, ${when}: ${best.beat === 1 ? "beat" : best.beat === 0 ? "missed" : "matched"}, moved ${best.move > 0 ? "+" : ""}${best.move}%`;
    tip.style.left = `${Math.max(0, Math.min(width - tip.offsetWidth, best.x - tip.offsetWidth / 2))}px`;
    tip.style.top = `${best.y > 60 ? best.y - 48 : best.y + 16}px`;
  }
  canvas.addEventListener("pointermove", hover);
  canvas.addEventListener("pointerdown", hover);
  canvas.addEventListener("pointerleave", () => { tip.hidden = true; });
  new ResizeObserver(resize).observe(canvas);
  resize(); describe();
})();
