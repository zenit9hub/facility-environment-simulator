import { describe, expect, it, vi } from 'vitest';

import { startSimulatorRuntime } from '../../src/runtime/startSimulatorRuntime.js';

describe('startSimulatorRuntime', () => {
  it('connects the simulator before starting and stops it only once', async () => {
    const events: string[] = [];
    const connect = vi.fn(async () => {
      events.push('connect');
    });
    const start = vi.fn(() => {
      events.push('start');
    });
    const stop = vi.fn(async () => {
      events.push('stop');
    });
    const getStateSnapshot = vi.fn();
    const applyConveyorControl = vi.fn();
    const applyAirconControl = vi.fn();
    const log = vi.fn();

    const handle = await startSimulatorRuntime(
      {
        brokerUrl: 'mqtt://broker.internal:1883',
        uniqUserId: 'student-01',
        controlPanel: {
          enabled: false,
          port: 3000,
          autoOpen: false
        },
        simulationTickMs: 250,
        temperatureChangeIntervalMs: 5000
      },
      {
        createSimulator: (options) => {
          expect(options).toEqual({
            brokerUrl: 'mqtt://broker.internal:1883',
            uniqUserId: 'student-01',
            log,
            simulationTickMs: 250,
            temperatureChangeIntervalMs: 5000
          });

          return {
            connect,
            start,
            stop,
            getStateSnapshot,
            applyConveyorControl,
            applyAirconControl
          };
        },
        log
      }
    );

    expect(events).toEqual(['connect', 'start']);
    expect(log).toHaveBeenCalledWith(
      'Facility Environment Simulator started. brokerUrl=mqtt://broker.internal:1883 uniqUserId=student-01 tickMs=250 temperatureIntervalMs=5000'
    );

    await handle.stop();
    await handle.stop();

    expect(events).toEqual(['connect', 'start', 'stop']);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenLastCalledWith('Facility Environment Simulator stopped.');
  });

  it('starts the control panel server and opens it when enabled', async () => {
    const simulator = {
      connect: vi.fn(async () => {}),
      start: vi.fn(() => {}),
      stop: vi.fn(async () => {}),
      getStateSnapshot: vi.fn(),
      applyConveyorControl: vi.fn(),
      applyAirconControl: vi.fn()
    };
    const closeControlPanel = vi.fn(async () => {});
    const log = vi.fn();
    const openControlPanel = vi.fn(async () => {});

    const handle = await startSimulatorRuntime(
      {
        brokerUrl: 'mqtt://broker.internal:1883',
        uniqUserId: 'student-01',
        controlPanel: {
          enabled: true,
          port: 3100,
          autoOpen: true
        },
        simulationTickMs: 250,
        temperatureChangeIntervalMs: 5000
      },
      {
        createSimulator: () => simulator,
        startControlPanelServer: vi.fn(async (options) => {
          expect(options).toMatchObject({
            simulator,
            brokerUrl: 'mqtt://broker.internal:1883',
            uniqUserId: 'student-01',
            port: 3100
          });

          return {
            url: 'http://localhost:3100',
            close: closeControlPanel
          };
        }),
        openControlPanel,
        log
      }
    );

    expect(log).toHaveBeenCalledWith(
      '[simulator] control panel started. url=http://localhost:3100'
    );
    expect(openControlPanel).toHaveBeenCalledWith('http://localhost:3100');
    expect(log).toHaveBeenCalledWith('[simulator] control panel opened.');

    await handle.stop();

    expect(closeControlPanel).toHaveBeenCalledTimes(1);
    expect(simulator.stop).toHaveBeenCalledTimes(1);
  });
});
