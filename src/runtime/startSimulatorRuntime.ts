import type { FacilityEnvironmentSimulatorOptions } from '../simulator/FacilityEnvironmentSimulator.js';
import { FacilityEnvironmentSimulator } from '../simulator/FacilityEnvironmentSimulator.js';
import type { RuntimeConfig } from './runtimeConfig.js';

export interface RuntimeSimulator {
  connect(): Promise<void>;
  start(): void;
  stop(): Promise<void>;
}

export interface RuntimeHandle {
  stop(): Promise<void>;
}

export interface StartSimulatorRuntimeDependencies {
  createSimulator?: (options: FacilityEnvironmentSimulatorOptions) => RuntimeSimulator;
  log?: (message: string) => void;
}

export async function startSimulatorRuntime(
  config: RuntimeConfig,
  dependencies: StartSimulatorRuntimeDependencies = {}
): Promise<RuntimeHandle> {
  const createSimulator =
    dependencies.createSimulator ??
    ((options: FacilityEnvironmentSimulatorOptions) => new FacilityEnvironmentSimulator(options));
  const log = dependencies.log ?? console.log;

  const simulator = createSimulator({
    brokerUrl: config.brokerUrl,
    uniqUserId: config.uniqUserId,
    log,
    simulationTickMs: config.simulationTickMs,
    temperatureChangeIntervalMs: config.temperatureChangeIntervalMs
  });

  await simulator.connect();
  simulator.start();

  log(
    `Facility Environment Simulator started. brokerUrl=${config.brokerUrl} uniqUserId=${config.uniqUserId} tickMs=${config.simulationTickMs} temperatureIntervalMs=${config.temperatureChangeIntervalMs}`
  );

  let stopped = false;

  return {
    async stop(): Promise<void> {
      if (stopped) {
        return;
      }

      stopped = true;
      await simulator.stop();
      log('Facility Environment Simulator stopped.');
    }
  };
}
