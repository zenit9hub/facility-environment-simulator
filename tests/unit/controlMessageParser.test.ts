import { describe, expect, it } from 'vitest';

import {
  parseAirconControlPayload,
  parseConveyorControlPayload,
  parseConveyorRunningFromControlPayload,
  parseCoolingCommandFromControlPayload
} from '../../src/contracts/controlMessageParser.js';

describe('control message parser contract', () => {
  it('parses conveyor power and optional overheat mode together', () => {
    expect(
      parseConveyorControlPayload(
        JSON.stringify({
          power: ' on ',
          overheatMode: 'ON',
          reason: 'manual'
        })
      )
    ).toEqual({
      power: true,
      reason: 'manual',
      overheatMode: true
    });

    expect(
      parseConveyorControlPayload(
        JSON.stringify({
          power: 'OFF'
        })
      )
    ).toEqual({
      power: false
    });
  });

  it('accepts only on and off power values for conveyor control payload', () => {
    expect(
      parseConveyorRunningFromControlPayload(
        JSON.stringify({
          power: ' on ',
          reason: 'manual'
        })
      )
    ).toBe(true);

    expect(
      parseConveyorRunningFromControlPayload(
        JSON.stringify({
          power: 'OFF'
        })
      )
    ).toBe(false);
  });

  it('rejects unsupported conveyor power aliases and malformed payloads', () => {
    expect(
      parseConveyorControlPayload(
        JSON.stringify({
          power: 'on',
          overheatMode: 'boost'
        })
      )
    ).toBeNull();

    expect(
      parseConveyorRunningFromControlPayload(
        JSON.stringify({
          power: 'START'
        })
      )
    ).toBeNull();

    expect(
      parseConveyorRunningFromControlPayload(
        JSON.stringify({
          reason: 'missing-power'
        })
      )
    ).toBeNull();

    expect(parseConveyorRunningFromControlPayload('{')).toBeNull();
  });

  it('rejects conveyor payloads when optional reason is not a string', () => {
    expect(
      parseConveyorControlPayload(
        JSON.stringify({
          power: 'on',
          reason: 1
        })
      )
    ).toBeNull();
  });

  it('keeps current conveyor overheat state when overheatMode is omitted', () => {
    expect(
      parseConveyorControlPayload(
        JSON.stringify({
          power: 'on'
        })
      )
    ).toEqual({
      power: true
    });
  });

  it('accepts only on and off power values for aircon control payload', () => {
    expect(
      parseCoolingCommandFromControlPayload(
        JSON.stringify({
          power: ' on ',
          reason: 'rule-critical'
        })
      )
    ).toBe(true);

    expect(
      parseCoolingCommandFromControlPayload(
        JSON.stringify({
          power: 'OFF'
        })
      )
    ).toBe(false);
  });

  it('keeps aircon optional reason for debug logging', () => {
    expect(
      parseAirconControlPayload(
        JSON.stringify({
          power: ' on ',
          reason: 'rule-critical'
        })
      )
    ).toEqual({
      power: true,
      reason: 'rule-critical'
    });
  });

  it('rejects unsupported aircon power aliases and malformed payloads', () => {
    expect(
      parseCoolingCommandFromControlPayload(
        JSON.stringify({
          power: 'ENABLE'
        })
      )
    ).toBeNull();

    expect(
      parseCoolingCommandFromControlPayload(
        JSON.stringify({
          reason: 'missing-power'
        })
      )
    ).toBeNull();

    expect(parseCoolingCommandFromControlPayload('{')).toBeNull();
  });

  it('rejects aircon payloads when optional reason is not a string', () => {
    expect(
      parseCoolingCommandFromControlPayload(
        JSON.stringify({
          power: 'off',
          reason: false
        })
      )
    ).toBeNull();
  });
});
