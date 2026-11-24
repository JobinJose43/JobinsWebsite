// Draws the hero chart from saved data, then refreshes it from the scanner.
(() => {
  const SOURCE = "https://scanner.jobinjose.site/data/";
  const chart = document.getElementById("chart");
  const el = (tag, text, cls) => {
    const n = document.createElement(tag);
    if (text != null) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  };
  const day = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  function draw({ asOf, rows }) {
    const max = Math.ceil(Math.max(...rows.flatMap((r) => [r.implied, ...r.past.map(Math.abs)])) / 5) * 5;
    const x = (v) => `${50 + (v / max) * 50}%`;
    const out = rows.map((r) => {
      const row = el("div", null, "move");
      const label = el("div");
      label.append(el("b", r.symbol), el("small", day(r.date)));
      const track = el("div", null, "track");
      track.setAttribute("role", "img");
      track.setAttribute("aria-label", `${r.symbol}: options imply plus or minus ${r.implied.toFixed(1)} percent. Past moves: ${r.past.map((p) => `${p}%`).join(", ")}.`);
      const bar = el("i");
      bar.style.left = x(-r.implied);
      bar.style.width = `${(r.implied / max) * 100}%`;
      track.append(bar);
      for (const p of r.past) {
        const dot = el("span", null, p < 0 ? "down" : "");
        dot.style.left = x(p);
        track.append(dot);
      }
      row.append(label, track, el("div", `±${r.implied.toFixed(1)}%`, "pct"));
      return row;
    });
    const scale = el("div", null, "scale");
    const ends = el("div");
    ends.append(el("span", `−${max}%`), el("span", "0"), el("span", `+${max}%`));
    scale.append(ends);
    chart.replaceChildren(...out, scale);
    document.getElementById("as-of").textContent = new Date(asOf).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }

  async function get(path) {
    const res = await fetch(SOURCE + path);
    if (!res.ok) throw new Error(res.status);
    return res.json();
  }

  async function refresh() {
    const snap = await get("snapshot.json");
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const today = iso(now);
    const picks = snap.stocks
      .filter((s) => s.earnings_date >= today && s.expected_move_covers_earnings && s.expected_move_pct != null)
      .sort((a, b) => a.earnings_date.localeCompare(b.earnings_date) || b.market_cap - a.market_cap)
      .slice(0, 8);
    const rows = await Promise.all(picks.map(async (s) => ({
      symbol: s.symbol,
      date: s.earnings_date,
      implied: s.expected_move_pct,
      past: (await get(`stocks/${s.symbol}.json`)).moves.history.map((h) => h.actual_move_pct),
    })));
    if (rows.length) draw({ asOf: snap.generated_at, rows });
  }

  draw(JSON.parse(document.getElementById("saved").textContent));
  refresh().catch(() => { /* keep the saved data */ });
})();
