import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  createCatalogEntity,
  deleteCatalogEntity,
  fetchCatalogEntity,
  updateCatalogEntity,
} from "../features/inventory/catalogCrudSlice";
import StockManagerLayout from "../components/StockManagerLayout";
import { readPdfText } from "../utils/billDocumentReader";
import {
  CalendarDays,
  Camera,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { scanBillFile, uploadBillFile } from "../utils/firebaseStorage";

const entity = "bills";

const expenseTypes = [
  "Supplier Bill",
  "Transportation",
  "Loading",
  "Unloading",
  "Outlet Maintenance",
  "Electricity",
  "Repair",
  "Other",
];

const statusOptions = ["Unpaid", "Partially Paid", "Paid", "Cancelled"];

const emptyForm = {
  bill_date: new Date().toISOString().slice(0, 10),
  organisation: "",
  expense_type: "Supplier Bill",
  reference_no: "",
  amount: "",
  tax_amount: "",
  total_amount: "",
  status: "Unpaid",
  due_date: "",
  paid_date: "",
  notes: "",
  bill_file_url: "",
  bill_file_path: "",
  bill_file_name: "",
  bill_file_type: "",
};

const emptyProductRow = {
  product_name: "",
  hsn_code: "",
  quantity: "",
  unit: "",
  unit_price: "",
  tax_amount: "",
  total_amount: "",
};

const billFileAccept = [
  "image/*",
  "application/pdf",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".csv",
  ".txt",
].join(",");

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
};

const displayDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getId = (bill) => bill?.id ?? bill?.bill_id ?? bill?._id;

const getBillDate = (bill) =>
  bill.bill_date || bill.date || bill.expense_date || bill.created_at;

const getExpenseType = (bill) =>
  bill.expense_type || bill.bill_type || bill.category || "Other";

const getOrganisationName = (bill) =>
  bill.organisation_name || bill.organisation || "-";

const getBillAttachment = (bill) =>
  Array.isArray(bill.attachments) && bill.attachments.length
    ? bill.attachments[0]
    : null;

const getTotal = (bill) =>
  Number(
    bill.total_amount ??
      bill.total ??
      Number(bill.amount || 0) + Number(bill.tax_amount || bill.tax || 0)
  );

const getStatus = (bill) => bill.status || bill.payment_status || "Unpaid";

const normalizeStatus = (status) => String(status || "").toLowerCase();

const normalizeApiValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const getStakeholderName = (stakeholder) =>
  stakeholder?.stakeholder_name ||
  stakeholder?.name ||
  stakeholder?.organisation ||
  "";

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const cleanNumber = (value) => {
  if (value === null || value === undefined || value === "") return "";
  const normalized = String(value).replace(/[^0-9.-]/g, "");
  if (!normalized || Number.isNaN(Number(normalized))) return "";
  return normalized;
};

const getBillItems = (bill) => {
  const candidates = [
    bill?.items,
    bill?.line_items,
    bill?.lineItems,
    bill?.products,
    bill?.product_details,
    bill?.productDetails,
    bill?.bill_items,
  ];
  const items = candidates.find((value) => Array.isArray(value));
  return items || [];
};

const collectNestedArrays = (value, arrays = []) => {
  if (!value || typeof value !== "object") return arrays;
  if (Array.isArray(value)) {
    arrays.push(value);
    value.forEach((item) => collectNestedArrays(item, arrays));
    return arrays;
  }
  Object.values(value).forEach((item) => collectNestedArrays(item, arrays));
  return arrays;
};

const normalizeProductRow = (item = {}) => ({
  product_name:
    item.product_name ||
    item.productName ||
    item.name ||
    item.description ||
    item.item_name ||
    "",
  hsn_code: item.hsn_code || item.hsn || item.hsnCode || "",
  quantity: cleanNumber(item.quantity ?? item.qty ?? item.no_of_units),
  unit: item.unit || item.units || item.uom || "",
  unit_price: cleanNumber(
    item.unit_price ?? item.rate ?? item.price ?? item.expected_unit_price
  ),
  tax_amount: cleanNumber(item.tax_amount ?? item.tax ?? item.gst_amount),
  total_amount: cleanNumber(
    item.total_amount ?? item.total ?? item.amount ?? item.line_total
  ),
});

const parseDateCandidate = (value) => {
  if (!value) return "";
  const text = String(value).trim();
  const iso = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) {
    const [, year, month, day] = iso;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const indian = text.match(/\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2})\b/);
  if (indian) {
    const [, day, month, year] = indian;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return "";
};

const pickExtractedValue = (source, keys) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
};

const looksLikeTotalLine = (line) =>
  /\b(grand\s*total|subtotal|sub\s*total|total|gst|tax|round\s*off|balance|net\s*payable|payable)\b/i.test(
    line
  );

const splitDelimitedLine = (line) => {
  if (line.includes("\t")) return line.split("\t");
  if (line.includes(",")) return line.split(",");
  if (line.includes("|")) return line.split("|");
  return line.split(/\s{2,}/);
};

const valueByHeader = (row, headers, names) => {
  const index = headers.findIndex((header) =>
    names.some((name) => header.includes(name))
  );
  return index >= 0 ? row[index] || "" : "";
};

const parseDelimitedProductRows = (lines) => {
  const headerIndex = lines.findIndex((line) => {
    const normalized = line.toLowerCase();
    return (
      /(product|item|description|particular)/.test(normalized) &&
      /(qty|quantity)/.test(normalized) &&
      /(rate|price|mrp|unit)/.test(normalized) &&
      /(total|amount)/.test(normalized)
    );
  });

  if (headerIndex < 0) return [];

  const headers = splitDelimitedLine(lines[headerIndex]).map((header) =>
    normalizeApiValue(header)
  );

  return lines
    .slice(headerIndex + 1)
    .map((line) => splitDelimitedLine(line).map((cell) => cell.trim()))
    .filter((row) => row.length >= 4)
    .filter((row) => !looksLikeTotalLine(row.join(" ")))
    .map((row) =>
      normalizeProductRow({
        product_name: valueByHeader(row, headers, [
          "product",
          "item",
          "description",
          "particular",
          "name",
        ]),
        hsn_code: valueByHeader(row, headers, ["hsn"]),
        quantity: valueByHeader(row, headers, ["quantity", "qty"]),
        unit: valueByHeader(row, headers, ["unit", "uom"]),
        unit_price: valueByHeader(row, headers, ["rate", "price", "mrp"]),
        tax_amount: valueByHeader(row, headers, ["tax", "gst"]),
        total_amount: valueByHeader(row, headers, ["total", "amount"]),
      })
    )
    .filter(
      (item) => item.product_name && (item.quantity || item.unit_price || item.total_amount)
    );
};

const parseLooseProductRows = (lines) =>
  lines
    .filter((line) => !looksLikeTotalLine(line))
    .map((line) =>
      line
        .replace(/[|[\]]/g, " ")
        .replace(/(\d),\s+(\d)/g, "$1,$2")
        .replace(/\s+/g, " ")
        .trim()
    )
    .map((line) => {
      const rowMatch = line.match(/^\s*(\d{1,3})\s+(.+)$/);
      const rowText = rowMatch ? rowMatch[2] : line;
      const numberMatches = [
        ...rowText.matchAll(
          /(?:^|\s)(\d+(?:,\d{2,3})*(?:\.\d{1,2})?)(?=\s|[^\w]|$)/g
        ),
      ];
      if (numberMatches.length < 3) return null;

      const firstNumber = numberMatches[0];
      const productName = rowText.slice(0, firstNumber.index).trim();
      if (!productName || productName.length < 2) return null;

      const afterQuantity = rowText.slice(
        firstNumber.index + firstNumber[0].length
      );
      const unit = afterQuantity.match(/^\s*([a-zA-Z]{1,8})\b/)?.[1] || "";
      const numbers = numberMatches.map((match) => cleanNumber(match[1]));
      const [quantity, unitPrice] = numbers;
      const totalAmount = numbers[numbers.length - 1];
      const taxAmount = numbers.length > 3 ? numbers[numbers.length - 2] : "";

      return normalizeProductRow({
        product_name: productName.replace(/^\d+\s*[.)-]?\s*/, ""),
        quantity,
        unit,
        unit_price: unitPrice,
        tax_amount: taxAmount,
        total_amount: totalAmount,
      });
    })
    .filter(Boolean);

const isPlainNumberLine = (line) =>
  /^\d+(?:,\d{2,3})*(?:\.\d{1,2})?$/.test(String(line || "").trim());

const parseStructuredInvoiceRows = (lines) => {
  const rows = [];

  for (let index = 0; index < lines.length - 4; index += 1) {
    const itemNo = lines[index];
    const hsnCode = lines[index + 1];
    if (!/^\d{4,8}$/.test(itemNo) || !/^\d{4,8}$/.test(hsnCode)) {
      continue;
    }

    let cursor = index + 2;
    const nameParts = [];
    while (cursor < lines.length) {
      const line = lines[cursor];
      if (
        /^(freight allocation|convenience fees|slab promotion|\d+\s+tier price value)$/i.test(
          line
        )
      ) {
        cursor += 1;
        continue;
      }
      if (isPlainNumberLine(line) && /^[A-Z]{2,4}$/.test(lines[cursor + 1] || "")) {
        break;
      }
      if (/^(item no|hsn code|total from page|tax invoice)$/i.test(line)) {
        break;
      }
      if (/^\d{4,8}$/.test(line) && /^\d{4,8}$/.test(lines[cursor + 1] || "")) {
        break;
      }
      nameParts.push(line);
      cursor += 1;
    }

    const quantity = cleanNumber(lines[cursor]);
    const unit = /^[A-Z]{2,4}$/.test(lines[cursor + 1] || "")
      ? lines[cursor + 1]
      : "";
    const unitPrice = cleanNumber(lines[cursor + 2]);

    if (!nameParts.length || !quantity || !unitPrice) continue;

    rows.push(
      normalizeProductRow({
        product_name: nameParts.join(" "),
        hsn_code: hsnCode,
        quantity,
        unit,
        unit_price: unitPrice,
        total_amount: String(Number(quantity) * Number(unitPrice)),
      })
    );
  }

  return rows;
};

const parseProductRowsFromText = (text = "") => {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const structuredRows = parseStructuredInvoiceRows(lines);
  if (structuredRows.length) return structuredRows;

  const delimitedRows = parseDelimitedProductRows(lines);
  if (delimitedRows.length) return delimitedRows;

  return parseLooseProductRows(lines);
};

const extractGrandTotalFromText = (text = "") => {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of [...lines].reverse()) {
    if (
      !/\b(grand\s*total|net\s*payable|total\s*\(rs\.?\)|total\s*\[rs\.?\])\b/i.test(
        line
      )
    ) {
      continue;
    }

    const values = [
      ...line.matchAll(/\b\d+(?:,\d{2,3})*(?:\.\d{1,2})?\b/g),
    ]
      .map((match) => cleanNumber(match[0]))
      .filter(Boolean);

    if (values.length) return values[values.length - 1];
  }

  return "";
};

const fileNeedsOcr = (file) =>
  Boolean(file?.type?.startsWith("image/") || /\.pdf$/i.test(file?.name || ""));

const extractBillFromText = (text = "", fileName = "") => {
  const fullText = `${text}\n${fileName}`;
  const reference =
    fullText.match(
      /\b(?:invoice|inv|bill|ref|reference)\s*(?:no|number|#)?\s*[:.-]?\s*([A-Z0-9/-]{3,})/i
    )?.[1] || "";
  const total =
    fullText.match(/\b(?:grand\s*)?total\s*[:.-]?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.\d{1,2})?)/i)?.[1] ||
    "";
  const tax =
    fullText.match(/\b(?:gst|tax)\s*[:.-]?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.\d{1,2})?)/i)?.[1] ||
    "";
  const amount =
    fullText.match(/\b(?:subtotal|sub\s*total|amount)\s*[:.-]?\s*(?:rs\.?|inr|₹)?\s*([0-9,]+(?:\.\d{1,2})?)/i)?.[1] ||
    "";

  const parsedGrandTotal = extractGrandTotalFromText(fullText);
  const payableTotal =
    fullText.match(
      /\b(?:net\s*payable|grand\s*total)\s*[:.-]?\s*(?:rs\.?|inr|₹|i)?\s*([0-9,]+(?:\.\d{1,2})?)/i
    )?.[1] || "";

  return {
    reference_no: reference,
    bill_date: parseDateCandidate(fullText),
    amount: cleanNumber(amount),
    tax_amount: cleanNumber(tax),
    total_amount: cleanNumber(parsedGrandTotal || payableTotal || total),
    items: parseProductRowsFromText(text),
  };
};

const normalizeExtractedBill = (extracted, fileName = "") => {
  const source = extracted?.bill || extracted?.invoice || extracted || {};
  const rawText = pickExtractedValue(source, [
    "text",
    "raw_text",
    "rawText",
    "content",
  ]);
  const textFallback =
    typeof extracted === "string"
      ? extractBillFromText(extracted, fileName)
      : extractBillFromText(rawText, fileName);
  const extractedItems = getBillItems(source)
    .map(normalizeProductRow)
    .filter((item) =>
      Object.values(item).some((value) => String(value || "").trim())
    );
  const nestedItems = collectNestedArrays(source)
    .flatMap((items) => items.map(normalizeProductRow))
    .filter(
      (item) =>
        item.product_name &&
        (item.quantity || item.unit_price || item.total_amount)
    );

  return {
    bill_date:
      parseDateCandidate(
        pickExtractedValue(source, ["bill_date", "date", "invoice_date"])
      ) || textFallback.bill_date,
    organisation:
      pickExtractedValue(source, [
        "organisation",
        "organisation_name",
        "supplier",
        "supplier_name",
        "vendor",
        "vendor_name",
      ]) || "",
    reference_no:
      pickExtractedValue(source, [
        "reference_no",
        "invoice_no",
        "invoice_number",
        "bill_no",
        "bill_number",
      ]) || textFallback.reference_no,
    amount:
      cleanNumber(
        pickExtractedValue(source, ["amount", "subtotal", "sub_total"])
      ) || textFallback.amount,
    tax_amount:
      cleanNumber(
        pickExtractedValue(source, ["tax_amount", "tax", "gst", "gst_amount"])
      ) || textFallback.tax_amount,
    total_amount:
      cleanNumber(
        pickExtractedValue(source, ["total_amount", "total", "grand_total"])
      ) || textFallback.total_amount,
    notes: pickExtractedValue(source, ["notes", "remarks"]) || "",
    items: extractedItems.length
      ? extractedItems
      : nestedItems.length
      ? nestedItems
      : textFallback.items,
  };
};

const getStakeholderType = (stakeholder) =>
  normalizeText(stakeholder?.stakeholder_type);

const organisationTypeConfig = {
  "Supplier Bill": {
    label: "supplier",
    matches: ["supplier"],
  },
  Transportation: {
    label: "transporter",
    matches: ["transport", "transporter", "transportation"],
  },
  Loading: {
    label: "loading vendor",
    matches: ["loading", "loader", "labour", "labor"],
  },
  Unloading: {
    label: "unloading vendor",
    matches: ["unloading", "loader", "labour", "labor"],
  },
  "Outlet Maintenance": {
    label: "maintenance vendor",
    matches: ["maintenance", "service", "vendor", "contractor"],
  },
  Electricity: {
    label: "electricity provider",
    matches: ["electricity", "power", "utility", "vendor"],
  },
  Repair: {
    label: "repair vendor",
    matches: ["repair", "service", "vendor", "contractor"],
  },
  Other: {
    label: "organisation",
    matches: [],
  },
};

const billCategoryByExpenseType = {
  "Supplier Bill": "expense",
  Transportation: "transportation",
  Loading: "loading",
  Unloading: "unloading",
  "Outlet Maintenance": "outlet_maintenance",
  Electricity: "electricity",
  Repair: "repair",
  Other: "expense",
};

const matchesStakeholderTypes = (stakeholder, matches) => {
  if (!matches?.length) return true;
  const type = getStakeholderType(stakeholder);
  return matches.some((item) => type.includes(item));
};

const AccountsBillsPage = () => {
  const dispatch = useDispatch();
  const { data = {}, loading, error, successMessage } = useSelector(
    (state) => state.catalogCrud || {}
  );
  const token = useSelector((state) => state.posUser?.userInfo?.token || "");

  const bills = useMemo(() => data[entity] || [], [data]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadedFileData, setUploadedFileData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [productRows, setProductRows] = useState([]);
  const [expandedBillId, setExpandedBillId] = useState(null);

  const organisationConfig =
    organisationTypeConfig[form.expense_type] || organisationTypeConfig.Other;
  const organisationOptions = useMemo(
    () =>
      (data.stakeholders || [])
        .filter((stakeholder) =>
          matchesStakeholderTypes(stakeholder, organisationConfig.matches)
        )
        .sort((a, b) =>
          getStakeholderName(a).localeCompare(getStakeholderName(b), undefined, {
            sensitivity: "base",
          })
        ),
    [data.stakeholders, organisationConfig.matches]
  );

  const loadBills = useCallback(() => {
    dispatch(fetchCatalogEntity(entity));
  }, [dispatch]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  useEffect(() => {
    dispatch(fetchCatalogEntity("stakeholders"));
  }, [dispatch]);

  const filteredBills = useMemo(() => {
    const q = search.trim().toLowerCase();

    return bills
      .filter((bill) => {
        const statusMatches =
          statusFilter === "all" ||
          normalizeStatus(getStatus(bill)) === normalizeStatus(statusFilter);
        const typeMatches =
          typeFilter === "all" || getExpenseType(bill) === typeFilter;
        const searchMatches =
          !q ||
          [
            getOrganisationName(bill),
            getExpenseType(bill),
            bill.reference_no,
            bill.notes,
            getStatus(bill),
          ]
            .join(" ")
            .toLowerCase()
            .includes(q);

        return statusMatches && typeMatches && searchMatches;
      })
      .sort((a, b) => new Date(getBillDate(b)) - new Date(getBillDate(a)));
  }, [bills, search, statusFilter, typeFilter]);

  const totals = useMemo(() => {
    const paid = bills
      .filter((bill) => normalizeStatus(getStatus(bill)) === "paid")
      .reduce((sum, bill) => sum + getTotal(bill), 0);
    const pending = bills
      .filter((bill) => normalizeStatus(getStatus(bill)) !== "paid")
      .reduce((sum, bill) => sum + getTotal(bill), 0);
    const total = bills.reduce((sum, bill) => sum + getTotal(bill), 0);

    return { total, paid, pending, count: bills.length };
  }, [bills]);

  const typeSummary = useMemo(() => {
    const grouped = {};
    for (const bill of bills) {
      const type = getExpenseType(bill);
      grouped[type] = (grouped[type] || 0) + getTotal(bill);
    }

    return Object.entries(grouped)
      .map(([type, amount]) => ({ type, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [bills]);

  const handleChange = (name, value) => {
    setForm((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "expense_type") {
        next.organisation = "";
      }

      if (name === "amount" || name === "tax_amount") {
        next.total_amount = String(
          Number(name === "amount" ? value : next.amount || 0) +
            Number(name === "tax_amount" ? value : next.tax_amount || 0)
        );
      }

      if (name === "status" && value !== "Paid") {
        next.paid_date = "";
      }

      return next;
    });
  };

  const applyExtractedBill = (extracted) => {
    if (!extracted) return false;
    const scannedItems = extracted.items || [];
    const itemsTotal = scannedItems.reduce(
      (sum, item) => sum + Number(item.total_amount || 0),
      0
    );
    setForm((prev) => {
      const amount = extracted.amount || (itemsTotal ? String(itemsTotal) : prev.amount);
      const taxAmount = extracted.tax_amount || prev.tax_amount;
      const totalAmount =
        extracted.total_amount ||
        (amount !== "" || taxAmount !== ""
          ? String(Number(amount || 0) + Number(taxAmount || 0))
          : prev.total_amount);

      return {
        ...prev,
        bill_date: extracted.bill_date || prev.bill_date,
        organisation: extracted.organisation || prev.organisation,
        reference_no: extracted.reference_no || prev.reference_no,
        amount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        notes: extracted.notes || prev.notes,
      };
    });

    if (scannedItems.length) {
      setProductRows(scannedItems);
      setScanMessage(
        `Scanned ${scannedItems.length} product row${
          scannedItems.length === 1 ? "" : "s"
        }. Please check quantity, unit, rate, tax, and total before saving.`
      );
    } else {
      setScanMessage(
        "Bill scanned. Product rows were not detected, so you can add them manually."
      );
    }
    return scannedItems.length > 0;
  };

  const readFileText = (file) =>
    new Promise(async (resolve) => {
      if (!file) return resolve("");

      if (file.type === "application/pdf" || /\.pdf$/i.test(file.name || "")) {
        try {
          return resolve(await readPdfText(file));
        } catch (err) {
          return resolve("");
        }
      }

      if (!/\.(csv|txt)$/i.test(file.name || "")) return resolve("");

      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve("");
      reader.readAsText(file);
    });

  const handleBillFileSelected = async (file) => {
    setSelectedFile(file || null);
    setUploadedFileData(null);
    setUploadError("");
    setScanMessage("");
    if (!file) return;

    setExtracting(true);
    try {
      const text = await readFileText(file);
      let hasProductRows = applyExtractedBill(extractBillFromText(text, file.name));
      if (text && !hasProductRows && file.type === "application/pdf") {
        setScanMessage(
          "PDF text was read, but product rows were not detected. Please add rows manually."
        );
      }

      let scannedData = null;
      try {
        scannedData = await scanBillFile(
          file,
          form.reference_no || form.organisation || file.name,
          token
        );
      } catch (err) {
        setScanMessage(
          "Backend scan was unavailable. Continuing with local image scan."
        );
      }
      if (scannedData) {
        hasProductRows =
          applyExtractedBill(normalizeExtractedBill(scannedData, file.name)) ||
          hasProductRows;
      }

      const fileData = await uploadBillFile(
        file,
        form.reference_no || form.organisation || file.name,
        token
      );
      setUploadedFileData(fileData);
      setForm((prev) => ({
        ...prev,
        bill_file_url: fileData?.url || prev.bill_file_url,
        bill_file_path: fileData?.path || prev.bill_file_path,
        bill_file_name: fileData?.name || file.name,
        bill_file_type: fileData?.type || file.type,
      }));
      hasProductRows =
        applyExtractedBill(normalizeExtractedBill(fileData?.extracted, file.name)) ||
        hasProductRows;
      if (!hasProductRows && fileNeedsOcr(file)) {
        setScanMessage(
          file.type === "application/pdf"
            ? "PDF uploaded, but the scan service did not return readable text or product rows. Please add rows manually."
            : "Image uploaded, but OCR did not return product rows. Please add rows manually or upload a clearer bill image."
        );
      }
    } catch (err) {
      setUploadError(
        err?.message ||
          "Unable to read this bill. You can still enter details manually."
      );
    } finally {
      setExtracting(false);
    }
  };

  const updateProductRow = (index, name, value) => {
    setProductRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [name]: value } : row
      )
    );
  };

  const addProductRow = () => {
    setProductRows((prev) => [...prev, emptyProductRow]);
  };

  const removeProductRow = (index) => {
    setProductRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setSelectedFile(null);
    setUploadedFileData(null);
    setProductRows([]);
    setScanMessage("");
    setUploadError("");
  };

  const buildPayload = (fileData = null) => {
    const savedAttachment =
      form.bill_file_url || form.bill_file_path || form.bill_file_name
        ? {
            url: form.bill_file_url,
            path: form.bill_file_path,
            name: form.bill_file_name,
            type: form.bill_file_type,
          }
        : null;
    const attachmentData = fileData || savedAttachment;
    const attachments = attachmentData
      ? [
          {
            url: attachmentData.url,
            path: attachmentData.path,
            name: attachmentData.name,
            originalName: attachmentData.originalName,
            type: attachmentData.type,
            size: attachmentData.size,
            bucket: attachmentData.bucket,
          },
        ]
      : [];
    const lineItems = productRows
      .map(normalizeProductRow)
      .filter((item) =>
        Object.values(item).some((value) => String(value || "").trim())
      );

    const payload = {
      bill_date: form.bill_date,
      organisation_name: form.organisation,
      organisation_type: organisationConfig.label || "vendor",
      bill_category:
        billCategoryByExpenseType[form.expense_type] ||
        normalizeApiValue(form.expense_type) ||
        "expense",
      expense_type: normalizeApiValue(form.expense_type) || "expense",
      reference_no: form.reference_no || null,
      amount: form.amount === "" ? null : Number(form.amount),
      tax_amount: form.tax_amount === "" ? null : Number(form.tax_amount),
      total_amount:
        form.total_amount === "" ? null : Number(form.total_amount),
      status: form.status,
      due_date: form.due_date || null,
      paid_date: form.paid_date || null,
      notes: form.notes || null,
    };

    if (attachments.length) {
      payload.attachments = attachments.map((attachment) =>
        Object.fromEntries(
          Object.entries(attachment).filter(
            ([, value]) => value !== undefined && value !== null && value !== ""
          )
        )
      );
    }

    if (lineItems.length) {
      payload.items = lineItems;
      payload.line_items = lineItems;
    }

    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploadError("");
    setUploading(true);

    try {
      const fileData = uploadedFileData
        ? uploadedFileData
        : selectedFile
        ? await uploadBillFile(
            selectedFile,
            form.reference_no || form.organisation,
            token
          )
        : null;
      const payload = buildPayload(fileData);

      if (editingId) {
        dispatch(updateCatalogEntity({ entity, id: editingId, payload }));
      } else {
        dispatch(createCatalogEntity({ entity, payload }));
      }

      resetForm();
    } catch (err) {
      setUploadError(err?.message || "Unable to upload bill soft copy.");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (bill) => {
    setEditingId(getId(bill));
    setForm({
      bill_date: toDateInput(getBillDate(bill)),
      organisation: bill.organisation_name || bill.organisation || "",
      expense_type: getExpenseType(bill),
      reference_no: bill.reference_no || bill.bill_no || "",
      amount: bill.amount ?? "",
      tax_amount: bill.tax_amount ?? bill.tax ?? "",
      total_amount: bill.total_amount ?? bill.total ?? "",
      status: getStatus(bill),
      due_date: toDateInput(bill.due_date),
      paid_date: toDateInput(bill.paid_date || bill.payment_date),
      notes: bill.notes || "",
      bill_file_url:
        getBillAttachment(bill)?.url || bill.bill_file_url || bill.file_url || "",
      bill_file_path:
        getBillAttachment(bill)?.path || bill.bill_file_path || bill.file_path || "",
      bill_file_name:
        getBillAttachment(bill)?.name || bill.bill_file_name || bill.file_name || "",
      bill_file_type:
        getBillAttachment(bill)?.type || bill.bill_file_type || bill.file_type || "",
    });
    setProductRows(getBillItems(bill).map(normalizeProductRow));
    setSelectedFile(null);
    setUploadedFileData(null);
    setScanMessage("");
    setUploadError("");
  };

  const handleDelete = (bill) => {
    const id = getId(bill);
    if (!id) return;
    if (window.confirm("Delete this bill or expense?")) {
      dispatch(deleteCatalogEntity({ entity, id }));
    }
  };

  return (
    <StockManagerLayout>
      <main className="space-y-4">
        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Bills & Expenses
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Track supplier bills, transport, loading, outlet maintenance,
                electricity, repairs, and other outgoing payments.
              </p>
            </div>
            <button
              type="button"
              onClick={loadBills}
              disabled={loading}
              className="inline-flex h-11 min-w-[118px] items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:bg-gray-400"
            >
              <RefreshCw size={16} />
              {loading ? "Loading" : "Refresh"}
            </button>
          </div>
        </section>

        {error || successMessage || uploadError ? (
          <div
            className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
              error || uploadError
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {error || uploadError || successMessage}
          </div>
        ) : null}

        <section className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">Bills</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {totals.count}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">
              Total Expenses
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {money(totals.total)}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">Paid</div>
            <div className="mt-2 text-2xl font-bold text-green-700">
              {money(totals.paid)}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">Pending</div>
            <div className="mt-2 text-2xl font-bold text-amber-700">
              {money(totals.pending)}
            </div>
          </div>
        </section>

        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">
            {editingId ? "Edit Bill" : "Add Bill"}
          </h2>
          <form
            onSubmit={handleSubmit}
            className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4"
          >
            <label className="block">
              <span className="text-xs font-bold text-gray-600">Date</span>
              <input
                type="date"
                value={form.bill_date}
                onChange={(e) => handleChange("bill_date", e.target.value)}
                required
                className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-gray-600">
                Organisation
              </span>
              {organisationOptions.length ? (
                <select
                  value={form.organisation}
                  onChange={(e) =>
                    handleChange("organisation", e.target.value)
                  }
                  required
                  className="mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">Select {organisationConfig.label}</option>
                  {organisationOptions.map((stakeholder) => {
                    const name = getStakeholderName(stakeholder);
                    return (
                      <option
                        key={
                          stakeholder.id || stakeholder.stakeholder_id || name
                        }
                        value={name}
                      >
                        {name}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <input
                  value={form.organisation}
                  onChange={(e) =>
                    handleChange("organisation", e.target.value)
                  }
                  required
                  placeholder={`No ${organisationConfig.label}s found in Stakeholders`}
                  className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200"
                />
              )}
            </label>

            <label className="block">
              <span className="text-xs font-bold text-gray-600">Type</span>
              <select
                value={form.expense_type}
                onChange={(e) => handleChange("expense_type", e.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200"
              >
                {expenseTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-bold text-gray-600">
                Reference No.
              </span>
              <input
                value={form.reference_no}
                onChange={(e) => handleChange("reference_no", e.target.value)}
                placeholder="Bill / invoice number"
                className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-gray-600">Amount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => handleChange("amount", e.target.value)}
                required
                className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-gray-600">Tax</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.tax_amount}
                onChange={(e) => handleChange("tax_amount", e.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-gray-600">
                Grand Total
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.total_amount}
                onChange={(e) => handleChange("total_amount", e.target.value)}
                required
                className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-gray-600">Status</span>
              <select
                value={form.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-bold text-gray-600">Due Date</span>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => handleChange("due_date", e.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-gray-600">Paid Date</span>
              <input
                type="date"
                value={form.paid_date}
                onChange={(e) => handleChange("paid_date", e.target.value)}
                disabled={form.status !== "Paid"}
                className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200 disabled:bg-gray-100"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-xs font-bold text-gray-600">Notes</span>
              <input
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Transport route, repair details, payment note"
                className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200"
              />
            </label>

            <div className="md:col-span-4">
              <span className="text-xs font-bold text-gray-600">
                Bill Soft Copy
              </span>
              <div className="mt-1 flex flex-col gap-2 rounded-lg border border-dashed border-gray-300 bg-slate-50 p-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-gray-800">
                    {selectedFile?.name ||
                      form.bill_file_name ||
                      "No bill file selected"}
                  </div>
                  {extracting ? (
                    <div className="mt-1 text-xs font-semibold text-blue-700">
                      Scanning bill content and filling fields...
                    </div>
                  ) : null}
                  {form.bill_file_url ? (
                    <a
                      href={form.bill_file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800"
                    >
                      <ExternalLink size={14} />
                      Open saved bill
                    </a>
                  ) : (
                    <div className="mt-1 text-xs text-gray-500">
                      Upload PDF/image or take a photo from camera.
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-bold text-gray-700 hover:bg-gray-100">
                    <Upload size={16} />
                    Upload
                    <input
                      type="file"
                      accept={billFileAccept}
                      onChange={(e) =>
                        handleBillFileSelected(e.target.files?.[0] || null)
                      }
                      className="hidden"
                    />
                  </label>
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-bold text-gray-700 hover:bg-gray-100">
                    <Camera size={16} />
                    Camera
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) =>
                        handleBillFileSelected(e.target.files?.[0] || null)
                      }
                      className="hidden"
                    />
                  </label>
                  {selectedFile ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setUploadedFileData(null);
                      }}
                      className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm font-bold text-gray-700 hover:bg-gray-100"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="md:col-span-4">
              <div className="flex flex-col gap-2 border-t pt-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-bold text-gray-900">
                    Product Details
                  </div>
                  <div className="text-xs text-gray-500">
                    Scan collects product name, quantity, unit, rate, tax, total,
                    and grand total where available.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addProductRow}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-bold text-gray-700 hover:bg-gray-100"
                >
                  <Plus size={16} />
                  Add Product
                </button>
              </div>

              {scanMessage ? (
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
                  {scanMessage}
                </div>
              ) : null}

              {productRows.length ? (
                <div className="mt-3 overflow-x-auto rounded-lg border">
                  <table className="min-w-[920px] w-full text-sm">
                    <thead className="bg-slate-100 text-xs text-gray-600">
                      <tr>
                        <th className="px-2 py-2 text-left">Product</th>
                        <th className="px-2 py-2 text-left">HSN</th>
                        <th className="px-2 py-2 text-right">Qty</th>
                        <th className="px-2 py-2 text-left">Unit</th>
                        <th className="px-2 py-2 text-right">Rate</th>
                        <th className="px-2 py-2 text-right">Tax</th>
                        <th className="px-2 py-2 text-right">Total</th>
                        <th className="px-2 py-2 text-right">Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productRows.map((row, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-2 py-2">
                            <input
                              value={row.product_name}
                              onChange={(e) =>
                                updateProductRow(
                                  index,
                                  "product_name",
                                  e.target.value
                                )
                              }
                              className="h-9 w-full rounded-md border border-gray-300 px-2 outline-none focus:border-slate-600"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              value={row.hsn_code}
                              onChange={(e) =>
                                updateProductRow(index, "hsn_code", e.target.value)
                              }
                              className="h-9 w-full rounded-md border border-gray-300 px-2 outline-none focus:border-slate-600"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.quantity}
                              onChange={(e) =>
                                updateProductRow(index, "quantity", e.target.value)
                              }
                              className="h-9 w-full rounded-md border border-gray-300 px-2 text-right outline-none focus:border-slate-600"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              value={row.unit}
                              onChange={(e) =>
                                updateProductRow(index, "unit", e.target.value)
                              }
                              className="h-9 w-full rounded-md border border-gray-300 px-2 outline-none focus:border-slate-600"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.unit_price}
                              onChange={(e) =>
                                updateProductRow(index, "unit_price", e.target.value)
                              }
                              className="h-9 w-full rounded-md border border-gray-300 px-2 text-right outline-none focus:border-slate-600"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.tax_amount}
                              onChange={(e) =>
                                updateProductRow(index, "tax_amount", e.target.value)
                              }
                              className="h-9 w-full rounded-md border border-gray-300 px-2 text-right outline-none focus:border-slate-600"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.total_amount}
                              onChange={(e) =>
                                updateProductRow(
                                  index,
                                  "total_amount",
                                  e.target.value
                                )
                              }
                              className="h-9 w-full rounded-md border border-gray-300 px-2 text-right outline-none focus:border-slate-600"
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeProductRow(index)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-red-700 hover:bg-red-50"
                              title="Remove product"
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-slate-50 px-3 py-4 text-sm text-gray-500">
                  No product rows yet. Upload a bill with item details or add
                  products manually.
                </div>
              )}
            </div>

            <div className="flex items-end gap-2 md:col-span-4">
              <button
                type="submit"
                disabled={loading || uploading || extracting}
                className="inline-flex h-11 min-w-[110px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-gray-400"
              >
                <FileText size={16} />
                {uploading || extracting
                  ? "Uploading"
                  : editingId
                  ? "Update"
                  : "Save"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <div className="grid gap-3 border-b p-4 md:grid-cols-[1fr_180px_180px]">
              <label className="relative block">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search organisation, reference, notes"
                  className="h-11 w-full rounded-lg border border-gray-300 pl-10 pr-3 text-sm outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200"
                />
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200"
              >
                <option value="all">All Types</option>
                {expenseTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200"
              >
                <option value="all">All Status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="max-h-[70vh] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Organisation</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Reference</th>
                    <th className="px-3 py-2 text-left">Soft Copy</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-3 py-8 text-center">
                        Loading bills...
                      </td>
                    </tr>
                  ) : filteredBills.length ? (
                    filteredBills.map((bill) => {
                      const billId = getId(bill);
                      const items = getBillItems(bill).map(normalizeProductRow);
                      const isExpanded = expandedBillId === billId;

                      return (
                        <React.Fragment key={billId}>
                          <tr
                            className="cursor-pointer border-t hover:bg-slate-50"
                            onClick={() =>
                              setExpandedBillId(isExpanded ? null : billId)
                            }
                          >
                            <td className="whitespace-nowrap px-3 py-2">
                              <span className="inline-flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown size={16} />
                                ) : (
                                  <ChevronRight size={16} />
                                )}
                                {displayDate(getBillDate(bill))}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-semibold text-gray-900">
                              {getOrganisationName(bill)}
                            </td>
                            <td className="px-3 py-2">{getExpenseType(bill)}</td>
                            <td className="px-3 py-2">
                              {bill.reference_no || bill.bill_no || "-"}
                            </td>
                            <td className="px-3 py-2">
                              {getBillAttachment(bill)?.url ||
                              bill.bill_file_url ||
                              bill.file_url ? (
                                <a
                                  href={
                                    getBillAttachment(bill)?.url ||
                                    bill.bill_file_url ||
                                    bill.file_url
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                  className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-800"
                                >
                                  <ExternalLink size={14} />
                                  Open
                                </a>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                                {getStatus(bill)}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-bold">
                              {money(getTotal(bill))}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="inline-flex gap-2">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleEdit(bill);
                                  }}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-blue-700 hover:bg-blue-50"
                                  title="Edit bill"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDelete(bill);
                                  }}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 text-red-700 hover:bg-red-50"
                                  title="Delete bill"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded ? (
                            <tr className="border-t bg-slate-50">
                              <td colSpan="8" className="px-3 py-3">
                                {items.length ? (
                                  <div className="overflow-x-auto rounded-lg border bg-white">
                                    <table className="min-w-[760px] w-full text-sm">
                                      <thead className="bg-slate-100 text-xs text-gray-600">
                                        <tr>
                                          <th className="px-3 py-2 text-left">
                                            Product
                                          </th>
                                          <th className="px-3 py-2 text-left">
                                            HSN
                                          </th>
                                          <th className="px-3 py-2 text-right">
                                            Qty
                                          </th>
                                          <th className="px-3 py-2 text-left">
                                            Unit
                                          </th>
                                          <th className="px-3 py-2 text-right">
                                            Rate
                                          </th>
                                          <th className="px-3 py-2 text-right">
                                            Tax
                                          </th>
                                          <th className="px-3 py-2 text-right">
                                            Total
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {items.map((item, index) => (
                                          <tr key={index} className="border-t">
                                            <td className="px-3 py-2 font-semibold text-gray-900">
                                              {item.product_name || "-"}
                                            </td>
                                            <td className="px-3 py-2">
                                              {item.hsn_code || "-"}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                              {item.quantity || "-"}
                                            </td>
                                            <td className="px-3 py-2">
                                              {item.unit || "-"}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                              {item.unit_price
                                                ? money(item.unit_price)
                                                : "-"}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                              {item.tax_amount
                                                ? money(item.tax_amount)
                                                : "-"}
                                            </td>
                                            <td className="px-3 py-2 text-right font-bold">
                                              {item.total_amount
                                                ? money(item.total_amount)
                                                : "-"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-4 text-sm text-gray-500">
                                    No product details saved for this bill.
                                  </div>
                                )}
                              </td>
                            </tr>
                          ) : null}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="8"
                        className="px-3 py-8 text-center text-gray-500"
                      >
                        No bills or expenses found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
              <CalendarDays size={17} />
              Expense Types
            </div>
            <div className="mt-4 space-y-3">
              {typeSummary.length ? (
                typeSummary.map((item) => (
                  <div key={item.type}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-gray-700">
                        {item.type}
                      </span>
                      <span className="font-bold text-gray-900">
                        {money(item.amount)}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{
                          width: `${Math.max(
                            6,
                            (item.amount / Math.max(totals.total, 1)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">
                  Expense summary appears after bills are added.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </StockManagerLayout>
  );
};

export default AccountsBillsPage;
