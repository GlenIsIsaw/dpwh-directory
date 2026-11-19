// ---- colours (same palette as the web app) ----
const NAVY = "FF0B2A4A";
const BLUE = "FF1B5FA8";
const GOLD = "FFC9A227";
const STRIPE = "FFF3F6FA";
const LINE = "FFE3E8EF";
const WHITE = "FFFFFFFF";
const TEXT = "FF1C2733";

const solid = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const thin = { style: "thin", color: { argb: LINE } };
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };

const STATUS_STYLE = {
  Active: { bg: "FFE3F6EA", fg: "FF17653A" },
  Inactive: { bg: "FFF0F1F3", fg: "FF5B6672" },
};
const TYPE_STYLE = {
  "Regular/Budgetary": { bg: "FFE0F0FF", fg: "FF0B4F8A" },
  "Job Order": { bg: "FFFEF3C7", fg: "FF8A6D0B" },
  Casual: { bg: "FFEDE9FE", fg: "FF5B3FA0" },
};

const COLUMNS = [
  { header: "Photo", key: "photo", width: 14 },
  { header: "ID Number", key: "idNumber", width: 16 },
  { header: "Last Name", key: "lastName", width: 22 },
  { header: "First Name", key: "firstName", width: 22 },
  { header: "Middle Name", key: "middleName", width: 20 },
  { header: "Suffix", key: "suffix", width: 10 },
  { header: "Nickname", key: "nickname", width: 16 },
  { header: "Department", key: "department", width: 38 },
  { header: "Position", key: "position", width: 38 },
  { header: "Employment Type", key: "employmentType", width: 20 },
  { header: "Contact", key: "contact", width: 18 },
  { header: "Hire Date", key: "hireDate", width: 14 },
  { header: "Status", key: "status", width: 12 },
  { header: "Birthday", key: "birthday", width: 14 },
  { header: "Address", key: "address", width: 40 },
  { header: "Emergency Contact Person", key: "emergencyName", width: 28 },
  { header: "Emergency Contact Number", key: "emergencyContact", width: 24 },
];
const IDX = Object.fromEntries(COLUMNS.map((c, i) => [c.key, i + 1]));
const DATE_KEYS = new Set(["hireDate", "birthday"]);

// "2024-05-10" -> a real Excel date (built in UTC so the day never shifts)
function toDate(value) {
  if (!value) return null;
  const [y, m, d] = String(value).split("-").map(Number);
  if (!y || !m || !d) return String(value);
  return new Date(Date.UTC(y, m - 1, d));
}

// the logo is read from the app's own files, so it also works offline
async function fetchDataUrl(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function countBy(list, getKey) {
  const map = new Map();
  list.forEach((item) => {
    const key = getKey(item);
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
}

// navy title bar, subtitle line and a gold rule across the top of a sheet
function banner(ws, { title, subtitle, titleCol, lastCol, logoId }) {
  for (let c = 1; c <= lastCol; c += 1) {
    ws.getCell(1, c).fill = solid(NAVY);
    ws.getCell(2, c).fill = solid(NAVY);
    ws.getCell(3, c).fill = solid(GOLD);
  }
  if (lastCol > titleCol) {
    ws.mergeCells(1, titleCol, 1, lastCol);
    ws.mergeCells(2, titleCol, 2, lastCol);
  }
  const t = ws.getCell(1, titleCol);
  t.value = title;
  t.font = { name: "Calibri", size: 18, bold: true, color: { argb: WHITE } };
  t.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

  const s = ws.getCell(2, titleCol);
  s.value = subtitle;
  s.font = { name: "Calibri", size: 10, color: { argb: "FFCBD5E1" } };
  s.alignment = { vertical: "top", horizontal: "left", indent: 1 };

  ws.getRow(1).height = 36;
  ws.getRow(2).height = 20;
  ws.getRow(3).height = 4;

  if (logoId !== null && logoId !== undefined) {
    ws.addImage(logoId, { tl: { col: 0.12, row: 0.12 }, ext: { width: 54, height: 54 } });
  }
}

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
  wb.creator = "DPWH Directory";
  wb.created = new Date();

  const logoUrl = await fetchDataUrl("/logo.png");
  const logoId = logoUrl ? wb.addImage({ base64: logoUrl, extension: "png" }) : null;

  const stamp = new Date().toLocaleString();
  const active = employees.filter((e) => e.status === "Active");

  // ===== Sheet 1: Employees =====
  const ws = wb.addWorksheet("Employees", { properties: { tabColor: { argb: BLUE } } });
  ws.columns = COLUMNS.map(({ key, width }) => ({ key, width }));
  const N = COLUMNS.length;
  const HEADER = 4;

  banner(ws, {
    title: "DPWH Directory · Employee Masterlist",
    subtitle: `Generated ${stamp} · ${employees.length} records · ${active.length} active`,
    titleCol: 2,
    lastCol: N,
    logoId,
  });

  const head = ws.getRow(HEADER);
  head.height = 30;
  COLUMNS.forEach((col, i) => {
    const cell = head.getCell(i + 1);
    cell.value = col.header;
    cell.font = { name: "Calibri", size: 10.5, bold: true, color: { argb: WHITE } };
    cell.fill = solid(NAVY);
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: GOLD } } };
  });

  employees.forEach((e, i) => {
    const row = ws.getRow(HEADER + 1 + i);
    row.height = 75;

    COLUMNS.forEach((col, c) => {
      const cell = row.getCell(c + 1);
      if (col.key === "photo") cell.value = null;
      else if (DATE_KEYS.has(col.key)) cell.value = toDate(e[col.key]);
      else cell.value = e[col.key] ?? null;

      cell.font = { name: "Calibri", size: 10, color: { argb: TEXT } };
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = BORDER;
      if (i % 2 === 1) cell.fill = solid(STRIPE);

      if (DATE_KEYS.has(col.key)) {
        cell.numFmt = "dd mmm yyyy";
        cell.alignment = { vertical: "middle", horizontal: "center" };
      }
    });

    const last = row.getCell(IDX.lastName);
    last.font = { name: "Calibri", size: 10, bold: true, color: { argb: NAVY } };

    const status = STATUS_STYLE[e.status];
    if (status) {
      const cell = row.getCell(IDX.status);
      cell.fill = solid(status.bg);
      cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: status.fg } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    }

    const type = TYPE_STYLE[e.employmentType];
    if (type) {
      const cell = row.getCell(IDX.employmentType);
      cell.fill = solid(type.bg);
      cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: type.fg } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    }

    if (e.photo && e.photo.startsWith("data:image/")) {
      const extension = e.photo.startsWith("data:image/png") ? "png" : "jpeg";
      const imageId = wb.addImage({ base64: e.photo, extension });
      ws.addImage(imageId, {
        tl: { col: 0.08, row: HEADER + i + 0.05 },
        ext: { width: 90, height: 90 },
      });
    }
  });

  ws.autoFilter = { from: { row: HEADER, column: 1 }, to: { row: HEADER, column: N } };
  ws.views = [{ state: "frozen", ySplit: HEADER, showGridLines: false }];
  ws.pageSetup = {
    orientation: "landscape",
    paperSize: 9, // A4
    margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    printTitlesRow: `1:${HEADER}`,
  };
  ws.headerFooter = { oddFooter: "&LDPWH Directory&CPage &P of &N&R&D" };

  // ===== Sheet 2: Summary =====
  const sum = wb.addWorksheet("Summary", { properties: { tabColor: { argb: GOLD } } });
  sum.columns = [
    { key: "a", width: 46 },
    { key: "b", width: 14 },
  ];
  banner(sum, {
    title: "Summary",
    subtitle: `Generated ${stamp}`,
    titleCol: 1,
    lastCol: 2,
    logoId: null,
  });
  sum.views = [{ showGridLines: false }];

  let r = 5;
  const section = (title, rows) => {
    const head2 = sum.getRow(r);
    r += 1;
    head2.height = 24;
    [1, 2].forEach((c) => {
      const cell = head2.getCell(c);
      cell.fill = solid(NAVY);
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: WHITE } };
      cell.alignment = { vertical: "middle", horizontal: c === 1 ? "left" : "right", indent: 1 };
      cell.border = { bottom: { style: "medium", color: { argb: GOLD } } };
    });
    head2.getCell(1).value = title;

    rows.forEach(([label, count], i) => {
      const line = sum.getRow(r);
      r += 1;
      line.height = 20;
      line.getCell(1).value = label;
      line.getCell(2).value = count;
      [1, 2].forEach((c) => {
        const cell = line.getCell(c);
        cell.border = BORDER;
        if (i % 2 === 1) cell.fill = solid(STRIPE);
      });
      line.getCell(1).font = { name: "Calibri", size: 10.5, color: { argb: TEXT } };
      line.getCell(1).alignment = { vertical: "middle", indent: 1 };
      line.getCell(2).font = { name: "Calibri", size: 10.5, bold: true, color: { argb: NAVY } };
      line.getCell(2).alignment = { vertical: "middle", horizontal: "right", indent: 1 };
    });
    r += 1; // blank line between sections
  };

  section("Records", [
    ["Active employees", active.length],
    ["Inactive", employees.length - active.length],
    ["Total records", employees.length],
  ]);

  const typeCounts = countBy(active, (e) => e.employmentType || "Not set");
  const typeRows = ["Regular/Budgetary", "Job Order", "Casual", "Not set"]
    .map((t) => [t, typeCounts.get(t) || 0])
    .filter(([t, n]) => t !== "Not set" || n > 0);
  section("Active employees by employment type", typeRows);

  const deptCounts = countBy(active, (e) => e.department || "Not set");
  section(
    "Active employees by department",
    [...deptCounts.entries()].sort((a, b) => b[1] - a[1])
  );

  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename
  );
}