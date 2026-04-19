const CONTRACT_FIELDS = {
  conveyorStatus: ['power', 'overheatMode'],
  airconStatus: ['power'],
  temperatureSensor: ['value'],
  vibrationSensor: ['value']
} as const;

export type PublishedMessageContractKind = keyof typeof CONTRACT_FIELDS;

export function assertPublishedMessageContract(
  kind: PublishedMessageContractKind,
  payload: unknown
): void {
  const record = asRecord(payload);
  const expectedFields = [...CONTRACT_FIELDS[kind]];

  assertExactFieldSet(kind, record, expectedFields);

  switch (kind) {
    case 'conveyorStatus':
      assertPowerField(record);
      assertToggleField(record, 'overheatMode');
      break;
    case 'airconStatus':
      assertPowerField(record);
      break;
    case 'temperatureSensor':
    case 'vibrationSensor':
      assertNumberField(record, 'value');
      break;
  }
}

function assertExactFieldSet(
  kind: PublishedMessageContractKind,
  record: Record<string, unknown>,
  expectedFields: string[]
): void {
  const actualFields = Object.keys(record);
  const isSameFieldSet =
    actualFields.length === expectedFields.length &&
    expectedFields.every((field) => actualFields.includes(field));

  if (!isSameFieldSet) {
    throw new Error(
      `Published ${kind} payload must include exactly these fields: ${expectedFields.join(', ')}`
    );
  }
}

function asRecord(payload: unknown): Record<string, unknown> {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new Error('Published payload must be a non-null object.');
  }

  return payload as Record<string, unknown>;
}

function assertStringField(record: Record<string, unknown>, key: string): void {
  if (typeof record[key] !== 'string') {
    throw new Error(`Published payload field ${key} must be a string.`);
  }
}

function assertPowerField(record: Record<string, unknown>): void {
  assertStringField(record, 'power');

  if (record.power !== 'on' && record.power !== 'off') {
    throw new Error('Published payload field power must be either on or off.');
  }
}

function assertToggleField(record: Record<string, unknown>, key: string): void {
  assertStringField(record, key);

  if (record[key] !== 'on' && record[key] !== 'off') {
    throw new Error(`Published payload field ${key} must be either on or off.`);
  }
}

function assertNumberField(record: Record<string, unknown>, key: string): void {
  if (typeof record[key] !== 'number' || !Number.isFinite(record[key])) {
    throw new Error(`Published payload field ${key} must be a finite number.`);
  }
}
