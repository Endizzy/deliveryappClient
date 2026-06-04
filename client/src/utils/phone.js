// Хелперы для работы с телефонами в формах заказа.

// Универсальный форматтер номера: оставляет ведущий + и цифры.
export const formatPhoneNumber = (value) => {
  const cleaned = String(value || "").replace(/\D/g, "");
  if (!cleaned) return "";
  return value.startsWith("+") ? value : `+${cleaned}`;
};

// Нормализация номера для поиска: убираем пробелы.
export const normalizePhoneForLookup = (value) =>
  String(value || "").replace(/\s/g, "");

// Валидация международного номера: + и 8-15 цифр.
export const isValidPhone = (value) =>
  /^\+\d{8,15}$/.test(normalizePhoneForLookup(value));
