/*
  Phase 6 — Live Browser Controller
  Wires up the existing [data-live-controller] markup:
    inputs   -> [data-input="power|flow|temp|pressure"]
    readouts -> <output data-value="power|flow|temp|pressure">
    button   -> [data-run]
    result   -> [data-rate] [data-state] [data-fired] [data-log]
    status   -> .phase-status

  Same triangular MFs and 11-rule base as the Phase 6 notebook
  (scikit-fuzzy), with Mamdani min/max inference and CENTROID
  defuzzification (numerically integrated), not weighted-average.
*/
(function () {
  "use strict";

  const UNITS = { power: "kW", flow: "L/min", temp: "°C", pressure: "bar" };

  const tri = (x, a, b, c) => {
    const left = b === a ? (x >= a ? 1 : 0) : (x - a) / (b - a);
    const right = c === b ? (x <= c ? 1 : 0) : (c - x) / (c - b);
    return Math.max(Math.min(left, right), 0);
  };

  const INPUT_MFS = {
    power:    { Low: [0, 0, 50],   Medium: [25, 50, 75], High: [50, 100, 100] },
    flow:     { Low: [0, 0, 10],   Medium: [5, 10, 15],  High: [10, 20, 20] },
    pressure: { Low: [0, 0, 50],   Medium: [25, 50, 75], High: [50, 100, 100] },
    temp:     { Low: [20, 20, 40], Normal: [30, 50, 70], High: [60, 80, 80] }
  };

  const OUTPUT_MFS = {
    Off: [0, 0, 2], Low: [1, 3, 5], Medium: [4, 6, 8], High: [7, 10, 10]
  };

  const RULES = [
    { id: "R1",  power: "High",   flow: "High",   pressure: "Low",    temp: "Normal", out: "High" },
    { id: "R2",  power: "High",   flow: "Low",    pressure: "Low",    temp: "Normal", out: "Medium" },
    { id: "R3",  power: "Medium", flow: "Medium", pressure: "Low",    temp: "Normal", out: "Medium" },
    { id: "R4",  power: "Medium", flow: "Low",    pressure: "Low",    temp: "Normal", out: "Medium" },
    { id: "R5",  power: "Low",    flow: "High",   pressure: "Low",    temp: "Normal", out: "Medium" },
    { id: "R6",  power: "Low",    flow: "Medium", pressure: "Low",    temp: "Normal", out: "Low" },
    { id: "R7",  power: "Low",    flow: "Low",    pressure: "Low",    temp: "Normal", out: "Low" },
    { id: "R8",  power: "High",   flow: "High",   pressure: "Medium", temp: "Normal", out: "High" },
    { id: "R9",  power: "High",   flow: "Medium", pressure: "Medium", temp: "Normal", out: "Medium" },
    { id: "R10", power: "Low",    flow: "Low",    pressure: "High",   temp: "Normal", out: "Off" },
    { id: "R11", power: "Medium", flow: "Any",    pressure: "Any",    temp: "High",   out: "Low" }
  ];

  function memberships(key, x) {
    const out = {};
    for (const [term, [a, b, c]] of Object.entries(INPUT_MFS[key])) out[term] = tri(x, a, b, c);
    return out;
  }

  // Mamdani inference + centroid defuzzification (discretized integration)
  function runController({ power, flow, pressure, temp }) {
    const mem = {
      power: memberships("power", power),
      flow: memberships("flow", flow),
      pressure: memberships("pressure", pressure),
      temp: memberships("temp", temp)
    };

    const fired = RULES.map((r) => {
      const vals = ["power", "flow", "pressure", "temp"].map((k) =>
        r[k] === "Any" ? 1 : mem[k][r[k]]
      );
      return { ...r, w: Math.min(...vals) };
    });

    const termW = {};
    fired.forEach((r) => {
      if (r.w > 0) termW[r.out] = Math.max(termW[r.out] || 0, r.w);
    });

    const N = 1001; // resolution of the output universe [0,10] kg/h
    let num = 0, den = 0;
    for (let i = 0; i < N; i++) {
      const y = (10 * i) / (N - 1);
      let mu = 0;
      for (const [term, w] of Object.entries(termW)) {
        const [a, b, c] = OUTPUT_MFS[term];
        mu = Math.max(mu, Math.min(w, tri(y, a, b, c)));
      }
      num += y * mu;
      den += mu;
    }

    const y_star = den > 0 ? num / den : 0;
    const firedCount = fired.filter((r) => r.w > 0).length;

    return { y: y_star, firedCount, fired, termW };
  }

  function initController(root) {
    const inputs = root.querySelectorAll("[data-input]");
    const runBtn = root.querySelector("[data-run]");
    const rateEl = root.querySelector("[data-rate]");
    const stateEl = root.querySelector("[data-state]");
    const firedEl = root.querySelector("[data-fired]");
    const logEl = root.querySelector("[data-log]");
    const statusEl = root.querySelector(".phase-status");

    const state = {};
    inputs.forEach((inp) => {
      const key = inp.dataset.input;
      state[key] = parseFloat(inp.value);
    });

    function updateReadouts() {
      inputs.forEach((inp) => {
        const key = inp.dataset.input;
        const out = root.querySelector(`[data-value="${key}"]`);
        if (out) out.textContent = `${state[key]} ${UNITS[key]}`;
      });
    }

    inputs.forEach((inp) => {
      inp.addEventListener("input", () => {
        state[inp.dataset.input] = parseFloat(inp.value);
        updateReadouts();
      });
    });

    updateReadouts();

    runBtn.addEventListener("click", () => {
      runBtn.disabled = true;
      if (statusEl) statusEl.textContent = "Running";
      if (stateEl) stateEl.textContent = "Calculating…";
      if (logEl) logEl.textContent = "Executing cell → fuzzifying inputs…";

      // small delay so the UI reads as an actual browser execution, not instant
      setTimeout(() => {
        const result = runController(state);
        const termsSummary = Object.entries(result.termW)
          .map(([t, w]) => `${t}=${w.toFixed(2)}`)
          .join(", ");

        rateEl.textContent = result.y.toFixed(2);
        if (stateEl) stateEl.textContent = "Run complete";
        if (firedEl) firedEl.textContent = `${result.firedCount} rule${result.firedCount === 1 ? "" : "s"} fired`;
        if (logEl) {
          logEl.textContent =
            `power=${state.power}kW flow=${state.flow}L/min ` +
            `pressure=${state.pressure}bar temp=${state.temp}°C\n` +
            `Rules fired: ${result.firedCount}/11 → active output terms: ${termsSummary || "none"}\n` +
            `Centroid defuzzification → y* = ${result.y.toFixed(2)} kg/h`;
        }
        if (statusEl) statusEl.textContent = "Ready";
        runBtn.disabled = false;
      }, 350);
    });

    // run once on load with default values
    runBtn.click();
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-live-controller]").forEach(initController);
  });
})();
