import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MQTT_BROKER_URL,
  loadRuntimeConfig
} from '../../src/runtime/runtimeConfig.js';

describe('loadRuntimeConfig', () => {
  it('uses the documented broker default and requires MQTT_UNIQ_USER_ID', () => {
    const config = loadRuntimeConfig({
      MQTT_UNIQ_USER_ID: 'student-01'
    });

    expect(config).toEqual({
      brokerUrl: DEFAULT_MQTT_BROKER_URL,
      uniqUserId: 'student-01',
      simulationTickMs: 1000,
      temperatureChangeIntervalMs: 10000
    });
  });

  it('parses only MQTT broker override from environment variables', () => {
    const config = loadRuntimeConfig({
      MQTT_UNIQ_USER_ID: 'student-02',
      MQTT_BROKER_URL: 'mqtt://broker.internal:1883'
    });

    expect(config).toEqual({
      uniqUserId: 'student-02',
      brokerUrl: 'mqtt://broker.internal:1883',
      simulationTickMs: 1000,
      temperatureChangeIntervalMs: 10000
    });
  });

  it('rejects missing or blank MQTT_UNIQ_USER_ID', () => {
    expect(() => loadRuntimeConfig({})).toThrow('MQTT_UNIQ_USER_ID is required.');
    expect(() =>
      loadRuntimeConfig({
        MQTT_UNIQ_USER_ID: '   '
      })
    ).toThrow('MQTT_UNIQ_USER_ID is required.');
  });
});
