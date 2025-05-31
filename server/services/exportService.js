// analytics/services/exportService.js
const ExcelJS = require('exceljs');
const { jsPDF } = require('jspdf');
const { Parser } = require('json2csv');

const exportService = {

  async exportToExcel(data, sheetName = 'Report') {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    if (!data.length) return null;

    // Заголовки
    const columns = Object.keys(data[0]).map(key => ({ header: key, key }));
    worksheet.columns = columns;

    data.forEach(row => worksheet.addRow(row));
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  },

  exportToPDF(data, title = 'Report') {
    const doc = new jsPDF();
    doc.text(title, 10, 10);
    // Простейший вывод JSON, можно сделать таблицу и стилизацию
    doc.text(JSON.stringify(data, null, 2), 10, 20);
    return doc.output();
  },

  exportToCSV(data) {
    const parser = new Parser();
    return parser.parse(data);
  }

};

module.exports = exportService;
