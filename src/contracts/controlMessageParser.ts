const POWER_ON = 'on';
const POWER_OFF = 'off';

export interface ConveyorControlParseResult {
  power: boolean;
  reason?: string;
  overheatMode?: boolean;
}

export interface AirconControlParseResult {
  power: boolean;
  reason?: string;
}

function parseJsonRecord(payload: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(payload);

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizePower(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeToggle(value: unknown): string | null {
  if (value === undefined) {
    return null;
  }

  return normalizePower(value);
}

function hasValidOptionalReason(record: Record<string, unknown>): boolean {
  if (!Object.hasOwn(record, 'reason') || record.reason === undefined) {
    return true;
  }

  return typeof record.reason === 'string';
}

function getOptionalReason(record: Record<string, unknown>): string | undefined {
  return typeof record.reason === 'string' ? record.reason : undefined;
}

export function parseAirconControlPayload(payload: string): AirconControlParseResult | null {
  const record = parseJsonRecord(payload);

  if (!record || !hasValidOptionalReason(record)) {
    return null;
  }

  const power = normalizePower(record.power);
  const reason = getOptionalReason(record);

  if (power === POWER_ON) {
    return {
      power: true,
      ...(reason === undefined ? {} : { reason })
    };
  }

  if (power === POWER_OFF) {
    return {
      power: false,
      ...(reason === undefined ? {} : { reason })
    };
  }

  return null;
}

export function parseConveyorRunningFromControlPayload(payload: string): boolean | null {
  return parseConveyorControlPayload(payload)?.power ?? null;
}

export function parseCoolingCommandFromControlPayload(payload: string): boolean | null {
  return parseAirconControlPayload(payload)?.power ?? null;
}

export function parseConveyorControlPayload(payload: string): ConveyorControlParseResult | null {
  const record = parseJsonRecord(payload);

  if (!record || !hasValidOptionalReason(record)) {
    return null;
  }

  const power = normalizePower(record.power);
  const reason = getOptionalReason(record);

  if (power !== POWER_ON && power !== POWER_OFF) {
    return null;
  }

  const overheatMode = normalizeToggle(record.overheatMode);

  if (
    overheatMode !== null &&
    overheatMode !== POWER_ON &&
    overheatMode !== POWER_OFF
  ) {
    return null;
  }

  return {
    power: power === POWER_ON,
    ...(reason === undefined ? {} : { reason }),
    ...(overheatMode === null ? {} : { overheatMode: overheatMode === POWER_ON })
  };
}
