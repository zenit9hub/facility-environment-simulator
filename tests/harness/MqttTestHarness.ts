import { Aedes } from 'aedes';
import { createServer, type AddressInfo, type Server } from 'node:net';
import { connect, type MqttClient } from 'mqtt';

export interface CapturedMessage<TPayload = unknown> {
  topic: string;
  rawPayload: string;
  payload: TPayload;
}

export class MqttTestHarness {
  private broker: Aedes | null = null;
  private server: Server | null = null;
  private readonly clients = new Set<MqttClient>();
  brokerUrl = '';

  async start(): Promise<void> {
    this.broker = await Aedes.createBroker();
    this.server = createServer(this.broker.handle);

    await new Promise<void>((resolve, reject) => {
      this.server?.once('error', reject);
      this.server?.listen(0, '127.0.0.1', () => resolve());
    });

    const address = this.server.address();

    if (!address || typeof address === 'string') {
      throw new Error('Failed to resolve broker address');
    }

    this.brokerUrl = `mqtt://127.0.0.1:${(address as AddressInfo).port}`;
  }

  async createClient(clientId: string): Promise<MqttClient> {
    const client = await new Promise<MqttClient>((resolve, reject) => {
      const mqttClient = connect(this.brokerUrl, {
        clientId,
        reconnectPeriod: 0
      });

      const onConnect = () => {
        mqttClient.off('error', onError);
        resolve(mqttClient);
      };

      const onError = (error: Error) => {
        mqttClient.off('connect', onConnect);
        reject(error);
      };

      mqttClient.once('connect', onConnect);
      mqttClient.once('error', onError);
    });

    this.clients.add(client);
    return client;
  }

  async subscribeJson<TPayload>(
    client: MqttClient,
    topics: string[],
    sink: CapturedMessage<TPayload>[]
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      client.subscribe(topics, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    client.on('message', (topic, payload) => {
      const rawPayload = payload.toString('utf8');
      sink.push({
        topic,
        rawPayload,
        payload: JSON.parse(rawPayload) as TPayload
      });
    });
  }

  async publishJson(client: MqttClient, topic: string, payload: unknown): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      client.publish(topic, JSON.stringify(payload), (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  async publishRaw(client: MqttClient, topic: string, payload: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      client.publish(topic, payload, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  async close(): Promise<void> {
    await Promise.all(
      Array.from(this.clients).map(
        (client) =>
          new Promise<void>((resolve) => {
            client.end(false, {}, () => resolve());
          })
      )
    );
    this.clients.clear();

    if (this.server) {
      await new Promise<void>((resolve, reject) => {
        this.server?.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
      this.server = null;
    }

    if (this.broker) {
      await new Promise<void>((resolve) => {
        this.broker?.close(() => {
          resolve();
        });
      });
      this.broker = null;
    }
  }
}

export async function waitForMessageCount(
  messages: unknown[],
  expectedCount: number,
  timeoutMs = 1500
): Promise<void> {
  const startedAt = Date.now();

  while (messages.length < expectedCount) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(
        `Timed out waiting for ${expectedCount} messages. Received ${messages.length} messages.`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
