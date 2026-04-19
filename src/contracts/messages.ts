export type PowerState = 'on' | 'off';
export type OverheatMode = 'on' | 'off';

export interface ConveyorControlMessage {
  power: PowerState;
  overheatMode?: OverheatMode;
  reason?: string;
}

export interface AirconControlMessage {
  power: PowerState;
  reason?: string;
}

export interface ConveyorStatusMessage {
  power: PowerState;
  overheatMode: OverheatMode;
}

export interface AirconStatusMessage {
  power: PowerState;
}

export interface TemperatureSensorMessage {
  value: number;
}

export interface VibrationSensorMessage {
  value: number;
}
