// controllers/exportController.js

const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const reportService = require('../services/reportService');
const formatters = require('../utils/formatters');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);

// Вспомогательная функция для формирования PDF с шаблонами
async function generatePDFReport(reportData, reportType, res) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    // Прямо в ответ поток данных для скачивания
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${reportType}_report.pdf`);

    doc.pipe(res);

    // Заголовок отчёта
    doc.fontSize(20).text(`Отчёт: ${formatters.capitalize(reportType)}`, { align: 'center' });
    doc.moveDown();

    // В зависимости от типа отчёта, форматируем тело
    switch (reportType) {
      case 'finance':
        doc.fontSize(12);
        doc.text(`Период: ${reportData.period}`);
        doc.moveDown();
        // Таблица
        doc.text('Месяц\tЗаказы\tВыручка (₽)\tНалог (₽)\tСкидки (₽)\tЧистая выручка');
        reportData.data.forEach(row => {
          doc.text(`${row.month}\t${row.orders}\t${formatters.currency(row.revenue)}\t${formatters.currency(row.tax)}\t${formatters.currency(row.discount)}\t${formatters.currency(row.netRevenue)}`);
        });
        break;

      case 'inventory':
        // Аналогично: таблицы остатков, дефицита и пр.
        doc.fontSize(12).text('Остатки на складах:');
        reportData.data.forEach(item => {
          doc.text(`${item.warehouseName}: ${item.stock} ед.`);
        });
        break;

      case 'sales':
        doc.fontSize(12).text('Популярные товары:');
        reportData.data.forEach(item => {
          doc.text(`${item.productName} - Продано: ${item.quantity}`);
        });
        break;

      default:
        doc.text('Тип отчёта не поддерживается для PDF.');
    }

    doc.end();

    doc.on('end', () => resolve());
    doc.on('error', err => reject(err));
  });
}

// Генерация Excel отчёта
async function generateExcelReport(reportData, reportType, res) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Отчёт');

  switch (reportType) {
    case 'finance':
      sheet.columns = [
        { header: 'Месяц', key: 'month', width: 15 },
        { header: 'Заказы', key: 'orders', width: 10 },
        { header: 'Выручка (₽)', key: 'revenue', width: 20 },
        { header: 'Налог (₽)', key: 'tax', width: 20 },
        { header: 'Скидки (₽)', key: 'discount', width: 20 },
        { header: 'Чистая выручка', key: 'netRevenue', width: 25 },
      ];

      reportData.data.forEach(row => {
        sheet.addRow({
          month: row.month,
          orders: row.orders,
          revenue: row.revenue,
          tax: row.tax,
          discount: row.discount,
          netRevenue: row.netRevenue,
        });
      });
      break;

    case 'inventory':
      sheet.columns = [
        { header: 'Склад', key: 'warehouseName', width: 30 },
        { header: 'Остаток', key: 'stock', width: 15 },
      ];
      reportData.data.forEach(row => {
        sheet.addRow({ warehouseName: row.warehouseName, stock: row.stock });
      });
      break;

    case 'sales':
      sheet.columns = [
        { header: 'Товар', key: 'productName', width: 40 },
        { header: 'Продано', key: 'quantity', width: 15 },
      ];
      reportData.data.forEach(row => {
        sheet.addRow({ productName: row.productName, quantity: row.quantity });
      });
      break;

    default:
      sheet.addRow(['Тип отчёта не поддерживается для Excel.']);
  }

  // Формируем файл в память
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${reportType}_report.xlsx`);

  await workbook.xlsx.write(res);
  res.end();
}

// Генерация CSV
async function generateCSVReport(reportData, reportType, res) {
  let header, records;

  switch (reportType) {
    case 'finance':
      header = [
        { id: 'month', title: 'Месяц' },
        { id: 'orders', title: 'Заказы' },
        { id: 'revenue', title: 'Выручка (₽)' },
        { id: 'tax', title: 'Налог (₽)' },
        { id: 'discount', title: 'Скидки (₽)' },
        { id: 'netRevenue', title: 'Чистая выручка' },
      ];
      records = reportData.data;
      break;

    case 'inventory':
      header = [
        { id: 'warehouseName', title: 'Склад' },
        { id: 'stock', title: 'Остаток' },
      ];
      records = reportData.data;
      break;

    case 'sales':
      header = [
        { id: 'productName', title: 'Товар' },
        { id: 'quantity', title: 'Продано' },
      ];
      records = reportData.data;
      break;

    default:
      res.status(400).json({ error: 'Тип отчёта не поддерживается для CSV.' });
      return;
  }

  // Создаём временный файл
  const tempFilePath = path.join(__dirname, '..', 'temp', `${reportType}_report.csv`);
  const csvWriter = createCsvWriter({ path: tempFilePath, header });

  try {
    await csvWriter.writeRecords(records);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${reportType}_report.csv`);

    const readStream = fs.createReadStream(tempFilePath);
    readStream.pipe(res);

    readStream.on('end', async () => {
      await unlinkAsync(tempFilePath);
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка при генерации CSV.' });
  }
}

module.exports = {
  /**
   * Генерация отчёта в одном из форматов: pdf, excel, csv.
   * В запросе указывается тип отчёта и параметры.
   * Пример запроса: /analytics/export?type=finance&format=pdf&period=month&start=2025-01-01&end=2025-03-31
   */
  exportReport: async (req, res) => {
    try {
      const { type, format, start, end, period } = req.query;

      // Валидация параметров
      if (!type || !format) {
        return res.status(400).json({ error: 'Не указаны обязательные параметры: type и format.' });
      }

      // Пример парсинга периода и дат для отчёта
      let reportParams = {};
      if (start && end) {
        reportParams.startDate = new Date(start);
        reportParams.endDate = new Date(end);
      }
      if (period) {
        reportParams.period = period;
      }

      // Получение данных отчёта через сервис
      let reportData;
      switch (type) {
        case 'finance':
          reportData = await reportService.getIncomeSummary(reportParams);
          break;
        case 'inventory':
          reportData = await reportService.getCurrentStockByWarehouse();
          break;
        case 'sales':
          reportData = await reportService.getTopSellingProducts({ limit: 50 });
          break;
        default:
          return res.status(400).json({ error: 'Неподдерживаемый тип отчёта.' });
      }

      // Генерация и отправка файла в нужном формате
      switch (format.toLowerCase()) {
        case 'pdf':
          await generatePDFReport(reportData, type, res);
          break;
        case 'excel':
          await generateExcelReport(reportData, type, res);
          break;
        case 'csv':
          await generateCSVReport(reportData, type, res);
          break;
        default:
          res.status(400).json({ error: 'Неподдерживаемый формат экспорта.' });
      }
    } catch (error) {
      console.error('Ошибка генерации отчёта:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера при генерации отчёта.' });
    }
  },
};
