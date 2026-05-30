import electronPath from 'electron';
import { spawn } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packagedMode = process.argv.includes('--packaged');
const executable = join(root, 'release', 'win-unpacked', 'Qwen Workshop.exe');
const mainBundle = join(root, 'out', 'main', 'index.js');
const successMarker = 'QWEN_WORKSHOP_SMOKE_OK';
const keepTemp = process.env.QWEN_WORKSHOP_KEEP_SMOKE === '1';
const sourceUserData = process.env.QWEN_WORKSHOP_SOURCE_USER_DATA || join(process.env.APPDATA || '', 'Qwen Workshop');

if (packagedMode && !existsSync(executable)) {
  console.error('Packaged Qwen Workshop executable was not found. Run npm run pack before this smoke test.');
  process.exit(1);
}

if (!packagedMode && !existsSync(mainBundle)) {
  console.error('Built Electron output was not found. Run npm run build before this smoke test.');
  process.exit(1);
}

if (!sourceUserData || !existsSync(join(sourceUserData, 'settings.json')) || !existsSync(join(sourceUserData, 'secrets.json'))) {
  console.error('Saved Qwen Workshop settings/secrets were not found. Open the app and save a Qwen API key first.');
  process.exit(1);
}

const tempRoot = await mkdtemp(join(tmpdir(), 'qwen-workshop-real-smoke-'));
const tempUserData = join(tempRoot, 'userData');
const tempWorkspace = join(tempRoot, 'workspace');

await mkdir(tempUserData, { recursive: true });
await mkdir(tempWorkspace, { recursive: true });
await copyIfExists(join(sourceUserData, 'settings.json'), join(tempUserData, 'settings.json'));
await copyIfExists(join(sourceUserData, 'secrets.json'), join(tempUserData, 'secrets.json'));
await copyIfExists(join(sourceUserData, 'Local State'), join(tempUserData, 'Local State'));

const command = packagedMode ? executable : electronPath;
const args = packagedMode ? ['--qwen-workshop-smoke'] : ['.', '--qwen-workshop-smoke'];
const child = spawn(command, args, {
  cwd: root,
  env: {
    ...process.env,
    QWEN_WORKSHOP_SMOKE: '1',
    QWEN_WORKSHOP_REAL_QWEN_SMOKE: '1',
    QWEN_WORKSHOP_SMOKE_USER_DATA: tempUserData,
    QWEN_WORKSHOP_SMOKE_WORKSPACE: tempWorkspace
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true
});

let output = '';
let settled = false;

const timeout = setTimeout(() => {
  void fail('Timed out waiting for real Qwen smoke marker.');
}, 260000);

child.stdout.on('data', (chunk) => {
  const text = chunk.toString('utf8');
  output += text;
  process.stdout.write(text);

  if (text.includes(successMarker)) {
    pass();
  }
});

child.stderr.on('data', (chunk) => {
  const text = chunk.toString('utf8');
  output += text;
  process.stderr.write(text);
});

child.on('error', (error) => {
  void fail(error.message);
});

child.on('close', (code) => {
  if (settled) {
    return;
  }

  void fail(`Real Qwen smoke exited with code ${code ?? 'unknown'} before smoke marker.`);
});

function pass() {
  if (settled) {
    return;
  }

  settled = true;
  clearTimeout(timeout);
  setTimeout(async () => {
    try {
      child.kill();
    } catch {
      // App normally exits itself after printing the marker.
    }

    await removeTempUnlessKept();
    process.exit(0);
  }, 3000);
}

async function fail(message) {
  if (settled) {
    return;
  }

  settled = true;
  clearTimeout(timeout);

  try {
    child.kill();
  } catch {
    // Process may already be gone.
  }

  console.error(`\nReal Qwen smoke failed: ${message}`);
  if (keepTemp) {
    console.error(`Temporary smoke files kept at: ${tempRoot}`);
  } else {
    await removeTempUnlessKept();
    console.error('Temporary smoke files removed. Re-run with QWEN_WORKSHOP_KEEP_SMOKE=1 to keep them for debugging.');
  }
  if (output.trim()) {
    console.error('\nCaptured output:');
    console.error(output.trim());
  }
  process.exit(1);
}

async function removeTempUnlessKept() {
  if (keepTemp) {
    return;
  }

  await rm(tempRoot, { recursive: true, force: true });
}

async function copyIfExists(source, destination) {
  if (!existsSync(source)) {
    return;
  }

  await copyFile(source, destination);
}
