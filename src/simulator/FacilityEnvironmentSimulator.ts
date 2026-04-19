import { connect, type MqttClient } from 'mqtt';

import {
  AIRCON_MIN_TEMP,
  AMBIENT_BASELINE_TEMP,
  BASELINE_RECOVERY_DELTA_PER_INTERVAL,
  CONVEYOR_MAX_TEMP,
  CONVEYOR_HEAT_DELTA_PER_INTERVAL,
  CONVEYOR_OVERHEAT_EXTRA_DELTA_PER_INTERVAL,
  CONVEYOR_OVERHEAT_MODE,
  COOLING_DELTA_PER_INTERVAL,
  PUBLISH_INTERVAL_MS,
  ROOM_ID,
  SIMULATION_TICK_MS,
  TEMPERATURE_CHANGE_INTERVAL_MS,
  TEMPERATURE_CHANGE_INTERVAL_SEC,
  VIBRATION_AT_REST,
  VIBRATION_WHEN_RUNNING
} from '../constants/simulationConstants.js';
import type {
  AirconStatusMessage,
  ConveyorStatusMessage,
  TemperatureSensorMessage,
  VibrationSensorMessage
} from '../contracts/messages.js';
import {
  parseAirconControlPayload,
  parseConveyorControlPayload
} from '../contracts/controlMessageParser.js';
import { buildTopics, type TopicSet } from '../contracts/topics.js';
import { calculateNextTemperature } from '../domain/temperatureModel.js';

type SimulatorLogger = (message: string) => void;
type LogFieldValue = number | string | undefined;

const noopLog: SimulatorLogger = () => {};

export interface FacilityEnvironmentSimulatorOptions {
  brokerUrl: string;
  uniqUserId: string;
  log?: SimulatorLogger;
  now?: () => Date;
  simulationTickMs?: number;
  publishIntervalMs?: number;
  temperatureChangeIntervalMs?: number;
  ambientBaselineTemp?: number;
  airconMinTemp?: number;
  conveyorMaxTemp?: number;
  conveyorHeatDeltaPerInterval?: number;
  conveyorOverheatExtraDeltaPerInterval?: number;
  coolingDeltaPerInterval?: number;
  baselineRecoveryDeltaPerInterval?: number;
}

export interface SimulatorStateSnapshot {
  conveyorRunning: boolean;
  conveyorOverheatMode: boolean;
  coolingCommandActive: boolean;
  equipmentTemperature: number;
  vibration: number;
  ambientBaselineTemp: number;
  airconMinTemp: number;
  conveyorMaxTemp: number;
}

export class FacilityEnvironmentSimulator {
  private readonly now: () => Date;
  private readonly simulationTickMs: number;
  private readonly publishIntervalMs: number;
  private readonly temperatureChangeIntervalMs: number;
  private readonly conveyorHeatDeltaPerInterval: number;
  private readonly conveyorOverheatExtraDeltaPerInterval: number;
  private readonly coolingDeltaPerInterval: number;
  private readonly baselineRecoveryDeltaPerInterval: number;
  private readonly topics: TopicSet;
  private readonly state: SimulatorStateSnapshot;
  private readonly logger: SimulatorLogger;

  private client: MqttClient | null = null;
  private scheduler: NodeJS.Timeout | null = null;
  private elapsedPublishIntervalMs = 0;
  private elapsedTemperatureIntervalMs = 0;

  constructor(private readonly options: FacilityEnvironmentSimulatorOptions) {
    this.now = options.now ?? (() => new Date());
    this.simulationTickMs = options.simulationTickMs ?? SIMULATION_TICK_MS;
    this.publishIntervalMs = options.publishIntervalMs ?? PUBLISH_INTERVAL_MS;
    this.temperatureChangeIntervalMs =
      options.temperatureChangeIntervalMs ?? TEMPERATURE_CHANGE_INTERVAL_MS;
    this.conveyorHeatDeltaPerInterval =
      options.conveyorHeatDeltaPerInterval ?? CONVEYOR_HEAT_DELTA_PER_INTERVAL;
    this.conveyorOverheatExtraDeltaPerInterval =
      options.conveyorOverheatExtraDeltaPerInterval ?? CONVEYOR_OVERHEAT_EXTRA_DELTA_PER_INTERVAL;
    this.coolingDeltaPerInterval = options.coolingDeltaPerInterval ?? COOLING_DELTA_PER_INTERVAL;
    this.baselineRecoveryDeltaPerInterval =
      options.baselineRecoveryDeltaPerInterval ?? BASELINE_RECOVERY_DELTA_PER_INTERVAL;
    this.topics = buildTopics(options.uniqUserId);
    this.logger = options.log ?? noopLog;
    this.state = {
      conveyorRunning: false,
      conveyorOverheatMode: CONVEYOR_OVERHEAT_MODE !== 'off',
      coolingCommandActive: false,
      equipmentTemperature: options.ambientBaselineTemp ?? AMBIENT_BASELINE_TEMP,
      vibration: VIBRATION_AT_REST,
      ambientBaselineTemp: options.ambientBaselineTemp ?? AMBIENT_BASELINE_TEMP,
      airconMinTemp: options.airconMinTemp ?? AIRCON_MIN_TEMP,
      conveyorMaxTemp: options.conveyorMaxTemp ?? CONVEYOR_MAX_TEMP
    };
  }

  async connect(): Promise<void> {
    if (this.client) {
      return;
    }

    const client = await connectClient(this.options.brokerUrl);
    this.client = client;

    client.on('message', (topic, payload) => {
      void this.handleControlMessage(topic, payload.toString('utf8')).catch(() => {
        // Ignore runtime publish errors from asynchronous control handling.
      });
    });

    await Promise.all(this.topics.controlTopics.map((topic) => subscribeTopic(client, topic)));
  }

  start(): void {
    this.ensureClient();

    if (this.scheduler) {
      return;
    }

    this.scheduler = setInterval(() => {
      void this.tick();
    }, this.simulationTickMs);
  }

  async stop(): Promise<void> {
    if (this.scheduler) {
      clearInterval(this.scheduler);
      this.scheduler = null;
    }

    if (!this.client) {
      return;
    }

    const client = this.client;
    this.client = null;
    await closeClient(client);
  }

  getStateSnapshot(): SimulatorStateSnapshot {
    return { ...this.state };
  }

  async tick(): Promise<void> {
    this.ensureClient();

    this.applyEnvironmentalChanges();
    this.elapsedPublishIntervalMs += this.simulationTickMs;

    while (this.elapsedPublishIntervalMs >= this.publishIntervalMs) {
      await this.publishPeriodicSnapshot();
      this.elapsedPublishIntervalMs -= this.publishIntervalMs;
    }
  }

  private applyEnvironmentalChanges(): void {
    this.elapsedTemperatureIntervalMs += this.simulationTickMs;

    while (this.elapsedTemperatureIntervalMs >= this.temperatureChangeIntervalMs) {
      this.state.equipmentTemperature = calculateNextTemperature({
        currentTemperature: this.state.equipmentTemperature,
        conveyorRunning: this.state.conveyorRunning,
        conveyorOverheatMode: this.state.conveyorOverheatMode,
        coolingCommandActive: this.state.coolingCommandActive,
        ambientBaselineTemp: this.state.ambientBaselineTemp,
        airconMinTemp: this.state.airconMinTemp,
        conveyorMaxTemp: this.state.conveyorMaxTemp,
        conveyorHeatDeltaPerInterval: this.conveyorHeatDeltaPerInterval,
        conveyorOverheatExtraDeltaPerInterval: this.conveyorOverheatExtraDeltaPerInterval,
        coolingDeltaPerInterval: this.coolingDeltaPerInterval,
        baselineRecoveryDeltaPerInterval: this.baselineRecoveryDeltaPerInterval
      });

      this.elapsedTemperatureIntervalMs -= this.temperatureChangeIntervalMs;
    }

    this.state.vibration = this.state.conveyorRunning ? VIBRATION_WHEN_RUNNING : VIBRATION_AT_REST;
  }

  private async handleControlMessage(topic: string, payload: string): Promise<void> {
    if (topic === this.topics.conveyorControlTopic) {
      const nextState = parseConveyorControlPayload(payload);

      if (nextState !== null) {
        this.logger(
          formatLogLine('[simulator] control message received.', {
            target: 'conveyor-belt',
            power: formatPower(nextState.power),
            overheatMode:
              nextState.overheatMode === undefined ? undefined : formatPower(nextState.overheatMode),
            reason: nextState.reason
          })
        );
        this.state.conveyorRunning = nextState.power;
        if (nextState.overheatMode !== undefined) {
          this.state.conveyorOverheatMode = nextState.overheatMode;
        }
        await this.publishConveyorStatus();
      }

      return;
    }

    if (topic === this.topics.airconControlTopic) {
      const nextState = parseAirconControlPayload(payload);

      if (nextState !== null) {
        this.logger(
          formatLogLine('[simulator] control message received.', {
            target: 'aircon',
            power: formatPower(nextState.power),
            reason: nextState.reason
          })
        );
        this.state.coolingCommandActive = nextState.power;
        await this.publishAirconStatus();
      }
    }
  }

  private async publishPeriodicSnapshot(): Promise<void> {
    const client = this.ensureClient();

    await Promise.all([
      publishJson(client, this.topics.conveyorStatusTopic, this.createConveyorStatusMessage()),
      publishJson(client, this.topics.airconStatusTopic, this.createAirconStatusMessage()),
      publishJson(client, this.topics.temperatureSensorTopic, this.createTemperatureSensorMessage()),
      publishJson(client, this.topics.vibrationSensorTopic, this.createVibrationSensorMessage())
    ]);

    this.logger(
      formatLogLine('[simulator] MQTT topic messages published.', {
        intervalMs: this.publishIntervalMs,
        userId: this.options.uniqUserId.trim(),
        roomId: ROOM_ID
      })
    );
  }

  private async publishConveyorStatus(): Promise<void> {
    const client = this.client;

    if (!client) {
      return;
    }

    const statusMessage = this.createConveyorStatusMessage();
    await publishJson(client, this.topics.conveyorStatusTopic, statusMessage);
    this.logger(
      formatLogLine('[simulator] actuator status published immediately.', {
        target: 'conveyor-belt',
        power: statusMessage.power,
        overheatMode: statusMessage.overheatMode
      })
    );
  }

  private async publishAirconStatus(): Promise<void> {
    const client = this.client;

    if (!client) {
      return;
    }

    const statusMessage = this.createAirconStatusMessage();
    await publishJson(client, this.topics.airconStatusTopic, statusMessage);
    this.logger(
      formatLogLine('[simulator] actuator status published immediately.', {
        target: 'aircon',
        power: statusMessage.power
      })
    );
  }

  private createConveyorStatusMessage(): ConveyorStatusMessage {
    return {
      power: this.state.conveyorRunning ? 'on' : 'off',
      overheatMode: this.state.conveyorOverheatMode ? 'on' : 'off'
    };
  }

  private createAirconStatusMessage(): AirconStatusMessage {
    return {
      power: this.state.coolingCommandActive ? 'on' : 'off'
    };
  }

  private createTemperatureSensorMessage(): TemperatureSensorMessage {
    return {
      value: this.state.equipmentTemperature
    };
  }

  private createVibrationSensorMessage(): VibrationSensorMessage {
    return {
      value: this.state.vibration
    };
  }

  private ensureClient(): MqttClient {
    if (!this.client) {
      throw new Error(
        `MQTT client is not connected. Call connect() before start() or tick(). Interval=${TEMPERATURE_CHANGE_INTERVAL_SEC}s`
      );
    }

    return this.client;
  }
}

async function connectClient(brokerUrl: string): Promise<MqttClient> {
  return await new Promise<MqttClient>((resolve, reject) => {
    const client = connect(brokerUrl, {
      reconnectPeriod: 0
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

async function subscribeTopic(client: MqttClient, topic: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    client.subscribe(topic, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
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

async function closeClient(client: MqttClient): Promise<void> {
  await new Promise<void>((resolve) => {
    client.end(false, {}, () => resolve());
  });
}

function formatPower(value: boolean): 'on' | 'off' {
  return value ? 'on' : 'off';
}

function formatLogLine(prefix: string, fields: Record<string, LogFieldValue>): string {
  const details = Object.entries(fields)
    .flatMap(([key, value]) => (value === undefined ? [] : [`${key}=${value}`]))
    .join(' ');

  return details.length === 0 ? prefix : `${prefix} ${details}`;
}
