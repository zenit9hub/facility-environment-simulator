import { ROOM_ID } from '../constants/simulationConstants.js';

const KIOT_TOPIC_PREFIX = 'kiot';
const FACTORY_SEGMENT = 'factory';
const SENSOR_SEGMENT = 'sensor';
const ACTUATOR_SEGMENT = 'actuator';
const TEMPERATURE_SEGMENT = 'temperature';
const VIBRATION_SEGMENT = 'vibration';
const CONVEYOR_SEGMENT = 'conveyor-belt';
const AIRCON_SEGMENT = 'aircon';

export interface TopicSet {
  conveyorControlTopic: string;
  airconControlTopic: string;
  conveyorStatusTopic: string;
  airconStatusTopic: string;
  temperatureSensorTopic: string;
  vibrationSensorTopic: string;
  controlTopics: readonly [string, string];
  publishTopics: readonly [string, string, string, string];
}

export function buildTopics(uniqUserId: string): TopicSet {
  const normalizedUniqUserId = uniqUserId.trim();

  if (normalizedUniqUserId.length === 0) {
    throw new Error('uniqUserId must be a non-empty string.');
  }

  const roomRoot = `${KIOT_TOPIC_PREFIX}/${normalizedUniqUserId}/${FACTORY_SEGMENT}/${ROOM_ID}`;
  const sensorRoot = `${roomRoot}/${SENSOR_SEGMENT}`;
  const actuatorRoot = `${roomRoot}/${ACTUATOR_SEGMENT}`;
  const conveyorControlTopic = `${actuatorRoot}/${CONVEYOR_SEGMENT}/control`;
  const airconControlTopic = `${actuatorRoot}/${AIRCON_SEGMENT}/control`;
  const conveyorStatusTopic = `${actuatorRoot}/${CONVEYOR_SEGMENT}/status`;
  const airconStatusTopic = `${actuatorRoot}/${AIRCON_SEGMENT}/status`;
  const temperatureSensorTopic = `${sensorRoot}/${TEMPERATURE_SEGMENT}`;
  const vibrationSensorTopic = `${sensorRoot}/${VIBRATION_SEGMENT}`;

  return {
    conveyorControlTopic,
    airconControlTopic,
    conveyorStatusTopic,
    airconStatusTopic,
    temperatureSensorTopic,
    vibrationSensorTopic,
    controlTopics: [conveyorControlTopic, airconControlTopic],
    publishTopics: [
      conveyorStatusTopic,
      airconStatusTopic,
      temperatureSensorTopic,
      vibrationSensorTopic
    ]
  };
}
