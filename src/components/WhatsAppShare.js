// src/components/WhatsAppShare.js
import  { forwardRef, useImperativeHandle } from 'react';

/** Build a neat text-only invoice message */
// 📌 Put this function near the top of WhatsAppShare.js (before forwardRef)
function buildOrderText(order) {
  // --- Shop info (clean + deduped labels) ---
  const shopName = (process.env.REACT_APP_SHOP_NAME || 'MANAKIRANA').trim();

  const addr1 = (process.env.REACT_APP_SHOP_ADDRESS_LINE1 || 'Uppalaguptham').trim();
  const addr2 = (process.env.REACT_APP_SHOP_ADDRESS_LINE2 || 'Konaseema').trim();

  // Ensure we don’t double-prefix “GST” or “GSTIN”
  const rawGst = (process.env.REACT_APP_SHOP_GST || 'GSTIN123456780').trim();
  const gst = rawGst.replace(/^(\s*GST\s*Number\s*:\s*|\s*GSTIN\s*:\s*)/i, '').trim();

  // Multiple phones allowed; format and join with " | "
  const phones = (process.env.REACT_APP_SHOP_PHONE || '8121774325, 08856-297898')
    .split(',')
    .map(n => n.trim())
    .filter(Boolean)
    .join(' | ');

  // --- Order meta ---
  const id = order?.order_number || order?.id || '';
  const dt = new Date(order?.datetime || Date.now());
  const date = dt.toLocaleDateString();
  const time = dt.toLocaleTimeString();

  // --- Items (compact, readable) ---
  const items = (order?.items || []).map((it, i) => {
    const name = (it.item || it.name || '').toString();
    const qty = it.catalogQuantity ?? it.quantity ?? it.qty ?? 0;
    const price = Number(it.dprice ?? it.price ?? 0);
    const disc = Number(it.discount ?? 0);
    const lineTotal = Number(
      it.subtotal ??
      (price * qty * (1 - disc / 100))
    );
    return `${i + 1}) ${name}
   Qty: ${qty} @ ₹${price.toFixed(2)}  •  Disc: ${disc}%  •  Line: ₹${lineTotal.toFixed(2)}`;
  });

  const totals = [
    `Total Qty: ${Number(order?.totalQty ?? 0).toFixed(2)}`,
    `Total Discount: ₹${Number(order?.totalDiscount ?? 0).toFixed(2)}`,
    `Grand Total: ₹${Number(order?.total ?? order?.totalPrice ?? 0).toFixed(2)}`
  ];

  // Optional payment snippet (if you provided these in order)
  const paymentBits = [];
  if (order?.paymentMethod) paymentBits.push(`Payment: ${order.paymentMethod}`);
  if (typeof order?.cashGiven === 'number') paymentBits.push(`Cash Given: ₹${order.cashGiven.toFixed(2)}`);
  if (typeof order?.change === 'number') paymentBits.push(`Change: ₹${order.change.toFixed(2)}`);

  // Assemble nicely
  return [
    `🧾 *${shopName}*`,
    `📍 ${addr1}${addr2 ? ', ' + addr2 : ''}`,
    `🧪 GSTIN: ${gst}`,
    `📞 ${phones}`,
    ``,
    `*Your order details*`,
    `Invoice #: ${id}`,
    `Date: ${date}   Time: ${time}`,
    ``,
    ...items,
    ``,
    ...totals,
    ...(paymentBits.length ? [''] : []),
    ...paymentBits,
    ``,
    `🙏 Thank you for shopping with us!`
  ].join('\n');
}


/** Open WhatsApp with text (prefer app deeplink on mobile, fallback to web) */
function openWhatsappWithText(phone10, text) {
  if (!/^\d{10}$/.test(String(phone10))) {
    alert('❌ Customer phone number is missing or invalid.');
    return;
  }

  const encoded = encodeURIComponent(text);
  const appUrl = `whatsapp://send?phone=91${phone10}&text=${encoded}`;
  const webApi = `https://api.whatsapp.com/send?phone=91${phone10}&text=${encoded}`;
  const waMe  = `https://wa.me/91${phone10}?text=${encoded}`;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    const fallback = setTimeout(() => {
      window.location.href = webApi;
      setTimeout(() => { window.location.href = waMe; }, 800);
    }, 1200);

    window.location.href = appUrl;

    const clear = () => { clearTimeout(fallback); document.removeEventListener('visibilitychange', clear); };
    document.addEventListener('visibilitychange', clear);
  } else {
    window.open(waMe, '_blank');
  }
}

const WhatsAppShare = forwardRef(function WhatsAppShare(_, ref) {
  useImperativeHandle(ref, () => ({
    /**
     * Send text-only invoice to WhatsApp.
     * @param {Object} order
     * @param {string} phone10 - 10-digit Indian number (no +91)
     * @param {string} [customMessage] - optional override text
     */
    sendText(order, phone10, customMessage) {
      const msg = customMessage ?? buildOrderText(order);
      openWhatsappWithText(phone10, msg);
    },

    /**
     * Convenience: open a simple success message immediately after order.
     */
    openSuccess(orderId, phone10) {
      const msg = `Hello! Your order #${orderId} has been placed successfully.\nWe'll send your invoice shortly.`;
      openWhatsappWithText(phone10, msg);
    }
  }));

  return null; // no UI
});

export default WhatsAppShare;
export { buildOrderText };
