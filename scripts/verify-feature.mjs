import { spawn } from 'node:child_process';

const commands = [
  ['npm', ['run', 'build']],
  ['npm', ['run', 'test:unit']],
  ['npm', ['run', 'test:integration']]
];

function runCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    child.on('exit', (code) => {
      resolve(code ?? 1);
    });
  });
}

for (const [command, args] of commands) {
  console.log(`\n==> ${command} ${args.join(' ')}`);
  const exitCode = await runCommand(command, args);

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}

console.log('\nVerification passed.');
