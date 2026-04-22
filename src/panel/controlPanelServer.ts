import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

import type {
  AirconControlCommand,
  ConveyorControlCommand,
  SimulatorStateSnapshot
} from '../simulator/FacilityEnvironmentSimulator.js';
import {
  CONTROL_PANEL_CSS,
  CONTROL_PANEL_HTML,
  CONTROL_PANEL_JS
} from './controlPanelAssets.js';

type PowerState = 'on' | 'off';

export interface ControlPanelSimulator {
  getStateSnapshot(): SimulatorStateSnapshot;
  applyConveyorControl(command: ConveyorControlCommand): Promise<void>;
  applyAirconControl(command: AirconControlCommand): Promise<void>;
}

export interface ControlPanelServerOptions {
  simulator: ControlPanelSimulator;
  brokerUrl: string;
  uniqUserId: string;
  port: number;
  host?: string;
}

export interface ControlPanelServerHandle {
  url: string;
  close(): Promise<void>;
}

export async function startControlPanelServer(
  options: ControlPanelServerOptions
): Promise<ControlPanelServerHandle> {
  const host = options.host ?? '127.0.0.1';
  const server = createServer((request, response) => {
    void handleRequest(options, request, response);
  });

  await listen(server, options.port, host);
  const address = server.address();
  const port = typeof address === 'object' && address !== null ? address.port : options.port;

  return {
    url: `http://localhost:${port}`,
    async close(): Promise<void> {
      await close(server);
    }
  };
}

async function handleRequest(
  options: ControlPanelServerOptions,
  request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? '/', 'http://localhost');

  try {
    if (method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      sendText(response, 200, 'text/html; charset=utf-8', CONTROL_PANEL_HTML);
      return;
    }

    if (method === 'GET' && url.pathname === '/panel.css') {
      sendText(response, 200, 'text/css; charset=utf-8', CONTROL_PANEL_CSS);
      return;
    }

    if (method === 'GET' && url.pathname === '/panel.js') {
      sendText(response, 200, 'application/javascript; charset=utf-8', CONTROL_PANEL_JS);
      return;
    }

    if (method === 'GET' && url.pathname === '/api/state') {
      sendJson(response, 200, createPanelState(options));
      return;
    }

    if (method === 'POST' && url.pathname === '/api/control/conveyor-belt') {
      const payload = await readJsonPayload(request);
      const command = parseConveyorPanelCommand(payload);
      await options.simulator.applyConveyorControl(command);
      sendJson(response, 200, createPanelState(options));
      return;
    }

    if (method === 'POST' && url.pathname === '/api/control/aircon') {
      const payload = await readJsonPayload(request);
      const command = parseAirconPanelCommand(payload);
      await options.simulator.applyAirconControl(command);
      sendJson(response, 200, createPanelState(options));
      return;
    }

    sendJson(response, 404, { error: 'Not found.' });
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : 'Bad request.'
    });
  }
}

function createPanelState(options: ControlPanelServerOptions): Record<string, unknown> {
  const snapshot = options.simulator.getStateSnapshot();

  return {
    simulatorName: 'Factory Sensor Simulator',
    uniqUserId: options.uniqUserId,
    brokerUrl: options.brokerUrl,
    connectionState: snapshot.connected ? 'connected' : 'disconnected',
    lastPublishedAt: snapshot.lastPublishedAt,
    sensors: {
      temperature: {
        value: snapshot.equipmentTemperature,
        min: snapshot.airconMinTemp,
        max: snapshot.conveyorMaxTemp
      },
      vibration: {
        value: snapshot.vibration
      },
      lastPublishedAt: snapshot.lastSensorPublishedAt
    },
    actuators: {
      conveyorBelt: {
        power: formatPower(snapshot.conveyorRunning),
        overheatMode: formatPower(snapshot.conveyorOverheatMode)
      },
      aircon: {
        power: formatPower(snapshot.coolingCommandActive)
      }
    }
  };
}

function parseConveyorPanelCommand(payload: unknown): ConveyorControlCommand {
  const record = requireRecord(payload);
  const power = parsePower(record.power, 'power');
  const overheatMode =
    record.overheatMode === undefined ? undefined : parsePower(record.overheatMode, 'overheatMode');

  return {
    power,
    ...(overheatMode === undefined ? {} : { overheatMode }),
    reason: 'control-panel',
    source: 'control-panel'
  };
}

function parseAirconPanelCommand(payload: unknown): AirconControlCommand {
  const record = requireRecord(payload);

  return {
    power: parsePower(record.power, 'power'),
    reason: 'control-panel',
    source: 'control-panel'
  };
}

function requireRecord(payload: unknown): Record<string, unknown> {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new Error('Payload must be a JSON object.');
  }

  return payload as Record<string, unknown>;
}

function parsePower(value: unknown, fieldName: string): boolean {
  if (value === 'on') {
    return true;
  }

  if (value === 'off') {
    return false;
  }

  throw new Error(`${fieldName} must be "on" or "off".`);
}

async function readJsonPayload(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('Request body must be valid JSON.');
  }
}

function formatPower(value: boolean): PowerState {
  return value ? 'on' : 'off';
}

function sendText(
  response: ServerResponse,
  statusCode: number,
  contentType: string,
  body: string
): void {
  response.writeHead(statusCode, {
    'content-type': contentType,
    'cache-control': 'no-store'
  });
  response.end(body);
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(body));
}

async function listen(server: Server, port: number, host: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
