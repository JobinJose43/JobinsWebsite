// Illustrative walk-through of the New York ATM rules. Prices are invented.
(() => {
  const svg = document.getElementById("atm");
  if (!svg) return;
  const NS = "http://www.w3.org/2000/svg";
  const pre = [[104, 105.2, 103.4, 105], [105, 107, 104.6, 106.6], [106.6, 108.4, 106, 108], [108, 110, 107.5, 109.2], [109.2, 109.5, 107, 107.3], [107.3, 107.8, 104.8, 105.1], [105.1, 105.6, 102.4, 102.8], [102.8, 103.2, 100, 100.9], [100.9, 103, 100.6, 102.7], [102.7, 104.6, 102.3, 104]];
  const day = [[104, 104.5, 103, 103.2], [103.2, 103.3, 100.6, 100.8], [100.8, 101.2, 99.2, 99.4], [99.4, 100.9, 98.9, 100.7], [100.7, 102.6, 100.4, 102.3], [102.3, 104.2, 102, 103.9], [103.9, 105.5, 103.6, 105.2], [105.2, 106.4, 104.7, 105.6], [105.6, 107.5, 105.3, 107.2], [107.2, 108.6, 106.8, 108.2], [108.2, 110.3, 108, 110]];
  const all = [...pre, ...day];
  const X = (i) => 24 + i * 26, Y = (p) => 20 + (111 - p) * 25;
  const until = [10, 13, 13, 16, 21];
  const add = (tag, at, text) => {
    const n = document.createElementNS(NS, tag);
    for (const k in at) n.setAttribute(k, at[k]);
    if (text) n.textContent = text;
    svg.append(n);
  };
  const level = (p, x1, x2, stroke, text, dash, above) => {
    add("line", { x1, x2, y1: Y(p), y2: Y(p), stroke, "stroke-width": 2, "stroke-dasharray": dash || "none" });
    add("text", { x: x2, y: Y(p) + (above ? -7 : 18), "text-anchor": "end", fill: stroke, "font-size": 15, "font-weight": 600 }, text);
  };
  function draw(step) {
    svg.replaceChildren();
    const end = 590;
    add("rect", { x: 8, y: 8, width: X(10) - 24, height: 330, fill: "#f4e3bb" });
    add("text", { x: 16, y: 328, "font-size": 14, fill: "#4a3a12" }, "7:00 to 9:29");
    if (step >= 1) {
      level(110, 8, end, "#0b2233", "Session high", null, true);
      level(100, 8, end, "#0b2233", "Session low", null, true);
    }
    if (step >= 3) {
      add("rect", { x: X(10), y: Y(103), width: 160, height: Y(101.2) - Y(103), fill: "#ff8f75", opacity: 0.45 });
      add("text", { x: X(10) + 168, y: Y(102) + 8, "font-size": 14, "font-weight": 600, fill: "#7a2413" }, "Gap");
    }
    all.slice(0, until[step - 1]).forEach(([o, h, l, c], i) => {
      add("line", { x1: X(i), x2: X(i), y1: Y(h), y2: Y(l), stroke: "#0e2230", "stroke-width": 1.5 });
      add("rect", { x: X(i) - 8, y: Y(Math.max(o, c)), width: 16, height: Math.max(2, Math.abs(Y(o) - Y(c))), fill: c >= o ? "#fff" : "#0e2230", stroke: "#0e2230", "stroke-width": 1.5 });
    });
    if (step === 2) add("circle", { cx: X(12), cy: Y(99.3), r: 18, fill: "none", stroke: "#c23a1e", "stroke-width": 3 });
    if (step >= 4) {
      add("path", { d: `M${X(16)} ${Y(103.5) + 4} l-8 14 h16 z`, fill: "#0b7a5e" });
      add("text", { x: X(16) + 14, y: Y(103.5) + 20, "font-size": 15, "font-weight": 700, fill: "#0b6b53" }, "Entry");
    }
    if (step >= 5) {
      level(98.9, X(12), end, "#b23218", "Stop", "6 5");
      add("text", { x: X(20) - 14, y: Y(110) + 22, "text-anchor": "end", "font-size": 15, "font-weight": 700, fill: "#0b6b53" }, "Target");
    }
  }
  const buttons = [...document.querySelectorAll("[data-step]")];
  const go = (n) => {
    draw(n);
    buttons.forEach((b) => (Number(b.dataset.step) === n ? b.setAttribute("aria-current", "step") : b.removeAttribute("aria-current")));
  };
  buttons.forEach((b) => b.addEventListener("click", () => go(Number(b.dataset.step))));
  go(5);
})();
