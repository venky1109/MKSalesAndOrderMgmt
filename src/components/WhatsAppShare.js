// src/components/WhatsAppShare.js
import { forwardRef, useImperativeHandle } from 'react';

const NAME_MAX = 30;

function money(v) {
  return Number(v || 0).toFixed(2);
}

function trimText(text, maxLen) {
  const str = String(text || '');
  return str.length > maxLen ? `${str.substring(0, maxLen - 2)}..` : str;
}

function cleanProductName(name) {
  return String(name || '').split('(')[0].trim();
}

function formatDateTime(dt) {
  const d = new Date(dt || Date.now());
  return `${d.toLocaleDateString('en-GB')} ${d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function getItems(order) {
  return order?.orderItems || order?.cartItems || order?.items || [];
}

function buildOrderText(order) {
  const shopName = process.env.REACT_APP_SHOP_NAME || 'MANAKIRANA';
  const phone = process.env.REACT_APP_SHOP_PHONE || '8121774325';

  const items = getItems(order);

  const totalQty =
    order?.totalQty ??
    items.reduce((sum, item) => sum + Number(item?.qty || 0), 0);

  const total =
    order?.total ??
    order?.totalPrice ??
    order?.grandTotal ??
    items.reduce((sum, item) => sum + Number(item?.subtotal || 0), 0);

  const discount = order?.totalDiscount || order?.discount || 0;
  const gst = order?.gstAmount || order?.totalGst || 0;

  const lines = [];

  lines.push(`*${shopName}*`);
  lines.push(`Phone: ${phone}`);
  lines.push('');
  lines.push(`Order: ${order?.order_number || order?._id || order?.id || 'NA'}`);
  lines.push(`Date : ${formatDateTime(order?.datetime || order?.createdAt)}`);
  lines.push('------------------------------');

  items.forEach((item, index) => {
    const name = trimText(cleanProductName(item?.item || ''), NAME_MAX);

    const saleQty = Number(item?.qty || 1); // qty
    const packQty = item?.quantity || '';   // quantity
    const units = item?.units || '';
    const rate = Number(item?.dprice || item?.price || 0);
    const amt = Number(item?.subtotal || saleQty * rate);

    if (!name) return;

    const packText = packQty && units ? `${packQty}${units}` : '';

    lines.push(
      `${index + 1}. ${name} ${packText} x${saleQty}`
    );
    lines.push(
      `₹${money(rate)} = ₹${money(amt)}`
    );
  });

  lines.push('------------------------------');
  lines.push(
    `*Qty:* ${money(totalQty)}  *Disc:* ${money(discount)}`
  );
  lines.push(
    `*GST:* ${money(gst)}  *TOTAL:* ₹${money(total)}`
  );
  lines.push('------------------------------');

  if (order?.paymentMethod) lines.push(`Pay: ${order.paymentMethod}`);
  if (typeof order?.cashGiven === 'number') lines.push(`Given: ₹${money(order.cashGiven)}`);
  if (typeof order?.change === 'number') lines.push(`Change: ₹${money(order.change)}`);

  lines.push('');
  lines.push('Thank you');

  return lines.join('\n');
}

function toPhone10(p) {
  return String(p || '').replace(/\D/g, '').slice(-10);
}

function openWhatsapp(phone10, text) {
  window.open(`https://wa.me/91${phone10}?text=${encodeURIComponent(text)}`, '_blank');
}

const WhatsAppShare = forwardRef((_, ref) => {
  useImperativeHandle(ref, () => ({
    sendText(order, phone) {
      const p = toPhone10(phone);
      if (!/^\d{10}$/.test(p)) return alert('Invalid phone number');
      openWhatsapp(p, buildOrderText(order));
    },

    sendImage(order, phone) {
      const p = toPhone10(phone);
      if (!/^\d{10}$/.test(p)) return alert('Invalid phone number');
      openWhatsapp(p, buildOrderText(order));
    },

    getInvoiceText(order) {
      return buildOrderText(order);
    },
  }));

  return null;
});

export default WhatsAppShare;
export { buildOrderText };