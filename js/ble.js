import { colorCommand, wrapWireCommand } from './protocol.js';

const NUS_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_WRITE_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_NOTIFY_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

const STORAGE_KEY_LAST_DEVICE = 'floro_last_device';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 250;
const WRITE_GAP_MS = 120;
/** Neon Attack demo111 delays 250ms before sending mode after color/state changes. */
const MODE_DELAY_MS = 250;

export class FloroBleController {
  constructor({ onLog, onConnectionChange, onDisconnect }) {
    this.onLog = onLog || (() => {});
    this.onConnectionChange = onConnectionChange || (() => {});
    this.onDisconnect = onDisconnect || (() => {});

    this.device = null;
    this.server = null;
    this.characteristic = null;
    this.notifyCharacteristic = null;
    this.manualDisconnect = false;

    this.queue = [];
    this.processing = false;
  }

  get isConnected() {
    return Boolean(this.characteristic && this.device?.gatt?.connected);
  }

  get deviceName() {
    return this.device?.name || null;
  }

  get lastDeviceInfo() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LAST_DEVICE);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  canReconnect() {
    return Boolean(
      navigator.bluetooth?.getDevices &&
      this.lastDeviceInfo?.id
    );
  }

  saveLastDevice(device) {
    if (!device?.id) return;
    localStorage.setItem(
      STORAGE_KEY_LAST_DEVICE,
      JSON.stringify({ id: device.id, name: device.name || 'FloRo Sign' })
    );
  }

  clearLastDevice() {
    localStorage.removeItem(STORAGE_KEY_LAST_DEVICE);
  }

  _commandPrefix(str) {
    const kv = str.match(/^([A-Z]+)=/);
    if (kv) return kv[1];
    if (/^M\d/i.test(str)) return 'M';
    return null;
  }

  enqueue(str, label = 'Command') {
    const processed = wrapWireCommand(str);
    const prefix = this._commandPrefix(processed);

    if (prefix) {
      this.queue = this.queue.filter((item) => item.prefix !== prefix);
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ str: processed, label, prefix, resolve, reject });
      this._processQueue();
    });
  }

  async _processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      try {
        await this._writeWithRetry(item.str, item.label);
        item.resolve(true);
        if (this.queue.length > 0) {
          await new Promise((r) => setTimeout(r, WRITE_GAP_MS));
        }
      } catch (error) {
        item.reject(error);
        this.onLog(`Command failed: ${error.message}`, 'error');
        break;
      }
    }

    this.processing = false;
  }

  async _writeWithRetry(str, label) {
    if (!this.characteristic) {
      throw new Error('Not connected to sign');
    }

    const bytes = new TextEncoder().encode(str);
    const asciiPreview = str.trim();
    this.onLog(`Sending Command: "${asciiPreview}"`, 'write');

    let lastError = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (!this.device?.gatt?.connected) {
          throw new Error('Bluetooth connection lost');
        }

        if (this.characteristic.properties.writeWithResponse) {
          await this.characteristic.writeValueWithResponse(bytes);
        } else {
          await this.characteristic.writeValueWithoutResponse(bytes);
        }
        return;
      } catch (error) {
        lastError = error;
        if (attempt < MAX_RETRIES) {
          this.onLog(`Retry ${attempt}/${MAX_RETRIES - 1} for "${asciiPreview}"`, 'info');
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
        }
      }
    }

    throw lastError || new Error('Write failed');
  }

  async _attachGatt(device) {
    this.device = device;
    device.addEventListener('gattserverdisconnected', () => this._handleDisconnect('connection lost'));

    this.onLog('Connecting to Bluetooth GATT...', 'info');
    this.server = await device.gatt.connect();
    this.onLog('Bluetooth connection established.', 'success');

    this.onLog('Discovering Nordic UART Service...', 'info');
    const service = await this.server.getPrimaryService(NUS_SERVICE_UUID);

    this.onLog('Discovering Write Characteristic...', 'info');
    this.characteristic = await service.getCharacteristic(NUS_WRITE_UUID);

    try {
      this.notifyCharacteristic = await service.getCharacteristic(NUS_NOTIFY_UUID);
      await this.notifyCharacteristic.startNotifications();
      this.notifyCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
        const text = new TextDecoder().decode(event.target.value).trim();
        if (text) this.onLog(`Sign: ${text}`, 'info');
      });
    } catch {
      this.onLog('Notify characteristic unavailable (write-only control).', 'info');
    }

    this.onLog('Sign connected and ready for control.', 'success');

    this.saveLastDevice(device);
    this.onConnectionChange(true, device.name || 'FloRo Sign');
  }

  async connectNew() {
    this.manualDisconnect = false;
    this.onLog('Scanning for FloRo Bluetooth sign...', 'info');

    const device = await navigator.bluetooth.requestDevice({
      filters: [{ name: 'FloRo' }, { namePrefix: 'FloRo' }],
      optionalServices: [NUS_SERVICE_UUID],
    });

    this.onLog(`Found sign: ${device.name || 'FloRo'}`, 'success');
    await this._attachGatt(device);
    return device;
  }

  async reconnectLast() {
    const last = this.lastDeviceInfo;
    if (!last?.id) {
      throw new Error('No previously paired sign found');
    }

    if (!navigator.bluetooth?.getDevices) {
      throw new Error('Reconnect is not supported in this browser');
    }

    this.manualDisconnect = false;
    this.onLog(`Reconnecting to ${last.name}...`, 'info');

    const devices = await navigator.bluetooth.getDevices();
    const device = devices.find((d) => d.id === last.id);

    if (!device) {
      throw new Error('Previously paired sign not available — scan again');
    }

    await this._attachGatt(device);
    return device;
  }

  disconnect() {
    if (!this.device?.gatt?.connected) return;
    this.manualDisconnect = true;
    this.onLog('Disconnecting from sign...', 'info');
    this.device.gatt.disconnect();
  }

  _handleDisconnect(reason) {
    const wasManual = this.manualDisconnect;
    this.manualDisconnect = false;

    this.queue.forEach((item) => item.reject(new Error('Disconnected')));
    this.queue = [];
    this.processing = false;

    this.device = null;
    this.server = null;
    this.characteristic = null;
    this.notifyCharacteristic = null;

    const message = wasManual ? 'Disconnected by user.' : `Bluetooth ${reason}.`;
    this.onLog(message, wasManual ? 'info' : 'error');
    this.onDisconnect({ reason, wasManual });
    this.onConnectionChange(false);
  }

  sendAscii(str, label) {
    return this.enqueue(str, label);
  }

  sendBrightness(val) {
    return this.sendAscii(`B=${val}`, `Brightness set to ${val}`);
  }

  sendSpeed(val) {
    return this.sendAscii(`S=${val}`, `Speed set to ${val}%`);
  }

  sendColor(r, g, b, label) {
    return this.sendAscii(colorCommand(r, g, b), label);
  }

  sendMode(mode) {
    return this.sendAscii(`M${mode}`, `Flow mode ${mode}`);
  }

  /** Push full sign state — mode is sent last after a short delay (matches Neon Attack app). */
  async sendScene({ brightness, speed, r, g, b, mode }) {
    await this.sendAscii(`B=${brightness}`, `Brightness ${brightness}`);
    await this.sendAscii(`S=${speed}`, `Speed ${speed}%`);
    await this.sendAscii(colorCommand(r, g, b).trimEnd(), 'Color');
    await new Promise((r) => setTimeout(r, MODE_DELAY_MS));
    await this.sendAscii(`M${mode}`, `Flow mode ${mode}`);
  }
}

export function isBleSupported() {
  return Boolean(navigator.bluetooth?.requestDevice);
}
