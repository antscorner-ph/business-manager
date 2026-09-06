export interface PrintablePOItem {
  name: string;
  unit: string | null;
  po_in_pcs: number;
  unit_cost: number;
  line_total: number;
  inventory_note: string | null;
}

export interface PrintablePO {
  supplierName: string;
  voucherNo: string;
  date: string;
  items: PrintablePOItem[];
}

const peso = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

/** Escape user-provided text so it is safe to inject into the print HTML. */
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Print a purchase order by opening a dedicated print window with self-contained
 * HTML. This avoids Radix dialog portal / CSS visibility conflicts that make
 * in-page print isolation unreliable.
 */
export function printPurchaseOrder(po: PrintablePO) {
  const grandTotal = po.items.reduce((sum, item) => sum + item.line_total, 0);

  const rows = po.items
    .map(
      (item) => `
        <tr>
          <td class="name">${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.unit ?? "")}</td>
          <td class="num">${item.po_in_pcs}</td>
          <td class="num">${peso(item.unit_cost)}</td>
          <td class="num">${peso(item.line_total)}</td>
          <td>${escapeHtml(item.inventory_note ?? "")}</td>
        </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>PO ${escapeHtml(po.voucherNo)}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { height: auto; }
    body {
      font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      color: #111;
      margin: 20px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #111;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .supplier { font-size: 20px; font-weight: 700; text-transform: uppercase; }
    .subtitle { font-size: 11px; color: #444; margin-top: 2px; }
    .meta { font-size: 11px; text-align: right; line-height: 1.5; }
    .meta strong { display: inline-block; min-width: 70px; text-align: left; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
    /* Column widths so long product names wrap instead of pushing to a 2nd page. */
    col.c-name { width: 34%; }
    col.c-unit { width: 12%; }
    col.c-pcs  { width: 11%; }
    col.c-cost { width: 13%; }
    col.c-total{ width: 14%; }
    col.c-inv  { width: 16%; }
    thead th {
      text-align: left;
      border-bottom: 1.5px solid #111;
      padding: 5px 6px;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.02em;
    }
    tbody td {
      padding: 4px 6px;
      border-bottom: 1px solid #ccc;
      vertical-align: top;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    tbody tr { page-break-inside: avoid; break-inside: avoid; }
    td.num, th.num { text-align: right; white-space: nowrap; }
    td.name { font-weight: 600; }
    tfoot td {
      padding: 6px;
      border-top: 2px solid #111;
      font-weight: 700;
    }
    tfoot .num { text-align: right; }
    .empty { padding: 24px; text-align: center; color: #666; }
    @media print {
      body { margin: 0; padding: 12px; }
      @page { size: A4; margin: 12mm; }
      thead { display: table-header-group; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="supplier">${escapeHtml(po.supplierName || "Supplier")}</div>
      <div class="subtitle">Purchase Order</div>
    </div>
    <div class="meta">
      <div><strong>Voucher No:</strong> ${escapeHtml(po.voucherNo || "-")}</div>
      <div><strong>Date:</strong> ${escapeHtml(po.date || "-")}</div>
    </div>
  </div>

  ${
    po.items.length === 0
      ? `<div class="empty">No line items recorded for this purchase order.</div>`
      : `<table>
    <colgroup>
      <col class="c-name" />
      <col class="c-unit" />
      <col class="c-pcs" />
      <col class="c-cost" />
      <col class="c-total" />
      <col class="c-inv" />
    </colgroup>
    <thead>
      <tr>
        <th>Name</th>
        <th>Unit</th>
        <th class="num">PO in pcs</th>
        <th class="num">Unit cost</th>
        <th class="num">Total</th>
        <th>Inventory</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="4">GRAND TOTAL</td>
        <td class="num">${peso(grandTotal)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>`
  }
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    // Popup blocked — surface a clear message to the caller.
    throw new Error("Unable to open print window. Please allow pop-ups for this site.");
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  // Give the new document a tick to render before invoking print.
  printWindow.onload = () => {
    printWindow.print();
  };
  // Fallback if onload doesn't fire (some browsers with document.write).
  setTimeout(() => {
    try {
      printWindow.print();
    } catch {
      /* no-op */
    }
  }, 300);
}
