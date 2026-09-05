#!/usr/bin/env node
/**
 * Validates protocol wire format builders against docs/ble-protocol.schema.json.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildSceneCommand,
  colorCommand,
  hexToRgb,
  kvCommand,
  modeCommand,
  uiSpeedToBle,
  wrapWireCommand,
} from '../js/protocol.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fail = (msg) => {
  console.error(`check-protocol: ${msg}`);
  process.exitCode = 1;
};

const schemaRaw = readFileSync(join(root, 'docs/ble-protocol.schema.json'), 'utf8');
let schema;
try {
  schema = JSON.parse(schemaRaw);
} catch (err) {
  fail(`Invalid schema JSON: ${err.message}`);
}

if (schema?.properties?.service?.properties?.uuid?.const !== '6e400001-b5a3-f393-e0a9-e50e24dcca9e') {
  fail('Service UUID mismatch in schema');
}

// 1. Color command G/B swap verification
const colorOut = colorCommand(255, 100, 50);
if (colorOut !== 'C=255,50,100;\n') {
  fail(`colorCommand should swap G/B: expected "C=255,50,100;\\n", got ${JSON.stringify(colorOut)}`);
}

// 2. Key-value command format
const bOut = kvCommand('B', 8);
if (bOut !== 'B=8;\n') {
  fail(`kvCommand expected "B=8;\\n", got ${JSON.stringify(bOut)}`);
}

// 3. UI speed to BLE wire mapping (inversion)
if (uiSpeedToBle(0) !== 100 || uiSpeedToBle(100) !== 0 || uiSpeedToBle(40) !== 60) {
  fail('uiSpeedToBle must map 0..100 to 100..0');
}

// 4. Mode command format (no equals sign, terminates with newline)
const mOut = modeCommand(32);
if (mOut !== 'M32\n') {
  fail(`modeCommand expected "M32\\n", got ${JSON.stringify(mOut)}`);
}

// 5. Wire command wrapping
if (wrapWireCommand('B=4') !== 'B=4;\n') {
  fail('wrapWireCommand failed for B=4');
}
if (wrapWireCommand('M15') !== 'M15\n') {
  fail('wrapWireCommand failed for M15');
}

// 6. Full scene command builder
const sceneOut = buildSceneCommand({
  brightness: 7,
  speed: 80,
  r: 200,
  g: 10,
  b: 90,
  mode: 35,
});
const expectedScene = 'B=7;\nS=20;\nC=200,90,10;\nM35\n';
if (sceneOut !== expectedScene) {
  fail(`buildSceneCommand expected ${JSON.stringify(expectedScene)}, got ${JSON.stringify(sceneOut)}`);
}

// 7. Hex to RGB parser
const rgb = hexToRgb('#112233');
if (rgb.r !== 17 || rgb.g !== 34 || rgb.b !== 51) {
  fail(`hexToRgb failed for #112233: got ${JSON.stringify(rgb)}`);
}

if (!process.exitCode) {
  console.log('check-protocol: ok');
}
