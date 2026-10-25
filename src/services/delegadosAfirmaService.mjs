const EXCHANGE_TTL_MS = 15 * 60 * 1000;
const EXCHANGE_MAX_VALUE_LENGTH = 25 * 1024 * 1024;
const EXCHANGE_ID_RE = /^[A-Za-z0-9._-]{1,128}$/;

const exchangeStore = new Map();
const EXCHANGE_MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const cleanupTimer = setInterval(cleanupExpired, 60_000);
cleanupTimer.unref();

export function isValidExchangeId(exchangeId) {
  return EXCHANGE_ID_RE.test(String(exchangeId || ''));
}

export function isValidExchangeData(data) {
  return Boolean(data) && String(data).length <= EXCHANGE_MAX_VALUE_LENGTH;
}

export function putExchange(exchangeId, data, owner) {
  cleanupExpired();
  if (!owner || !isValidExchangeId(exchangeId) || !isValidExchangeData(data)) {
    throw Object.assign(new Error('Intercambio no válido.'), { statusCode: 400 });
  }
  const key = JSON.stringify([owner, exchangeId]);
  const items = [...exchangeStore.values()];
  const size = String(data).length * 2;
  if (items.reduce((sum, item) => sum + item.size, 0) + size > EXCHANGE_MAX_TOTAL_BYTES
      || exchangeStore.size >= 100) {
    throw Object.assign(new Error('Almacén temporal lleno.'), { statusCode: 429 });
  }
  exchangeStore.set(key, {
    data,
    size,
    expiresAt: Date.now() + EXCHANGE_TTL_MS,
  });
}

export function popExchange(exchangeId, owner) {
  cleanupExpired();
  if (!owner) return null;
  const key = JSON.stringify([owner, exchangeId]);
  const item = exchangeStore.get(key);
  if (!item) return null;
  exchangeStore.delete(key);
  if (item.expiresAt < Date.now()) return null;
  return item.data;
}

function cleanupExpired() {
  const now = Date.now();
  for (const [exchangeId, item] of exchangeStore.entries()) {
    if (item.expiresAt < now) {
      exchangeStore.delete(exchangeId);
    }
  }
}
