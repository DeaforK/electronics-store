const PDFDocument = require('pdfkit');
const { PassThrough } = require('stream');

exports.exportToPdf = (orders) => {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    const stream = new PassThrough();
    const buffers = [];

    doc.fontSize(18).text('Отчёт по заказам', { align: 'center' });
    doc.moveDown();

    orders.forEach(order => {
      doc.fontSize(12).text(`Заказ ID: ${order._id}`);
      doc.text(`Пользователь: ${order.users_id?.name || '—'}`);
      doc.text(`Сумма: ${parseFloat(order.total_amount)} руб`);
      doc.text(`Налог: ${parseFloat(order.tax)} руб`);
      doc.text(`Дата: ${order.createdAt.toISOString().split('T')[0]}`);
      doc.text(`Статус: ${order.status}`);
      doc.moveDown();
    });

    doc.pipe(stream);
    doc.end();

    stream.on('data', chunk => buffers.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(buffers)));
  });
};
