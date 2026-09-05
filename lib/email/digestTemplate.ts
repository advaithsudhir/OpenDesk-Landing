// Builds the weekly digest email. Kept independent of any DB/query shape —
// callers pass already-resolved, display-ready rows — so this file is just
// "data in, email out" and easy to reason about (or preview) on its own.
//
// Visual design supplied directly as email-safe HTML (inline styles, table
// layout) — this file only re-templates it with real per-clinic data in
// place of the example rows.

const INK = "#1F2421";
const STONE = "#6B7268";
const SAGE_DEEP = "#4A6350";
const ALERT = "#B5563E";
const AMBER = "#8A6A3D";
const LINE = "#E4E1D8";
const PAPER = "#F7F5F0";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";
const APP_URL = "https://getopendesk.com/app";

export type DigestExpiryRow = {
  productName: string;
  supplier: string | null;
  batchNumber: string | null;
  days: number;
  quantity: number;
  unit: string;
};

export type DigestPrioritiseRow = {
  procedureName: string;
  productName: string;
  batchNumber: string | null;
  days: number;
  capacity: number | null;
};

export type DigestReorderRow = {
  productName: string;
  onHand: number;
  unit: string;
  avgMonthlyUsage: number;
  suggestedOrderQty: number;
  daysUntilStockout: number;
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

// Plain colored-text row (Expiry risk / Reorder soon).
function textRow(main: string, meta: string, right: string, rightColor: string) {
  return `
    <tr>
      <td valign="top" style="padding:12px 12px 12px 0;border-top:1px solid ${LINE};font-family:${SANS};">
        <div style="font-size:14px;line-height:20px;color:${INK};font-weight:700;">${main}</div>
        <div style="font-size:12px;line-height:18px;color:${STONE};padding-top:3px;">${meta}</div>
      </td>
      <td valign="top" align="right" style="padding:12px 0;border-top:1px solid ${LINE};white-space:nowrap;font-family:${SANS};font-size:14px;line-height:20px;font-weight:700;color:${rightColor};">${right}</td>
    </tr>`;
}

// Pill row (Procedures to prioritise).
function pillRow(main: string, meta: string, right: string, urgent: boolean) {
  const bg = urgent ? "rgba(181,86,62,.14)" : "rgba(232,196,192,.45)";
  const color = urgent ? ALERT : AMBER;
  return `
    <tr>
      <td valign="top" style="padding:12px 12px 12px 0;border-top:1px solid ${LINE};font-family:${SANS};">
        <div style="font-size:14px;line-height:20px;color:${INK};font-weight:700;">${main}</div>
        <div style="font-size:12px;line-height:18px;color:${STONE};padding-top:3px;">${meta}</div>
      </td>
      <td valign="top" align="right" style="padding:12px 0;border-top:1px solid ${LINE};white-space:nowrap;">
        <span style="display:inline-block;background-color:${bg};border-radius:11px;padding:3px 10px;font-family:${SANS};font-size:13px;line-height:18px;font-weight:700;color:${color};">${right}</span>
      </td>
    </tr>`;
}

function section(title: string, subtitle: string, rows: string[], topPad: number, bottomPad: number) {
  return `
    <tr>
      <td style="padding:${topPad}px 28px 0 28px;">
        <div style="font-family:${SERIF};font-size:19px;line-height:24px;color:${INK};">${title}</div>
        <div style="font-family:${SANS};font-size:12px;line-height:18px;color:${STONE};padding-top:4px;">${subtitle}</div>
      </td>
    </tr>
    <tr>
      <td style="padding:14px 28px ${bottomPad}px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
          <tbody>${rows.join("")}</tbody>
        </table>
      </td>
    </tr>`;
}

export function buildDigestEmail(
  clinicName: string,
  expiry: DigestExpiryRow[],
  prioritise: DigestPrioritiseRow[],
  reorder: DigestReorderRow[],
  today: Date
): { subject: string; html: string; text: string } {
  const totalFlags = expiry.length + prioritise.length + reorder.length;
  const clinic = escapeHtml(clinicName);
  const dateLabel = today.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

  const subject = totalFlags === 0
    ? `${clinicName}: all clear this week`
    : `${clinicName}: ${totalFlags} item${totalFlags === 1 ? "" : "s"} to check this week`;

  const preheaderParts: string[] = [];
  if (expiry.length) preheaderParts.push(`${expiry.length} batch${expiry.length === 1 ? "" : "es"} expiring within 30 days`);
  if (prioritise.length) preheaderParts.push(`${prioritise.length} procedure${prioritise.length === 1 ? "" : "s"} to prioritise`);
  if (reorder.length) preheaderParts.push(`${reorder.length} item${reorder.length === 1 ? "" : "s"} to reorder`);
  const preheader = preheaderParts.length ? preheaderParts.join(" · ") : "Nothing needs attention this week";

  const expiryRows = expiry.map((r) =>
    textRow(
      escapeHtml(r.productName) + (r.batchNumber ? ` · batch ${escapeHtml(r.batchNumber)}` : ""),
      [r.supplier ? `Supplier: ${escapeHtml(r.supplier)}` : "", `${r.quantity} ${escapeHtml(r.unit)} on hand`].filter(Boolean).join(" · "),
      `${r.days} day${r.days === 1 ? "" : "s"}`,
      r.days <= 15 ? ALERT : AMBER
    )
  );

  const prioritiseRows = prioritise.map((r) => {
    const capacityNote = r.capacity != null ? ` · ~${r.capacity} more treatment${r.capacity === 1 ? "" : "s"} in this batch` : "";
    return pillRow(
      escapeHtml(r.procedureName),
      `Driven by ${escapeHtml(r.productName)}${r.batchNumber ? ` (batch ${escapeHtml(r.batchNumber)})` : ""}${capacityNote}`,
      `${r.days}d`,
      r.days <= 15
    );
  });

  const reorderRows = reorder.map((r) =>
    textRow(
      escapeHtml(r.productName),
      `${r.onHand} ${escapeHtml(r.unit)} on hand · order ~${Math.ceil(r.suggestedOrderQty)} ${escapeHtml(r.unit)}`,
      `${Math.max(0, Math.round(r.daysUntilStockout))}d left`,
      r.daysUntilStockout <= 14 ? ALERT : AMBER
    )
  );

  const cta = `
    <tr>
      <td style="padding:20px 28px 28px 28px;">
        <a href="${APP_URL}" style="display:inline-block;font-family:${SANS};font-size:13px;line-height:18px;font-weight:700;color:${SAGE_DEEP};text-decoration:none;border:1px solid ${SAGE_DEEP};border-radius:5px;padding:9px 16px;">Open stock in Opendesk</a>
      </td>
    </tr>`;

  const cardInner = totalFlags === 0
    ? `<tr><td style="padding:28px;">
         <div style="font-family:${SERIF};font-size:19px;line-height:26px;color:${INK};">All clear</div>
         <div style="font-family:${SANS};font-size:14px;line-height:22px;color:${STONE};padding-top:8px;">Nothing needs attention this week — no stock expiring in the next 30 days, no procedures affected, and nothing due for reorder before your next cycle.</div>
       </td></tr>`
    : [
        expiryRows.length ? section("Expiry risk", "Stock expiring in the next 30 days.", expiryRows, 28, 0) : "",
        prioritiseRows.length ? section("Procedures to prioritise", "Book these while the stock they depend on is still good.", prioritiseRows, 30, 0) : "",
        reorderRows.length ? section("Reorder soon", "Consumables that run out before your next ordering cycle.", reorderRows, 30, 4) : "",
        cta,
      ].join("");

  const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Opendesk weekly digest</title>
</head>
<body style="margin:0;padding:0;background-color:${PAPER};">
<div style="display:none;font-size:1px;color:${PAPER};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:${PAPER};margin:0;padding:0;">
  <tbody><tr>
    <td align="center" style="padding:32px 16px 48px 16px;background-color:${PAPER};">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
        <tbody>
        <tr>
          <td style="padding:0 4px 20px 4px;">
            <div style="font-family:${SERIF};font-size:26px;line-height:30px;color:${INK};letter-spacing:-0.2px;">open<span style="color:${SAGE_DEEP};">·</span>desk</div>
            <div style="font-family:${SANS};font-size:12px;line-height:18px;color:${STONE};padding-top:6px;letter-spacing:0.2px;">${clinic} &nbsp;·&nbsp; Weekly digest &nbsp;·&nbsp; ${dateLabel}</div>
          </td>
        </tr>
        <tr>
          <td style="background-color:#FFFFFF;border:1px solid ${LINE};border-radius:6px;padding:0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
              <tbody>${cardInner}</tbody>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 4px 0 4px;font-family:${SANS};font-size:11px;line-height:17px;color:${STONE};">
            Sent automatically by Opendesk, based on your current stock and treatment logs. Manage who receives this under Staff in the app.
          </td>
        </tr>
        </tbody>
      </table>
    </td>
  </tr></tbody>
</table>
</body></html>`;

  const textLines: string[] = [`open·desk — ${clinicName} · Weekly digest · ${dateLabel}`, ""];
  if (totalFlags === 0) {
    textLines.push("All clear — nothing needs attention this week.");
  } else {
    if (expiry.length) {
      textLines.push("EXPIRY RISK — stock expiring in the next 30 days");
      for (const r of expiry) textLines.push(`- ${r.productName}${r.batchNumber ? ` (batch ${r.batchNumber})` : ""}: ${r.days}d, ${r.quantity} ${r.unit} on hand`);
      textLines.push("");
    }
    if (prioritise.length) {
      textLines.push("PROCEDURES TO PRIORITISE — book these while stock is still good");
      for (const r of prioritise) textLines.push(`- ${r.procedureName}: driven by ${r.productName}, ${r.days}d${r.capacity != null ? `, ~${r.capacity} more treatments in this batch` : ""}`);
      textLines.push("");
    }
    if (reorder.length) {
      textLines.push("REORDER SOON — before your next ordering cycle");
      for (const r of reorder) textLines.push(`- ${r.productName}: ${r.onHand} ${r.unit} on hand, ~${Math.round(r.daysUntilStockout)}d left, order ~${Math.ceil(r.suggestedOrderQty)} ${r.unit}`);
      textLines.push("");
    }
  }
  textLines.push(`Open stock in Opendesk: ${APP_URL}`);
  textLines.push("Manage recipients under Staff in the app.");

  return { subject, html, text: textLines.join("\n") };
}
