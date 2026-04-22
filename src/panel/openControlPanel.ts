import { spawn } from 'node:child_process';

export type OpenControlPanel = (url: string) => Promise<void>;

export const openControlPanelInDefaultBrowser: OpenControlPanel = async (url) => {
  const { command, args } = getOpenCommand(url, process.platform);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore'
    });

    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
};

function getOpenCommand(url: string, platform: NodeJS.Platform): { command: string; args: string[] } {
  if (platform === 'darwin') {
    return {
      command: 'open',
      args: [url]
    };
  }

  if (platform === 'win32') {
    return {
      command: 'cmd',
      args: ['/c', 'start', '', url]
    };
  }

  return {
    command: 'xdg-open',
    args: [url]
  };
}
