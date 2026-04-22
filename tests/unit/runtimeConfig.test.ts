import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CONTROL_PANEL_PORT,
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
      controlPanel: {
        enabled: true,
        port: DEFAULT_CONTROL_PANEL_PORT,
        autoOpen: true
      },
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
      controlPanel: {
        enabled: true,
        port: DEFAULT_CONTROL_PANEL_PORT,
        autoOpen: true
      },
      simulationTickMs: 1000,
      temperatureChangeIntervalMs: 10000
    });
  });

  it('parses control panel runtime options from environment variables', () => {
    const config = loadRuntimeConfig({
      MQTT_UNIQ_USER_ID: 'student-03',
      CONTROL_PANEL_ENABLED: 'false',
      CONTROL_PANEL_PORT: '3100',
      CONTROL_PANEL_AUTO_OPEN: 'false'
    });

    expect(config.controlPanel).toEqual({
      enabled: false,
      port: 3100,
      autoOpen: false
    });
  });

  it('rejects invalid control panel port values', () => {
    expect(() =>
      loadRuntimeConfig({
        MQTT_UNIQ_USER_ID: 'student-04',
        CONTROL_PANEL_PORT: 'not-a-port'
      })
    ).toThrow('CONTROL_PANEL_PORT must be an integer between 1 and 65535.');

    expect(() =>
      loadRuntimeConfig({
        MQTT_UNIQ_USER_ID: 'student-04',
        CONTROL_PANEL_PORT: '70000'
      })
    ).toThrow('CONTROL_PANEL_PORT must be an integer between 1 and 65535.');
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
