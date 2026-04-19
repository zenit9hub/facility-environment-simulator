import { SIMULATION_TICK_MS, TEMPERATURE_CHANGE_INTERVAL_MS } from '../constants/simulationConstants.js';

export const DEFAULT_MQTT_BROKER_URL = 'mqtt://broker.emqx.io:1883';

export interface RuntimeConfig {
  brokerUrl: string;
  uniqUserId: string;
  simulationTickMs: number;
  temperatureChangeIntervalMs: number;
}

export function loadRuntimeConfig(
  env: Record<string, string | undefined> = process.env
): RuntimeConfig {
  const brokerUrl = env.MQTT_BROKER_URL?.trim() || DEFAULT_MQTT_BROKER_URL;

  return {
    brokerUrl,
    uniqUserId: requireNonEmptyString(env.MQTT_UNIQ_USER_ID, 'MQTT_UNIQ_USER_ID'),
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
