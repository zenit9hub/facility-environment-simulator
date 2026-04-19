import { loadRuntimeConfig } from './runtime/runtimeConfig.js';
import { startSimulatorRuntime } from './runtime/startSimulatorRuntime.js';

const config = loadRuntimeConfig();
const runtimeHandle = await startSimulatorRuntime(config);

const shutdown = async (signal: string): Promise<void> => {
  console.log(`Received ${signal}. Shutting down simulator runtime.`);
  await runtimeHandle.stop();
  process.exit(0);
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
