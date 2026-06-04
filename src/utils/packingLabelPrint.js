import {
  getCalculatedPackingAmounts,
  getDispatchItemPackingConfigurations,
  getDispatchItemProductName,
  getDispatchItemUnit,
  getPackingConfigurationsFromNotes,
  getPackingConfigUnit,
} from './dispatchDisplay';

const LABEL_WIDTH_MM = 57.5;
const LABEL_HEIGHT_MM = 40;
const LABEL_EXPIRY_DAYS = 90;
const LOCAL_LABEL_PRINTER_URL =
  process.env.REACT_APP_LABEL_PRINTER_URL || 'http://127.0.0.1:8765/print-label';

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const formatDate = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const cleanPrice = (value) => {
  if (value === undefined || value === null || value === '') return '';

  const text = String(value).trim();
  if (!text || text.toLowerCase() === 'null' || text.toLowerCase() === 'undefined') {
    return '';
  }

  return text.replace(/^rs\.?\s*/i, '');
};

const formatQuantity = (value) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) return String(value || '');
  if (Number.isInteger(numeric)) return String(numeric);

  return String(numeric).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
};

const getPriceFromNotes = (notes, label) => {
  const text = String(notes || '');
  const pattern =
    label === 'mrp'
      ? /MRP\s*Rs\.?\s*([0-9]+(?:\.[0-9]+)?)/i
      : /(?:Purchase|DPrice|Discount(?:ed)?(?:\s*Price)?|Package(?:\s*Amount)?)\s*Rs\.?\s*([0-9]+(?:\.[0-9]+)?)/i;

  return cleanPrice(text.match(pattern)?.[1]);
};

const getPrice = (item) =>
  cleanPrice(
    firstValue(
      item.package_amount,
      item.packageAmount,
      item.purchase_amount,
      item.purchaseAmount,
      item.discount_price,
      item.discountPrice,
      item.discounted_price,
      item.discountedPrice,
      item.dprice,
      item.DPrice,
      item.selling_price,
      item.sellingPrice,
      item.unit_price,
      item.unitPrice,
      item.price,
      getPriceFromNotes(item.notes, 'discount')
    )
  );

const getPerUnitPrice = (item) => {
  const price = Number(getPrice(item));
  const quantity = Number(item.barcode_quantity || item.quantity || item.qty || 0);
  const unit = String(item.unit_short_code || item.unit_code || item.unit_name || '').toLowerCase();

  if (!price || !quantity) return '';

  const baseQty = unit.startsWith('kg') ? quantity * 1000 : quantity;
  if (!baseQty) return '';

  return (price / baseQty).toFixed(2);
};

const getMrp = (item) =>
  cleanPrice(
    firstValue(
      item.mrp_amount,
      item.mrpAmount,
      item.MRP,
      item.mrp,
      item.maximum_retail_price,
      item.maximumRetailPrice,
      getPriceFromNotes(item.notes, 'mrp')
    )
  );

const getLabelMrp = (item) => {
  const mrp = getMrp(item);
  if (mrp) return mrp;

  const discountPrice = Number(getPrice(item));
  if (!discountPrice) return '';

  return String(Math.round(discountPrice * 1.25));
};

const getMkid = (item) =>
  firstValue(
    item.mkid,
    item.MKID,
    item.mk_id,
    item.generatedCode,
    item.generated_code,
    item.sku_id,
    item.pos_mkid,
    item.posMkid,
    item.catalog_mkid,
    item.catalogMkid,
    item.product_code,
    ''
  );

const compactValues = (...values) =>
  values
    .flat()
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);

const getLabelId = (item) =>
  firstValue(
    item.product_barcode_id,
    item.productBarcodeId,
    item.catalogProductBarcodeId,
    item.catalogProductBarcodeID,
    item.label_id,
    item.labelId,
    item.mkid,
    item.MKID,
    ''
  );

const getLabelBarcode = (item) => {
  const candidates = compactValues(
    item.mk_barcode,
    item.mkBarcode,
    item.MKBarcode
  );
  const longNumericBarcode = candidates.find((value) => /^\d{8,}$/.test(value));

  if (longNumericBarcode) return longNumericBarcode;

  return candidates.find((value) => !/^MK[A-Z]*\d+$/i.test(value)) || '';
};

const code128Patterns = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213',
  '122312', '132212', '221213', '221312', '231212', '112232', '122132',
  '122231', '113222', '123122', '123221', '223211', '221132', '221231',
  '213212', '223112', '312131', '311222', '321122', '321221', '312212',
  '322112', '322211', '212123', '212321', '232121', '111323', '131123',
  '131321', '112313', '132113', '132311', '211313', '231113', '231311',
  '112133', '112331', '132131', '113123', '113321', '133121', '313121',
  '211331', '231131', '213113', '213311', '213131', '311123', '311321',
  '331121', '312113', '312311', '332111', '314111', '221411', '431111',
  '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114',
  '413111', '241112', '134111', '111242', '121142', '121241', '114212',
  '124112', '124211', '411212', '421112', '421211', '212141', '214121',
  '412121', '111143', '111341', '131141', '114113', '114311', '411113',
  '411311', '113141', '114131', '311141', '411131', '211412', '211214',
  '211232', '2331112',
];

const makeCode128Svg = (value) => {
  const text = String(value || '').replace(/[^\x20-\x7e]/g, '');
  if (!text) return '';

  const codes = [104];

  for (const char of text) {
    codes.push(char.charCodeAt(0) - 32);
  }

  const checksum =
    codes.reduce((sum, code, index) => sum + code * (index === 0 ? 1 : index), 0) %
    103;
  codes.push(checksum, 106);

  let x = 0;
  const bars = [];

  codes.forEach((code) => {
    const pattern = code128Patterns[code];
    if (!pattern) return;

    pattern.split('').forEach((widthText, index) => {
      const width = Number(widthText);
      if (index % 2 === 0) {
        bars.push(`<rect x="${x}" y="0" width="${width}" height="34" />`);
      }
      x += width;
    });
  });

  return `<svg class="barcodeSvg" viewBox="0 0 ${x} 34" preserveAspectRatio="none" aria-label="${escapeHtml(text)}">${bars.join(
    ''
  )}</svg>`;
};

export const getPackingLabelRows = (order) =>
  (order?.items || []).flatMap((item) => {
    const isInternalPacking = String(order?.destination || '')
      .toLowerCase()
      .startsWith('internal_packing:');
    const configs = getDispatchItemPackingConfigurations(item);
    const noteConfigs = getPackingConfigurationsFromNotes(item);

    if (!configs.length) {
      if (isInternalPacking) {
        return getPackingRowsFromNotes(item);
      }

      const count = Math.max(1, Number(item.no_of_units || item.qty || 1));
      return Array.from({ length: count }, () => ({
        ...item,
        product_name: getDispatchItemProductName(item),
        unitText: getDispatchItemUnit(item),
      }));
    }

    return configs.flatMap((config, configIndex) => {
      const noteConfig = noteConfigs[configIndex] || {};
      const calculatedAmounts = getCalculatedPackingAmounts(item, {
        ...noteConfig,
        ...config,
      });
      const labelConfig = {
        ...noteConfig,
        ...config,
        package_amount: firstValue(
          calculatedAmounts.packageAmount,
          config.package_amount,
          config.packageAmount,
          config.purchase_amount,
          config.purchaseAmount,
          noteConfig.package_amount,
          noteConfig.packageAmount
        ),
        mrp_amount: firstValue(
          calculatedAmounts.mrpAmount,
          config.mrp_amount,
          config.mrpAmount,
          config.MRP,
          config.mrp,
          noteConfig.mrp_amount,
          noteConfig.mrpAmount
        ),
        notes: config.notes || noteConfig.notes || '',
      };
      const count = Math.max(1, Number(config.pack_count || config.qty || 1));

      return Array.from({ length: count }, () => ({
        ...labelConfig,
        notes: labelConfig.notes,
        product_name:
          labelConfig.product_name ||
          labelConfig.product_name_eng ||
          getDispatchItemProductName(item),
        mkid: getMkid(labelConfig) || getMkid(item),
        exp_date: item.exp_date,
        unitText: getPackingConfigUnit(labelConfig),
      }));
    });
  });

const escapeTsplText = (value) =>
  String(value ?? '')
    .replace(/"/g, '')
    .replace(/[^\x20-\x7e₹]/g, '')
    .trim();

const getTsplText = (text, maxLength = 24) =>
  escapeTsplText(text).slice(0, maxLength);

const buildTsplLabel = (item, order) => {
  const productName = getTsplText(getDispatchItemProductName(item), 26);
  const discountPrice = getTsplText(getPrice(item), 8);
  const mrp = getTsplText(getLabelMrp(item), 8);
  const unit = getTsplText(item.unitText || getDispatchItemUnit(item), 12);
  const barcode = getTsplText(getLabelBarcode(item), 32);
  const labelId = getTsplText(getLabelId(item), 20);
  const perUnitPrice = getTsplText(getPerUnitPrice(item), 8);
  const pkd = formatDate(new Date());
  const expDate = new Date();
  expDate.setDate(expDate.getDate() + LABEL_EXPIRY_DAYS);
  const exp = formatDate(expDate);
  const dispatchNo = getTsplText(order?.dispatch_no || '', 16);

  return `
SIZE 57.5 mm, 40 mm
DIRECTION 0,0
REFERENCE 0,0
OFFSET 0 mm
SET PEEL OFF
SET CUTTER OFF
SET PARTIAL_CUTTER OFF
SET TEAR ON
CLS

TEXT 430,185,"0",180,11,11,"${productName}"
TEXT 430,158,"0",180,9,9,"MRP:Rs ${mrp || '-'}"
TEXT 310,158,"0",180,9,9,"MKP:Rs ${discountPrice || '-'}"
TEXT 430,135,"0",180,7,7,"PkdDt ${pkd}"
TEXT 310,135,"0",180,7,7,"ExpDt ${exp}"
TEXT 430,112,"0",180,7,7,"PerGm Rs:${perUnitPrice || '-'}"
TEXT 310,112,"0",180,9,9,"${unit || '-'}"
${labelId ? `TEXT 92,128,"0",270,8,8,"ID ${labelId}"` : ''}
BARCODE 430,64,"128",38,1,180,2,2,"${barcode}"
TEXT 120,18,"0",180,5,5,"${dispatchNo}"

PRINT 1,1
`;
};

const downloadTsplLabels = (order, rows) => {
  const prn = rows.map((item) => buildTsplLabel(item, order)).join('\n');
  const blob = new Blob([prn], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `${order?.dispatch_no || 'packing-labels'}.prn`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const sendTsplToLocalPrinter = async (prn) => {
  const response = await fetch(LOCAL_LABEL_PRINTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prn }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.ok === false) {
    throw new Error(data.message || 'Local label printer failed');
  }

  return data;
};

const getPackingRowsFromNotes = (item) => {
  const noteParts = String(item.notes || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);

  return noteParts.flatMap((part, index) => {
    const packMatch = part.match(
      /^(.*?)\s+([0-9]+(?:\.[0-9]+)?)\s*([A-Za-z]+)\s+x\s*([0-9]+)/i
    );

    if (!packMatch) return [];

    const [, productName, quantity, unit, countText] = packMatch;
    const count = Math.max(1, Number(countText || 1));
    const packageAmount = getPriceFromNotes(part, 'discount');
    const mrpAmount = getPriceFromNotes(part, 'mrp');

    return Array.from({ length: count }, () => ({
      ...item,
      product_name: productName.trim(),
      barcode_quantity: formatQuantity(quantity),
      unit_short_code: unit,
      unitText: `${formatQuantity(quantity)} ${unit}`,
      package_amount: packageAmount,
      mrp_amount: mrpAmount,
      mkid: getMkid(item),
      notes: part,
      _notePackIndex: index,
    }));
  });
};

export const getPackingLabelRowKey = (item) =>
  compactValues(
    getLabelId(item),
    getLabelBarcode(item),
    getDispatchItemProductName(item),
    item.unitText || getDispatchItemUnit(item),
    item.barcode_quantity,
    item.quantity,
    item.package_amount,
    item.mrp_amount,
    item._notePackIndex
  ).join('|');

export const summarizePackingLabelRows = (rows = []) => {
  const byKey = new Map();

  rows.forEach((row) => {
    const key = getPackingLabelRowKey(row);
    const existing = byKey.get(key);

    if (existing) {
      existing.count += 1;
      return;
    }

    byKey.set(key, {
      key,
      count: 1,
      productName: getDispatchItemProductName(row),
      unit: row.unitText || getDispatchItemUnit(row),
      barcode: getLabelBarcode(row),
      labelId: getLabelId(row),
      price: getPrice(row),
      mrp: getLabelMrp(row),
    });
  });

  return Array.from(byKey.values());
};

const buildLabel = (item, order) => {
  const productName = getDispatchItemProductName(item).replace(/\(.*?\)/g, '').trim();
  const discountPrice = getPrice(item);
  const mrp = getLabelMrp(item);
  const unit = item.unitText || getDispatchItemUnit(item);
  const barcode = getLabelBarcode(item);
  const labelId = getLabelId(item);
  const pkd = formatDate(new Date());
  const expDate = new Date();
  expDate.setDate(expDate.getDate() + LABEL_EXPIRY_DAYS);
  const exp = formatDate(expDate);
  const perUnitPrice = getPerUnitPrice(item);
  const barcodeSvg = makeCode128Svg(barcode);

  return `
    <section class="label">
      <div class="labelContent">
        <div class="product">${escapeHtml(productName).slice(0, 30)}</div>
        <div class="priceLine">
          <strong>MRP:Rs ${escapeHtml(mrp || '-')}</strong>
          <strong>MKP:Rs ${escapeHtml(discountPrice || '-')}</strong>
        </div>
        <div class="detailGrid">
          <span>PkdDt ${escapeHtml(pkd)}</span>
          <span>ExpDt ${escapeHtml(exp)}</span>
          <span>${perUnitPrice ? `PerGm Rs: ${escapeHtml(perUnitPrice)}` : ''}</span>
          <strong>${escapeHtml(unit || '-')}</strong>
        </div>
        ${labelId ? `<div class="idBadge">ID ${escapeHtml(labelId)}</div>` : ''}
        <div class="barcode">${barcodeSvg || escapeHtml(barcode || '-')}</div>
        <div class="barcodeText">${escapeHtml(barcode || '-')}</div>
        <div class="dispatchNo">${escapeHtml(order?.dispatch_no || '')}</div>
      </div>
    </section>
  `;
};

const buildPackingLabelsHtml = (order, labels, autoPrint = true) => `
  <html>
    <head>
      <title>${escapeHtml(order?.dispatch_no || 'Packing Labels')}</title>
      <style>
        @page {
          size: ${LABEL_WIDTH_MM}mm ${LABEL_HEIGHT_MM}mm;
          margin: 0;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          color: #111;
          font-family: Arial, Helvetica, sans-serif;
          width: ${LABEL_WIDTH_MM}mm;
        }

        .label {
          position: relative;
          width: ${LABEL_WIDTH_MM}mm;
          height: ${LABEL_HEIGHT_MM}mm;
          padding: 0;
          page-break-after: always;
          break-after: page;
          overflow: hidden;
        }

        .labelContent {
          position: absolute;
          left: 3mm;
          right: 3mm;
          top: 20mm;
          height: 20mm;
          overflow: hidden;
        }

        .product {
          font-size: 10px;
          line-height: 1;
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .priceLine {
          display: grid;
          grid-template-columns: 25mm 19mm;
          align-items: baseline;
          column-gap: 1.5mm;
          margin-top: 1mm;
          font-size: 8px;
          line-height: 1;
          font-weight: 800;
        }

        .detailGrid {
          display: grid;
          grid-template-columns: 25mm 19mm;
          gap: 0.7mm 1.5mm;
          margin-top: 1mm;
          font-size: 8px;
          line-height: 1;
        }

        .priceLine strong:nth-child(2),
        .detailGrid span:nth-child(2),
        .detailGrid strong {
          text-align: left;
        }

        .mkid {
          margin-top: 1.1mm;
          font-size: 10px;
          line-height: 1;
          font-weight: 800;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .idBadge {
          position: absolute;
          right: 0;
          top: 9.6mm;
          max-width: 17mm;
          overflow: hidden;
          text-overflow: ellipsis;
          transform: rotate(90deg);
          transform-origin: right top;
          font-size: 6px;
          line-height: 1;
          font-weight: 800;
          white-space: nowrap;
        }

        .meta {
          margin-top: 0.7mm;
          font-size: 5.5px;
          line-height: 1;
        }

        .barcode {
          margin-top: 0.9mm;
          height: 5.4mm;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .barcodeSvg {
          width: 100%;
          height: 5.4mm;
          fill: #111;
        }

        .barcodeText {
          margin-top: 0.3mm;
          text-align: center;
          font-family: 'Courier New', monospace;
          font-size: 6px;
          line-height: 1;
        }

        .dispatchNo {
          position: absolute;
          right: 0;
          bottom: 0;
          max-width: 32mm;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #555;
          font-size: 5px;
        }

        .previewToolbar {
          position: sticky;
          top: 0;
          z-index: 2;
          display: flex;
          gap: 8px;
          align-items: center;
          padding: 8px;
          background: #111827;
          color: #fff;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
        }

        .previewToolbar button {
          border: 0;
          border-radius: 6px;
          padding: 6px 10px;
          background: #2563eb;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
        }

        @media print {
          html,
          body {
            width: ${LABEL_WIDTH_MM}mm !important;
            height: ${LABEL_HEIGHT_MM}mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }

          .previewToolbar {
            display: none !important;
          }

          .label {
            margin: 0 !important;
            page-break-after: always;
            break-after: page;
          }
        }
      </style>
    </head>
    <body>
      ${
        autoPrint
          ? ''
          : `<div class="previewToolbar">
              <strong>${escapeHtml(order?.dispatch_no || 'Packing Labels')}</strong>
              <span>${labels.length} label${labels.length === 1 ? '' : 's'}</span>
              <button type="button" onclick="window.print()">Print previewed labels</button>
            </div>`
      }
      ${labels.join('')}
      ${
        autoPrint
          ? `<script>
              window.onload = function () {
                window.focus();
                setTimeout(function () {
                  window.print();
                }, 150);
              };
            </script>`
          : ''
      }
    </body>
  </html>
`;

const openPackingLabelsWindow = (order, rows, autoPrint = true) => {
  const labels = rows.map((item) => buildLabel(item, order));
  const html = buildPackingLabelsHtml(order, labels, autoPrint);
  const printWindow = window.open('', '_blank', autoPrint ? 'width=420,height=360' : 'width=900,height=700');

  if (!printWindow) {
    alert('Please allow popups to print packing labels.');
    return false;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
};

export const printPackingLabels = async (order, options = {}) => {
  const excludedRowKeys = new Set(options.excludedRowKeys || []);
  const labelRows = (options.rows || getPackingLabelRows(order)).filter(
    (row) => !excludedRowKeys.has(getPackingLabelRowKey(row))
  );

  if (!labelRows.length) {
    alert('No labels available for this dispatch.');
    return false;
  }

  if (options.mode === 'preview') {
    return openPackingLabelsWindow(order, labelRows, false);
  }

  const prn = labelRows.map((item) => buildTsplLabel(item, order)).join('\n');

  try {
    await sendTsplToLocalPrinter(prn);
    alert('Labels sent to local TSC printer.');
    return true;
  } catch (error) {
    downloadTsplLabels(order, labelRows);
    if (
      !window.confirm(
        `Local print failed: ${
          error.message || error
        }\n\nRaw TSC label file downloaded as fallback. Open browser preview also?`
      )
    ) {
      return true;
    }
  }

  return openPackingLabelsWindow(order, labelRows, true);
};
