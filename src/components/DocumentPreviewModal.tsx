import { type ReactNode } from "react";
import {
  X,
  Printer,
  FileText,
  Receipt,
  ScanLine,
  ShieldCheck,
  Building2,
  ClipboardCheck,
} from "lucide-react";
import type { RepairRecord } from "../types";

// ============================================================
// Document preview types — 5 distinct operational layouts
// ============================================================

export type PreviewType =
  | "invoice"
  | "deposit"
  | "corporate"
  | "standard"
  | "barcode";

interface DocumentPreviewModalProps {
  open: boolean;
  type: PreviewType | null;
  repair: RepairRecord | null;
  onClose: () => void;
}

// ============================================================
// Company constants
// ============================================================

const COMPANY = {
  name: "CyGnuS SARL",
  tagline: "Professional Repair Services",
  address: "Rue 920 George Matta Sideway, Dekwaneh, Al Metn, Lebanon.",
  phone: "+961 1 688 433",
  mof: "#3929987-601",
};

const VAT_RATE = 0.11; // 11% Lebanon VAT
const WARRANTY_DAYS = 90;

// ============================================================
// Helpers
// ============================================================

function now12h() {
  return new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function shortDate() {
  return new Date().toLocaleDateString("en-GB");
}

// Returns precise @page + body dimension rules per document template.
// Accepts dynamicHeight to solve the PDF preview scaling bug for thermal sizes.
const getPrintPageCSS = (docType: PreviewType, dynamicHeight: string = "500mm"): string => {
  switch (docType) {
    case "barcode":
      return `
        @page { size: 80mm 20mm; margin: 0; }
        @media print {
          html, body {
            width: 80mm !important;
            height: 20mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-document-target {
            width: 80mm !important;
            height: 20mm !important;
            box-sizing: border-box !important;
            transform: none !important;
            overflow: hidden !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `;
    case "deposit":
    case "standard":
    case "corporate":
      return `
        @page { size: 80mm ${dynamicHeight}; margin: 0; }
        @media print {
          html, body {
            width: 80mm !important;
            max-height: ${dynamicHeight} !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            box-sizing: border-box !important;
            white-space: normal !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-document-target {
            width: 80mm !important;
            height: auto !important;
            box-sizing: border-box !important;
            transform: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `;
    case "invoice":
    default:
      return `
        @page { size: A4; margin: 12mm; }
        @media print {
          html, body {
            width: auto !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-document-target {
            width: 210mm !important;
            box-sizing: border-box !important;
            transform: none !important;
          }
        }
      `;
  }
};

// ============================================================
// Code128-style barcode visual (deterministic from input string)
// ============================================================

function Code128Visual({ value }: { value: string }) {
  const bars: ReactNode[] = [];
  let x = 4;

  [2, 1, 1, 2, 3, 2].forEach((w, j) => {
    bars.push(
      <rect
        key={`sg${j}`}
        x={x}
        y={0}
        width={w}
        height={40}
        fill={j % 2 === 0 ? "#000" : "#fff"}
      />,
    );
    x += w;
  });

  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    const pattern = [
      ((c >> 0) & 3) + 1,
      ((c >> 2) & 1) + 1,
      ((c >> 3) & 3) + 1,
      ((c >> 5) & 1) + 1,
      ((c >> 6) & 1) + 2,
      1,
    ];
    pattern.forEach((w, j) => {
      bars.push(
        <rect
          key={`d${i}-${j}`}
          x={x}
          y={0}
          width={w}
          height={40}
          fill={j % 2 === 0 ? "#000" : "#fff"}
        />,
      );
      x += w;
    });
  }

  [2, 3, 3, 1, 1, 1, 2].forEach((w, j) => {
    bars.push(
      <rect
        key={`eg${j}`}
        x={x}
        y={0}
        width={w}
        height={40}
        fill={j % 2 === 0 ? "#000" : "#fff"}
      />,
    );
    x += w;
  });

  x += 4;

  return (
    <svg
      viewBox={`0 0 ${x} 40`}
      className="w-full h-full"
      preserveAspectRatio="none"
    >
      <rect x={0} y={0} width={x} height={40} fill="#fff" />
      {bars}
    </svg>
  );
}

// ============================================================
// Thermal divider helpers
// ============================================================

function ThermalDivider({ dashed = true }: { dashed?: boolean }) {
  return (
    <div
      className="my-2"
      style={{ borderTop: `1px ${dashed ? "dashed" : "solid"} #aaa` }}
    />
  );
}

function ThermalSection({ title }: { title: string }) {
  return (
    <>
      <ThermalDivider />
      <p className="text-center text-[9px] font-bold uppercase tracking-widest text-gray-500 my-1">
        {title}
      </p>
    </>
  );
}

// ============================================================
// Main modal shell
// ============================================================

export function DocumentPreviewModal({
  open,
  type,
  repair,
  onClose,
}: DocumentPreviewModalProps) {
  if (!open || !type) return null;

const handlePrint = () => {
    const target = document.querySelector(".print-document-target") as HTMLElement;
    if (!target) return;

    // 1. Calculate exact dynamic height based on the live DOM
    let pageHeight = "500mm";
    if (type === "deposit" || type === "standard" || type === "corporate") {
      pageHeight = `${target.scrollHeight + 20}px`;
    }

    // 2. Clean up any lingering print elements from previous attempts
    document.getElementById("__crm-print-page-override__")?.remove();
    document.getElementById("__crm-print-clone__")?.remove();

    // 3. Clone the document target to isolate it from the React layout tree
    const clone = target.cloneNode(true) as HTMLElement;
    clone.id = "__crm-print-clone__";
    
    // Strip Tailwind print classes from the clone so they don't cause unintended layout shifts
    clone.className = clone.className.replace(/print:\S+/g, '');

    // 4. Inject aggressive CSS that hides the React app and ONLY shows the clone
    const styleEl = document.createElement("style");
    styleEl.id = "__crm-print-page-override__";
    styleEl.textContent = `
      ${getPrintPageCSS(type, pageHeight)}
      @media print {
        /* Hide the entire React application wrapper */
        body > *:not(#__crm-print-clone__):not(script):not(style) {
          display: none !important;
        }
        /* Reset the body so it doesn't restrict the height of the document */
        html, body {
          background: #fff !important;
          overflow: visible !important;
          height: auto !important;
          min-height: 100% !important;
        }
        /* Anchor the clone strictly to the top left of the paper */
        #__crm-print-clone__ {
          display: block !important;
          visibility: visible !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: ${type === 'invoice' ? '210mm' : '80mm'} !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      }
    `;

    // Append the styles and the clone to the DOM
    document.head.appendChild(styleEl);
    document.body.appendChild(clone);

    // 5. Robust cleanup function to restore the app after the print dialog closes
    const cleanup = () => {
      document.getElementById("__crm-print-page-override__")?.remove();
      document.getElementById("__crm-print-clone__")?.remove();
      window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup);

    const mql = window.matchMedia("print");
    const mqlListener = (e: MediaQueryListEvent) => {
      if (!e.matches) {
        cleanup();
        mql.removeEventListener("change", mqlListener);
      }
    };
    mql.addEventListener("change", mqlListener);

    // Give the browser slightly more time (100ms) to paint the clone before opening the dialog
    setTimeout(() => {
      window.print();
    }, 100);
  };
  
  const meta: Record<PreviewType, { title: string; icon: ReactNode }> = {
    barcode: {
      title: "Asset Label (80 × 20 mm)",
      icon: <ScanLine className="h-4 w-4" />,
    },
    deposit: {
      title: "Deposit Receipt — Tech Intake",
      icon: <ClipboardCheck className="h-4 w-4" />,
    },
    standard: {
      title: "Standard Receipt (No VAT)",
      icon: <Receipt className="h-4 w-4" />,
    },
    corporate: {
      title: "Corporate Receipt (VAT / MOF)",
      icon: <Building2 className="h-4 w-4" />,
    },
    invoice: {
      title: "Final Invoice (A4)",
      icon: <FileText className="h-4 w-4" />,
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/50 backdrop-blur-sm animate-fade-in print:static print:block print:overflow-visible print:bg-transparent">
<style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          /* 1. Reset background and hide ALL elements globally */
          html, body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body * {
            visibility: hidden !important;
          }

          /* 2. Force the target and all its children to be visible */
          .print-document-target,
          .print-document-target * {
            visibility: visible !important;
          }

          /* 3. Pull the document out of the DOM flow and anchor it to the top-left */
          .print-document-target {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `,
        }}
      />

      <div className="relative z-10 w-full my-4 print:my-0">
        {/* Toolbar */}
        <div className="no-print mx-auto max-w-4xl mb-3 flex items-center justify-between rounded-xl bg-white px-5 py-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <span className="text-brand-600">{meta[type].icon}</span>
            <h2 className="text-sm font-semibold text-gray-900">
              {meta[type].title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              <Printer className="h-4 w-4" />
              Print Document
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Document area */}
        <div className="mx-auto max-w-4xl print:max-w-full print:w-full print-document-target">
          {type === "barcode" && <LabelDocument repair={repair} />}
          {type === "deposit" && <DepositReceiptDocument repair={repair} />}
          {type === "standard" && <StandardReceiptDocument repair={repair} />}
          {type === "corporate" && <CorporateReceiptDocument repair={repair} />}
          {type === "invoice" && <InvoiceDocument repair={repair} />}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// A. Asset Label — exact 80mm × 20mm
// ============================================================

function LabelDocument({ repair }: { repair: RepairRecord | null }) {
  const repairId = repair?.repair_id || "REP-2026-1";
  const customer = repair?.customer_name || "";
  const device = `${repair?.brand || ""} ${repair?.model || ""}`.trim();

  return (
    <div className="flex items-center justify-center py-6 print:py-0 print:m-0 print:p-0 print:block">
      <div
        className="bg-white border border-black shadow-xl print:shadow-none box-border"
        style={{
          width: "80mm",
          height: "20mm",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          className="flex items-center justify-between px-2 pt-0.5"
          style={{ height: "5mm", overflow: "hidden" }}
        >
          <span
            className="font-mono font-bold text-black"
            style={{
              fontSize: "7pt",
              letterSpacing: "0.05em",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {repairId}
          </span>
          <span
            className="text-black font-semibold uppercase text-right"
            style={{
              fontSize: "6pt",
              maxWidth: "45%",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {COMPANY.name}
          </span>
        </div>

        <div
          className="flex items-center justify-center"
          style={{ height: "8mm", padding: "0 3mm" }}
        >
          <Code128Visual value={repairId} />
        </div>

        <div
          className="flex items-center justify-between px-2 pb-0.5"
          style={{ height: "4mm", overflow: "hidden" }}
        >
          <span
            className="text-black"
            style={{
              fontSize: "5.5pt",
              maxWidth: "48%",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {customer}
          </span>
          <span
            className="text-black text-right"
            style={{
              fontSize: "5.5pt",
              maxWidth: "48%",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {device}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// B. Deposit Receipt — Tech Intake
// ============================================================

function DepositReceiptDocument({ repair }: { repair: RepairRecord | null }) {
  const repairId = repair?.repair_id || "REP-2026-1";
  const customer = repair?.customer_name || "—";
  const phone = repair?.phone || "—";
  const brand = repair?.brand || "";
  const model = repair?.model || "";
  const serial = repair?.serial || "—";
  const condition = repair?.condition || "—";
  const problem = repair?.problem || "—";
  const dateIn = repair?.date_in
    ? new Date(repair.date_in).toLocaleDateString("en-GB")
    : new Date().toLocaleDateString("en-GB");
  const timeNow = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const trackingUrl = `https://cygnus-lb.com/track-repair/?id=${encodeURIComponent(repairId)}`;

  return (
    <div className="flex justify-center py-4 print:py-0 print:block">
      <div
        className="bg-white p-2 shadow-xl print:shadow-none box-border text-black mx-auto print:mx-0"
        style={{ width: "80mm", fontFamily: "monospace" }}
      >
        <div className="text-center pt-2 pb-1 px-1">
          <p
            className="font-bold uppercase tracking-tight text-black"
            style={{ fontSize: "12pt" }}
          >
            {COMPANY.name}
          </p>
          <p className="text-black font-medium" style={{ fontSize: "7.5pt" }}>
            {COMPANY.tagline}
          </p>
          <p
            className="text-black font-mono mt-0.5"
            style={{ fontSize: "7.5pt" }}
          >
            Tel: {COMPANY.phone}
          </p>
        </div>

        <ThermalDivider dashed={false} />

        <div className="text-center py-0.5">
          <p
            className="font-bold text-black tracking-widest uppercase"
            style={{ fontSize: "9.5pt" }}
          >
            DEPOSIT RECEIPT
          </p>
          <p
            className="text-black font-medium uppercase mt-0.5"
            style={{ fontSize: "6.5pt", letterSpacing: "0.05em" }}
          >
            Tech Intake Confirmation
          </p>
        </div>

        <ThermalDivider dashed={false} />

        <div className="text-center py-1">
          <p
            className="text-black font-bold uppercase tracking-wider"
            style={{ fontSize: "7pt" }}
          >
            REPAIR TICKET ID
          </p>
          <p
            className="font-mono font-bold text-black my-1"
            style={{ fontSize: "15pt", letterSpacing: "0.05em" }}
          >
            {repairId}
          </p>
          <div className="flex h-[11mm] w-full items-center justify-center px-2 my-1">
            <Code128Visual value={repairId} />
          </div>
        </div>

        <ThermalDivider />

        <div
          className="px-1 py-1 space-y-1 text-black"
          style={{ fontSize: "8.5pt" }}
        >
          <div className="flex justify-between items-baseline">
            <span className="font-bold uppercase tracking-wider text-[7.5pt]">
              Date In:
            </span>
            <span className="font-mono font-bold">
              {dateIn} {timeNow}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="font-bold uppercase tracking-wider text-[7.5pt]">
              Customer:
            </span>
            <span className="font-bold truncate max-w-[65%] text-right">
              {customer}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="font-bold uppercase tracking-wider text-[7.5pt]">
              Phone:
            </span>
            <span className="font-mono font-bold">{phone}</span>
          </div>
        </div>

        <ThermalSection title="Device Specifications" />

        <div
          className="px-1 py-1 space-y-1 text-black"
          style={{ fontSize: "8.5pt" }}
        >
          <div className="flex justify-between items-baseline">
            <span className="font-bold uppercase tracking-wider text-[7.5pt]">
              Model:
            </span>
            <span className="font-bold truncate max-w-[70%] text-right">
              {`${brand} ${model}`.trim() || "—"}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="font-bold uppercase tracking-wider text-[7.5pt]">
              S/N / IMEI:
            </span>
            <span className="font-mono font-bold truncate max-w-[65%] text-right">
              {serial}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="font-bold uppercase tracking-wider text-[7.5pt]">
              Condition:
            </span>
            <span className="font-medium truncate max-w-[65%] text-right">
              {condition}
            </span>
          </div>
        </div>

        <ThermalSection title="Problem Reported" />

        <div className="px-2 py-1.5 border border-black rounded-sm my-1 bg-white">
          <p
            className="text-black font-bold text-center leading-tight whitespace-pre-wrap break-words"
            style={{ fontSize: "8.5pt" }}
          >
            {problem}
          </p>
        </div>

        <ThermalDivider dashed={false} />

        <div
          className="text-center border-2 border-black py-1.5 my-1.5 bg-white text-black font-extrabold tracking-widest rounded-sm"
          style={{ fontSize: "11pt" }}
        >
          ✓ IN-TAKE RECEIVED
        </div>

        <ThermalDivider dashed={false} />

        <div className="flex flex-col items-center justify-center p-2 text-center bg-white border border-black rounded-sm my-2">
          <p
            className="text-black font-extrabold uppercase tracking-wider mb-1.5"
            style={{ fontSize: "8pt" }}
          >
            Scan to track your repair
          </p>
          <div className="w-[30mm] h-[30mm] bg-white p-1 flex items-center justify-center border border-black">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(trackingUrl)}&ecc=M`}
              alt="Live Status Tracking QR Link"
              className="w-full h-full object-contain mix-blend-multiply"
            />
          </div>
          <p
            className="text-black font-mono font-bold mt-1.5 tracking-tight"
            style={{ fontSize: "6.5pt" }}
          >
            cygnus-lb.com/track-repair
          </p>
        </div>

        <ThermalDivider />

        <div
          className="text-center px-1 py-1 space-y-1 text-black leading-tight"
          style={{ fontSize: "7.5pt" }}
        >
          <p className="font-bold uppercase tracking-wide">
            Important Instructions
          </p>
          <p className="font-medium">Please preserve this receipt safely.</p>
          <p className="font-medium">
            It must be presented to claim and collect the device.
          </p>
          <p className="font-medium">
            Our team will update you as soon as the technical diagnosis is
            verified.
          </p>
        </div>

        <ThermalDivider dashed={false} />

        <p
          className="text-center font-bold font-mono pb-1 text-black"
          style={{ fontSize: "6.5pt" }}
        >
          {COMPANY.name} · System Print: {now12h()}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// C. Corporate Receipt
// ============================================================

function CorporateReceiptDocument({ repair }: { repair: RepairRecord | null }) {
  const repairId = repair?.repair_id || "REP-2026-1";
  const customer = repair?.customer_name || "—";
  const phone = repair?.phone || "—";
  const device = `${repair?.brand || ""} ${repair?.model || ""}`.trim() || "—";
  const serial = repair?.serial || "—";
  const problem = repair?.problem || "Diagnostic & Repair";
  const tech = repair?.technician || "—";
  const price = repair?.price || 0;
  const vatAmt = price * VAT_RATE;
  const grandTotal = price + vatAmt;

  const trackingUrl = `https://cygnus-lb.com/track-repair/?id=${encodeURIComponent(repairId)}`;

  return (
    <div className="flex justify-center py-4 print:py-0 print:block">
      <div
        className="bg-white p-2 shadow-xl print:shadow-none box-border text-black mx-auto print:mx-0"
        style={{ width: "80mm", fontFamily: "monospace" }}
      >
        <div className="text-center pt-2 pb-1 px-1">
          <p
            className="font-bold uppercase tracking-tight text-black"
            style={{ fontSize: "12pt" }}
          >
            {COMPANY.name}
          </p>
          <p className="text-black font-medium" style={{ fontSize: "7.5pt" }}>
            {COMPANY.address}
          </p>
          <p
            className="text-black font-mono mt-0.5"
            style={{ fontSize: "7.5pt" }}
          >
            Tel: {COMPANY.phone}
          </p>
          <p
            className="font-extrabold text-black mt-0.5"
            style={{ fontSize: "8pt", letterSpacing: "0.02em" }}
          >
            MOF: {COMPANY.mof}
          </p>
        </div>

        <ThermalDivider dashed={false} />

        <div className="text-center py-0.5">
          <p
            className="font-bold text-black tracking-widest uppercase"
            style={{ fontSize: "9.5pt" }}
          >
            CORPORATE RECEIPT
          </p>
          <p
            className="text-black font-medium uppercase mt-0.5"
            style={{ fontSize: "6.5pt", letterSpacing: "0.05em" }}
          >
            Official Invoice Copy
          </p>
        </div>

        <ThermalDivider dashed={false} />

        <div className="text-center py-1">
          <p
            className="text-black font-bold uppercase tracking-wider"
            style={{ fontSize: "7pt" }}
          >
            RECEIPT TRANSACTION ID
          </p>
          <p
            className="font-mono font-bold text-black my-1"
            style={{ fontSize: "15pt", letterSpacing: "0.05em" }}
          >
            {repairId}
          </p>
          <div className="flex h-[11mm] w-full items-center justify-center px-2 my-1">
            <Code128Visual value={repairId} />
          </div>
        </div>

        <ThermalDivider />

        <div
          className="px-1 py-1 space-y-1 text-black"
          style={{ fontSize: "8.5pt" }}
        >
          <div className="flex justify-between items-baseline">
            <span className="font-bold uppercase tracking-wider text-[7.5pt]">
              Date/Time:
            </span>
            <span className="font-mono font-bold">{now12h()}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="font-bold uppercase tracking-wider text-[7.5pt]">
              Invoice Ref:
            </span>
            <span className="font-mono font-bold">{repairId}</span>
          </div>
        </div>

        <ThermalSection title="Bill To (Client)" />

        <div
          className="px-1 py-1 space-y-1 text-black"
          style={{ fontSize: "8.5pt" }}
        >
          <div className="flex justify-between items-baseline">
            <span className="font-bold uppercase tracking-wider text-[7.5pt]">
              Company:
            </span>
            <span className="font-bold truncate max-w-[65%] text-right">
              {customer}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="font-bold uppercase tracking-wider text-[7.5pt]">
              Phone:
            </span>
            <span className="font-mono font-bold">{phone}</span>
          </div>
        </div>

        <ThermalSection title="Asset & Service Specifications" />

        <div
          className="px-1 py-1 space-y-1 text-black"
          style={{ fontSize: "8.5pt" }}
        >
          <div className="flex justify-between items-baseline">
            <span className="font-bold uppercase tracking-wider text-[7.5pt]">
              Device:
            </span>
            <span className="font-bold truncate max-w-[70%] text-right">
              {device}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="font-bold uppercase tracking-wider text-[7.5pt]">
              S/N / IMEI:
            </span>
            <span className="font-mono font-bold truncate max-w-[65%] text-right">
              {serial}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="font-bold uppercase tracking-wider text-[7.5pt]">
              Service:
            </span>
            <span className="font-medium truncate max-w-[65%] text-right">
              {problem}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="font-bold uppercase tracking-wider text-[7.5pt]">
              Technician:
            </span>
            <span className="font-medium text-right">{tech}</span>
          </div>
        </div>

        <ThermalSection title="Accounting Payment Breakdown" />

        <div
          className="px-1 py-1 space-y-1 text-black"
          style={{ fontSize: "8.5pt" }}
        >
          <div className="flex justify-between items-baseline">
            <span className="font-bold uppercase tracking-wider text-[7.5pt]">
              Subtotal (USD):
            </span>
            <span className="font-mono font-bold">
              {price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="font-bold uppercase tracking-wider text-[7.5pt]">
              VAT Amount (11%):
            </span>
            <span className="font-mono font-bold">
              {vatAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <ThermalDivider dashed={false} />

        <div
          className="px-1 py-1 flex justify-between font-extrabold text-black"
          style={{ fontSize: "10pt" }}
        >
          <span className="uppercase tracking-tight">
            TOTAL (USD incl. VAT):
          </span>
          <span className="font-mono">
            ${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </div>

        <ThermalDivider dashed={false} />

        <div
          className="text-center border-2 border-black py-1.5 my-1.5 bg-white text-black font-extrabold tracking-widest rounded-sm"
          style={{ fontSize: "11pt" }}
        >
          ✓ PAYMENT CONFIRMED
        </div>

        <ThermalDivider dashed={false} />

        <div className="flex flex-col items-center justify-center p-2 text-center bg-white border border-black rounded-sm my-2">
          <p
            className="text-black font-extrabold uppercase tracking-wider mb-1.5"
            style={{ fontSize: "8pt" }}
          >
            Scan to track your repair
          </p>
          <div className="w-[30mm] h-[30mm] bg-white p-1 flex items-center justify-center border border-black">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(trackingUrl)}&ecc=M`}
              alt="Live Status Tracking QR Link"
              className="w-full h-full object-contain mix-blend-multiply"
            />
          </div>
          <p
            className="text-black font-mono font-bold mt-1.5 tracking-tight"
            style={{ fontSize: "6.5pt" }}
          >
            cygnus-lb.com/track-repair
          </p>
        </div>

        <ThermalDivider />

        <div
          className="text-center px-1 py-1 space-y-1 text-black leading-tight"
          style={{ fontSize: "7.5pt" }}
        >
          <p className="font-bold uppercase tracking-wide">
            Thank you for your business
          </p>
          <p className="font-medium">
            This document is officially audit-ready and certified for standard
            accounting file declarations.
          </p>
        </div>

        <ThermalDivider dashed={false} />

        <p
          className="text-center font-bold font-mono pb-1 text-black"
          style={{ fontSize: "6.5pt" }}
        >
          {COMPANY.name} · {COMPANY.mof} · {shortDate()}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// D. Standard Receipt
// ============================================================

function StandardReceiptDocument({ repair }: { repair: RepairRecord | null }) {
  const repairId = repair?.repair_id || "REP-2026-1";
  const customer = repair?.customer_name || "—";
  const phone = repair?.phone || "—";
  const device = `${repair?.brand || ""} ${repair?.model || ""}`.trim() || "—";
  const serial = repair?.serial || "—";
  const problem = repair?.problem || "Diagnostic & Repair";
  const tech = repair?.technician || "—";
  const price = repair?.price || 0;

  const trackingUrl = `https://cygnus-lb.com/track-repair/?id=${encodeURIComponent(repairId)}`;

  return (
    <div className="flex justify-center py-4 print:py-0 print:block">
      <div
        className="bg-white p-2 shadow-xl print:shadow-none box-border text-black mx-auto print:mx-0"
        style={{ width: "80mm", fontFamily: "monospace" }}
      >
        <div className="text-center pt-2 pb-1 px-1">
          <p
            className="font-bold uppercase tracking-tight text-black"
            style={{ fontSize: "12pt" }}
          >
            {COMPANY.name}
          </p>
          <p className="text-black font-medium" style={{ fontSize: "7.5pt" }}>
            {COMPANY.tagline}
          </p>
          <p
            className="text-black font-mono mt-0.5"
            style={{ fontSize: "7.5pt" }}
          >
            Tel: {COMPANY.phone}
          </p>
        </div>

        <ThermalDivider dashed={false} />

        <div className="text-center py-0.5">
          <p
            className="font-bold text-black tracking-widest uppercase"
            style={{ fontSize: "9.5pt" }}
          >
            REPAIR RECEIPT
          </p>
          <p
            className="text-black font-medium uppercase mt-0.5"
            style={{ fontSize: "6.5pt", letterSpacing: "0.05em" }}
          >
            Customer Settlement Copy
          </p>
        </div>

        <ThermalDivider dashed={false} />

        <div className="text-center py-1">
          <p
            className="text-black font-bold uppercase tracking-wider"
            style={{ fontSize: "7pt" }}
          >
            RECEIPT TICKET ID
          </p>
          <p
            className="font-mono font-bold text-black my-1"
            style={{ fontSize: "15pt", letterSpacing: "0.05em" }}
          >
            {repairId}
          </p>
          <div className="flex h-[11mm] w-full items-center justify-center px-2 my-1">
            <Code128Visual value={repairId} />
          </div>
        </div>

        <ThermalDivider />

        <div
          className="px-1 py-1 space-y-1 text-black"
          style={{ fontSize: "8.5pt" }}
        >
          <div className="flex justify-between items-baseline">
            <span className="font-bold uppercase tracking-wider text-[7.5pt]">
              Date/Time:
            </span>
            <span className="font-mono font-bold">{now12h()}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="font-bold uppercase tracking-wider text-[7.5pt]">
              Receipt Ref:
            </span>
            <span className="font-mono font-bold">{repairId}</span>
          </div>
        </div>

        <ThermalSection title="Customer Details" />

        <div
          className="px-1 py-1 space-y-1 text-black"
          style={{ fontSize: "8.5pt" }}
        >
          <div className="flex justify-between items-baseline">
            <span className="font-bold uppercase tracking-wider text-[7.5pt]">
              Name:
            </span>
            <span className="font-bold truncate max-w-[65%] text-right">
              {customer}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="font-bold uppercase tracking-wider text-[7.5pt]">
              Phone:
            </span>
            <span className="font-mono font-bold">{phone}</span>
          </div>
        </div>

        <ThermalSection title="Hardware & Services" />

        <div
          className="px-1 py-1 space-y-1 text-black"
          style={{ fontSize: "8.5pt" }}
        >
          <div className="flex justify-between items-baseline">
            <span className="font-bold uppercase tracking-wider text-[7.5pt]">
              Device:
            </span>
            <span className="font-bold truncate max-w-[70%] text-right">
              {device}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="font-bold uppercase tracking-wider text-[7.5pt]">
              S/N / IMEI:
            </span>
            <span className="font-mono font-bold truncate max-w-[65%] text-right">
              {serial}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="font-bold uppercase tracking-wider text-[7.5pt]">
              Service:
            </span>
            <span className="font-medium truncate max-w-[65%] text-right">
              {problem}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="font-bold uppercase tracking-wider text-[7.5pt]">
              Technician:
            </span>
            <span className="font-medium text-right">{tech}</span>
          </div>
        </div>

        <ThermalDivider dashed={false} />

        <div
          className="px-1 py-1 flex justify-between font-extrabold text-black"
          style={{ fontSize: "10.5pt" }}
        >
          <span className="uppercase tracking-tight">TOTAL PAID (USD):</span>
          <span className="font-mono">
            ${price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </div>

        <ThermalDivider dashed={false} />

        <div
          className="text-center border-2 border-black py-1.5 my-1.5 bg-white text-black font-extrabold tracking-widest rounded-sm"
          style={{ fontSize: "11pt" }}
        >
          ✓ PAYMENT CONFIRMED
        </div>

        <ThermalDivider dashed={false} />

        <div className="flex flex-col items-center justify-center p-2 text-center bg-white border border-black rounded-sm my-2">
          <p
            className="text-black font-extrabold uppercase tracking-wider mb-1.5"
            style={{ fontSize: "8pt" }}
          >
            Scan to track your repair
          </p>
          <div className="w-[30mm] h-[30mm] bg-white p-1 flex items-center justify-center border border-black">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(trackingUrl)}&ecc=M`}
              alt="Live Status Tracking QR Link"
              className="w-full h-full object-contain mix-blend-multiply"
            />
          </div>
          <p
            className="text-black font-mono font-bold mt-1.5 tracking-tight"
            style={{ fontSize: "6.5pt" }}
          >
            cygnus-lb.com/track-repair
          </p>
        </div>

        <ThermalDivider />

        <div
          className="text-center px-1 py-1 space-y-1 text-black leading-tight"
          style={{ fontSize: "7.5pt" }}
        >
          <p className="font-bold uppercase tracking-wide">
            Thank you for your trust!
          </p>
          <p className="font-medium">
            Warranty: <span className="font-bold">{WARRANTY_DAYS} Days</span> on
            parts &amp; specific labour faults.
          </p>
          <p className="text-[7pt] text-gray-700 italic">
            Void if structural tampering, liquid damage, or physical impact is
            detected.
          </p>
        </div>

        <ThermalDivider dashed={false} />

        <p
          className="text-center font-bold font-mono pb-1 text-black"
          style={{ fontSize: "6.5pt" }}
        >
          {COMPANY.name} · System Print: {shortDate()}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// E. Final Invoice — A4
// ============================================================

function InvoiceDocument({ repair }: { repair: RepairRecord | null }) {
  const docNum = repair?.repair_id || "REP-2026-1";
  const customer = repair?.customer_name || "Walk-in Customer";
  const phone = repair?.phone || "—";
  const address = repair?.address || "—";
  const email = repair?.email || "—";
  const device = `${repair?.brand || ""} ${repair?.model || ""}`.trim() || "—";
  const serial = repair?.serial || "—";
  const problem = repair?.problem || "Diagnostic & Repair";
  const notes = repair?.technician_notes || "";
  const tech = repair?.technician || "—";
  const status = repair?.status || "—";
  const price = repair?.price || 0;
  const vatAmt = price * VAT_RATE;
  const grandTotal = price + vatAmt;
  const dateIn = repair?.date_in
    ? new Date(repair.date_in).toLocaleDateString("en-GB")
    : shortDate();

  return (
    <div
      className="document-invoice mx-auto bg-white shadow-xl print:shadow-none"
      style={{ maxWidth: "210mm", minHeight: "297mm", padding: "14mm" }}
    >
      <div
        className="flex items-start justify-between pb-6"
        style={{ borderBottom: "2px solid #1a1a1a" }}
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-600 text-white">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {COMPANY.name}
              </h1>
              <p className="text-xs text-gray-500">{COMPANY.tagline}</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 max-w-xs mt-2">
            {COMPANY.address}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">Tel: {COMPANY.phone}</p>
          <p className="text-xs text-gray-700 font-medium mt-0.5">
            MOF: {COMPANY.mof}
          </p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
          <p className="text-xs text-gray-500 mt-2">
            Invoice #:{" "}
            <span className="font-mono font-semibold text-gray-800">
              {docNum}
            </span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Date Issued: {shortDate()}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Date In: {dateIn}</p>
          <span
            className={`inline-block mt-2 rounded-full px-3 py-0.5 text-xs font-semibold ${
              status === "Completed"
                ? "bg-emerald-100 text-emerald-700"
                : status === "Ready"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-gray-100 text-gray-600"
            }`}
          >
            {status}
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-8">
        <div>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Bill To
          </h3>
          <p className="text-sm font-semibold text-gray-900">{customer}</p>
          <p className="text-xs text-gray-600 mt-0.5">{phone}</p>
          {address !== "—" && (
            <p className="text-xs text-gray-600 mt-0.5">{address}</p>
          )}
          {email !== "—" && (
            <p className="text-xs text-gray-600 mt-0.5">{email}</p>
          )}
        </div>
        <div>
          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            Device
          </h3>
          <p className="text-sm font-semibold text-gray-900">{device}</p>
          <p className="text-xs text-gray-600 mt-0.5">
            Serial / IMEI: <span className="font-mono">{serial}</span>
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            Technician:{" "}
            <span className="font-medium text-gray-800">{tech}</span>
          </p>
        </div>
      </div>

      <table
        className="mt-6 w-full border-collapse"
        style={{ fontSize: "11px" }}
      >
        <thead>
          <tr style={{ borderBottom: "2px solid #d1d5db" }}>
            <th className="py-2 px-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide">
              Description
            </th>
            <th className="py-2 px-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide">
              Device
            </th>
            <th className="py-2 px-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide">
              Serial
            </th>
            <th className="py-2 px-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide">
              Work Performed
            </th>
            <th className="py-2 px-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wide">
              Amount (USD)
            </th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
            <td className="py-3 px-3 text-gray-700">
              {device} — Repair Service
            </td>
            <td className="py-3 px-3 text-gray-700">{device}</td>
            <td className="py-3 px-3 text-gray-700 font-mono text-[10px]">
              {serial}
            </td>
            <td className="py-3 px-3 text-gray-700">{problem}</td>
            <td className="py-3 px-3 text-gray-900 font-semibold text-right">
              {price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </td>
          </tr>
          {notes && (
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td
                colSpan={5}
                className="py-2 px-3 text-gray-500 italic text-[10px]"
              >
                Technician notes: {notes}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-56 space-y-2" style={{ fontSize: "12px" }}>
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span className="font-medium text-gray-900">
              {price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>VAT (11%)</span>
            <span className="font-medium text-gray-900">
              {vatAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div
            className="flex justify-between pt-2 font-bold text-gray-900"
            style={{ borderTop: "2px solid #1a1a1a", fontSize: "13px" }}
          >
            <span>Grand Total (USD)</span>
            <span>
              {grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      <div
        className="mt-8 rounded-lg bg-gray-50 px-4 py-3"
        style={{ border: "1px solid #e5e7eb", fontSize: "10px" }}
      >
        <p className="font-bold text-gray-700 mb-1 uppercase tracking-wide">
          Warranty Terms
        </p>
        <p className="text-gray-600">
          This repair is covered by a{" "}
          <strong>{WARRANTY_DAYS}-day warranty</strong> on parts and labour from
          the date of delivery. Warranty is void if the device is tampered with,
          subjected to liquid damage, or physical impact after delivery. Contact
          us within the warranty period for any recurring fault.
        </p>
      </div>

      <div className="mt-10 flex justify-between">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">
            Authorised Signature
          </p>
          <div
            className="mt-8 border-t border-gray-300"
            style={{ width: "48mm" }}
          />
          <p className="text-[10px] text-gray-500 mt-1">
            {COMPANY.name} · {shortDate()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">
            Customer Signature
          </p>
          <div
            className="mt-8 border-t border-gray-300"
            style={{ width: "48mm" }}
          />
          <p className="text-[10px] text-gray-500 mt-1">
            {customer} · {shortDate()}
          </p>
        </div>
      </div>

      <p
        className="mt-8 text-center text-[9px] text-gray-400"
        style={{ borderTop: "1px solid #e5e7eb", paddingTop: "8px" }}
      >
        Thank you for choosing {COMPANY.name}. This invoice was generated
        electronically — {COMPANY.mof}.
      </p>
    </div>
  );
}