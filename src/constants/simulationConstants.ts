export const SIMULATION_TICK_MS = 1000;
export const PUBLISH_INTERVAL_MS = 10000;
export const TEMPERATURE_CHANGE_INTERVAL_MS = PUBLISH_INTERVAL_MS;
export const TEMPERATURE_CHANGE_INTERVAL_SEC = TEMPERATURE_CHANGE_INTERVAL_MS / 1000;

export const AMBIENT_BASELINE_TEMP = 25;
export const AIRCON_MIN_TEMP = 22;
export const CONVEYOR_MAX_TEMP = 50;
export const CONVEYOR_HEAT_DELTA_PER_INTERVAL = 0.2;
export const CONVEYOR_OVERHEAT_MODE = 'off';
export const CONVEYOR_OVERHEAT_EXTRA_DELTA_PER_INTERVAL = 1.0;
export const COOLING_DELTA_PER_INTERVAL = -0.3;
export const BASELINE_RECOVERY_DELTA_PER_INTERVAL = 0.1;

export const ROOM_ID = 'room-01';
export const CONVEYOR_ID = 'conveyor-01';
export const AIRCON_ID = 'aircon-01';
export const TEMP_SENSOR_ID = 'temp-01';
export const VIB_SENSOR_ID = 'vib-01';

export const VIBRATION_AT_REST = 0;
export const VIBRATION_WHEN_RUNNING = 1;
