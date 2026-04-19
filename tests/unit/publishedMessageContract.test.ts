import { describe, expect, it } from 'vitest';

import { assertPublishedMessageContract } from '../../src/contracts/publishedMessageContract.js';

describe('published message contract', () => {
  it('accepts a valid conveyor status payload', () => {
    expect(() =>
      assertPublishedMessageContract('conveyorStatus', {
        power: 'on',
        overheatMode: 'off'
      })
    ).not.toThrow();
  });

  it('rejects payloads with missing or extra conveyor status fields', () => {
    expect(() =>
      assertPublishedMessageContract('conveyorStatus', {
        power: 'on',
        reason: 'unexpected'
      })
    ).toThrow('must include exactly these fields: power, overheatMode');

    expect(() =>
      assertPublishedMessageContract('conveyorStatus', {
        value: 25
      })
    ).toThrow('must include exactly these fields: power, overheatMode');
  });

  it('rejects invalid status power values', () => {
    expect(() =>
      assertPublishedMessageContract('airconStatus', {
        power: 'enabled'
      })
    ).toThrow('power must be either on or off.');
  });

  it('rejects invalid conveyor overheat mode values', () => {
    expect(() =>
      assertPublishedMessageContract('conveyorStatus', {
        power: 'on',
        overheatMode: 'boost'
      })
    ).toThrow('overheatMode must be either on or off.');
  });

  it('accepts valid temperature, vibration, and aircon status payloads', () => {
    expect(() =>
      assertPublishedMessageContract('temperatureSensor', {
        value: 24.9
      })
    ).not.toThrow();

    expect(() =>
      assertPublishedMessageContract('vibrationSensor', {
        value: 1
      })
    ).not.toThrow();

    expect(() =>
      assertPublishedMessageContract('airconStatus', {
        power: 'off'
      })
    ).not.toThrow();
  });

  it('rejects non-numeric sensor values', () => {
    expect(() =>
      assertPublishedMessageContract('temperatureSensor', {
        value: '24.9'
      })
    ).toThrow('value must be a finite number.');
  });
});
