import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import html2canvas from "html2canvas";
import WhatsAppShare from "../components/WhatsAppShare";

const PaymentInvoiceSharePage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const orderId = params.get("orderId");
  const amount = params.get("amount");

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const receiptRef = useRef(null);
  const waRef = useRef(null);

  const [invoiceImgUrl, setInvoiceImgUrl] = useState(null);
  const [pendingCapture, setPendingCapture] = useState(false);
  const [printWidth, setPrintWidth] = useState(270);

  const money = (n) => `₹ ${(Number(n || 0)).toFixed(2)}`;

  const fetchOrderDetails = useCallback(async () => {
    try {
      setLoading(true);

      // TODO: replace with your actual backend API
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || "Failed to fetch order");

      setOrder(data);
      setPendingCapture(true);
    } catch (err) {
      console.error(err);
      alert("Failed to load invoice details");
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [orderId, navigate]);

  useEffect(() => {
    if (orderId) fetchOrderDetails();
  }, [orderId, fetchOrderDetails]);

  useEffect(() => {
    const doCapture = async () => {
      if (!pendingCapture || !receiptRef.current) return;

      try {
        await new Promise((r) => requestAnimationFrame(r));
        await new Promise((r) => setTimeout(r, 30));

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
            img { width: ${widthPx}px; height: auto; display: block; }
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
      alert("Invoice image not ready yet.");
      return;
    }

    const phone = order?.user?.phone || order?.shippingAddress?.phone || "";
    waRef.current.sendImage(order, phone, invoiceImgUrl);
  };

  const handleClose = () => {
    navigate("/");
  };

  const items = order?.orderItems || [];
  const totalQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const formattedDate = order?.createdAt
    ? new Date(order.createdAt).toLocaleDateString()
    : new Date().toLocaleDateString();
  const formattedTime = order?.createdAt
    ? new Date(order.createdAt).toLocaleTimeString()
    : new Date().toLocaleTimeString();

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl">
          <h3 className="text-lg font-bold">Invoice Preview</h3>

          <div className="mt-3 rounded-lg border bg-gray-50 p-3">
            {loading ? (
              <div>Loading invoice...</div>
            ) : !invoiceImgUrl ? (
              <div>Generating...</div>
            ) : (
              <img
                src={invoiceImgUrl}
                alt="Invoice"
                className="w-full border border-gray-200"
              />
            )}
          </div>

          <div className="mt-3">
            <label className="text-xs text-gray-500">Printer profile: </label>
            <select
              value={printWidth}
              onChange={(e) => setPrintWidth(Number(e.target.value))}
              className="ml-2 rounded border px-2 py-1 text-sm"
            >
              <option value={352}>58 mm SAFE (352 px)</option>
              <option value={384}>58 mm Exact (384 px)</option>
              <option value={576}>80 mm Receipt (576 px)</option>
              <option value={812}>TSC TE244 4" Label (812 px)</option>
            </select>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => printImageAtWidth(invoiceImgUrl, printWidth)}
              disabled={!invoiceImgUrl}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Print
            </button>

            <button
              onClick={handleShareWhatsApp}
              disabled={!invoiceImgUrl}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Share WhatsApp
            </button>

            <a href={invoiceImgUrl || "#"} download={`invoice-${orderId}.png`}>
              <button
                disabled={!invoiceImgUrl}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Download PNG
              </button>
            </a>

            <button
              onClick={handleClose}
              className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Close
            </button>
          </div>

          <div className="mt-3 text-xs text-gray-500">
            Tip: Print dialog → More settings → Margins: None, Scale: 100, disable headers & footers.
          </div>
        </div>
      </div>

      {/* Hidden receipt for capture */}
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
        <div>Order ID: {orderId || "--"}</div>
        <div>Bill To: {order?.user?.phone || order?.shippingAddress?.phone || "--"}</div>
        <div>Date: {formattedDate} {formattedTime}</div>
        <div style={{ borderTop: "1px dashed #000", margin: "1mm 0" }} />

        {items.map((it, idx) => {
          const name = (it.name || "").replace(/\s*\([^)]*\)/g, "").trim();
          const lineTotal = Number(it.qty || 0) * Number(it.price || 0);

          return (
            <div key={idx} style={{ marginBottom: "2px" }}>
              <div>{name}</div>
              <div style={{ fontSize: "12px", display: "flex", justifyContent: "space-between" }}>
                <span>
                  {it.qty} x {money(it.price)} ({it.quantity} {it.units})
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
          <strong>Total</strong>
          <strong>{money(order?.totalPrice || amount || 0)}</strong>
        </div>
        <div style={{ borderTop: "1px dashed #000", margin: "1mm 0" }} />
        <div style={{ textAlign: "center" }}>Thank you! Visit again</div>
      </div>

      <WhatsAppShare ref={waRef} />
    </>
  );
};

export default PaymentInvoiceSharePage;