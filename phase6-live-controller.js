(() => {
  const trimf = (x, points) => {
    const [a, b, c] = points;
    if (x <= a || x >= c) return x === b ? 1 : 0;
    if (x === b) return 1;
    if (x < b) return (x - a) / (b - a || 1);
    return (c - x) / (c - b || 1);
  };

  const terms = {
    power: { low: [0, 0, 50], medium: [25, 50, 75], high: [50, 100, 100] },
    flow: { low: [0, 0, 10], medium: [5, 10, 15], high: [10, 20, 20] },
    temp: { low: [20, 20, 40], normal: [30, 50, 70], high: [60, 80, 80] },
    pressure: { low: [0, 0, 50], medium: [25, 50, 75], high: [50, 100, 100] },
    rate: { off: [0, 0, 2], low: [1, 3, 5], medium: [4, 6, 8], high: [7, 10, 10] }
  };

  const rules = [
    [['power', 'high'], ['flow', 'high'], ['pressure', 'low'], ['temp', 'normal'], 'high'],
    [['power', 'high'], ['flow', 'low'], ['pressure', 'low'], ['temp', 'normal'], 'medium'],
    [['power', 'medium'], ['flow', 'medium'], ['pressure', 'low'], ['temp', 'normal'], 'medium'],
    [['power', 'medium'], ['flow', 'low'], ['pressure', 'low'], ['temp', 'normal'], 'medium'],
    [['power', 'low'], ['flow', 'high'], ['pressure', 'low'], ['temp', 'normal'], 'medium'],
    [['power', 'low'], ['flow', 'medium'], ['pressure', 'low'], ['temp', 'normal'], 'low'],
    [['power', 'low'], ['flow', 'low'], ['pressure', 'low'], ['temp', 'normal'], 'low'],
    [['power', 'high'], ['flow', 'high'], ['pressure', 'medium'], ['temp', 'normal'], 'high'],
    [['power', 'high'], ['flow', 'medium'], ['pressure', 'medium'], ['temp', 'normal'], 'medium'],
    [['power', 'low'], ['flow', 'low'], ['pressure', 'high'], ['temp', 'normal'], 'off'],
    [['power', 'medium'], ['temp', 'high'], 'low']
  ];

  const evaluate = (input) => {
    const aggregate = [];
    let firingRules = 0;
    for (let r = 0; r < rules.length; r += 1) {
      const rule = rules[r];
      const consequent = rule[rule.length - 1];
      let strength = 1;
      for (let i = 0; i < rule.length - 1; i += 1) {
        const [variable, label] = rule[i];
        strength = Math.min(strength, trimf(input[variable], terms[variable][label]));
      }
      if (strength > 0) firingRules += 1;
      for (let step = 0; step <= 1000; step += 1) {
        const y = step / 100;
        const membership = Math.min(strength, trimf(y, terms.rate[consequent]));
        aggregate[step] = Math.max(aggregate[step] || 0, membership);
      }
    }
    let numerator = 0;
    let denominator = 0;
    for (let step = 0; step <= 1000; step += 1) {
      const y = step / 100;
      numerator += y * (aggregate[step] || 0);
      denominator += aggregate[step] || 0;
    }
    return { rate: denominator ? numerator / denominator : 0, firingRules };
  };

  const init = () => {
    const root = document.querySelector('[data-live-controller]');
    if (!root) return;
    const fields = ['power', 'flow', 'temp', 'pressure'];
    const values = {};
    const update = () => {
      fields.forEach((name) => {
        values[name] = Number(root.querySelector(`[data-input="${name}"]`).value);
        root.querySelector(`[data-value="${name}"]`).textContent = `${values[name]} ${name === 'power' ? 'kW' : name === 'flow' ? 'L/min' : name === 'temp' ? '°C' : 'bar'}`;
      });
      const result = evaluate(values);
      root.querySelector('[data-rate]').textContent = result.rate.toFixed(2);
      root.querySelector('[data-fired]').textContent = `${result.firingRules} rule${result.firingRules === 1 ? '' : 's'} fired`;
      const state = root.querySelector('[data-state]');
      state.textContent = values.pressure >= 80 ? 'PROTECTION / VERIFY INTERLOCKS' : values.temp >= 70 ? 'DERATED — HIGH TEMPERATURE' : 'NORMAL FUZZY COMMAND';
      root.querySelector('[data-log]').textContent = `Browser run complete · ${new Date().toLocaleTimeString()} · ${result.firingRules} active rule(s)`;
    };
    fields.forEach((name) => root.querySelector(`[data-input="${name}"]`).addEventListener('input', update));
    root.querySelector('[data-run]').addEventListener('click', update);
    update();
  };
  document.addEventListener('DOMContentLoaded', init);
})();
