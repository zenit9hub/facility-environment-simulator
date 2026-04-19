import {
  AIRCON_MIN_TEMP,
  AMBIENT_BASELINE_TEMP,
  BASELINE_RECOVERY_DELTA_PER_INTERVAL,
  CONVEYOR_MAX_TEMP,
  CONVEYOR_HEAT_DELTA_PER_INTERVAL,
  CONVEYOR_OVERHEAT_EXTRA_DELTA_PER_INTERVAL,
  COOLING_DELTA_PER_INTERVAL
} from '../constants/simulationConstants.js';

export interface TemperatureCalculationInput {
  currentTemperature: number;
  conveyorRunning: boolean;
  conveyorOverheatMode?: boolean;
  coolingCommandActive: boolean;
  ambientBaselineTemp?: number;
  airconMinTemp?: number;
  conveyorMaxTemp?: number;
  conveyorHeatDeltaPerInterval?: number;
  conveyorOverheatExtraDeltaPerInterval?: number;
  coolingDeltaPerInterval?: number;
  baselineRecoveryDeltaPerInterval?: number;
}

export function moveTowardBaseline(
  currentTemperature: number,
  ambientBaselineTemp = AMBIENT_BASELINE_TEMP,
  baselineRecoveryDeltaPerInterval = BASELINE_RECOVERY_DELTA_PER_INTERVAL
): number {
  if (currentTemperature === ambientBaselineTemp) {
    return roundTemperature(currentTemperature);
  }

  if (currentTemperature > ambientBaselineTemp) {
    return roundTemperature(
      Math.max(ambientBaselineTemp, currentTemperature - baselineRecoveryDeltaPerInterval)
    );
  }

  return roundTemperature(
    Math.min(ambientBaselineTemp, currentTemperature + baselineRecoveryDeltaPerInterval)
  );
}

export function calculateNextTemperature({
  currentTemperature,
  conveyorRunning,
  conveyorOverheatMode = false,
  coolingCommandActive,
  ambientBaselineTemp = AMBIENT_BASELINE_TEMP,
  airconMinTemp = AIRCON_MIN_TEMP,
  conveyorMaxTemp = CONVEYOR_MAX_TEMP,
  conveyorHeatDeltaPerInterval = CONVEYOR_HEAT_DELTA_PER_INTERVAL,
  conveyorOverheatExtraDeltaPerInterval = CONVEYOR_OVERHEAT_EXTRA_DELTA_PER_INTERVAL,
  coolingDeltaPerInterval = COOLING_DELTA_PER_INTERVAL,
  baselineRecoveryDeltaPerInterval = BASELINE_RECOVERY_DELTA_PER_INTERVAL
}: TemperatureCalculationInput): number {
  const effectiveConveyorDelta =
    conveyorHeatDeltaPerInterval +
    (conveyorRunning && conveyorOverheatMode ? conveyorOverheatExtraDeltaPerInterval : 0);

  if (coolingCommandActive && conveyorRunning) {
    return clampTemperature(
      currentTemperature + coolingDeltaPerInterval + effectiveConveyorDelta,
      airconMinTemp,
      conveyorMaxTemp
    );
  }

  if (coolingCommandActive) {
    return clampTemperature(currentTemperature + coolingDeltaPerInterval, airconMinTemp);
  }

  if (conveyorRunning) {
    return clampTemperature(currentTemperature + effectiveConveyorDelta, undefined, conveyorMaxTemp);
  }

  return moveTowardBaseline(
    currentTemperature,
    ambientBaselineTemp,
    baselineRecoveryDeltaPerInterval
  );
}

function roundTemperature(value: number): number {
  return Number(value.toFixed(6));
}

function clampTemperature(value: number, min?: number, max?: number): number {
  const clampedToMin = min === undefined ? value : Math.max(min, value);
  const clampedToRange = max === undefined ? clampedToMin : Math.min(max, clampedToMin);

  return roundTemperature(clampedToRange);
}
