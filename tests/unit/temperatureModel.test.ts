import { describe, expect, it } from 'vitest';

import { calculateNextTemperature } from '../../src/domain/temperatureModel.js';

describe('calculateNextTemperature', () => {
  it('drops temperature by 0.3 when only aircon is running', () => {
    const nextTemperature = calculateNextTemperature({
      currentTemperature: 25,
      conveyorRunning: false,
      coolingCommandActive: true
    });

    expect(nextTemperature).toBeCloseTo(24.7, 6);
  });

  it('raises temperature by 0.2 when only conveyor is running', () => {
    const nextTemperature = calculateNextTemperature({
      currentTemperature: 25,
      conveyorRunning: true,
      coolingCommandActive: false
    });

    expect(nextTemperature).toBeCloseTo(25.2, 6);
  });

  it('drops temperature by 0.1 when aircon and conveyor are running together', () => {
    const nextTemperature = calculateNextTemperature({
      currentTemperature: 25,
      conveyorRunning: true,
      coolingCommandActive: true
    });

    expect(nextTemperature).toBeCloseTo(24.9, 6);
  });

  it('moves temperature back toward baseline without overshooting', () => {
    const cooledDown = calculateNextTemperature({
      currentTemperature: 25.3,
      conveyorRunning: false,
      coolingCommandActive: false
    });

    const warmedUp = calculateNextTemperature({
      currentTemperature: 24.95,
      conveyorRunning: false,
      coolingCommandActive: false
    });

    expect(cooledDown).toBeCloseTo(25.2, 6);
    expect(warmedUp).toBeCloseTo(25.0, 6);
  });

  it('does not cool below 22 when cooling remains active', () => {
    const nextTemperature = calculateNextTemperature({
      currentTemperature: 22.1,
      conveyorRunning: false,
      coolingCommandActive: true
    });

    expect(nextTemperature).toBeCloseTo(22.0, 6);
  });

  it('does not heat above 50 when conveyor remains active without cooling', () => {
    const nextTemperature = calculateNextTemperature({
      currentTemperature: 49.95,
      conveyorRunning: true,
      coolingCommandActive: false
    });

    expect(nextTemperature).toBeCloseTo(50.0, 6);
  });

  it('keeps the lower bound at 22 even when aircon and conveyor run together', () => {
    const nextTemperature = calculateNextTemperature({
      currentTemperature: 22.05,
      conveyorRunning: true,
      coolingCommandActive: true
    });

    expect(nextTemperature).toBeCloseTo(22.0, 6);
  });

  it('adds overheat delta when conveyor overheat mode is on without cooling', () => {
    const nextTemperature = calculateNextTemperature({
      currentTemperature: 25,
      conveyorRunning: true,
      conveyorOverheatMode: true,
      coolingCommandActive: false
    });

    expect(nextTemperature).toBeCloseTo(26.2, 6);
  });

  it('results in +0.9 when conveyor overheat mode and aircon are both on', () => {
    const nextTemperature = calculateNextTemperature({
      currentTemperature: 25,
      conveyorRunning: true,
      conveyorOverheatMode: true,
      coolingCommandActive: true
    });

    expect(nextTemperature).toBeCloseTo(25.9, 6);
  });

  it('does not heat above 50 even when overheat mode is on', () => {
    const nextTemperature = calculateNextTemperature({
      currentTemperature: 49.5,
      conveyorRunning: true,
      conveyorOverheatMode: true,
      coolingCommandActive: false
    });

    expect(nextTemperature).toBeCloseTo(50.0, 6);
  });
});
