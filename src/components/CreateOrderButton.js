// 📁 src/components/CreateOrderButton.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLatestOrders, queueOrder } from '../features/orders/orderSlice';
import { clearCart } from '../features/cart/cartSlice';
import { fetchAllProducts } from '../features/products/productSlice';
import html2canvas from 'html2canvas';

import CashModal from './CashModal';
import PhoneModal from './PhoneModal';
// 👇 your WhatsApp share helper
import WhatsAppShare from './WhatsAppShare';

function CreateOrderButton() {
  const dispatch = useDispatch();

  // Store data
  const cartItems = useSelector((s) => s.cart.items || []);
  const total = useSelector((s) => s.cart.total || 0);
  const token = useSelector((s) => s.posUser.userInfo?.token);

  // Flow state
  const [orderCreated, setOrderCreated] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [pendingPhone, setPendingPhone] = useState(null);
  const [showCashModal, setShowCashModal] = useState(false);

  // Invoice preview/capture
  const receiptRef = useRef(null);
  const [invoiceImgUrl, setInvoiceImgUrl] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [lastFullOrder, setLastFullOrder] = useState(null);
  const [pendingCapture, setPendingCapture] = useState(false);

  // Printer profile selection (narrow default to avoid clipping)
  const [printWidth, setPrintWidth] = useState(352);

  // WhatsApp share ref
  const waRef = useRef(null);

  useEffect(() => {
    if (cartItems.length === 0) setOrderCreated(false);
  }, [cartItems.length]);

  const money = (n) => `₹ ${(Number(n || 0)).toFixed(2)}`;
  const now = new Date();
  const formattedDate = now.toLocaleDateString();
  const formattedTime = now.toLocaleTimeString();

  // Remove anything inside parentheses from item names
  const sanitizeName = (name) => (name || '').replace(/\s*\([^)]*\)/g, '').trim();

  // Ensure 10-digit Indian phone (use last 10 digits)
  const toPhone10 = (p) => String(p || '').replace(/\D/g, '').slice(-10);

  // Capture AFTER the receipt DOM is rendered with latest order
  useEffect(() => {
    const doCapture = async () => {
      if (!pendingCapture || !receiptRef.current) return;

      try {
        await new Promise((r) => requestAnimationFrame(r));
        await new Promise((r) => setTimeout(r, 30));

        const canvas = await html2canvas(receiptRef.current, {
          scale: 2,
          backgroundColor: '#fff',
          useCORS: true,
          logging: false,
        });

        const dataUrl = canvas.toDataURL('image/png');
        setInvoiceImgUrl(dataUrl);
        setShowInvoiceModal(true);
      } catch (e) {
        console.error('html2canvas failed', e);
        alert('Failed to generate invoice preview.');
      } finally {
        setPendingCapture(false);
      }
    };

    doCapture();
  }, [pendingCapture]);

  // Kickoff render-then-capture
  const createAndShowInvoice = useCallback((order) => {
    setLastFullOrder(order);
    setPendingCapture(true);
  }, []);

  // ---------- Reliable print (iframe-based) ----------
  const printImageAtWidth = (imgUrl, widthPx = 352) => {
    if (!imgUrl) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
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
      try { document.body.removeChild(iframe); } catch {}
    }, 5000);
  };

  const printCurrent = () => printImageAtWidth(invoiceImgUrl, printWidth);

  // ---------- WhatsApp share (uses your helper) ----------
  const handleShareWhatsApp = () => {
    const phone10 = toPhone10(lastFullOrder?.phone || pendingPhone);
    if (!phone10 || !waRef.current) {
      alert('❌ Missing/invalid customer phone.');
      return;
    }
    // text-only invoice share
    waRef.current.sendText(lastFullOrder, phone10);
  };

  // Order flow
  const handleCreateOrder = () => {
    if (orderCreated) return;

    if (cartItems.length === 0) {
      alert('🛒 Cart is empty. Please add items first.');
      return;
    }
    setShowPhoneModal(true);
  };

  const handlePhoneConfirm = (digits) => {
    setShowPhoneModal(false);
    setPendingPhone(digits);
    setShowCashModal(true);
  };

  const handleConfirmCash = async (cashGiven) => {
    setShowCashModal(false);

    const orderPayload = {
      shippingAddress: {
        street: 'Gollavelli',
        city: 'Amalapuram',
        postalCode: '533222',
        country: 'India',
      },
      paymentMethod: 'Cash',
      orderItems: cartItems.map((item) => ({
        name: item.item,
        quantity: item.catalogQuantity,
        units: item.units,
        brand: item.brand,
        qty: item.qty,
        image: item.image || '',
        price: item.dprice,
        productId: item.id,
        brandId: item.brandId,
        financialId: item.financialId,
      })),
      totalPrice: total,
    };

    try {
      const result = await dispatch(
        queueOrder({ payload: orderPayload, token, cartItems, phone: pendingPhone })
      ).unwrap();

      alert(`✅ Order queued for ${pendingPhone} with ID ${result._localId}`);

      const fullOrder = {
        id: result,
        items: cartItems,
        total: result.total || total,
        totalQty: result.totalQty || cartItems.reduce((s, i) => s + i.qty, 0),
        totalDiscount: result.totalDiscount || 0,
        cashGiven,
        change: cashGiven - total,
        datetime: new Date().toISOString(),
        phone: pendingPhone,
        paymentMethod: 'Cash',
      };

      createAndShowInvoice(fullOrder);

      dispatch(fetchLatestOrders());
      dispatch(clearCart());
      dispatch(fetchAllProducts(token));
      setOrderCreated(true);
      setPendingPhone(null);
    } catch (err) {
      alert('❌ Order failed: ' + err.message);
    }
  };

  // Modal via portal (centered)
  const modal = showInvoiceModal
    ? createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2147483647,
            padding: 16,
            overflowY: 'auto',
          }}
          onClick={() => setShowInvoiceModal(false)}
        >
          <div
            style={{
              background: '#fff',
              padding: 16,
              borderRadius: 8,
              maxWidth: 480,
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow:
                '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Invoice Preview</h3>

            {!invoiceImgUrl ? (
              <div>Generating...</div>
            ) : (
              <img
                src={invoiceImgUrl}
                alt="Invoice"
                style={{ width: '100%', height: 'auto', border: '1px solid #eee' }}
              />
            )}

            {/* Printer profile selector */}
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

            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button onClick={printCurrent} disabled={!invoiceImgUrl}>
                Print
              </button>
              <button
                onClick={handleShareWhatsApp}
                disabled={!lastFullOrder || !toPhone10(lastFullOrder?.phone || pendingPhone)}
              >
                Share WhatsApp
              </button>
              <a href={invoiceImgUrl || '#'} download="invoice.png">
                <button disabled={!invoiceImgUrl}>Download PNG</button>
              </a>
              <button onClick={() => setShowInvoiceModal(false)}>Close</button>
            </div>

            <div style={{ fontSize: 12, marginTop: 8, opacity: 0.7 }}>
              Tip: In the browser print dialog → More settings → set <b>Margins: None</b>,
              <b>Scale: 100</b>, and disable headers & footers.
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="grid">
      <button
        onClick={handleCreateOrder}
        className="h-10 p-3 inline-flex items-center justify-center rounded-lg bg-green-600 text-white font-medium shadow-sm
                   active:translate-y-[1px] active:shadow-inner transition-all hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        Cash
      </button>

      {/* Phone flow */}
      {showPhoneModal && (
        <PhoneModal onCancel={() => setShowPhoneModal(false)} onConfirm={handlePhoneConfirm} />
      )}

      {/* Cash modal */}
      {showCashModal && pendingPhone && (
        <CashModal total={total} onCancel={() => setShowCashModal(false)} onConfirm={handleConfirmCash} />
      )}

      {/* Hidden receipt for capture (off-screen) */}
      <div
        ref={receiptRef}
        style={{
          width: '56mm',
          padding: '3mm 3mm 7mm',
          background: '#fff',
          color: '#000',
          fontFamily: 'Menlo, Consolas, "Courier New", monospace',
          fontSize: '10px',
          lineHeight: 1.32,
          letterSpacing: '0.1px',
          position: 'fixed',
          left: -10000,
          top: 0,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
        }}
        aria-hidden="true"
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
          <div style={{ fontWeight: 'bold' }}>
            {process.env.REACT_APP_SHOP_NAME || 'MANAKIRANA'}
          </div>
          <div>{process.env.REACT_APP_SHOP_ADDRESS_LINE1 || 'Gollavilli'}</div>
          {process.env.REACT_APP_SHOP_PHONE && <div>Phone: {process.env.REACT_APP_SHOP_PHONE}</div>}
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />
        <div>Bill To: {lastFullOrder?.phone || pendingPhone || '--'}</div>
        <div>Date: {formattedDate} {formattedTime}</div>
        <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />

        {/* Items */}
        {lastFullOrder?.items?.map((it, idx) => {
          const name = sanitizeName(it.item);
          const lineTotal = Number(it.qty || 0) * Number(it.dprice || it.price || 0);
          return (
            <div key={idx} style={{ marginBottom: '2px' }}>
              <div>{name}</div>
              <div style={{ fontSize: '9.5px', display: 'flex', justifyContent: 'space-between' }}>
                <span>
                  {it.qty} x {money(it.dprice || it.price)} ({it.catalogQuantity} {it.units})
                </span>
                <span>{money(lineTotal)}</span>
              </div>
            </div>
          );
        })}

        <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <strong>Total Qty</strong>
          <strong>{(lastFullOrder?.totalQty || 0).toFixed(2)}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>Total Discount</div>
          <div>{money(lastFullOrder?.totalDiscount || 0)}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <strong>Total</strong>
          <strong>{money(lastFullOrder?.total || total)}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>Cash Given</div>
          <div>{money(lastFullOrder?.cashGiven || 0)}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>Change</div>
          <div>{money(lastFullOrder?.change || 0)}</div>
        </div>

        <div style={{ borderTop: '1px dashed #000', margin: '2mm 0' }} />
        <div style={{ textAlign: 'center' }}>Thank you! Visit again</div>
      </div>

      {/* Mount your WhatsApp helper (no UI) */}
      <WhatsAppShare ref={waRef} />

      {/* Modal portal */}
      {modal}
    </div>
  );
}

export default CreateOrderButton;
