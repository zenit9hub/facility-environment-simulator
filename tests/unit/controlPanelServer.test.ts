import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  startControlPanelServer,
  type ControlPanelServerHandle,
  type ControlPanelSimulator
} from '../../src/panel/controlPanelServer.js';

describe('control panel server', () => {
  let handle: ControlPanelServerHandle | null = null;

  afterEach(async () => {
    if (handle) {
      await handle.close();
      handle = null;
    }
  });

  it('serves the control panel UI and current simulator state', async () => {
    const simulator = createPanelSimulator();
    handle = await startControlPanelServer({
      simulator,
      brokerUrl: 'mqtt://broker.internal:1883',
      uniqUserId: 'student-01',
      port: 0
    });

    const htmlResponse = await fetch(handle.url);
    expect(htmlResponse.status).toBe(200);
    await expect(htmlResponse.text()).resolves.toContain('Factory Simulator Control Panel');

    const stateResponse = await fetch(`${handle.url}/api/state`);
    expect(stateResponse.status).toBe(200);
    await expect(stateResponse.json()).resolves.toMatchObject({
      simulatorName: 'Factory Sensor Simulator',
      uniqUserId: 'student-01',
      brokerUrl: 'mqtt://broker.internal:1883',
      connectionState: 'connected',
      sensors: {
        temperature: {
          value: 25,
          min: 22,
          max: 50
        },
        vibration: {
          value: 0
        }
      },
      actuators: {
        conveyorBelt: {
          power: 'off',
          overheatMode: 'off'
        },
        aircon: {
          power: 'off'
        }
      }
    });
  });

  it('applies conveyor and aircon commands through simulator control methods', async () => {
    const simulator = createPanelSimulator();
    handle = await startControlPanelServer({
      simulator,
      brokerUrl: 'mqtt://broker.internal:1883',
      uniqUserId: 'student-01',
      port: 0
    });

    const conveyorResponse = await fetch(`${handle.url}/api/control/conveyor-belt`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        power: 'on',
        overheatMode: 'on'
      })
    });

    expect(conveyorResponse.status).toBe(200);
    expect(simulator.applyConveyorControl).toHaveBeenCalledWith({
      power: true,
      overheatMode: true,
      reason: 'control-panel',
      source: 'control-panel'
    });

    const airconResponse = await fetch(`${handle.url}/api/control/aircon`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        power: 'on'
      })
    });

    expect(airconResponse.status).toBe(200);
    expect(simulator.applyAirconControl).toHaveBeenCalledWith({
      power: true,
      reason: 'control-panel',
      source: 'control-panel'
    });
  });

  it('rejects malformed control panel payloads', async () => {
    const simulator = createPanelSimulator();
    handle = await startControlPanelServer({
      simulator,
      brokerUrl: 'mqtt://broker.internal:1883',
      uniqUserId: 'student-01',
      port: 0
    });

    const response = await fetch(`${handle.url}/api/control/conveyor-belt`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        power: 'start'
      })
    });

    expect(response.status).toBe(400);
    expect(simulator.applyConveyorControl).not.toHaveBeenCalled();
  });
});

function createPanelSimulator(): ControlPanelSimulator {
  return {
    getStateSnapshot: vi.fn(() => ({
      connected: true,
      conveyorRunning: false,
      conveyorOverheatMode: false,
      coolingCommandActive: false,
      equipmentTemperature: 25,
      vibration: 0,
      ambientBaselineTemp: 25,
      airconMinTemp: 22,
      conveyorMaxTemp: 50,
      lastPublishedAt: null,
      lastSensorPublishedAt: null
    })),
    applyConveyorControl: vi.fn(async () => {}),
    applyAirconControl: vi.fn(async () => {})
  };
}
