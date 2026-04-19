import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  AirconStatusMessage,
  ConveyorStatusMessage,
  TemperatureSensorMessage,
  VibrationSensorMessage
} from '../../src/contracts/messages.js';
import { assertPublishedMessageContract } from '../../src/contracts/publishedMessageContract.js';
import { buildTopics } from '../../src/contracts/topics.js';
import { FacilityEnvironmentSimulator } from '../../src/simulator/FacilityEnvironmentSimulator.js';
import { MqttTestHarness, type CapturedMessage, waitForMessageCount } from '../harness/MqttTestHarness.js';

type PublishedPayload =
  | ConveyorStatusMessage
  | AirconStatusMessage
  | TemperatureSensorMessage
  | VibrationSensorMessage;

const TEST_UNIQ_USER_ID = 'student-01';

describe('FacilityEnvironmentSimulator', () => {
  let mqttHarness: MqttTestHarness;
  let simulator: FacilityEnvironmentSimulator;

  beforeEach(async () => {
    mqttHarness = new MqttTestHarness();
    await mqttHarness.start();

    simulator = new FacilityEnvironmentSimulator({
      brokerUrl: mqttHarness.brokerUrl,
      uniqUserId: TEST_UNIQ_USER_ID
    });

    await simulator.connect();
  });

  afterEach(async () => {
    if (simulator) {
      await simulator.stop();
    }

    if (mqttHarness) {
      await mqttHarness.close();
    }
  });

  it('publishes sensor and actuator topics within a tick', async () => {
    const topics = buildTopics(TEST_UNIQ_USER_ID);
    const observer = await mqttHarness.createClient('observer-published-topics');
    const received: CapturedMessage<PublishedPayload>[] = [];

    await mqttHarness.subscribeJson(observer, topics.publishTopics.slice(), received);

    for (let tick = 0; tick < 10; tick += 1) {
      await simulator.tick();
    }
    await waitForMessageCount(received, 4);

    const publishedTopics = received.map((message) => message.topic).sort();
    expect(publishedTopics).toEqual(topics.publishTopics.slice().sort());
  });

  it('publishes payloads that satisfy the MQTT wire contract', async () => {
    const topics = buildTopics(TEST_UNIQ_USER_ID);
    const observer = await mqttHarness.createClient('observer-payload-contract');
    const received: CapturedMessage<PublishedPayload>[] = [];

    await mqttHarness.subscribeJson(observer, topics.publishTopics.slice(), received);

    for (let tick = 0; tick < 10; tick += 1) {
      await simulator.tick();
    }
    await waitForMessageCount(received, 4);

    const conveyorStatus = received.find((message) => message.topic === topics.conveyorStatusTopic);
    const airconStatus = received.find((message) => message.topic === topics.airconStatusTopic);
    const temperatureSensor = received.find((message) => message.topic === topics.temperatureSensorTopic);
    const vibrationSensor = received.find((message) => message.topic === topics.vibrationSensorTopic);

    expect(() =>
      assertPublishedMessageContract('conveyorStatus', conveyorStatus?.payload)
    ).not.toThrow();
    expect(() =>
      assertPublishedMessageContract('airconStatus', airconStatus?.payload)
    ).not.toThrow();
    expect(() =>
      assertPublishedMessageContract('temperatureSensor', temperatureSensor?.payload)
    ).not.toThrow();
    expect(() =>
      assertPublishedMessageContract('vibrationSensor', vibrationSensor?.payload)
    ).not.toThrow();
  });

  it('publishes actuator status immediately after valid control messages', async () => {
    const topics = buildTopics(TEST_UNIQ_USER_ID);
    const observer = await mqttHarness.createClient('observer-immediate-status');
    const controller = await mqttHarness.createClient('controller-immediate-status');
    const received: CapturedMessage<PublishedPayload>[] = [];

    await mqttHarness.subscribeJson(
      observer,
      [topics.conveyorStatusTopic, topics.airconStatusTopic],
      received
    );

    await mqttHarness.publishJson(controller, topics.conveyorControlTopic, {
      power: 'on',
      reason: 'start-simulation'
    });

    await mqttHarness.publishJson(controller, topics.airconControlTopic, {
      power: 'on',
      reason: 'cool-down'
    });

    await waitForMessageCount(received, 2);

    const conveyorStatus = received.find((message) => message.topic === topics.conveyorStatusTopic);
    const airconStatus = received.find((message) => message.topic === topics.airconStatusTopic);

    expect(conveyorStatus?.payload).toEqual({ power: 'on', overheatMode: 'off' });
    expect(airconStatus?.payload).toEqual({ power: 'on' });
  });

  it('logs periodic publishes, control messages, and immediate status publishes', async () => {
    const topics = buildTopics(TEST_UNIQ_USER_ID);
    const log = vi.fn();
    await simulator.stop();

    simulator = new FacilityEnvironmentSimulator({
      brokerUrl: mqttHarness.brokerUrl,
      uniqUserId: TEST_UNIQ_USER_ID,
      log,
      simulationTickMs: 100,
      publishIntervalMs: 100,
      temperatureChangeIntervalMs: 100
    });

    await simulator.connect();

    const observer = await mqttHarness.createClient('observer-console-logs');
    const controller = await mqttHarness.createClient('controller-console-logs');
    const received: CapturedMessage<PublishedPayload>[] = [];

    await mqttHarness.subscribeJson(
      observer,
      [topics.conveyorStatusTopic, topics.airconStatusTopic],
      received
    );

    await mqttHarness.publishJson(controller, topics.conveyorControlTopic, {
      power: 'on',
      overheatMode: 'on',
      reason: 'manual-test'
    });

    await mqttHarness.publishJson(controller, topics.airconControlTopic, {
      power: 'on',
      reason: 'manual-test'
    });

    await waitForMessageCount(received, 2);

    expect(log).toHaveBeenCalledWith(
      '[simulator] control message received. target=conveyor-belt power=on overheatMode=on reason=manual-test'
    );
    expect(log).toHaveBeenCalledWith(
      '[simulator] actuator status published immediately. target=conveyor-belt power=on overheatMode=on'
    );
    expect(log).toHaveBeenCalledWith(
      '[simulator] control message received. target=aircon power=on reason=manual-test'
    );
    expect(log).toHaveBeenCalledWith(
      '[simulator] actuator status published immediately. target=aircon power=on'
    );

    await simulator.tick();

    expect(log).toHaveBeenCalledWith(
      '[simulator] MQTT topic messages published. intervalMs=100 userId=student-01 roomId=room-01'
    );
  });

  it('reflects conveyor overheat mode immediately and keeps it when omitted in later control payloads', async () => {
    const topics = buildTopics(TEST_UNIQ_USER_ID);
    const observer = await mqttHarness.createClient('observer-overheat-status');
    const controller = await mqttHarness.createClient('controller-overheat-status');
    const received: CapturedMessage<PublishedPayload>[] = [];

    await mqttHarness.subscribeJson(observer, [topics.conveyorStatusTopic], received);

    await mqttHarness.publishJson(controller, topics.conveyorControlTopic, {
      power: 'on',
      overheatMode: 'on',
      reason: 'overheat-test'
    });

    await waitForMessageCount(received, 1);
    expect(received.at(-1)?.payload).toEqual({ power: 'on', overheatMode: 'on' });

    await mqttHarness.publishJson(controller, topics.conveyorControlTopic, {
      power: 'on'
    });

    await waitForMessageCount(received, 2);
    expect(received.at(-1)?.payload).toEqual({ power: 'on', overheatMode: 'on' });
    expect(simulator.getStateSnapshot().conveyorOverheatMode).toBe(true);
  });

  it('applies combined cooling and conveyor heating after 10 ticks and reflects actuator power state', async () => {
    const topics = buildTopics(TEST_UNIQ_USER_ID);
    const observer = await mqttHarness.createClient('observer-temperature');
    const controller = await mqttHarness.createClient('controller-temperature');
    const received: CapturedMessage<PublishedPayload>[] = [];

    await mqttHarness.subscribeJson(observer, topics.publishTopics.slice(), received);

    await mqttHarness.publishJson(controller, topics.conveyorControlTopic, {
      power: 'on',
      reason: 'start-simulation'
    });

    await mqttHarness.publishJson(controller, topics.airconControlTopic, {
      power: 'on',
      reason: 'cool-down'
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    for (let tick = 0; tick < 10; tick += 1) {
      await simulator.tick();
    }

    await waitForMessageCount(received, 6);

    const temperatureMessages = received.filter(
      (message): message is CapturedMessage<TemperatureSensorMessage> =>
        message.topic === topics.temperatureSensorTopic
    );
    const conveyorStatusMessages = received.filter(
      (message): message is CapturedMessage<ConveyorStatusMessage> =>
        message.topic === topics.conveyorStatusTopic
    );
    const airconStatusMessages = received.filter(
      (message): message is CapturedMessage<AirconStatusMessage> =>
        message.topic === topics.airconStatusTopic
    );

    expect(temperatureMessages).toHaveLength(1);
    expect(temperatureMessages.at(-1)?.payload.value).toBeCloseTo(24.9, 6);
    expect(conveyorStatusMessages.at(-1)?.payload.power).toBe('on');
    expect(conveyorStatusMessages.at(-1)?.payload.overheatMode).toBe('off');
    expect(airconStatusMessages.at(-1)?.payload.power).toBe('on');
    expect(simulator.getStateSnapshot().conveyorRunning).toBe(true);
    expect(simulator.getStateSnapshot().conveyorOverheatMode).toBe(false);
    expect(simulator.getStateSnapshot().coolingCommandActive).toBe(true);
  });

  it('applies overheat mode to make temperature rise rapidly', async () => {
    const topics = buildTopics(TEST_UNIQ_USER_ID);
    const observer = await mqttHarness.createClient('observer-overheat-temperature');
    const controller = await mqttHarness.createClient('controller-overheat-temperature');
    const received: CapturedMessage<PublishedPayload>[] = [];

    await mqttHarness.subscribeJson(observer, topics.publishTopics.slice(), received);

    await mqttHarness.publishJson(controller, topics.conveyorControlTopic, {
      power: 'on',
      overheatMode: 'on',
      reason: 'rule-critical'
    });

    await mqttHarness.publishJson(controller, topics.airconControlTopic, {
      power: 'on',
      reason: 'cool-down'
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    for (let tick = 0; tick < 10; tick += 1) {
      await simulator.tick();
    }

    await waitForMessageCount(received, 6);

    const temperatureMessages = received.filter(
      (message): message is CapturedMessage<TemperatureSensorMessage> =>
        message.topic === topics.temperatureSensorTopic
    );
    const conveyorStatusMessages = received.filter(
      (message): message is CapturedMessage<ConveyorStatusMessage> =>
        message.topic === topics.conveyorStatusTopic
    );

    expect(temperatureMessages.at(-1)?.payload.value).toBeCloseTo(25.9, 6);
    expect(conveyorStatusMessages.at(-1)?.payload).toEqual({
      power: 'on',
      overheatMode: 'on'
    });
    expect(simulator.getStateSnapshot().conveyorOverheatMode).toBe(true);
  });

  it('ignores unsupported power aliases so state is not polluted', async () => {
    const topics = buildTopics(TEST_UNIQ_USER_ID);
    const controller = await mqttHarness.createClient('controller-invalid-alias');

    await mqttHarness.publishJson(controller, topics.conveyorControlTopic, {
      power: 'start'
    });

    await mqttHarness.publishJson(controller, topics.airconControlTopic, {
      power: 'enable'
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(simulator.getStateSnapshot().conveyorRunning).toBe(false);
    expect(simulator.getStateSnapshot().conveyorOverheatMode).toBe(false);
    expect(simulator.getStateSnapshot().coolingCommandActive).toBe(false);
  });

  it('ignores control payloads without a valid power field', async () => {
    const topics = buildTopics(TEST_UNIQ_USER_ID);
    const controller = await mqttHarness.createClient('controller-invalid-payload');

    await mqttHarness.publishJson(controller, topics.conveyorControlTopic, {
      reason: 'missing-power'
    });

    await mqttHarness.publishJson(controller, topics.airconControlTopic, {
      power: 1
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(simulator.getStateSnapshot().conveyorRunning).toBe(false);
    expect(simulator.getStateSnapshot().conveyorOverheatMode).toBe(false);
    expect(simulator.getStateSnapshot().coolingCommandActive).toBe(false);
  });

  it('ignores malformed raw MQTT payloads and still handles the next valid control message', async () => {
    const topics = buildTopics(TEST_UNIQ_USER_ID);
    const controller = await mqttHarness.createClient('controller-malformed-raw');

    await mqttHarness.publishRaw(controller, topics.conveyorControlTopic, '{');
    await mqttHarness.publishRaw(controller, topics.airconControlTopic, '[]');

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(simulator.getStateSnapshot().conveyorRunning).toBe(false);
    expect(simulator.getStateSnapshot().conveyorOverheatMode).toBe(false);
    expect(simulator.getStateSnapshot().coolingCommandActive).toBe(false);

    await mqttHarness.publishJson(controller, topics.conveyorControlTopic, {
      power: 'on'
    });

    await mqttHarness.publishJson(controller, topics.airconControlTopic, {
      power: 'on',
      reason: 'rule-critical'
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(simulator.getStateSnapshot().conveyorRunning).toBe(true);
    expect(simulator.getStateSnapshot().conveyorOverheatMode).toBe(false);
    expect(simulator.getStateSnapshot().coolingCommandActive).toBe(true);
  });

  it('schedules ticks automatically after start and stops publishing after stop', async () => {
    const topics = buildTopics(TEST_UNIQ_USER_ID);
    await simulator.stop();

    simulator = new FacilityEnvironmentSimulator({
      brokerUrl: mqttHarness.brokerUrl,
      uniqUserId: TEST_UNIQ_USER_ID,
      simulationTickMs: 50,
      publishIntervalMs: 100
    });

    await simulator.connect();

    const observer = await mqttHarness.createClient('observer-runtime-loop');
    const received: CapturedMessage<PublishedPayload>[] = [];

    await mqttHarness.subscribeJson(observer, topics.publishTopics.slice(), received);

    simulator.start();
    await waitForMessageCount(received, 8, 1000);

    await simulator.stop();
    const publishedBeforeStop = received.length;

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(publishedBeforeStop).toBeGreaterThanOrEqual(8);
    expect(received.length).toBe(publishedBeforeStop);
  });

  it('supports a custom uniq user id so external broker tests can use isolated namespaces', async () => {
    const customUniqUserId = 'student-02';
    const topics = buildTopics(customUniqUserId);
    await simulator.stop();

    simulator = new FacilityEnvironmentSimulator({
      brokerUrl: mqttHarness.brokerUrl,
      uniqUserId: customUniqUserId
    });

    await simulator.connect();

    const observer = await mqttHarness.createClient('observer-custom-uniq-user-id');
    const controller = await mqttHarness.createClient('controller-custom-uniq-user-id');
    const received: CapturedMessage<PublishedPayload>[] = [];

    await mqttHarness.subscribeJson(observer, topics.publishTopics.slice(), received);

    await mqttHarness.publishJson(controller, topics.conveyorControlTopic, {
      power: 'on'
    });

    await waitForMessageCount(received, 1);
    for (let tick = 0; tick < 10; tick += 1) {
      await simulator.tick();
    }
    await waitForMessageCount(received, 5);

    expect(simulator.getStateSnapshot().conveyorRunning).toBe(true);
    expect(received.every((message) => message.topic.startsWith('kiot/student-02/'))).toBe(true);
  });
});
