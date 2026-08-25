(() => {
  const fields = {
    power: document.querySelector('#telemetry-power'),
    flow: document.querySelector('#telemetry-flow'),
    temp: document.querySelector('#telemetry-temp'),
    pressure: document.querySelector('#telemetry-pressure')
  };
  const values = {
    power: document.querySelector('#value-power'),
    flow: document.querySelector('#value-flow'),
    temp: document.querySelector('#value-temp'),
    pressure: document.querySelector('#value-pressure')
  };
  const bars = {
    power: document.querySelector('#bar-power'),
    flow: document.querySelector('#bar-flow'),
    temp: document.querySelector('#bar-temp'),
    pressure: document.querySelector('#bar-pressure')
  };
  const output = document.querySelector('#telemetry-output');
  const outputBar = document.querySelector('#telemetry-output-bar');
  const status = document.querySelector('#telemetry-status');
  const rules = document.querySelector('#telemetry-rules');
  const timestamp = document.querySelector('#telemetry-timestamp');
  const liveToggle = document.querySelector('#telemetry-live');
  const simulateButton = document.querySelector('#telemetry-simulate');

  if (!fields.power || !output) return;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function calculateProduction(power, flow, temp, pressure) {
    const powerSupport = power / 100;
    const flowSupport = flow / 20;
    const pressurePenalty = pressure <= 50 ? pressure / 500 : 0.1 + ((pressure - 50) / 50) * 0.8;
    const temperaturePenalty = temp <= 70 ? 0 : ((temp - 70) / 10) * 0.7;
    const lowResourceFactor = 0.45 * powerSupport + 0.25 * flowSupport + 0.3;
    let production = 10 * lowResourceFactor * (1 - pressurePenalty) * (1 - temperaturePenalty);

    if (pressure >= 80 && power <= 30 && flow <= 5) {
      production *= 0.08;
    }
    return clamp(production, 0, 10);
  }

  function statusFor(production, pressure, temp) {
    if (pressure >= 80) return ['Protection active', 'alert'];
    if (temp >= 70) return ['Temperature derating', 'warning'];
    if (production < 2) return ['Low command', 'warning'];
    return ['Nominal operation', 'ok'];
  }

  function update() {
    const power = Number(fields.power.value);
    const flow = Number(fields.flow.value);
    const temp = Number(fields.temp.value);
    const pressure = Number(fields.pressure.value);
    const production = calculateProduction(power, flow, temp, pressure);
    const [statusText, statusClass] = statusFor(production, pressure, temp);

    values.power.textContent = `${power.toFixed(0)} kW`;
    values.flow.textContent = `${flow.toFixed(1)} L/min`;
    values.temp.textContent = `${temp.toFixed(0)} °C`;
    values.pressure.textContent = `${pressure.toFixed(0)} bar`;
    bars.power.style.width = `${power}%`;
    bars.flow.style.width = `${flow / 20 * 100}%`;
    bars.temp.style.width = `${(temp - 20) / 60 * 100}%`;
    bars.pressure.style.width = `${pressure}%`;
    output.textContent = production.toFixed(2);
    outputBar.style.width = `${production * 10}%`;
    status.textContent = statusText;
    status.className = `telemetry-status ${statusClass}`;
    rules.textContent = pressure >= 80 ? 'High-pressure protection reduces the production command.' : temp >= 70 ? 'High-temperature derating rule is influencing the command.' : 'Renewable power, water flow, pressure, and temperature are combined by the fuzzy-style simulation.';
    const readingTime = new Date();
    timestamp.textContent = `Last reading: ${readingTime.toLocaleTimeString()}`;
    window.dispatchEvent(new CustomEvent('telemetry:update', {
      detail: {
        power,
        flow,
        temp,
        pressure,
        production,
        statusText,
        statusClass,
        safety: pressure >= 80 ? 'Protection active' : 'Interlocks nominal',
        time: readingTime
      }
    }));
  }

  function drift() {
    const perturbations = {
      power: (Math.random() - 0.5) * 12,
      flow: (Math.random() - 0.5) * 2,
      temp: (Math.random() - 0.5) * 4,
      pressure: (Math.random() - 0.5) * 5
    };
    fields.power.value = clamp(Number(fields.power.value) + perturbations.power, 0, 100).toFixed(0);
    fields.flow.value = clamp(Number(fields.flow.value) + perturbations.flow, 0, 20).toFixed(1);
    fields.temp.value = clamp(Number(fields.temp.value) + perturbations.temp, 20, 80).toFixed(0);
    fields.pressure.value = clamp(Number(fields.pressure.value) + perturbations.pressure, 0, 100).toFixed(0);
    update();
  }

  Object.values(fields).forEach(field => field.addEventListener('input', update));
  simulateButton.addEventListener('click', drift);
  update();
  window.setInterval(() => {
    if (liveToggle.checked) drift();
  }, 3500);
})();
