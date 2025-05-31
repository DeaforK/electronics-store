// utils/exportToExcel.js
const ExcelJS = require('exceljs');

exports.exportToExcel = async (data, sheetName) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  if (data.length > 0) {
    const keys = Object.keys(data[0].toObject());
    sheet.columns = keys.map(key => ({ header: key, key }));
    data.forEach(item => {
      const row = {};
      keys.forEach(key => row[key] = item[key]);
      sheet.addRow(row);
    });
  } else {
    sheet.addRow(["Нет данных"]);
  }

  return await workbook.xlsx.writeBuffer();
};
