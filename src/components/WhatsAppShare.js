// src/components/WhatsAppShare.js
import { forwardRef, useImperativeHandle } from 'react';

/** Build a neat text invoice caption */
function buildOrderText(order) {
  const shopName = (process.env.REACT_APP_SHOP_NAME || 'MANAKIRANA').trim();
  const addr1 = (process.env.REACT_APP_SHOP_ADDRESS_LINE1 || 'Uppalaguptham').trim();
  const addr2 = (process.env.REACT_APP_SHOP_ADDRESS_LINE2 || 'Konaseema').trim();
  const rawGst = (process.env.REACT_APP_SHOP_GST || 'GSTIN123456780').trim();
  const gst = rawGst.replace(/^(\s*GST\s*Number\s*:\s*|\s*GSTIN\s*:\s*)/i, '').trim();
  const phones = (process.env.REACT_APP_SHOP_PHONE || '8121774325, 08856-297898')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean)
    .join(' | ');

  const id = order?.order_number || order?.id || '';
  const dt = new Date(order?.datetime || Date.now());
  const date = dt.toLocaleDateString();
  const time = dt.toLocaleTimeString();

  const totals = [
    `Total Qty: ${Number(order?.totalQty ?? 0).toFixed(2)}`,
    `Total Discount: ₹${Number(order?.totalDiscount ?? 0).toFixed(2)}`,
    `Grand Total: ₹${Number(order?.total ?? order?.totalPrice ?? 0).toFixed(2)}`
  ];

  const paymentBits = [];
  if (order?.paymentMethod) paymentBits.push(`Payment: ${order.paymentMethod}`);
  if (typeof order?.cashGiven === 'number') paymentBits.push(`Cash Given: ₹${order.cashGiven.toFixed(2)}`);
  if (typeof order?.change === 'number') paymentBits.push(`Change: ₹${order.change.toFixed(2)}`);

  return [
    `🧾 *${shopName}*`,
    `📍 ${addr1}${addr2 ? ', ' + addr2 : ''}`,
    // `🧪 GSTIN: ${gst}`,
    `📞 ${phones}`,
    ``,
    // `*Invoice* #${id}`,
    `Date: ${date}   Time: ${time}`,
    ``,
    ...totals,
    ...(paymentBits.length ? [''] : []),
    ...paymentBits,
    ``,
    `Thank you for shopping with us!`
  ].join('\n');
}

/** Ensure last 10 digits (India) */
function toPhone10(p) {
  return String(p || '').replace(/\D/g, '').slice(-10);
}

/** Open a targeted WhatsApp chat with prefilled text */
function openWhatsappWithText(phone10, text) {
  const encoded = encodeURIComponent(text || '');
  const waMe = `https://wa.me/91${phone10}?text=${encoded}`;
  window.open(waMe, '_blank');
}

/** Convert base64 dataURL to File */
function dataUrlToFile(dataUrl, filename = 'invoice.png') {
  const [meta, b64] = dataUrl.split(',');
  const mime = (meta.match(/data:(.*?);/) || [])[1] || 'image/png';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

const WhatsAppShare = forwardRef(function WhatsAppShare(_, ref) {
  useImperativeHandle(ref, () => ({
    /** Keep text-only for compatibility if needed */
    sendText(order, phone, customMessage) {
      const phone10 = toPhone10(phone);
      if (!/^\d{10}$/.test(phone10)) {
        alert('❌ Customer phone number is missing or invalid.');
        return;
      }
      const msg = customMessage ?? buildOrderText(order);
      openWhatsappWithText(phone10, msg);
    },

    /**
     * Share IMAGE to a SPECIFIC NUMBER:
     * 1) Try copying image to clipboard, then open wa.me/<phone> with caption → user pastes image.
     * 2) If clipboard fails, download PNG and open targeted chat with caption → user attaches image.
     * Note: Web cannot attach media directly to a targeted chat.
     */
    async sendImage(order, phone, dataUrl, captionOverride) {
      const phone10 = toPhone10(phone);
      if (!/^\d{10}$/.test(phone10)) {
        alert('❌ Customer phone number is missing or invalid.');
        return;
      }
      if (!dataUrl) {
        alert('❌ Missing invoice image.');
        return;
      }

      const caption = captionOverride ?? buildOrderText(order);
      const filename = `invoice_${phone10}_${Date.now()}.png`;
      const file = dataUrlToFile(dataUrl, filename);

      // Preferred: targeted flow (skip generic share sheet, keep the number)
      try {
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([new ClipboardItem({ [file.type]: file })]);
          // Open the targeted chat with caption; user just pastes image.
          openWhatsappWithText(phone10, caption);
          return;
        }
      } catch (err) {
        // fall through to download fallback
        console.warn('Clipboard write failed, falling back to download → wa.me:', err);
      }

      // Fallback: download file, then open targeted chat
      try {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        alert('⬇️ invoice.png downloaded. Attach it in the chat that opens.');
      } catch (e) {
        console.warn('Download fallback failed:', e);
      }
      openWhatsappWithText(phone10, caption);
    },
  }));

  return null;
});

export default WhatsAppShare;
export { buildOrderText };
