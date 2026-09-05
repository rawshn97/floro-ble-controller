import {
  ble,
  bleHooks,
  controlPanels,
  els,
  log,
  persistSceneNow,
  state,
  wakeLock,
} from './app-context.js';
import { trackClarityEvent } from './clarity.js';
import { describeBleError } from './errors.js';
import { isBleSupported } from './ble.js';
import { onConnected, syncControlPanelsEnabled } from './scene-sync.js';
import { haptic, updateConnectionChip } from './ui.js';

export function setConnectionState(connectionState, name = '') {
  state.connectionState = connectionState;
  updateConnectionChip(
    els.statusChip,
    els.statusChipText,
    connectionState,
    name,
    ble.lastDeviceInfo
  );
  updateConnectPrompt();
}

export function updateConnectPrompt() {
  if (!els.connectPrompt) return;

  if (!isBleSupported() || ble.isConnected || state.connectionState === 'connecting') {
    els.connectPrompt.classList.add('hidden');
    return;
  }

  els.connectPrompt.classList.remove('hidden');

  const last = ble.lastDeviceInfo;
  if (els.btnReconnectMain && ble.canReconnect() && last) {
    els.btnReconnectMain.textContent = `Reconnect to ${last.name}`;
    els.btnReconnectMain.classList.remove('hidden');
  } else {
    els.btnReconnectMain?.classList.add('hidden');
  }
}

export function enablePanels(enabled) {
  controlPanels.forEach((p) => p?.classList.toggle('disabled-control', !enabled));
}

export function updateReconnectButton() {
  if (!isBleSupported() || ble.isConnected) {
    els.btnReconnect.classList.add('hidden');
    return;
  }

  const last = ble.lastDeviceInfo;
  if (ble.canReconnect() && last) {
    els.btnReconnect.textContent = `Reconnect to ${last.name}`;
    els.btnReconnect.classList.remove('hidden');
  } else {
    els.btnReconnect.classList.add('hidden');
  }
  updateConnectPrompt();
}

export function resetUI() {
  els.deviceNameEl.textContent = 'Not connected';
  els.connectionStatus.textContent = 'OFFLINE';
  els.connectionStatus.className = 'status-pill';
  els.btnConnect.classList.remove('hidden');
  els.btnDisconnect.classList.add('hidden');
  syncControlPanelsEnabled();
  updateReconnectButton();
  setConnectionState('offline');
}

function setConnectingBusy(busy) {
  els.btnConnect.disabled = busy;
  els.btnReconnect.disabled = busy;
  els.btnConnectMain && (els.btnConnectMain.disabled = busy);
  els.btnReconnectMain && (els.btnReconnectMain.disabled = busy);
}

export async function connectDevice() {
  if (!isBleSupported()) {
    log(
      'Web Bluetooth is not available. Use Chrome or Edge on desktop/Android over HTTPS.',
      'error'
    );
    return;
  }

  try {
    setConnectionState('connecting');
    setConnectingBusy(true);
    await ble.connectNew();
    await onConnected();
    haptic('light');
  } catch (error) {
    trackClarityEvent('sc_ble_connect_failed');
    const { message, level } = describeBleError(error, 'connection');
    log(message, level);
    resetUI();
  } finally {
    setConnectingBusy(false);
  }
}

export async function reconnectDevice() {
  if (!isBleSupported()) return;

  try {
    setConnectionState('connecting');
    setConnectingBusy(true);
    await ble.reconnectLast();
    await onConnected();
    haptic('light');
  } catch (error) {
    trackClarityEvent('sc_ble_connect_failed');
    const { message, level } = describeBleError(error, 'connection');
    log(message, level);
    resetUI();
  } finally {
    setConnectingBusy(false);
  }
}

export function disconnectDevice() {
  persistSceneNow();
  ble.disconnect();
  wakeLock.release();
  haptic('light');
}

export async function tryAutoReconnect() {
  if (!isBleSupported() || !ble.canReconnect() || !ble.lastDeviceInfo) return;

  log(`Auto-connecting to ${ble.lastDeviceInfo.name}…`, 'info');
  setConnectionState('connecting');

  try {
    els.btnConnect.disabled = true;
    els.btnReconnect.disabled = true;
    await ble.reconnectLast();
    await onConnected();
  } catch (error) {
    trackClarityEvent('sc_ble_connect_failed');
    const { message, level } = describeBleError(error, 'connection');
    log(message, level);
    resetUI();
  } finally {
    els.btnConnect.disabled = false;
    els.btnReconnect.disabled = false;
  }
}

export function initConnection() {
  bleHooks.onConnectionChange = (connected, name) => {
    if (connected) {
      trackClarityEvent('sc_ble_connected');
      els.deviceNameEl.textContent = name;
      els.connectionStatus.textContent = 'CONNECTED';
      els.connectionStatus.className = 'status-pill connected';
      els.btnConnect.classList.add('hidden');
      els.btnReconnect.classList.add('hidden');
      els.btnDisconnect.classList.remove('hidden');
      enablePanels(true);
      wakeLock.acquire();
      setConnectionState('connected', name);
      updateConnectPrompt();
    } else {
      persistSceneNow();
      resetUI();
    }
  };

  bleHooks.onDisconnect = () => {
    trackClarityEvent('sc_ble_disconnected');
    wakeLock.release();
  };

  els.btnConnect.addEventListener('click', connectDevice);
  els.btnReconnect.addEventListener('click', reconnectDevice);
  els.btnDisconnect.addEventListener('click', disconnectDevice);
  els.btnConnectMain?.addEventListener('click', connectDevice);
  els.btnReconnectMain?.addEventListener('click', reconnectDevice);

  updateReconnectButton();
  updateConnectPrompt();
}
