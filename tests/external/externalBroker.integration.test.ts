import { afterEach, describe, expect, it } from 'vitest';
import { connect, type MqttClient } from 'mqtt';

import type {
  AirconStatusMessage,
  ConveyorStatusMessage,
  TemperatureSensorMessage,
  VibrationSensorMessage
} from '../../src/contracts/messages.js';
import { assertPublishedMessageContract } from '../../src/contracts/publishedMessageContract.js';
import { buildTopics } from '../../src/contracts/topics.js';
import { FacilityEnvironmentSimulator } from '../../src/simulator/FacilityEnvironmentSimulator.js';

const EXTERNAL_BROKER_URL =
  process.env.EXTERNAL_BROKER_URL?.trim() || 'mqtt://broker.emqx.io:1883';
const UNIQ_USER_ID =
  process.env.EXTERNAL_TEST_UNIQ_USER_ID?.trim() ||
  `external-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

type ReceivedMessage = {
  topic: string;
  payload: Record<string, unknown>;
};

describe('External MQTT broker integration', () => {
  let simulator: FacilityEnvironmentSimulator | null = null;
  const clients: MqttClient[] = [];

  afterEach(async () => {
    if (simulator) {
      await simulator.stop();
      simulator = null;
    }

    await Promise.all(
      clients.map(
        (client) =>
          new Promise<void>((resolve) => {
            client.end(false, {}, () => resolve());
          })
      )
    );
    clients.length = 0;
  });

  it('publishes and verifies sensor messages through the external broker', async () => {
    const topics = buildTopics(UNIQ_USER_ID);
    const observer = await connectClient(`observer-${Date.now()}`);
    const controller = await connectClient(`controller-${Date.now()}`);
    clients.push(observer, controller);

    const received: ReceivedMessage[] = [];
    await subscribeJson(observer, [
      topics.conveyorStatusTopic,
      topics.airconStatusTopic,
      topics.temperatureSensorTopic,
      topics.vibrationSensorTopic
    ], received);

    simulator = new FacilityEnvironmentSimulator({
      brokerUrl: EXTERNAL_BROKER_URL,
      uniqUserId: UNIQ_USER_ID,
      simulationTickMs: 100,
      publishIntervalMs: 1000,
      temperatureChangeIntervalMs: 1000
    });

    await simulator.connect();

    await publishJson(controller, topics.conveyorControlTopic, {
      power: 'on',
      reason: 'start-simulation'
    });

    await publishJson(controller, topics.airconControlTopic, {
      power: 'on',
      reason: 'cool-down'
    });

    await waitForControlState(simulator, 10000);

    for (let tick = 0; tick < 12; tick += 1) {
      await simulator.tick();
    }

    await waitForExternalObservation(received, topics, 10000);

    const temperatureMessages = received.filter(
      (message): message is ReceivedMessage & { payload: TemperatureSensorMessage } =>
        message.topic === topics.temperatureSensorTopic
    );
    const conveyorStatusMessages = received.filter(
      (message): message is ReceivedMessage & { payload: ConveyorStatusMessage } =>
        message.topic === topics.conveyorStatusTopic
    );
    const airconStatusMessages = received.filter(
      (message): message is ReceivedMessage & { payload: AirconStatusMessage } =>
        message.topic === topics.airconStatusTopic
    );
    const vibrationMessages = received.filter(
      (message): message is ReceivedMessage & { payload: VibrationSensorMessage } =>
        message.topic === topics.vibrationSensorTopic
    );

    expect(simulator.getStateSnapshot().equipmentTemperature).toBeCloseTo(24.9, 6);
    expect(received.some((message) => message.topic === topics.conveyorStatusTopic)).toBe(true);
    expect(received.some((message) => message.topic === topics.airconStatusTopic)).toBe(true);
    expect(received.some((message) => message.topic === topics.temperatureSensorTopic)).toBe(true);
    expect(received.some((message) => message.topic === topics.vibrationSensorTopic)).toBe(true);
    expect(() =>
      assertPublishedMessageContract('temperatureSensor', temperatureMessages.at(-1)?.payload)
    ).not.toThrow();
    expect(() =>
      assertPublishedMessageContract('conveyorStatus', conveyorStatusMessages.at(-1)?.payload)
    ).not.toThrow();
    expect(() =>
      assertPublishedMessageContract('airconStatus', airconStatusMessages.at(-1)?.payload)
    ).not.toThrow();
    expect(() =>
      assertPublishedMessageContract('vibrationSensor', vibrationMessages.at(-1)?.payload)
    ).not.toThrow();
    expect(temperatureMessages.length).toBeGreaterThan(0);
  });
});

async function connectClient(clientId: string): Promise<MqttClient> {
  return await new Promise<MqttClient>((resolve, reject) => {
    const client = connect(EXTERNAL_BROKER_URL, {
      clientId,
      reconnectPeriod: 0,
      clean: true
    });

    const onConnect = () => {
      client.off('error', onError);
      resolve(client);
    };

    const onError = (error: Error) => {
      client.off('connect', onConnect);
      reject(error);
    };

    client.once('connect', onConnect);
    client.once('error', onError);
  });
}

async function subscribeJson(
  client: MqttClient,
  topics: string[],
  sink: ReceivedMessage[]
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    client.subscribe(topics, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  client.on('message', (topic, payload) => {
    const rawPayload = payload.toString('utf8');

    try {
      sink.push({
        topic,
        payload: JSON.parse(rawPayload) as Record<string, unknown>
      });
    } catch {
      // Ignore non-JSON payloads. This test validates simulator output only.
    }
  });
}

async function publishJson(client: MqttClient, topic: string, payload: unknown): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    client.publish(topic, JSON.stringify(payload), (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function waitForExternalObservation(
  messages: ReceivedMessage[],
  topics: ReturnType<typeof buildTopics>,
  timeoutMs: number
): Promise<void> {
  const startedAt = Date.now();

  while (true) {
    const hasConveyorStatus = messages.some((message) => message.topic === topics.conveyorStatusTopic);
    const hasAirconStatus = messages.some((message) => message.topic === topics.airconStatusTopic);
    const hasTemperatureSensor = messages.some(
      (message) => message.topic === topics.temperatureSensorTopic
    );
    const hasVibrationSensor = messages.some(
      (message) => message.topic === topics.vibrationSensorTopic
    );

    if (hasConveyorStatus && hasAirconStatus && hasTemperatureSensor && hasVibrationSensor) {
      return;
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(
        `Timed out waiting for expected observations from external broker. Received ${messages.length} messages.`
      );
    }

    await delay(50);
  }
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForControlState(
  simulator: FacilityEnvironmentSimulator,
  timeoutMs: number
): Promise<void> {
  const startedAt = Date.now();

  while (true) {
    const state = simulator.getStateSnapshot();

    if (state.conveyorRunning && state.coolingCommandActive) {
      return;
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Timed out waiting for external broker control messages to update state.');
    }

    await delay(50);
  }
}
