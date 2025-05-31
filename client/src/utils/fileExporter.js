import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

export function exportToCsv(data) {
  const rows = Array.isArray(data) ? data : [data];
  const csv = [
    Object.keys(rows[0]).join(','), // заголовки
    ...rows.map(r => Object.values(r).join(',')) // значения
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, 'report.csv');
}

export function exportToExcel(data) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  XLSX.writeFile(workbook, 'report.xlsx');
}

export function exportToPdf(data) {
  const doc = new jsPDF();
  doc.text('Report', 10, 10);
  doc.text(JSON.stringify(data, null, 2), 10, 20);
  doc.save('report.pdf');
}
