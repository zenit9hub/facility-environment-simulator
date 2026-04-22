export const CONTROL_PANEL_HTML = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Factory Simulator Control Panel</title>
    <link rel="stylesheet" href="/panel.css" />
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <div>
          <p class="eyebrow">Factory Sensor Simulator</p>
          <h1>Factory Simulator Control Panel</h1>
          <p class="note">수동 조작은 시뮬레이터 테스트용입니다. 룰 엔진 판단에 따라 상태가 다시 바뀔 수 있습니다.</p>
        </div>
        <div class="status-pill" id="connectionState">disconnected</div>
      </section>

      <section class="meta-grid">
        <article>
          <span>Current User ID</span>
          <strong id="uniqUserId">-</strong>
        </article>
        <article>
          <span>MQTT Broker</span>
          <strong id="brokerUrl">-</strong>
        </article>
        <article>
          <span>Last Published At</span>
          <strong id="lastPublishedAt">-</strong>
        </article>
      </section>

      <section class="panel-grid">
        <article class="card sensor-card">
          <p class="eyebrow">Sensors</p>
          <h2>현재 센서 상태</h2>
          <div class="sensor-value">
            <span>Current Temperature</span>
            <strong><span id="temperatureValue">25.0</span> ℃</strong>
            <small>Reference range 22 ~ 50 ℃</small>
          </div>
          <div class="sensor-value">
            <span>Current Vibration</span>
            <strong id="vibrationValue">0.0</strong>
          </div>
          <div class="subtle-row">
            <span>Last Sensor Published At</span>
            <b id="lastSensorPublishedAt">-</b>
          </div>
        </article>

        <article class="card control-card">
          <p class="eyebrow">Actuators</p>
          <h2>액추에이터 제어</h2>

          <section class="control-group">
            <div>
              <h3>Conveyor Belt</h3>
              <p>Power와 Overheat Mode를 조정합니다.</p>
            </div>
            <label class="toggle-row">
              <span>Power</span>
              <input id="conveyorPower" type="checkbox" />
            </label>
            <label class="toggle-row">
              <span>Overheat Mode</span>
              <input id="conveyorOverheatMode" type="checkbox" />
            </label>
          </section>

          <section class="control-group">
            <div>
              <h3>Air Conditioner</h3>
              <p>냉각 장치 power를 조정합니다.</p>
            </div>
            <label class="toggle-row">
              <span>Power</span>
              <input id="airconPower" type="checkbox" />
            </label>
          </section>
        </article>
      </section>
    </main>
    <script src="/panel.js" type="module"></script>
  </body>
</html>`;

export const CONTROL_PANEL_CSS = `:root {
  color-scheme: light;
  --ink: #17201b;
  --muted: #637064;
  --line: rgba(23, 32, 27, 0.14);
  --paper: #fff9ec;
  --panel: rgba(255, 255, 255, 0.82);
  --field: #f7efe0;
  --accent: #e6542f;
  --accent-strong: #a9331f;
  --ok: #146c43;
  --off: #8a3b24;
  font-family: Avenir Next, Optima, Trebuchet MS, sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  color: var(--ink);
  background:
    radial-gradient(circle at 18% 18%, rgba(230, 84, 47, 0.22), transparent 28rem),
    radial-gradient(circle at 90% 12%, rgba(34, 95, 66, 0.18), transparent 24rem),
    linear-gradient(135deg, #f3dfba 0%, #fff9ec 46%, #d8e1c4 100%);
}

.shell {
  width: min(1024px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0;
}

.hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;
  border: 1px solid var(--line);
  border-radius: 28px;
  background: rgba(255, 249, 236, 0.76);
  box-shadow: 0 24px 80px rgba(68, 54, 30, 0.18);
}

h1,
h2,
h3,
p {
  margin: 0;
}

h1 {
  font-size: clamp(2.2rem, 4vw, 4rem);
  letter-spacing: -0.06em;
  line-height: 0.95;
}

h2 {
  font-size: clamp(1.4rem, 2.4vw, 2.2rem);
  letter-spacing: -0.04em;
}

h3 {
  font-size: 1.15rem;
}

.eyebrow {
  margin-bottom: 10px;
  color: var(--accent-strong);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.note {
  max-width: 680px;
  margin-top: 14px;
  color: var(--muted);
}

.status-pill {
  min-width: 128px;
  padding: 10px 16px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--field);
  color: var(--off);
  font-weight: 800;
  text-align: center;
}

.status-pill.connected {
  color: var(--ok);
}

.meta-grid,
.panel-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.meta-grid article,
.card {
  border: 1px solid var(--line);
  border-radius: 24px;
  background: var(--panel);
  backdrop-filter: blur(12px);
  box-shadow: 0 16px 48px rgba(68, 54, 30, 0.12);
}

.meta-grid article {
  padding: 18px;
}

.meta-grid span,
.sensor-value > span,
.subtle-row span,
.toggle-row span {
  display: block;
  color: var(--muted);
  font-size: 0.85rem;
}

.meta-grid strong {
  display: block;
  margin-top: 6px;
  overflow-wrap: anywhere;
}

.panel-grid {
  grid-template-columns: 0.9fr 1.1fr;
}

.card {
  padding: 24px;
}

.sensor-value {
  margin-top: 24px;
  padding: 20px;
  border-radius: 20px;
  background: rgba(247, 239, 224, 0.8);
}

.sensor-value strong {
  display: block;
  margin-top: 6px;
  font-size: clamp(2.4rem, 6vw, 4.8rem);
  letter-spacing: -0.07em;
}

.sensor-value strong span {
  display: inline;
  color: inherit;
  font-size: inherit;
}

.sensor-value small {
  color: var(--muted);
}

.subtle-row,
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 18px;
}

.control-group {
  margin-top: 22px;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: rgba(247, 239, 224, 0.72);
}

.control-group p {
  margin-top: 4px;
  color: var(--muted);
}

input[type='checkbox'] {
  width: 58px;
  height: 32px;
  appearance: none;
  position: relative;
  border-radius: 999px;
  background: #b9a997;
  cursor: pointer;
  transition: background 160ms ease;
}

input[type='checkbox']::after {
  content: '';
  position: absolute;
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: white;
  transition: transform 160ms ease;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
}

input[type='checkbox']:checked {
  background: var(--accent);
}

input[type='checkbox']:checked::after {
  transform: translateX(26px);
}

@media (max-width: 760px) {
  .hero,
  .subtle-row,
  .toggle-row {
    align-items: stretch;
    flex-direction: column;
  }

  .meta-grid,
  .panel-grid {
    grid-template-columns: 1fr;
  }

  .status-pill {
    width: 100%;
  }
}`;

export const CONTROL_PANEL_JS = `const state = {
  refreshing: false
};

const elements = {
  connectionState: document.getElementById('connectionState'),
  uniqUserId: document.getElementById('uniqUserId'),
  brokerUrl: document.getElementById('brokerUrl'),
  lastPublishedAt: document.getElementById('lastPublishedAt'),
  temperatureValue: document.getElementById('temperatureValue'),
  vibrationValue: document.getElementById('vibrationValue'),
  lastSensorPublishedAt: document.getElementById('lastSensorPublishedAt'),
  conveyorPower: document.getElementById('conveyorPower'),
  conveyorOverheatMode: document.getElementById('conveyorOverheatMode'),
  airconPower: document.getElementById('airconPower')
};

function formatTimestamp(value) {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString();
}

function powerToBoolean(value) {
  return value === 'on';
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return await response.json();
}

async function refreshState() {
  state.refreshing = true;
  try {
    const snapshot = await requestJson('/api/state');
    elements.connectionState.textContent = snapshot.connectionState;
    elements.connectionState.classList.toggle('connected', snapshot.connectionState === 'connected');
    elements.uniqUserId.textContent = snapshot.uniqUserId;
    elements.brokerUrl.textContent = snapshot.brokerUrl;
    elements.lastPublishedAt.textContent = formatTimestamp(snapshot.lastPublishedAt);
    elements.temperatureValue.textContent = snapshot.sensors.temperature.value.toFixed(1);
    elements.vibrationValue.textContent = snapshot.sensors.vibration.value.toFixed(1);
    elements.lastSensorPublishedAt.textContent = formatTimestamp(snapshot.sensors.lastPublishedAt);
    elements.conveyorPower.checked = powerToBoolean(snapshot.actuators.conveyorBelt.power);
    elements.conveyorOverheatMode.checked = powerToBoolean(snapshot.actuators.conveyorBelt.overheatMode);
    elements.airconPower.checked = powerToBoolean(snapshot.actuators.aircon.power);
  } finally {
    state.refreshing = false;
  }
}

function toPower(value) {
  return value ? 'on' : 'off';
}

async function postControl(path, payload) {
  await requestJson(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  await refreshState();
}

elements.conveyorPower.addEventListener('change', () => {
  if (state.refreshing) return;
  void postControl('/api/control/conveyor-belt', {
    power: toPower(elements.conveyorPower.checked),
    overheatMode: toPower(elements.conveyorOverheatMode.checked)
  });
});

elements.conveyorOverheatMode.addEventListener('change', () => {
  if (state.refreshing) return;
  void postControl('/api/control/conveyor-belt', {
    power: toPower(elements.conveyorPower.checked),
    overheatMode: toPower(elements.conveyorOverheatMode.checked)
  });
});

elements.airconPower.addEventListener('change', () => {
  if (state.refreshing) return;
  void postControl('/api/control/aircon', {
    power: toPower(elements.airconPower.checked)
  });
});

await refreshState();
setInterval(() => {
  void refreshState();
}, 1000);`;
