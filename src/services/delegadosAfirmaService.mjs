const EXCHANGE_TTL_MS = 15 * 60 * 1000;
const EXCHANGE_MAX_VALUE_LENGTH = 25 * 1024 * 1024;
const EXCHANGE_ID_RE = /^[A-Za-z0-9._-]{1,128}$/;

const exchangeStore = new Map();

export function isValidExchangeId(exchangeId) {
  return EXCHANGE_ID_RE.test(String(exchangeId || ''));
}

export function isValidExchangeData(data) {
  return Boolean(data) && String(data).length <= EXCHANGE_MAX_VALUE_LENGTH;
}

export function putExchange(exchangeId, data) {
  cleanupExpired();
  exchangeStore.set(exchangeId, {
    data,
    expiresAt: Date.now() + EXCHANGE_TTL_MS,
  });
}

export function popExchange(exchangeId) {
  cleanupExpired();
  const item = exchangeStore.get(exchangeId);
  if (!item) return null;
  exchangeStore.delete(exchangeId);
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
