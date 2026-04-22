import { SIMULATION_TICK_MS, TEMPERATURE_CHANGE_INTERVAL_MS } from '../constants/simulationConstants.js';

export const DEFAULT_MQTT_BROKER_URL = 'mqtt://broker.emqx.io:1883';
export const DEFAULT_CONTROL_PANEL_PORT = 3000;

export interface RuntimeConfig {
  brokerUrl: string;
  uniqUserId: string;
  controlPanel: ControlPanelRuntimeConfig;
  simulationTickMs: number;
  temperatureChangeIntervalMs: number;
}

export interface ControlPanelRuntimeConfig {
  enabled: boolean;
  port: number;
  autoOpen: boolean;
}

export function loadRuntimeConfig(
  env: Record<string, string | undefined> = process.env
): RuntimeConfig {
  const brokerUrl = env.MQTT_BROKER_URL?.trim() || DEFAULT_MQTT_BROKER_URL;

  return {
    brokerUrl,
    uniqUserId: requireNonEmptyString(env.MQTT_UNIQ_USER_ID, 'MQTT_UNIQ_USER_ID'),
    controlPanel: {
      enabled: parseBooleanEnv(env.CONTROL_PANEL_ENABLED, true),
      port: parsePortEnv(env.CONTROL_PANEL_PORT, DEFAULT_CONTROL_PANEL_PORT),
      autoOpen: parseBooleanEnv(env.CONTROL_PANEL_AUTO_OPEN, true)
    },
    simulationTickMs: SIMULATION_TICK_MS,
    temperatureChangeIntervalMs: TEMPERATURE_CHANGE_INTERVAL_MS
  };
}

function requireNonEmptyString(value: string | undefined, envName: string): string {
  if (value === undefined || value.trim() === '') {
    throw new Error(`${envName} is required.`);
  }

  return value.trim();
}

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }

  return value.trim().toLowerCase() !== 'false';
}

function parsePortEnv(value: string | undefined, defaultValue: number): number {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('CONTROL_PANEL_PORT must be an integer between 1 and 65535.');
  }

  return port;
}
