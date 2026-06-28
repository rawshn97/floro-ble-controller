/**
 * Map Web Bluetooth and app errors to user-facing activity log messages.
 * Returns { message, level } where level is 'error' or 'info'.
 */
export function describeBleError(error, context = 'connection') {
  if (!error) {
    return { message: 'Something went wrong. Try again.', level: 'error' };
  }

  const name = error.name || '';
  const msg = (error.message || '').trim();

  if (name === 'NotFoundError' || /cancelled|canceled/i.test(msg)) {
    return { message: 'Scan cancelled.', level: 'info' };
  }

  const byName = {
    NotAllowedError:
      'Bluetooth permission denied. Allow Bluetooth in site settings, then try again.',
    SecurityError:
      'Web Bluetooth needs HTTPS or localhost. Open the app from a secure URL.',
    NetworkError:
      'Bluetooth link lost. Move closer to the sign and tap Reconnect.',
    InvalidStateError: 'Bluetooth is busy. Wait a moment, then try again.',
  };

  if (byName[name]) {
    return { message: byName[name], level: 'error' };
  }

  const byMessage = [
    ['Not connected to sign', 'Not connected. Tap Scan & Connect first.'],
    ['Bluetooth connection lost', 'Connection lost. Tap Reconnect or Scan & Connect.'],
    ['No previously paired sign found', 'No saved sign. Tap Scan & Connect to pair.'],
    [
      'Reconnect is not supported in this browser',
      'Reconnect needs Chrome or Edge on desktop/Android over HTTPS.',
    ],
    [
      'Previously paired sign not available',
      'Saved sign not found. Tap Scan & Connect to choose it again.',
    ],
    ['Write failed', 'Could not send command. Check the sign is powered on and in range.'],
    ['Disconnected', 'Disconnected from sign.'],
  ];

  for (const [needle, friendly] of byMessage) {
    if (msg.includes(needle)) {
      return { message: friendly, level: 'error' };
    }
  }

  if (context === 'command') {
    return {
      message: `Could not send command (${msg}). Try reconnecting.`,
      level: 'error',
    };
  }

  return {
    message: `Could not connect (${msg}). Tap Scan & Connect to try again.`,
    level: 'error',
  };
}
