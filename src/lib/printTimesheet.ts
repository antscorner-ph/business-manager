export interface PrintableTimesheetRow {
  employeeName: string;
  date: string;
  clockIn: string;
  clockOut: string;
  hours: number;
  pay: number | null;
}

export interface PrintableTimesheet {
  title: string;
  rangeLabel: string;
  rows: PrintableTimesheetRow[];
  totalHours: number;
  totalPay: number | null;
}

const peso = (amount: number) =>
  new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    amount
  );

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Print a timesheet via a dedicated print window (avoids in-page CSS conflicts). */
export function printTimesheet(sheet: PrintableTimesheet) {
  const rows = sheet.rows
    .map(
      (r) => `
      <tr>
        <td>${escapeHtml(r.employeeName)}</td>
        <td>${escapeHtml(r.date)}</td>
        <td>${escapeHtml(r.clockIn)}</td>
        <td>${escapeHtml(r.clockOut)}</td>
        <td class="num">${r.hours.toFixed(2)}</td>
        <td class="num">${r.pay == null ? "-" : peso(r.pay)}</td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(sheet.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #111; margin: 20px; }
    .header { border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 12px; }
    h1 { font-size: 20px; margin: 0; }
    .sub { font-size: 12px; color: #444; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; table-layout: fixed; }
    thead th { text-align: left; border-bottom: 1.5px solid #111; padding: 5px 6px; text-transform: uppercase; font-size: 10px; }
    tbody td { padding: 4px 6px; border-bottom: 1px solid #ccc; word-break: break-word; }
    tbody tr { page-break-inside: avoid; }
    td.num, th.num { text-align: right; white-space: nowrap; }
    tfoot td { padding: 6px; border-top: 2px solid #111; font-weight: 700; }
    tfoot .num { text-align: right; }
    @media print { body { margin: 0; padding: 12px; } @page { size: A4; margin: 12mm; } thead { display: table-header-group; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(sheet.title)}</h1>
    <div class="sub">${escapeHtml(sheet.rangeLabel)}</div>
  </div>
  <table>
    <colgroup>
      <col style="width:26%" /><col style="width:16%" /><col style="width:16%" />
      <col style="width:16%" /><col style="width:13%" /><col style="width:13%" />
    </colgroup>
    <thead>
      <tr><th>Employee</th><th>Date</th><th>Clock In</th><th>Clock Out</th><th class="num">Hours</th><th class="num">Pay</th></tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="6" style="text-align:center;padding:20px;color:#666">No entries</td></tr>`}</tbody>
    <tfoot>
      <tr>
        <td colspan="4">TOTAL</td>
        <td class="num">${sheet.totalHours.toFixed(2)}</td>
        <td class="num">${sheet.totalPay == null ? "-" : peso(sheet.totalPay)}</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    throw new Error("Unable to open print window. Please allow pop-ups for this site.");
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => printWindow.print();
  setTimeout(() => {
    try {
      printWindow.print();
    } catch {
      /* no-op */
    }
  }, 300);
}
