import type {
  ControlPanelServerHandle,
  ControlPanelSimulator,
  ControlPanelServerOptions
} from '../panel/controlPanelServer.js';
import { startControlPanelServer as startDefaultControlPanelServer } from '../panel/controlPanelServer.js';
import {
  openControlPanelInDefaultBrowser,
  type OpenControlPanel
} from '../panel/openControlPanel.js';
import type { FacilityEnvironmentSimulatorOptions } from '../simulator/FacilityEnvironmentSimulator.js';
import { FacilityEnvironmentSimulator } from '../simulator/FacilityEnvironmentSimulator.js';
import type { RuntimeConfig } from './runtimeConfig.js';

export interface RuntimeSimulator extends ControlPanelSimulator {
  connect(): Promise<void>;
  start(): void;
  stop(): Promise<void>;
}

export interface RuntimeHandle {
  stop(): Promise<void>;
}

export interface StartSimulatorRuntimeDependencies {
  createSimulator?: (options: FacilityEnvironmentSimulatorOptions) => RuntimeSimulator;
  startControlPanelServer?: (options: ControlPanelServerOptions) => Promise<ControlPanelServerHandle>;
  openControlPanel?: OpenControlPanel;
  log?: (message: string) => void;
}

export async function startSimulatorRuntime(
  config: RuntimeConfig,
  dependencies: StartSimulatorRuntimeDependencies = {}
): Promise<RuntimeHandle> {
  const createSimulator =
    dependencies.createSimulator ??
    ((options: FacilityEnvironmentSimulatorOptions) => new FacilityEnvironmentSimulator(options));
  const startControlPanelServer =
    dependencies.startControlPanelServer ?? startDefaultControlPanelServer;
  const openControlPanel = dependencies.openControlPanel ?? openControlPanelInDefaultBrowser;
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

  const controlPanelHandle = await startControlPanelIfEnabled({
    config,
    simulator,
    startControlPanelServer,
    openControlPanel,
    log
  });

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
      if (controlPanelHandle) {
        await controlPanelHandle.close();
      }
      await simulator.stop();
      log('Facility Environment Simulator stopped.');
    }
  };
}

async function startControlPanelIfEnabled({
  config,
  simulator,
  startControlPanelServer,
  openControlPanel,
  log
}: {
  config: RuntimeConfig;
  simulator: RuntimeSimulator;
  startControlPanelServer: (options: ControlPanelServerOptions) => Promise<ControlPanelServerHandle>;
  openControlPanel: OpenControlPanel;
  log: (message: string) => void;
}): Promise<ControlPanelServerHandle | null> {
  if (!config.controlPanel.enabled) {
    return null;
  }

  const handle = await startControlPanelServer({
    simulator,
    brokerUrl: config.brokerUrl,
    uniqUserId: config.uniqUserId,
    port: config.controlPanel.port
  });

  log(`[simulator] control panel started. url=${handle.url}`);
  log(`Control panel: ${handle.url}`);

  if (config.controlPanel.autoOpen) {
    try {
      await openControlPanel(handle.url);
      log('[simulator] control panel opened.');
    } catch {
      log(`[simulator] control panel auto-open failed. open manually: ${handle.url}`);
    }
  }

  return handle;
}
