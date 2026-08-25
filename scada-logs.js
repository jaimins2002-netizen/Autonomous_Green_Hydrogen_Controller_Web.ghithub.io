(() => {
  const list = document.getElementById('scada-log-list');
  const count = document.getElementById('scada-log-count');
  const heartbeat = document.getElementById('scada-heartbeat');
  const safety = document.getElementById('scada-safety-status');
  const safetyDetail = document.getElementById('scada-safety-detail');
  const state = document.getElementById('scada-operating-state');
  const command = document.getElementById('scada-command-detail');
  const simulate = document.getElementById('telemetry-simulate');

  if (!list || !count || !safety || !state) return;

  const events = [];
  const formatTime = date => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  function addLog(level, message, time = new Date()) {
    events.unshift({ level, message, time });
    events.splice(8);
    list.replaceChildren();
    events.forEach(event => {
      const item = document.createElement('li');
      item.className = `scada-log ${event.level.toLowerCase()}`;
      const stamp = document.createElement('time');
      stamp.textContent = formatTime(event.time);
      const tag = document.createElement('b');
      tag.textContent = event.level;
      const text = document.createElement('span');
      text.textContent = event.message;
      item.append(stamp, tag, text);
      list.appendChild(item);
    });
    count.textContent = `${events.length} event${events.length === 1 ? '' : 's'}`;
  }

  function updatePanel({ power, flow, temp, pressure, production, statusText, time }) {
    const eventTime = time instanceof Date ? time : new Date(time);
    const pressureAlert = pressure >= 80;
    const temperatureWarning = temp >= 70;
    const level = pressureAlert ? 'ALERT' : temperatureWarning || production < 2 ? 'WARN' : 'INFO';

    heartbeat.textContent = `Heartbeat: ${formatTime(eventTime)}`;
    safety.textContent = pressureAlert ? 'TRIPPED' : 'ARMED';
    safety.className = pressureAlert ? 'scada-alert' : 'scada-safe';
    safetyDetail.textContent = pressureAlert
      ? 'High-pressure protection is limiting production'
      : temperatureWarning
        ? 'Temperature derating is active'
        : 'Pressure and temperature checks nominal';

    state.textContent = pressureAlert ? 'PROTECTION' : temperatureWarning ? 'DERATED' : production < 2 ? 'LOW COMMAND' : 'NOMINAL';
    state.className = pressureAlert ? 'scada-alert' : temperatureWarning || production < 2 ? 'scada-warning' : 'scada-safe';
    command.textContent = `Command: ${production.toFixed(2)} kg/h · ${statusText}`;

    const message = pressureAlert
      ? `SAFETY INTERLOCK: pressure ${pressure.toFixed(0)} bar; production protection active`
      : temperatureWarning
        ? `Temperature derating: stack ${temp.toFixed(0)} °C; command reduced to ${production.toFixed(2)} kg/h`
        : `Telemetry accepted: ${power.toFixed(0)} kW / ${flow.toFixed(1)} L/min / ${pressure.toFixed(0)} bar → ${production.toFixed(2)} kg/h`;
    addLog(level, message, eventTime);
  }

  addLog('INFO', 'Milestone 3 SCADA monitor initialized');
  window.addEventListener('telemetry:update', event => updatePanel(event.detail));

  // The telemetry controller emits its first reading before deferred scripts finish loading.
  // Trigger one user-visible simulation so the panel starts with a synchronized packet.
  window.setTimeout(() => {
    if (simulate) simulate.click();
  }, 80);
})();
