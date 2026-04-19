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
    const log = vi.fn();

    const handle = await startSimulatorRuntime(
      {
        brokerUrl: 'mqtt://broker.internal:1883',
        uniqUserId: 'student-01',
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
            stop
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
});
