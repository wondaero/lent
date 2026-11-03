import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// 예시 데이터 (서버에서 Object로 받는다고 가정)
// const serverData = [
//   { name: 'Alice', age: 25, city: 'Seoul' },
//   { name: 'Bob', age: 30, city: 'Busan' },
//   { name: 'Charlie', age: 28, city: 'Incheon' }
// ];

export const exportExcel = async (data, header) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet 1');

  // 헤더 추가
//   worksheet.columns = [
//     { header: '이름', key: 'name', width: 20 },
//     { header: '나이', key: 'age', width: 10 },
//     { header: '도시', key: 'city', width: 20 }
//   ];
  worksheet.columns = header;

  // 데이터 추가
  data.forEach(item => {
    worksheet.addRow(item);
  });

  worksheet.getRow(1).eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'ff74bb2a' }
    };
    cell.font = { bold: true, color: { argb: 'FF000000' } }; // 볼드 + 검은 글씨
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(
    now.getMinutes()
  ).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;

  

  // 브라우저에서 다운로드
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `excel_${timestamp}.xlsx`);
};
