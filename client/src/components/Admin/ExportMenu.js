import { exportToCsv, exportToExcel, exportToPdf } from '../../utils/fileExporter';

export default function ExportMenu({ data }) {
  return (
    <div className="flex gap-4 mb-6">
      <button
        className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
        onClick={() => exportToCsv(data)}
      >
        📤 CSV
      </button>
      <button
        className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
        onClick={() => exportToExcel(data)}
      >
        📊 Excel
      </button>
      <button
        className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
        onClick={() => exportToPdf(data)}
      >
        📄 PDF
      </button>
    </div>
  );
}

