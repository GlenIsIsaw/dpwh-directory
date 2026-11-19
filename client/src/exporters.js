const COLUMNS = [
  { header: "Photo", key: "photo", width: 14 },
  { header: "ID Number", key: "idNumber", width: 16 },
  { header: "Last Name", key: "lastName", width: 20 },
  { header: "First Name", key: "firstName", width: 20 },
  { header: "Middle Name", key: "middleName", width: 20 },
  { header: "Suffix", key: "suffix", width: 10 },
  { header: "Nickname", key: "nickname", width: 16 },
  { header: "Department", key: "department", width: 38 },
  { header: "Position", key: "position", width: 38 },
  { header: "Employment Type", key: "employmentType", width: 20 },
  { header: "Contact", key: "contact", width: 20 },
  { header: "Hire Date", key: "hireDate", width: 14 },
  { header: "Status", key: "status", width: 12 },
  { header: "Birthday", key: "birthday", width: 14 },
  { header: "Address", key: "address", width: 40 },
  { header: "Emergency Contact Person", key: "emergencyName", width: 28 },
  { header: "Emergency Contact Number", key: "emergencyContact", width: 24 },
];

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  downloadBlob(blob, filename);
}

export async function exportExcel(employees, filename) {
  // loaded only when needed, so the rest of the app stays small
  const ExcelJS = (await import("exceljs")).default;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Employees");
  ws.columns = COLUMNS;
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  employees.forEach((e, i) => {
    const row = ws.addRow({ ...e, photo: "" });
    row.height = 75;
    row.alignment = { vertical: "middle" };

    if (e.photo && e.photo.startsWith("data:image/")) {
      const extension = e.photo.startsWith("data:image/png") ? "png" : "jpeg";
      const imageId = wb.addImage({ base64: e.photo, extension });
      ws.addImage(imageId, {
        tl: { col: 0, row: i + 1 },
        ext: { width: 90, height: 90 },
      });
    }
  });

  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename
  );
}