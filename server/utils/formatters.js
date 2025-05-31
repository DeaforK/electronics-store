const { format, parseISO } = require('date-fns');
const { ru, enUS } = require('date-fns/locale');
const numeral = require('numeral');
const currencySymbols = {
  RUB: '₽',
  USD: '$',
  EUR: '€'
};

/**
 * Возвращает локаль date-fns по языковому коду
 */
function getLocale(locale = 'ru') {
  switch (locale) {
    case 'en':
    case 'en-US':
      return enUS;
    case 'ru':
    default:
      return ru;
  }
}

/**
 * Форматирование даты
 * @param {Date|string} date 
 * @param {string} pattern 
 * @param {string} locale 
 * @returns {string}
 */
function formatDate(date, pattern = 'dd.MM.yyyy', locale = 'ru') {
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  return format(parsed, pattern, { locale: getLocale(locale) });
}

/**
 * Форматирование даты и времени
 */
function formatDateTime(date, locale = 'ru') {
  return formatDate(date, 'dd.MM.yyyy HH:mm', locale);
}

/**
 * Форматирование валюты
 * @param {number} amount 
 * @param {string} currency 
 * @param {boolean} withSymbol 
 * @returns {string}
 */
function formatCurrency(amount, currency = 'RUB', withSymbol = true) {
  const symbol = withSymbol ? (currencySymbols[currency] || currency) : '';
  const formatted = numeral(amount).format('0,0.00');
  return withSymbol ? `${formatted} ${symbol}` : formatted;
}

/**
 * Форматирование процентов
 * @param {number} value 
 * @param {boolean} showSign 
 * @returns {string}
 */
function formatPercentage(value, showSign = false) {
  const formatted = numeral(value).format('0.00') + '%';
  return showSign && value > 0 ? `+${formatted}` : formatted;
}

/**
 * Форматирует число с разделителями
 */
function formatNumber(value, precision = 2) {
  const pattern = `0,0.${'0'.repeat(precision)}`;
  return numeral(value).format(pattern);
}

/**
 * Заголовок отчёта по дате
 * @param {string} reportName 
 * @param {Date|string} startDate 
 * @param {Date|string} endDate 
 * @param {string} locale 
 * @returns {string}
 */
function getReportTitle(reportName, startDate, endDate, locale = 'ru') {
  const start = formatDate(startDate, 'dd MMMM yyyy', locale);
  const end = formatDate(endDate, 'dd MMMM yyyy', locale);
  return `${reportName} (${start} – ${end})`;
}

/**
 * Получить название месяца
 * @param {number} monthIndex 
 * @param {string} locale 
 */
function getMonthName(monthIndex, locale = 'ru') {
  const date = new Date(2000, monthIndex, 1);
  return format(date, 'LLLL', { locale: getLocale(locale) });
}

/**
 * Формирует строку таблицы отчёта (для CSV или Excel)
 * @param {Object[]} rows 
 * @param {string[]} columns 
 * @returns {string[][]}
 */
function formatTable(rows, columns) {
  return rows.map(row => columns.map(key => row[key] ?? ''));
}

/**
 * Генерация названия файла
 */
function generateFilename(base = 'report', extension = 'pdf') {
  const now = new Date();
  const datePart = format(now, 'yyyy-MM-dd_HH-mm-ss');
  return `${base}_${datePart}.${extension}`;
}

/**
 * Генерация подписи отчёта
 */
function generateReportFooter(userName = 'Администратор', locale = 'ru') {
  const now = new Date();
  return `Сформировано ${formatDateTime(now, locale)} пользователем: ${userName}`;
}

module.exports = {
  formatDate,
  formatDateTime,
  formatCurrency,
  formatPercentage,
  formatNumber,
  formatTable,
  getReportTitle,
  getMonthName,
  generateFilename,
  generateReportFooter
};
