import { describe, expect, it } from 'vitest';

import { buildTopics } from '../../src/contracts/topics.js';

describe('buildTopics', () => {
  it('builds the documented Node-RED interop topic structure from uniq user id', () => {
    const topics = buildTopics('student-01');

    expect(topics.conveyorControlTopic).toBe(
      'kiot/student-01/factory/room-01/actuator/conveyor-belt/control'
    );
    expect(topics.airconControlTopic).toBe(
      'kiot/student-01/factory/room-01/actuator/aircon/control'
    );
    expect(topics.conveyorStatusTopic).toBe(
      'kiot/student-01/factory/room-01/actuator/conveyor-belt/status'
    );
    expect(topics.airconStatusTopic).toBe(
      'kiot/student-01/factory/room-01/actuator/aircon/status'
    );
    expect(topics.temperatureSensorTopic).toBe(
      'kiot/student-01/factory/room-01/sensor/temperature'
    );
    expect(topics.vibrationSensorTopic).toBe(
      'kiot/student-01/factory/room-01/sensor/vibration'
    );
    expect(topics.publishTopics).toHaveLength(4);
  });

  it('rejects blank uniq user ids', () => {
    expect(() => buildTopics('')).toThrow('uniqUserId must be a non-empty string.');
    expect(() => buildTopics('   ')).toThrow('uniqUserId must be a non-empty string.');
  });
});
