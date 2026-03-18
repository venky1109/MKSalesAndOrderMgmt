import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import html2canvas from "html2canvas";
import WhatsAppShare from "./WhatsAppShare";

const InvoiceShareModal = ({
  open,
  onClose,
  order,
  phone,
  title = "Invoice Preview",
}) => {
  const receiptRef = useRef(null);
  const waRef = useRef(null);

  const [invoiceImgUrl, setInvoiceImgUrl] = useState(null);
  const [pendingCapture, setPendingCapture] = useState(false);
  const [printWidth, setPrintWidth] = useState(352);

  const money = (n) => `₹ ${(Number(n || 0)).toFixed(2)}`;

  useEffect(() => {
    if (open && order) {
      setInvoiceImgUrl(null);
      setPendingCapture(true);
    }
  }, [open, order]);

  useEffect(() => {
    const doCapture = async () => {
      if (!pendingCapture || !receiptRef.current) return;

      try {
        await new Promise((r) => requestAnimationFrame(r));
        await new Promise((r) => setTimeout(r, 40));

        const canvas = await html2canvas(receiptRef.current, {
          scale: 2,
          backgroundColor: "#fff",
          useCORS: true,
          logging: false,
        });

        const dataUrl = canvas.toDataURL("image/png");
        setInvoiceImgUrl(dataUrl);
      } catch (e) {
        console.error("html2canvas failed", e);
        alert("Failed to generate invoice preview.");
      } finally {
        setPendingCapture(false);
      }
    };

    doCapture();
  }, [pendingCapture]);

  const printImageAtWidth = (imgUrl, widthPx = 352) => {
    if (!imgUrl) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Print Invoice</title>
          <style>
            html, body { margin: 0; padding: 0; }
            .wrap { width: ${widthPx}px; margin: 0 auto; }
            img { width: ${widthPx}px; height: auto; display: block; image-rendering: -webkit-optimize-contrast; }
            @media print {
              @page { size: auto; margin: 0; }
              html, body { margin: 0; padding: 0; }
              .wrap { width: ${widthPx}px; }
              img { width: ${widthPx}px; height: auto; display: block; }
            }
          </style>
        </head>
        <body>
          <div class="wrap">
            <img id="receipt-img" src="${imgUrl}" alt="Invoice" />
          </div>
          <script>
            (function() {
              const img = document.getElementById('receipt-img');
              function doPrint() {
                try { window.focus(); window.print(); } catch(e) {}
                setTimeout(() => { window.close && window.close(); }, 300);
              }
              if (img.complete) doPrint();
              else { img.onload = doPrint; img.onerror = doPrint; }
            })();
          </script>
        </body>
      </html>
    `;

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch {}
    }, 5000);
  };

  const handleShareWhatsApp = () => {
    if (!waRef.current || !invoiceImgUrl) {
      alert("❌ Invoice image not ready yet.");
      return;
    }
    waRef.current.sendImage(order, phone, invoiceImgUrl);
  };

  if (!open || !order) return null;

  const items = order.items || order.orderItems || [];
  const totalQty =
    order.totalQty ??
    items.reduce((sum, item) => sum + Number(item.qty || 0), 0);

  const total = order.total ?? order.totalPrice ?? 0;
  const totalDiscount = order.totalDiscount ?? 0;
  const cashGiven = order.cashGiven ?? 0;
  const change = order.change ?? 0;
  const orderId = order._id || order.id || order.orderId || "--";

  const dt = order.datetime || order.createdAt || new Date().toISOString();
  const formattedDate = new Date(dt).toLocaleDateString();
  const formattedTime = new Date(dt).toLocaleTimeString();

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

            {!invoiceImgUrl ? (
              <div>Generating...</div>
            ) : (
              <img
                src={invoiceImgUrl}
                alt="Invoice"
                style={{ width: "100%", height: "auto", border: "1px solid #eee" }}
              />
            )}

            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, opacity: 0.8 }}>Printer profile:&nbsp;</label>
              <select
                value={printWidth}
                onChange={(e) => setPrintWidth(Number(e.target.value))}
                style={{ padding: 6 }}
              >
                <option value={352}>58 mm SAFE (352 px)</option>
                <option value={384}>58 mm Exact (384 px)</option>
                <option value={576}>80 mm Receipt (576 px)</option>
                <option value={812}>TSC TE244 4" Label (812 px)</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button onClick={() => printImageAtWidth(invoiceImgUrl, printWidth)} disabled={!invoiceImgUrl}>
                Print
              </button>

              <button onClick={handleShareWhatsApp} disabled={!invoiceImgUrl}>
                Share WhatsApp
              </button>

              <a href={invoiceImgUrl || "#"} download={`invoice-${orderId}.png`}>
                <button disabled={!invoiceImgUrl}>Download PNG</button>
              </a>

              <button onClick={onClose}>Close</button>
            </div>

            <div style={{ fontSize: 12, marginTop: 8, opacity: 0.7 }}>
              Tip: In browser print dialog set <b>Margins: None</b>, <b>Scale: 100</b>,
              and disable headers & footers.
            </div>
          </div>
        </div>,
        document.body
      )}

      <div
        ref={receiptRef}
        style={{
          width: "56mm",
          padding: "3mm 3mm 7mm",
          background: "#fff",
          color: "#000",
          fontFamily: 'Menlo, Consolas, "Courier New", monospace',
          fontSize: "14px",
          lineHeight: 1.32,
          letterSpacing: "0.1px",
          position: "fixed",
          left: -10000,
          top: 0,
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
        aria-hidden="true"
      >
        <div style={{ textAlign: "center", marginBottom: "3mm" }}>
          <div style={{ fontWeight: "bold" }}>
            {process.env.REACT_APP_SHOP_NAME || "MANAKIRANA"}
          </div>
          <div>{process.env.REACT_APP_SHOP_ADDRESS_LINE1 || "Gollavilli"}</div>
          {process.env.REACT_APP_SHOP_PHONE && (
            <div>Phone: {process.env.REACT_APP_SHOP_PHONE}</div>
          )}
        </div>

        <div style={{ borderTop: "1px dashed #000", margin: "1mm 0" }} />
        <div>Order ID: {orderId}</div>
        <div>Bill To: {phone || order.phone || "--"}</div>
        <div>Date: {formattedDate} {formattedTime}</div>
        <div>Payment: {order.paymentMethod || "--"}</div>
        <div style={{ borderTop: "1px dashed #000", margin: "1mm 0" }} />

        {items.map((it, idx) => {
          const name = (it.item || it.name || "").replace(/\s*\([^)]*\)/g, "").trim();
          const price = Number(it.dprice || it.price || 0);
          const qty = Number(it.qty || 0);
          const lineTotal = qty * price;

          return (
            <div key={idx} style={{ marginBottom: "2px" }}>
              <div>{name}</div>
              <div style={{ fontSize: "12px", display: "flex", justifyContent: "space-between" }}>
                <span>
                  {qty} x {money(price)}{" "}
                  {it.catalogQuantity || it.quantity ? `(${it.catalogQuantity || it.quantity} ${it.units || ""})` : ""}
                </span>
                <span>{money(lineTotal)}</span>
              </div>
            </div>
          );
        })}

        <div style={{ borderTop: "1px dashed #000", margin: "1mm 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <strong>Total Qty</strong>
          <strong>{Number(totalQty).toFixed(2)}</strong>
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
        <div style={{ textAlign: "center" }}>Thank you! Visit again</div>
      </div>

      <WhatsAppShare ref={waRef} />
    </>
  );
};

export default InvoiceShareModal;