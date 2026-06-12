import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import WhatsAppShare, { buildOrderText } from "./WhatsAppShare";
import {
  getInvoicePrinterSettings,
  getPrinterProfile,
} from "../utils/printerConfig";
import { printHtmlInHiddenFrame } from "../utils/printFrame";

const InvoiceShareModal = ({
  open,
  onClose,
  order,
  phone,
  title = "Invoice Preview",
}) => {
  const receiptRef = useRef(null);
  const waRef = useRef(null);

  const [printerSettings, setPrinterSettings] = useState(() =>
    getInvoicePrinterSettings()
  );

  const money = (n) => `₹ ${Number(n || 0).toFixed(2)}`;

const cleanInvoiceItems = (items = []) =>
  items.map((it) => {
    const cleanName = (it.item || it.name || "")
      .replace(/\s*\([^)]*\)/g, "")
      .trim();

    const weight = it.weight;

   const finalName = weight
  ? `${cleanName} ${weight}`.trim()
  : cleanName;

    const price = Number(it.pricePerQty || it.dprice || it.price || 0);
    const qty = Number(it.qty || 0);

    return {
      ...it,
      item: finalName,
      name: finalName,
      weight,
      price,
      dprice: price,
      pricePerQty: price,
      qty,
      total: qty * price,
    };
  });
  useEffect(() => {
    if (open && order) {
      setPrinterSettings(getInvoicePrinterSettings());
    }
  }, [open, order]);

  const printReceipt = () => {
    if (!receiptRef.current) return;
    const profile = getPrinterProfile(printerSettings.profileId);
    const pageWidthCss =
      profile.imageWidth === "100%" ? "100%" : `${profile.imageWidth}`;
    const pageSizeCss = profile.pageSize || "auto";
    const receiptHtml = receiptRef.current.outerHTML;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Print Invoice</title>
          <style>
            @page { size: ${pageSizeCss}; margin: 0; }

            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: ${pageWidthCss} !important;
              min-width: ${pageWidthCss} !important;
              max-width: ${pageWidthCss} !important;
              background: #fff;
              overflow: hidden;
            }

            * { box-sizing: border-box; }

            .receipt {
              width: ${pageWidthCss} !important;
              max-width: ${pageWidthCss} !important;
              min-width: ${pageWidthCss} !important;
              padding: 2mm 2mm 0.5mm 2mm !important;
              margin: 0 !important;
              background: #fff !important;
              color: #000 !important;
              font-family: Menlo, Consolas, "Courier New", monospace !important;
              font-size: 11px !important;
              line-height: 1.35 !important;
              box-sizing: border-box !important;
              white-space: normal !important;
              overflow-wrap: break-word !important;
              word-break: break-word !important;
            }
          </style>
        </head>
        <body>
          ${receiptHtml}

          <script>
            (function () {
              setTimeout(function () {
                try {
                  window.focus();
                  window.print();
                } catch (e) {}
              }, 120);
            })();
          </script>
        </body>
      </html>
    `;

    printHtmlInHiddenFrame(html);
  };

  const getCleanedOrder = () => {
    const originalItems = order.items || order.orderItems || [];
    const cleanedItems = cleanInvoiceItems(originalItems);

    return {
      ...order,
      items: cleanedItems,
      orderItems: cleanedItems,
    };
  };

  const handleShareWhatsApp = () => {
    if (!waRef.current) {
      return;
    }

    waRef.current.sendText(getCleanedOrder(), phone);
  };

  const handleDownloadInvoice = () => {
    const text = buildOrderText(getCleanedOrder());
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice-${orderId}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (!open || !order) return null;

  const items = cleanInvoiceItems(order.items || order.orderItems || []);
  const printerProfile = getPrinterProfile(printerSettings.profileId);

  const totalQty =
    order.totalQty ?? items.reduce((sum, item) => sum + Number(item.qty || 0), 0);

  const total = order.total ?? order.totalPrice ?? 0;
  const totalDiscount = order.totalDiscount ?? 0;
  const cashGiven = order.cashGiven ?? 0;
  const change = order.change ?? 0;
  const orderId = order._id || order.id || order.orderId || "--";
  const paymentBreakdown = Array.isArray(order.paymentBreakdown)
    ? order.paymentBreakdown
    : [];

  const dt = order.datetime || order.createdAt || new Date().toISOString();
  const formattedDate = new Date(dt).toLocaleDateString();
  const formattedTime = new Date(dt).toLocaleTimeString();
  const receiptStyle = {
    width: printerProfile.captureWidth,
    maxWidth: "100%",
    padding: "2mm 2mm 0.5mm 2mm",
    margin: "0 auto",
    background: "#fff",
    color: "#000",
    fontFamily: 'Menlo, Consolas, "Courier New", monospace',
    fontSize: "11px",
    lineHeight: 1.35,
    boxSizing: "border-box",
    whiteSpace: "normal",
    overflowWrap: "break-word",
    wordBreak: "break-word",
    border: "1px solid #eee",
  };
  const receiptContent = (
    <>
      <div style={{ textAlign: "center", marginBottom: "2mm" }}>
        <div style={{ fontWeight: "bold", fontSize: "12px" }}>
          {process.env.REACT_APP_SHOP_NAME || "MANAKIRANA"}
        </div>
        <div>{process.env.REACT_APP_SHOP_ADDRESS_LINE1 || "Gollavilli"}</div>
        {process.env.REACT_APP_SHOP_PHONE && (
          <div>Phone: {process.env.REACT_APP_SHOP_PHONE}</div>
        )}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "1.5mm 0" }} />

      <div>Order ID: {orderId}</div>
      <div>Bill To: {phone || order.phone || "--"}</div>
      <div>
        Date: {formattedDate} {formattedTime}
      </div>
      <div>Payment: {order.paymentMethod || "--"}</div>
      {paymentBreakdown.length > 0 && (
        <div>
          {paymentBreakdown.map((payment, index) => (
            <div
              key={`${payment.channel || "payment"}-${index}`}
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <span>{payment.channel || "Payment"}</span>
              <span>{money(payment.amount)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: "1px dashed #000", margin: "1.5mm 0" }} />

      {items.map((it, idx) => {
        const price = Number(it.pricePerQty || 0);
        const qty = Number(it.qty || 0);
        const lineTotal = qty * price;

        return (
          <div key={idx} style={{ marginBottom: "3px" }}>
            <div style={{ fontWeight: 600 }}>
              {it.name}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                fontSize: "10px",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                {qty} x {money(price)}
              </div>

              <div style={{ whiteSpace: "nowrap" }}>{money(lineTotal)}</div>
            </div>
          </div>
        );
      })}

      <div style={{ borderTop: "1px dashed #000", margin: "1.5mm 0" }} />

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>Total Qty</strong>
        <strong>{Number(totalQty).toFixed(0)}</strong>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>Total Discount</div>
        <div>{money(totalDiscount)}</div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>Total</strong>
        <strong>{money(total)}</strong>
      </div>

      {order.paymentMethod === "Cash" && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>Cash Given</div>
            <div>{money(cashGiven)}</div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>Change</div>
            <div>{money(change)}</div>
          </div>
        </>
      )}

      <div style={{ borderTop: "1px dashed #000", margin: "1mm 0" }} />

      <div
        style={{
          textAlign: "center",
          marginBottom: "1mm",
          fontWeight: 600,
        }}
      >
        Thank you! Visit again
      </div>
    </>
  );

  return (
    <>
      {createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2147483647,
            padding: 16,
            overflowY: "auto",
          }}
          onClick={onClose}
        >
          <div
            style={{
              background: "#fff",
              padding: 16,
              borderRadius: 12,
              maxWidth: 480,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow:
                "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>{title}</h3>

            <div
              style={{
                maxHeight: "58vh",
                overflowY: "auto",
                border: "1px solid #eee",
                background: "#fafafa",
                padding: 8,
              }}
            >
              <div ref={receiptRef} className="receipt" style={receiptStyle}>
                {receiptContent}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 12,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={printReceipt}
              >
                Print
              </button>

              <button onClick={handleShareWhatsApp}>
                Share WhatsApp
              </button>

              <button onClick={handleDownloadInvoice}>
                Download
              </button>

              <button onClick={onClose}>Close</button>
            </div>

            <div style={{ fontSize: 12, marginTop: 8, opacity: 0.75 }}>
              Printer: {printerSettings.printerName || "Choose in print dialog"}.
              Paper: {printerProfile.label}. Keep margins none, scale 100%,
              headers and footers off.
            </div>
          </div>
        </div>,
        document.body
      )}

      <WhatsAppShare ref={waRef} />
    </>
  );
};

export default InvoiceShareModal;
