import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Activity,
  AlertTriangle,
  Barcode,
  CheckCircle2,
  Clock3,
  Edit3,
  ImagePlus,
  ListChecks,
  PackagePlus,
  RefreshCw,
  RotateCcw,
  Search,
  UploadCloud,
} from "lucide-react";

import StockManagerLayout from "../components/StockManagerLayout";
import {
  fetchAllProductsFresh,
  fetchProductByBarcode,
  updateProduct,
} from "../features/products/productSlice";
import {
  createCatalogEntity,
  fetchCatalogEntity,
  updateCatalogEntity,
} from "../features/inventory/catalogCrudSlice";
import { receiveVerifiedPurchaseToInventory } from "../features/inventory/inventoryMovementSlice";
import {
  createInventoryDispatchOrder,
  createPurchaseOrderWithItems,
  fetchInventoryDispatchOrders,
  fetchInventoryProducts,
  fetchPurchaseOrders,
  receiveDispatchToOutlet,
  updateInventoryDispatchStatus,
} from "../features/inventory/stockManagerInventorySlice";
import {
  downloadAndCompressImage,
  findProductImageByName,
  searchProductImageSuggestions,
  uploadProductImageFromUrl,
  uploadProductImage,
} from "../utils/migrationImage";
import { searchLegacyProducts } from "../utils/legacyProducts";
import { toWholeRupees } from "../utils/orderDiscount";
import { API_BASE_URL } from "../utils/apiConfig";
import { applyHsnGstFallback } from "../utils/hsnGstMapping";

const normalizeText = (value) => String(value || "").trim().toLowerCase();
const asArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const getProductName = (product) =>
  product?.name ||
  product?.product_name_eng ||
  product?.productNameEng ||
  product?.product_name_english ||
  product?.product_name ||
  product?.englishname ||
  product?.english_name ||
  product?.productName ||
  product?.productname ||
  product?.product?.product_name_eng ||
  "";

const getFirstBrand = (product) => asArray(product?.details || product?.brands)[0] || {};
const getFirstFinancial = (brand) => asArray(brand?.financials)[0] || {};
const getBrandName = (brand) =>
  brand?.brand ||
  brand?.brand_name ||
  brand?.brand_name_english ||
  brand?.name ||
  "";
const getCategoryName = (product) =>
  product?.category ||
  product?.category_name ||
  product?.category_name_english ||
  product?.categoryNameEnglish ||
  product?.categoryName ||
  product?.product?.category_name_english ||
  "";
const getProductImageUrl = (product) =>
  asArray(product?.images)[0]?.image ||
  asArray(product?.images)[0]?.url ||
  product?.image ||
  product?.imageUrl ||
  product?.product?.image ||
  "";

const getProductBarcodes = (product) => [
  ...asArray(product?.barcode),
  product?.mk_barcode,
  product?.mkid,
  product?.barcodeValue,
  ...asArray(getFirstFinancial(getFirstBrand(product))?.barcode),
].filter(Boolean);

const uniqueValues = (values) =>
  Array.from(new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean)));

const getProductSearchText = (product) =>
  [
    getProductName(product),
    product?.productName,
    product?.productname,
    product?.englishname,
    product?.teluguname,
    product?.brand,
    product?.brand_name,
    product?.category,
    product?.category_name,
    ...getProductBarcodes(product),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const sameNormalizedText = (left, right) =>
  normalizeText(left).replace(/\s+/g, " ") === normalizeText(right).replace(/\s+/g, " ");

const getLegacyBarcode = (item) =>
  asArray(item?.barcode)[0] ||
  item?.bar_code ||
  item?.barcode1 ||
  item?.barcode_1 ||
  item?.mk_barcode ||
  "";

const getLegacyPrice = (item) =>
  pickId(item?.MRP, item?.mrp, item?.price, item?.selling_price, item?.dprice, "");

const getLegacySellingPrice = (item) =>
  pickId(item?.dprice, item?.sellingPrice, item?.salePrice, item?.selling_price, item?.price, "");

const getLegacyWeightPack = (item) =>
  makeWeightPack(
    pickId(item?.quantity, item?.packQuantity, item?.weight, item?.qty),
    pickId(item?.units, item?.unit, item?.unit_short_code)
  );

const numberOrNull = (value) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};

const pickId = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");
const PACK_DELIMITER = " | ";

const makeWeightPack = (quantity, units) => {
  const qty = String(quantity ?? "").trim();
  const unit = String(units ?? "").trim();

  if (qty && unit) return `${qty}${PACK_DELIMITER}${unit}`;
  return qty || unit;
};

const getBarcodeQuantity = (item) =>
  pickId(
    item?.quantity,
    item?.barcode_quantity,
    item?.catalog_quantity,
    item?.catalogQuantity
  );

const getBarcodeWeight = (item) =>
  pickId(
    item?.weight,
    item?.unit_short_code,
    item?.unit_name,
    item?.units,
    item?.unit
  );

const getBarcodePackText = (item) =>
  makeWeightPack(getBarcodeQuantity(item), getBarcodeWeight(item));

const getProductSuggestionWeight = (product) => {
  const financial = getFirstFinancial(getFirstBrand(product));
  return makeWeightPack(
    pickId(product?.quantity, product?.catalogQuantity, financial?.quantity, financial?.weight),
    pickId(product?.units, financial?.units)
  );
};

const getProductSuggestionStock = (product) => {
  const financial = getFirstFinancial(getFirstBrand(product));
  return pickId(
    product?.countInStock,
    product?.stock,
    product?.qty,
    financial?.countInStock,
    financial?.quantityInStock,
    financial?.stock
  );
};

const splitWeightPack = (value) => {
  const text = String(value || "").trim();
  if (!text) return { quantity: "", units: "" };

  const [quantity, ...unitParts] = text.includes("|")
    ? text.split("|")
    : text.match(/^(\d+(?:\.\d+)?)\s+(.+)$/)?.slice(1) || text.split(PACK_DELIMITER);
  return {
    quantity: String(quantity || "").trim(),
    units: unitParts.join("|").trim(),
  };
};

const normalizeUnitText = (value) => {
  const text = normalizeText(value).replace(/[^a-z0-9]/g, "");

  if (["kg", "kgs", "kilogram", "kilograms"].includes(text)) return "kg";
  if (["g", "gm", "gms", "gram", "grams", "grammes", "gramme"].includes(text)) return "gms";
  if (["ltr", "ltrs", "lt", "lts", "liter", "liters", "litre", "litres"].includes(text)) return "ltr";
  if (["ml", "milliliter", "milliliters", "millilitre", "millilitres"].includes(text)) return "ml";
  if (["pc", "pcs", "piece", "pieces", "unit", "units", "nos", "no"].includes(text)) return "pcs";

  return text;
};

const getUnitLabel = (unit) =>
  [unit?.unit_short_code, unit?.unit_name].filter(Boolean).join(" - ") ||
  String(unit?.id || "");

const findCatalogUnit = (units, value) => {
  const text = normalizeText(value);
  const normalizedUnit = normalizeUnitText(value);
  if (!text) return null;

  return units.find((unit) =>
    [
      unit.id,
      unit.unit_short_code,
      unit.unit_name,
      unit.unit_code,
      unit.name,
      getUnitLabel(unit),
    ]
      .filter(Boolean)
      .some(
        (candidate) =>
          normalizeText(candidate) === text ||
          normalizeText(candidate).replace(/\s+/g, "") === text.replace(/\s+/g, "") ||
          normalizeUnitText(candidate) === normalizedUnit
      )
  );
};

const makeMkBarcode = ({
  product_id,
  brand_id,
  category_id,
  unit_id,
  quantity,
}) => {
  const pad = (num, size) => String(num || "").padStart(size, "0");

  return (
    "890" +
    pad(product_id, 4) +
    pad(brand_id, 3) +
    pad(category_id, 2) +
    pad(parseInt(quantity || 0, 10), 3)
  );
};

const getNextReadableCode = (rows = [], codeField, prefix) => {
  let max = 0;

  rows.forEach((row) => {
    const code = String(row?.[codeField] || "").trim();

    if (code.startsWith(prefix)) {
      const num = parseInt(code.replace(prefix, ""), 10);
      if (!Number.isNaN(num)) max = Math.max(max, num);
    }
  });

  return `${prefix}${String(max + 1).padStart(3, "0")}`;
};

const getEntityId = (payload) =>
  pickId(
    payload?.id,
    payload?.data?.id,
    payload?.data?.[0]?.id,
    payload?.rows?.[0]?.id,
    payload?.data?.rows?.[0]?.id,
    payload?.data?.row?.id,
    payload?.data?.entity?.id,
    payload?.data?.brand?.id,
    payload?.data?.category?.id,
    payload?.data?.product?.id,
    payload?.data?.productBarcode?.id,
    payload?.data?.product_barcode?.id,
    payload?.data?.inventoryProduct?.id,
    payload?.data?.order?.id,
    payload?.row?.id,
    payload?.entity?.id,
    payload?.brand?.id,
    payload?.category?.id,
    payload?.product?.id,
    payload?.productBarcode?.id,
    payload?.inventoryProduct?.id,
    payload?.order?.id
  );

const getCatalogProductId = (payload) =>
  pickId(
    getEntityId(payload),
    payload?.product_id,
    payload?.catalogProductId,
    payload?.catalog_product_id,
    payload?.data?.product_id,
    payload?.data?.catalogProductId,
    payload?.data?.catalog_product_id,
    payload?.data?.product?.product_id,
    payload?.product?.product_id
  );

const normalizeRows = (payload, keys = []) => {
  if (Array.isArray(payload)) return payload;

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  }

  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data?.rows)) return payload.data.rows;
  return [];
};

const getRequestId = (request) =>
  pickId(request?.id, request?._id, request?.request_id, request?.requestId);

const getRequestStatus = (request) =>
  String(request?.status || request?.request_status || request?.state || "").toLowerCase();

const getRequestType = (request) =>
  String(request?.request_type || request?.type || "").toLowerCase();

const getRequestKey = (request) =>
  pickId(request?.request_key, request?.requestKey, request?.key, request?.tracking_key, request?.trackingKey);

const getRequestPayload = (request) => {
  const payload = request?.payload || request?.request_payload || request?.event_payload;
  if (!payload) return {};
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      return {};
    }
  }
  return payload;
};

const formatMoneyValue = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return `Rs ${amount}`;
};

const getTrackingRequestTitle = (request) => {
  const payload = getRequestPayload(request);
  const firstItem = asArray(payload.items || payload.dispatch_items || payload.products)[0] || payload;
  const product = pickId(
    firstItem.product_name,
    firstItem.product_name_eng,
    firstItem.name,
    payload.product_name,
    payload.product_name_eng
  );
  const brand = pickId(
    firstItem.brand_name,
    firstItem.brand_name_english,
    payload.brand_name,
    payload.brand_name_english
  );
  const category = pickId(
    firstItem.category_name,
    firstItem.category_name_english,
    payload.category_name,
    payload.category_name_english
  );
  const quantity = pickId(firstItem.quantity, firstItem.barcode_quantity, firstItem.qty, payload.quantity);
  const unit = pickId(firstItem.unit, firstItem.unit_name, firstItem.unit_short_code, payload.unit);
  const amount = formatMoneyValue(
    pickId(
      firstItem.amount,
      firstItem.total,
      firstItem.total_price,
      firstItem.actual_unit_price,
      firstItem.unit_price,
      payload.amount,
      payload.total
    )
  );
  const pieces = [
    product,
    brand,
    category,
    quantity && unit ? `${quantity}${unit}` : quantity || unit,
    amount,
  ].filter(Boolean);

  if (pieces.length) return pieces.join(" | ");
  return getRequestKey(request) || `Request ${getRequestId(request) || "-"}`;
};

const getTrackingRequestSubtitle = (request) => {
  const payload = getRequestPayload(request);
  return [
    payload.dispatch_no || getRequestKey(request),
    request.request_type || request.type || "Migration",
    formatTrackingDate(request.created_at || request.createdAt || request.started_at),
  ]
    .filter(Boolean)
    .join(" | ");
};

const getStepId = (step) => pickId(step?.id, step?._id, step?.step_id, step?.stepId);

const getStepStatus = (step) =>
  String(step?.status || step?.step_status || step?.state || "").toLowerCase();

const isFailedStatus = (status) =>
  ["failed", "error", "retry_failed"].includes(String(status || "").toLowerCase());

const formatTrackingDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const TRACKING_REQUEST_TIMEOUT_MS = 8000;

const toRequiredNumber = (value) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};

const calculateSellingPrice = (price, discount) => {
  const mrp = Number(price);
  const discountPercent = Number(discount);

  if (!Number.isFinite(mrp) || !Number.isFinite(discountPercent)) return "";
  return toWholeRupees(mrp - (mrp * discountPercent) / 100);
};

const makeBatchId = () => {
  const d = new Date();
  const ymd = d.toISOString().slice(0, 10).replaceAll("-", "");
  const time = String(d.getTime()).slice(-5);
  return Number(`${ymd}${time}`);
};

const makeSkuId = ({ productCode, batchId, expDate }) => {
  const code = String(productCode || "MKP").replace(/\s+/g, "");
  const exp = expDate ? String(expDate).replaceAll("-", "") : "NOEXP";
  return `${code}-B${batchId}-${exp}`;
};

const fieldClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
const buttonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold";

const migrationStageConfigs = {
  outlet: [
    { key: "start", label: "Start" },
    { key: "catalog", label: "Catalog tables check" },
    { key: "barcode", label: "Product barcode check" },
    { key: "purchase", label: "Raise purchase request" },
    { key: "inventory", label: "Add to inventory" },
    { key: "dispatch", label: "Dispatch to outlet" },
    { key: "mongoOutlet", label: "Outlet Mongo stock" },
  ],
  inventory: [
    { key: "start", label: "Start" },
    { key: "catalog", label: "Catalog tables check" },
    { key: "barcode", label: "Product barcode check" },
    { key: "purchase", label: "Raise purchase request" },
    { key: "inventory", label: "Add to inventory" },
  ],
};

const createStageState = (mode) =>
  Object.fromEntries(
    migrationStageConfigs[mode].map((stage) => [
      stage.key,
      {
        status: "pending",
        detail:
          stage.key === "catalog"
            ? "Check product, brand, category and unit. Insert missing catalog rows."
            : stage.key === "barcode"
              ? "Check product_barcode. Insert if not available."
              : "",
      },
    ])
  );

const getStageBadgeClass = (status) => {
  if (status === "running") return "bg-blue-100 text-blue-700";
  if (status === "done") return "bg-green-100 text-green-700";
  if (status === "inserted") return "bg-emerald-100 text-emerald-700";
  if (status === "updated") return "bg-cyan-100 text-cyan-700";
  if (status === "skipped") return "bg-gray-100 text-gray-600";
  if (status === "failed") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-500";
};

const getStageBadgeText = (status) => {
  if (status === "running") return "Running";
  if (status === "done") return "Checked";
  if (status === "inserted") return "Inserted";
  if (status === "updated") return "Updated";
  if (status === "skipped") return "Skipped";
  if (status === "failed") return "Failed";
  return "Pending";
};

const emptyFinancial = {
  quantity: "",
  unit_id: "",
  price: "",
  dprice: "",
  discount: "",
  countInStock: "",
  barcode: "",
};

const MigrationStagePanel = ({ mode, stages }) => (
  <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/40 p-3">
    <div className="mb-3 flex items-center gap-2">
      <ListChecks size={18} className="text-blue-700" />
      <h3 className="font-bold text-gray-900">
        {mode === "outlet" ? "Outlet Migration Stages" : "Inventory Migration Stages"}
      </h3>
    </div>
    <div className="space-y-2">
      {migrationStageConfigs[mode].map((stage, index) => {
        const state = stages?.[stage.key] || { status: "pending", detail: "" };

        return (
          <div
            key={stage.key}
            className="grid grid-cols-[28px_1fr_auto] items-start gap-2 rounded-lg border border-white bg-white px-3 py-2 shadow-sm"
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                state.status === "failed"
                  ? "bg-red-600 text-white"
                  : state.status === "pending"
                    ? "bg-slate-200 text-slate-600"
                    : "bg-blue-600 text-white"
              }`}
            >
              {index + 1}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-gray-900">{stage.label}</div>
              {state.detail ? (
                <div className="mt-0.5 text-xs font-medium text-gray-600">{state.detail}</div>
              ) : null}
            </div>
            <span
              className={`rounded-full px-2 py-1 text-[11px] font-bold uppercase ${getStageBadgeClass(
                state.status
              )}`}
            >
              {getStageBadgeText(state.status)}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

const ApplicationMigrationHelperPage = () => {
  const dispatch = useDispatch();
  const migrationInFlightRef = useRef(false);
  const token = useSelector((state) => state.posUser?.userInfo?.token);
  const { data: catalogData = {}, loading: catalogLoading } = useSelector(
    (state) => state.catalogCrud || {}
  );
  const productLoading = useSelector((state) => state.products?.loading);
  const productsList = useSelector((state) => {
    const all = state.products?.all;
    if (Array.isArray(all)) return all;
    if (Array.isArray(all?.products)) return all.products;
    return [];
  });

  const [barcode, setBarcode] = useState("");
  const [migrationMode, setMigrationMode] = useState("outlet");
  const [productLookupOpen, setProductLookupOpen] = useState(false);
  const [legacyProductMatches, setLegacyProductMatches] = useState([]);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [scanMessage, setScanMessage] = useState("");
  const [activeAction, setActiveAction] = useState("stock");
  const [productName, setProductName] = useState("");
  const [selectedCatalogProductId, setSelectedCatalogProductId] = useState("");
  const [productForm, setProductForm] = useState({
    product_name_eng: "",
    product_name_tel: "",
    gst_rate: "",
    hsn_code: "",
    brand_id: "",
    brand_name: "",
    category_id: "",
    category_name: "",
  });
  const [financialForm, setFinancialForm] = useState(emptyFinancial);
  const [outletPostingForm, setOutletPostingForm] = useState({
    warehouse_id: "",
    supplier_id: "",
    outlet_id: "",
    batch_id: makeBatchId(),
    no_of_units: "1",
    unit_price: "",
    mfg_date: "",
    exp_date: "",
    sku_id: "",
    mk_barcode: "",
    vendor_barcode: "",
    remarks: "Outlet migration stock entry",
  });
  const [imageName, setImageName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageSuggestions, setImageSuggestions] = useState([]);
  const [imageSuggestionsOpen, setImageSuggestionsOpen] = useState(false);
  const [existingImageUrl, setExistingImageUrl] = useState("");
  const [resolvedImageUrl, setResolvedImageUrl] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryLookupOpen, setInventoryLookupOpen] = useState(false);
  const [legacyInventoryMatches, setLegacyInventoryMatches] = useState([]);
  const [selectedInventoryBarcode, setSelectedInventoryBarcode] = useState(null);
  const [inventoryForm, setInventoryForm] = useState({
    batch_id: makeBatchId(),
    warehouse_id: "",
    supplier_id: "",
    product_name_eng: "",
    product_name_tel: "",
    brand_name: "",
    category_name: "",
    hsn_code: "",
    gst_rate: "",
    mk_barcode: "",
    vendor_barcode: "",
    quantity: "",
    unit_id: "",
    qty: "",
    no_of_units: "1",
    unit_price: "",
    mfg_date: "",
    exp_date: "",
    sku_id: "",
    remarks: "Migration stock entry",
  });
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [productEditBusy, setProductEditBusy] = useState(false);
  const [inventorySaveBusy, setInventorySaveBusy] = useState(false);
  const [outletSaveBusy, setOutletSaveBusy] = useState(false);
  const [trackingStatusFilter, setTrackingStatusFilter] = useState("failed");
  const [trackingRequests, setTrackingRequests] = useState([]);
  const [trackingSelectedRequest, setTrackingSelectedRequest] = useState(null);
  const [trackingSteps, setTrackingSteps] = useState([]);
  const [trackingEvents, setTrackingEvents] = useState([]);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingMessage, setTrackingMessage] = useState("");
  const [reinitiatingStepId, setReinitiatingStepId] = useState("");
  const [resumingStepId, setResumingStepId] = useState("");
  const [migrationStages, setMigrationStages] = useState({
    outlet: createStageState("outlet"),
    inventory: createStageState("inventory"),
  });

  useEffect(() => {
    dispatch(fetchCatalogEntity("products"));
    dispatch(fetchCatalogEntity("brands"));
    dispatch(fetchCatalogEntity("categories"));
    dispatch(fetchCatalogEntity("units"));
    dispatch(fetchCatalogEntity("product-barcodes"));
    dispatch(fetchCatalogEntity("warehouses"));
    dispatch(fetchCatalogEntity("outlets"));
    dispatch(fetchCatalogEntity("stakeholders"));
    if (token) dispatch(fetchAllProductsFresh({ token }));
    if (token) dispatch(fetchInventoryProducts());
  }, [dispatch, token]);

  const catalogProducts = useMemo(
    () => asArray(catalogData.products),
    [catalogData.products]
  );
  const catalogBrands = useMemo(
    () => asArray(catalogData.brands),
    [catalogData.brands]
  );
  const catalogCategories = useMemo(
    () => asArray(catalogData.categories),
    [catalogData.categories]
  );
  const catalogBarcodes = useMemo(
    () => asArray(catalogData["product-barcodes"]),
    [catalogData]
  );
  const warehouses = useMemo(
    () => asArray(catalogData.warehouses),
    [catalogData.warehouses]
  );
  const outlets = useMemo(
    () => asArray(catalogData.outlets),
    [catalogData.outlets]
  );
  const suppliers = useMemo(
    () =>
      asArray(catalogData.stakeholders).filter((item) =>
        normalizeText(item.stakeholder_type).includes("supplier")
      ),
    [catalogData.stakeholders]
  );
  const units = useMemo(() => asArray(catalogData.units), [catalogData.units]);
  const selectedTrackingRequestId = getRequestId(trackingSelectedRequest);

  useEffect(() => {
    if (productForm.hsn_code && productForm.gst_rate) return;

    const next = applyHsnGstFallback(
      productForm,
      productForm.product_name_eng,
      productName,
      productForm.category_name
    );

    if (next.hsn_code !== productForm.hsn_code || next.gst_rate !== productForm.gst_rate) {
      setProductForm(next);
    }
  }, [
    productForm,
    productForm.product_name_eng,
    productForm.category_name,
    productForm.hsn_code,
    productForm.gst_rate,
    productName,
  ]);

  useEffect(() => {
    if (inventoryForm.hsn_code && inventoryForm.gst_rate) return;

    const next = applyHsnGstFallback(
      inventoryForm,
      inventoryForm.product_name_eng,
      inventorySearch,
      inventoryForm.category_name
    );

    if (next.hsn_code !== inventoryForm.hsn_code || next.gst_rate !== inventoryForm.gst_rate) {
      setInventoryForm(next);
    }
  }, [
    inventoryForm,
    inventoryForm.product_name_eng,
    inventoryForm.category_name,
    inventoryForm.hsn_code,
    inventoryForm.gst_rate,
    inventorySearch,
  ]);

  const resetMigrationStages = (mode) => {
    setMigrationStages((prev) => ({
      ...prev,
      [mode]: createStageState(mode),
    }));
  };

  const markMigrationStage = (mode, key, status, detail = "") => {
    setMigrationStages((prev) => ({
      ...prev,
      [mode]: {
        ...prev[mode],
        [key]: {
          ...(prev[mode]?.[key] || {}),
          status,
          detail: detail || prev[mode]?.[key]?.detail || "",
        },
      },
    }));
  };

  const matchingCatalogProducts = useMemo(() => {
    const q = normalizeText(productName);
    if (!q) return catalogProducts.slice(0, 8);
    return catalogProducts
      .filter((item) => normalizeText(item.product_name_eng).includes(q))
      .slice(0, 8);
  }, [catalogProducts, productName]);

  const productLookupMatches = useMemo(() => {
    const q = normalizeText(barcode);
    if (!q || q.length < 2) return [];

    return productsList
      .filter((item) => getProductSearchText(item).includes(q))
      .slice(0, 10);
  }, [barcode, productsList]);

  useEffect(() => {
    const q = barcode.trim();

    if (!q || q.length < 2) {
      setLegacyProductMatches([]);
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        setLegacyProductMatches(await searchLegacyProducts(q, token));
      } catch {
        setLegacyProductMatches([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [barcode, token]);

  const inventoryLookupMatches = useMemo(() => {
    const q = normalizeText(inventorySearch);
    if (!q || q.length < 2) return [];

    return catalogBarcodes
      .filter((item) =>
        [
          item.product_name_eng,
          item.product_name_tel,
          item.product_code,
          item.brand_name_english,
          item.category_name_english,
          item.mk_barcode,
          item.barcode,
          item.quantity,
          item.barcode_quantity,
          item.weight,
          item.unit_name,
          item.unit_short_code,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
      .slice(0, 12);
  }, [catalogBarcodes, inventorySearch]);

  useEffect(() => {
    const q = inventorySearch.trim();

    if (!q || q.length < 2) {
      setLegacyInventoryMatches([]);
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        setLegacyInventoryMatches(await searchLegacyProducts(q, token));
      } catch {
        setLegacyInventoryMatches([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [inventorySearch, token]);

  const requestTrackingApi = useCallback(async (path, options = {}) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), TRACKING_REQUEST_TIMEOUT_MS);
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/request-tracking${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;

      if (!response.ok) {
        throw new Error(data?.message || data?.error || `Request tracking failed (${response.status})`);
      }

      return data;
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("Migration monitor timed out. Migration actions can continue.");
      }
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, [token]);

  const loadTrackingRequestDetails = useCallback(async (request) => {
    const requestId = getRequestId(request);
    if (!requestId) return;

    setTrackingSelectedRequest(request);

    try {
      const [stepsPayload, eventsPayload] = await Promise.all([
        requestTrackingApi(`/requests/${requestId}/steps`),
        requestTrackingApi(`/requests/${requestId}/events`),
      ]);
      setTrackingSteps(normalizeRows(stepsPayload, ["steps", "requestSteps"]));
      setTrackingEvents(normalizeRows(eventsPayload, ["events", "requestEvents"]));
    } catch (error) {
      setTrackingMessage(error?.message || "Unable to load request details.");
    }
  }, [requestTrackingApi]);

  const loadTrackingRequests = useCallback(async ({ preserveSelection = true } = {}) => {
    setTrackingLoading(true);
    setTrackingMessage("");

    try {
      const params = new URLSearchParams();
      if (trackingStatusFilter !== "all") params.set("status", trackingStatusFilter);
      if (migrationMode === "outlet" && outletPostingForm.outlet_id) {
        params.set("outlet_id", outletPostingForm.outlet_id);
      }

      let payload;
      let clientStatusFilter = "";

      try {
        payload = await requestTrackingApi(`/requests${params.toString() ? `?${params}` : ""}`);
      } catch (error) {
        if (trackingStatusFilter === "all") throw error;

        clientStatusFilter = trackingStatusFilter;
        params.delete("status");
        payload = await requestTrackingApi(`/requests${params.toString() ? `?${params}` : ""}`);
        setTrackingMessage(
          "Backend status filter failed, so requests are filtered in the app for now."
        );
      }

      const allRows = normalizeRows(payload, ["requests", "requestTrackings"]);
      const modeRows =
        migrationMode === "inventory"
          ? allRows.filter((item) => getRequestType(item) === "inventory_migration")
          : allRows.filter((item) => getRequestType(item) !== "inventory_migration");
      const rows = clientStatusFilter
        ? modeRows.filter((item) => getRequestStatus(item) === clientStatusFilter)
        : modeRows;
      setTrackingRequests(rows);

      const previousId = preserveSelection ? selectedTrackingRequestId : "";
      const nextSelection =
        rows.find((item) => String(getRequestId(item)) === String(previousId)) || rows[0] || null;

      if (nextSelection) {
        await loadTrackingRequestDetails(nextSelection);
      } else {
        setTrackingSelectedRequest(null);
        setTrackingSteps([]);
        setTrackingEvents([]);
      }
    } catch (error) {
      setTrackingMessage(error?.message || "Unable to load migration requests. Migration actions can continue.");
      setTrackingRequests([]);
      setTrackingSelectedRequest(null);
      setTrackingSteps([]);
      setTrackingEvents([]);
    } finally {
      setTrackingLoading(false);
    }
  }, [
    loadTrackingRequestDetails,
    migrationMode,
    outletPostingForm.outlet_id,
    requestTrackingApi,
    selectedTrackingRequestId,
    trackingStatusFilter,
  ]);

  const handleReinitiateStep = async (step) => {
    const stepId = getStepId(step);
    if (!stepId) return;

    setReinitiatingStepId(String(stepId));
    setTrackingMessage("");

    try {
      await requestTrackingApi(`/steps/${stepId}/reinitiate`, { method: "POST" });
      setTrackingMessage("Step reinitiated. Refreshing request status.");
      await loadTrackingRequests();
    } catch (error) {
      setTrackingMessage(error?.message || "Unable to reinitiate this step.");
    } finally {
      setReinitiatingStepId("");
    }
  };

  const handleReceivePendingTrackingStep = async (step) => {
    const stepId = getStepId(step);
    const dispatchOrderId = pickId(
      trackingSelectedRequest?.reference_id,
      trackingSelectedRequest?.payload?.dispatch_order_id,
      trackingSelectedRequest?.dispatch_order_id
    );

    if (!dispatchOrderId) {
      setTrackingMessage("Dispatch order id is missing for this pending request.");
      return;
    }

    setResumingStepId(String(stepId || dispatchOrderId));
    setTrackingMessage("");

    try {
      await dispatch(receiveDispatchToOutlet({ dispatchOrderId })).unwrap();
      setTrackingMessage("Outlet receive completed. Refreshing request status.");
      await dispatch(fetchInventoryDispatchOrders()).unwrap();
      await loadTrackingRequests();
    } catch (error) {
      setTrackingMessage(error?.message || "Unable to receive this pending dispatch.");
      await loadTrackingRequests();
    } finally {
      setResumingStepId("");
    }
  };

  const waitForDispatchedOrder = async (dispatchId) => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const payload = await dispatch(fetchInventoryDispatchOrders()).unwrap();
      const orders = normalizeRows(payload, ["orders", "dispatchOrders"]);
      const order = orders.find((item) => String(getEntityId(item) || item.id) === String(dispatchId));
      const status = String(order?.dispatch_status || order?.status || "").toLowerCase();

      if (status === "dispatched") return order;
      if (attempt < 3) await wait(350);
    }

    throw new Error("Dispatch status was not confirmed as dispatched. Please retry receive from the dispatch screen.");
  };

  useEffect(() => {
    migrationInFlightRef.current = false;
    setInventorySaveBusy(false);
    setOutletSaveBusy(false);
    setTrackingRequests([]);
    setTrackingSelectedRequest(null);
    setTrackingSteps([]);
    setTrackingEvents([]);
    setTrackingMessage("");
    setTrackingLoading(false);
  }, [migrationMode]);

  const selectedBrand = getFirstBrand(scannedProduct);
  const selectedFinancial = getFirstFinancial(selectedBrand);

  useEffect(() => {
    const typedText = imageName.trim();

    if (!typedText) {
      setImageSuggestions([]);
      setImageSuggestionsOpen(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        const suggestions = await searchProductImageSuggestions(typedText, token);
        setImageSuggestions(suggestions);
        setImageSuggestionsOpen(suggestions.length > 0);
      } catch {
        setImageSuggestions([]);
        setImageSuggestionsOpen(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [imageName, token]);

  const hydrateFormsFromProduct = (product) => {
    const brand = getFirstBrand(product);
    const financial = getFirstFinancial(brand);
    const name = getProductName(product);
    const image = getProductImageUrl(product);

    setProductName(name);
    setExistingImageUrl(image);
    setResolvedImageUrl("");
    setImageUrl(image);
    setProductForm(
      applyHsnGstFallback(
        {
          product_name_eng: name,
          product_name_tel: product?.product_name_tel || product?.teluguname || "",
          gst_rate: product?.gst_rate || product?.gst || "",
          hsn_code: product?.["hsn-code"] || product?.hsn_code || product?.hsncode || "",
          brand_id: pickId(product?.catalogBrandId, brand?.brand_id, brand?.id, brand?._id),
          brand_name: product?.brand || getBrandName(brand),
          category_id: pickId(product?.category_id, product?.categoryId),
          category_name: getCategoryName(product),
        },
        name,
        getCategoryName(product)
      )
    );
    setFinancialForm({
      quantity: pickId(product?.quantity, product?.catalogQuantity, financial?.quantity, financial?.weight, ""),
      unit_id: findCatalogUnit(units, pickId(product?.units, financial?.units))?.id || "",
      price: pickId(product?.MRP, financial?.price, ""),
      dprice: pickId(product?.dprice, financial?.dprice, financial?.sellingPrice, ""),
      discount: pickId(product?.discount, financial?.discount, ""),
      countInStock: pickId(product?.countInStock, financial?.countInStock, financial?.quantityInStock, ""),
      barcode: asArray(product?.barcode)[0] || asArray(financial?.barcode)[0] || barcode,
    });
    setOutletPostingForm((prev) => ({
      ...prev,
      no_of_units: pickId(
        product?.countInStock,
        financial?.countInStock,
        financial?.quantityInStock,
        prev.no_of_units
      ),
      unit_price: prev.unit_price || pickId(product?.MRP, financial?.price, ""),
      mk_barcode: prev.mk_barcode || product?.mk_barcode || "",
      vendor_barcode:
        prev.vendor_barcode ||
        asArray(product?.barcode)[0] ||
        asArray(financial?.barcode)[0] ||
        barcode ||
        "",
    }));
  };

  const resolveProductImageFromName = async (name) => {
    const searchName = String(name || "").trim();
    if (!searchName) return;

    try {
      const suggestions = await searchProductImageSuggestions(searchName, token);
      const first = suggestions[0];
      const suggestionUrl = first?.imageUrl || first?.url;

      if (suggestionUrl) {
        setImageName(first?.name || searchName);
        setImageUrl(suggestionUrl);
        setResolvedImageUrl(suggestionUrl);
        return;
      }

      const image = await findProductImageByName(searchName, token);
      if (image?.url) {
        setImageName(image?.name || searchName);
        setImageUrl(image.url);
        setResolvedImageUrl(image.url);
      }
    } catch {
      // Image lookup is a helper only; product migration can continue without it.
    }
  };

  const selectLookupProduct = (product) => {
    const firstBarcode = getProductBarcodes(product)[0] || "";
    const name = getProductName(product) || "";

    setBarcode(String(firstBarcode || name));
    setScannedProduct(product);
    hydrateFormsFromProduct(product);
    resolveProductImageFromName(name);
    setActiveAction("stock");
    setProductLookupOpen(false);
    setScanMessage("Product selected. Choose stock update or product edit.");
  };

  const selectLegacyOutletProduct = (legacyProduct) => {
    const name = getProductName(legacyProduct);
    const barcodeValue = getLegacyBarcode(legacyProduct);

    setBarcode(String(barcodeValue || name || ""));
    setScannedProduct(null);
    setExistingImageUrl(getProductImageUrl(legacyProduct));
    setResolvedImageUrl(getProductImageUrl(legacyProduct));
    setImageUrl(getProductImageUrl(legacyProduct));
    setProductName(name);
    setProductForm((prev) =>
      applyHsnGstFallback(
        {
          ...prev,
          product_name_eng: name,
          product_name_tel: legacyProduct?.teluguname || legacyProduct?.telugu_name || "",
          gst_rate: pickId(legacyProduct?.gst, legacyProduct?.gstRate, ""),
          hsn_code: pickId(legacyProduct?.hsncode, legacyProduct?.hsn_code, ""),
          brand_name: legacyProduct?.brand || legacyProduct?.brand_name || "",
          category_name: getCategoryName(legacyProduct),
        },
        name,
        getCategoryName(legacyProduct)
      )
    );
    setFinancialForm({
      quantity: splitWeightPack(getLegacyWeightPack(legacyProduct)).quantity,
      unit_id: findCatalogUnit(units, splitWeightPack(getLegacyWeightPack(legacyProduct)).units)?.id || "",
      price: getLegacyPrice(legacyProduct),
      dprice: getLegacySellingPrice(legacyProduct),
      discount: pickId(legacyProduct?.discount, legacyProduct?.Discount, ""),
      countInStock: pickId(legacyProduct?.countInStock, legacyProduct?.stock, "0"),
      barcode: barcodeValue,
    });
    setOutletPostingForm((prev) => ({
      ...prev,
      no_of_units: pickId(legacyProduct?.countInStock, legacyProduct?.stock, prev.no_of_units),
      unit_price: prev.unit_price || getLegacyPrice(legacyProduct) || "",
      vendor_barcode: barcodeValue || prev.vendor_barcode,
      mk_barcode: legacyProduct?.mk_barcode || prev.mk_barcode,
    }));
    setActiveAction("new");
    setProductLookupOpen(false);
    setLegacyProductMatches([]);
    setScanMessage("Legacy product selected. Review and add to outlet migration.");
    resolveProductImageFromName(name);
  };

  const handleBarcodeSearch = async (event) => {
    event.preventDefault();
    const scanned = barcode.trim();
    if (!scanned) return;

    setBusy(true);
    setScanMessage("");
    setStatus("");

    try {
      const product = await dispatch(
        fetchProductByBarcode({ barcode: scanned, token })
      ).unwrap();
      selectLookupProduct(product);
      setScanMessage("Product found. Choose stock update or product edit.");
    } catch (error) {
      const q = normalizeText(scanned);
      const productNameMatch = productsList.find((item) =>
        getProductSearchText(item).includes(q)
      );

      if (productNameMatch) {
        selectLookupProduct(productNameMatch);
        setScanMessage("Product found by name. Choose stock update or product edit.");
        setBusy(false);
        return;
      }

      try {
        const legacyMatches = await searchLegacyProducts(scanned, token);
        if (legacyMatches[0]) {
          selectLegacyOutletProduct(legacyMatches[0]);
          setBusy(false);
          return;
        }
      } catch {}

      setScannedProduct(null);
      setExistingImageUrl("");
      setResolvedImageUrl("");
      setActiveAction("new");
      setProductName("");
      setFinancialForm((prev) => ({ ...prev, barcode: scanned }));
      setScanMessage("Barcode was not found. Continue with product name.");
    } finally {
      setBusy(false);
    }
  };

  const handleStockUpdate = async () => {
    if (migrationInFlightRef.current) return;
    migrationInFlightRef.current = true;
    const productID = pickId(scannedProduct?._id, scannedProduct?.id);
    const brandID = pickId(scannedProduct?.brandId, selectedBrand?._id, selectedBrand?.id);
    const financialID = pickId(scannedProduct?.financialId, selectedFinancial?._id, selectedFinancial?.id);
    const newQuantity = numberOrNull(financialForm.countInStock);
    const outletUnit = units.find((unit) => String(unit.id) === String(financialForm.unit_id));
    const pack = {
      quantity: financialForm.quantity,
      units: outletUnit?.unit_short_code || outletUnit?.unit_name || "",
    };

    if (
      !outletPostingForm.warehouse_id ||
      !outletPostingForm.supplier_id ||
      !outletPostingForm.outlet_id ||
      !outletPostingForm.exp_date
    ) {
      migrationInFlightRef.current = false;
      setStatus("Warehouse, supplier, outlet and expiry date are required for outlet migration.");
      return;
    }

    if (newQuantity === null) {
      migrationInFlightRef.current = false;
      setStatus("Count in stock is required.");
      return;
    }

    resetMigrationStages("outlet");
    markMigrationStage("outlet", "start", "done", "Outlet migration started.");
    setOutletSaveBusy(true);
    setBusy(true);
    let currentStage = "catalog";
    try {
      const taxFallback = applyHsnGstFallback(
        {
          hsn_code: productForm.hsn_code,
          gst_rate: productForm.gst_rate,
        },
        productForm.product_name_eng,
        productName,
        productForm.category_name
      );
      const base = await ensureSupplyChainBase({
        productName: productForm.product_name_eng,
        productTeluguName: productForm.product_name_tel,
        brandName: productForm.brand_name,
        categoryName: productForm.category_name,
        hsnCode: taxFallback.hsn_code,
        gstRate: taxFallback.gst_rate,
        pack,
        mkBarcode: outletPostingForm.mk_barcode,
        vendorBarcode: outletPostingForm.vendor_barcode || financialForm.barcode,
        existingProductId: scannedProduct?.catalogProductId || selectedCatalogProductId,
        existingBrandId: productForm.brand_id,
        existingCategoryId: productForm.category_id,
        existingUnitId: financialForm.unit_id,
        stageMode: "outlet",
      });
      setOutletPostingForm((prev) => ({
        ...prev,
        mk_barcode: prev.mk_barcode || base.mkBarcode,
        vendor_barcode: prev.vendor_barcode || base.vendorBarcode,
      }));

      if (productID && brandID && financialID) {
        const mongoBarcodes = uniqueValues([
          base.mkBarcode,
          base.vendorBarcode,
          outletPostingForm.vendor_barcode,
          financialForm.barcode,
          ...asArray(selectedFinancial?.barcode),
        ]);
        await dispatch(
          updateProduct({
            data: {
              productId: productID,
              detailId: brandID,
              financialId: financialID,
              updateFields: {
                catalogProductBarcodeId: base.productBarcodeId,
                mkid: numberOrNull(base.mkBarcode),
                price: numberOrNull(financialForm.price),
                dprice: numberOrNull(financialForm.dprice),
                Discount: numberOrNull(financialForm.discount),
                quantity: numberOrNull(pack.quantity),
                units: pack.units,
                barcode: mongoBarcodes,
              },
            },
            token,
          })
        ).unwrap();
      }

      const inventoryUnitPrice = Number(outletPostingForm.unit_price || financialForm.price || 0);
      const migrationPurchaseUnitPrice = toWholeRupees(inventoryUnitPrice);
      currentStage = "purchase";
      markMigrationStage("outlet", "purchase", "running", "Creating verified migration purchase request.");
      const purchaseOrder = await dispatch(
        createPurchaseOrderWithItems({
          supplier_id: Number(outletPostingForm.supplier_id),
          warehouse_id: Number(outletPostingForm.warehouse_id),
          expected_date: outletPostingForm.exp_date,
          remarks: outletPostingForm.remarks || "Outlet migration",
          status: "verified",
          bill_details: { created_from: "outlet_migration", source: "migration" },
          items: [
            {
              product_id: base.productId,
              category_id: base.categoryId,
              brand_id: base.brandId,
              unit_id: base.unitId,
              product_barcode_id: base.productBarcodeId,
              qty: Number(pack.quantity),
              no_of_units: Number(outletPostingForm.no_of_units || newQuantity || 1),
              expected_unit_price: migrationPurchaseUnitPrice,
              actual_unit_price: migrationPurchaseUnitPrice,
              product_name: productForm.product_name_eng,
              category_name: productForm.category_name,
              brand_name: productForm.brand_name,
              unit_name: pack.units,
              mk_barcode: base.mkBarcode,
              barcode: base.vendorBarcode,
            },
          ],
        })
      ).unwrap();

      const order = purchaseOrder?.order || purchaseOrder?.purchaseOrder || purchaseOrder?.data?.order || purchaseOrder?.data || purchaseOrder;
      const orderItem = asArray(purchaseOrder?.items)[0] || asArray(purchaseOrder?.data?.items)[0] || asArray(order?.items)[0];
      markMigrationStage("outlet", "purchase", "done", `Purchase request ready: ${order?.id || "created"}.`);
      currentStage = "inventory";
      markMigrationStage("outlet", "inventory", "running", "Adding received purchase units to inventory.");
      const inventoryResult = await dispatch(
        receiveVerifiedPurchaseToInventory({
          purchase_order_id: order?.id || null,
          purchase_order_item_id: orderItem?.id || null,
          product_barcode_id: base.productBarcodeId,
          product_id: base.productId,
          batch_id: outletPostingForm.batch_id,
          sku_id:
            outletPostingForm.sku_id ||
            makeSkuId({
              productCode: productForm.product_name_eng,
              batchId: outletPostingForm.batch_id,
              expDate: outletPostingForm.exp_date,
            }),
          warehouse_id: Number(outletPostingForm.warehouse_id),
          supplier_id: Number(outletPostingForm.supplier_id),
          stakeholders_id: Number(outletPostingForm.supplier_id),
          qty: Number(pack.quantity || 0),
          no_of_units: Number(outletPostingForm.no_of_units || newQuantity || 1),
          add_to_existing_units: true,
          merge_existing_inventory: true,
          unit_price: inventoryUnitPrice,
          mfg_date: outletPostingForm.mfg_date || null,
          exp_date: outletPostingForm.exp_date,
          source: "migration",
          remarks: outletPostingForm.remarks || "Outlet migration",
        })
      ).unwrap();

      const inventoryProduct = inventoryResult?.inventoryProduct || inventoryResult?.data?.inventoryProduct || inventoryResult?.data || inventoryResult;
      const inventoryProductId = getEntityId(inventoryProduct);
      const dispatchProductBarcodeId =
        toRequiredNumber(inventoryProduct?.product_barcode_id) || base.productBarcodeId;
      markMigrationStage(
        "outlet",
        "inventory",
        "updated",
        `Inventory ${inventoryProductId ? `ready: ${inventoryProductId}` : "updated"}. Barcode row ${dispatchProductBarcodeId}.`
      );
      if (inventoryProductId) {
        const outlet = outlets.find((item) => String(item.id) === String(outletPostingForm.outlet_id));
        const warehouse = warehouses.find((item) => String(item.id) === String(outletPostingForm.warehouse_id));
        currentStage = "dispatch";
        markMigrationStage("outlet", "dispatch", "running", "Creating and dispatching stock to outlet.");
        const dispatchOrder = await dispatch(
          createInventoryDispatchOrder({
            purchase_order_id: order?.id || null,
            source: `warehouse:${outletPostingForm.warehouse_id}:${warehouse?.warehouse_name || "Migration"}`,
            destination: `outlet:${outletPostingForm.outlet_id}:${outlet?.outlet_name || "Outlet"}`,
            expected_dispatch_at: null,
            dispatch_notes: outletPostingForm.remarks || "Outlet migration dispatch",
            dispatch_status: "sent",
            items: [
              {
                inventory_product_id: Number(inventoryProductId),
                product_barcode_id: dispatchProductBarcodeId,
                qty: Number(outletPostingForm.no_of_units || newQuantity || 1),
                no_of_units: Number(outletPostingForm.no_of_units || newQuantity || 1),
                exp_date: outletPostingForm.exp_date,
                notes: "Migration dispatch",
              },
            ],
          })
        ).unwrap();
        const dispatchId = getEntityId(dispatchOrder) || dispatchOrder?.id || dispatchOrder?.order?.id;
        if (dispatchId) {
          await dispatch(
            updateInventoryDispatchStatus({
              id: dispatchId,
              dispatch_status: "packed",
            })
          ).unwrap();
          await dispatch(
            updateInventoryDispatchStatus({
              id: dispatchId,
              dispatch_status: "dispatched",
            })
          ).unwrap();
          await waitForDispatchedOrder(dispatchId);
          markMigrationStage("outlet", "dispatch", "done", `Dispatch confirmed as dispatched: ${dispatchId}.`);
          currentStage = "mongoOutlet";
          markMigrationStage(
            "outlet",
            "mongoOutlet",
            "running",
            "Checking outlet Mongo product; insert if missing, otherwise update stock count."
          );
          try {
            const receiveResult = await dispatch(receiveDispatchToOutlet({ dispatchOrderId: dispatchId })).unwrap();
            const receiveText = String(
              receiveResult?.message ||
                receiveResult?.action ||
                receiveResult?.status ||
                "Outlet stock inserted or updated."
            );
            markMigrationStage(
              "outlet",
              "mongoOutlet",
              receiveText.toLowerCase().includes("insert") ||
                receiveText.toLowerCase().includes("created")
                ? "inserted"
                : "updated",
              receiveText
            );
          } catch (receiveError) {
            const message = String(receiveError?.message || receiveError || "");

            if (
              message.toLowerCase().includes("mongo product not found") ||
              message.toLowerCase().includes("financial barcode not matched")
            ) {
              markMigrationStage("outlet", "mongoOutlet", "failed", message || "Outlet Mongo product missing.");
              setStatus(
                "Catalog, barcode, purchase, inventory and dispatch completed. Outlet receive is pending because this barcode is not available in the Mongo outlet product list. Add the backend migration insert endpoint, then retry receive."
              );
              return;
            }

            throw receiveError;
          }
        }
      }

      dispatch(fetchInventoryProducts());
      dispatch(fetchPurchaseOrders());
      dispatch(fetchInventoryDispatchOrders());
      setStatus("Catalog, barcode, purchase, inventory, dispatch and outlet receive completed.");
    } catch (error) {
      markMigrationStage("outlet", currentStage, "failed", error?.message || "Stage failed.");
      setStatus(error?.message || "Unable to update stock.");
    } finally {
      setOutletSaveBusy(false);
      setBusy(false);
      migrationInFlightRef.current = false;
    }
  };

  const handleProductEdit = async () => {
    const productID = pickId(scannedProduct?._id, scannedProduct?.id);
    const brandID = pickId(scannedProduct?.brandId, selectedBrand?._id, selectedBrand?.id);
    const financialID = pickId(scannedProduct?.financialId, selectedFinancial?._id, selectedFinancial?.id);
    const catalogId =
      selectedCatalogProductId ||
      scannedProduct?.catalogProductId ||
      scannedProduct?.catalog_id ||
      scannedProduct?.catalogId;
    const outletUnit = units.find((unit) => String(unit.id) === String(financialForm.unit_id));
    const pack = {
      quantity: financialForm.quantity,
      units: outletUnit?.unit_short_code || outletUnit?.unit_name || "",
    };

    setProductEditBusy(true);
    try {
      if (catalogId) {
        await dispatch(
          updateCatalogEntity({
            entity: "products",
            id: catalogId,
            payload: {
              product_name_eng: productForm.product_name_eng,
              product_name_tel: productForm.product_name_tel || productForm.product_name_eng,
              gst_rate: productForm.gst_rate || null,
              "hsn-code": productForm.hsn_code || null,
              brand_id: productForm.brand_id || null,
              category_id: productForm.category_id || null,
            },
          })
        ).unwrap();
      }

      await dispatch(
        updateProduct({
          id: productID,
          token,
          data: {
            productId: productID,
            brandId: brandID,
            financialId: financialID,
            productData: {
              name: productForm.product_name_eng,
              product_name_eng: productForm.product_name_eng,
              category: productForm.category_name,
              category_id: productForm.category_id || undefined,
              image: resolvedImageUrl || existingImageUrl || undefined,
            },
            brandData: {
              brand: productForm.brand_name,
              brand_id: productForm.brand_id || undefined,
            },
            financialData: {
              quantity: pack.quantity,
              units: pack.units,
              weight: makeWeightPack(pack.quantity, pack.units),
              packQuantity: pack.quantity,
              price: numberOrNull(financialForm.price),
              dprice: numberOrNull(financialForm.dprice),
              discount: numberOrNull(financialForm.discount),
              countInStock: numberOrNull(financialForm.countInStock),
              barcode: financialForm.barcode ? [financialForm.barcode] : undefined,
            },
          },
        })
      ).unwrap();
      setStatus("Catalog updated first, then Mongo product updated.");
    } catch (error) {
      setStatus(error?.message || "Unable to edit product.");
    } finally {
      setProductEditBusy(false);
    }
  };

  const handleCatalogSelect = (catalogProduct) => {
    setSelectedCatalogProductId(catalogProduct.id);
    setProductName(catalogProduct.product_name_eng || "");
    setProductForm((prev) =>
      applyHsnGstFallback(
        {
          ...prev,
          product_name_eng: catalogProduct.product_name_eng || "",
          product_name_tel: catalogProduct.product_name_tel || "",
          gst_rate: catalogProduct.gst_rate || "",
          hsn_code: catalogProduct["hsn-code"] || catalogProduct.hsn_code || "",
          category_id: catalogProduct.category_id || prev.category_id,
          category_name: catalogProduct.category_name_english || prev.category_name,
        },
        catalogProduct.product_name_eng,
        catalogProduct.category_name_english
      )
    );
  };

  const handleBrandChange = (value) => {
    const match = catalogBrands.find(
      (item) => normalizeText(item.brand_name_english) === normalizeText(value)
    );
    setProductForm((prev) => ({
      ...prev,
      brand_name: value,
      brand_id: match?.id || "",
    }));
  };

  const handleCategoryChange = (value) => {
    const match = catalogCategories.find(
      (item) => normalizeText(item.category_name_english) === normalizeText(value)
    );
    setProductForm((prev) => ({
      ...prev,
      category_name: value,
      category_id: match?.id || "",
    }));
  };

  const handleOutletPostingFormChange = (field, value) => {
    setOutletPostingForm((prev) => {
      const next = { ...prev, [field]: value };

      if (["batch_id", "exp_date"].includes(field)) {
        next.sku_id = makeSkuId({
          productCode: productForm.product_name_eng,
          batchId: field === "batch_id" ? value : next.batch_id,
          expDate: field === "exp_date" ? value : next.exp_date,
        });
      }

      return next;
    });
  };

  const handleOutletCountInStockChange = (value) => {
    setFinancialForm((prev) => ({ ...prev, countInStock: value }));
    setOutletPostingForm((prev) => ({ ...prev, no_of_units: value || "0" }));
  };

  const handleInventoryFormChange = (field, value) => {
    setInventoryForm((prev) => {
      const next = { ...prev, [field]: value };

      if (["quantity", "unit_id"].includes(field)) {
        const nextUnit = units.find((unit) => String(unit.id) === String(next.unit_id));
        next.qty = makeWeightPack(
          next.quantity,
          nextUnit?.unit_short_code || nextUnit?.unit_name || ""
        );
      }

      if (["batch_id", "exp_date"].includes(field) && selectedInventoryBarcode) {
        next.sku_id = makeSkuId({
          productCode:
            selectedInventoryBarcode.product_code ||
            `MKP${selectedInventoryBarcode.product_id || selectedInventoryBarcode.id}`,
          batchId: field === "batch_id" ? value : next.batch_id,
          expDate: field === "exp_date" ? value : next.exp_date,
        });
      }

      return next;
    });
  };

  const getActiveImageProductName = () =>
    migrationMode === "inventory"
      ? inventoryForm.product_name_eng || inventorySearch || productName
      : productName || productForm.product_name_eng;

  const handleImageNameSearch = async () => {
    setBusy(true);
    setStatus("");
    try {
      const activeProductName = getActiveImageProductName();
      const image = await findProductImageByName(imageName || activeProductName, token);
      if (image?.url) {
        setResolvedImageUrl(image.url);
        setStatus("Image found in Firebase storage.");
      } else {
        setStatus("No Firebase image found. Paste an internet image URL.");
      }
    } catch (error) {
      setStatus(error?.message || "No Firebase image found. Paste an internet image URL.");
    } finally {
      setBusy(false);
    }
  };

  const handleImageSuggestionSelect = (item) => {
    const nextName = item?.name || "";
    const nextUrl = item?.imageUrl || item?.url || "";

    setImageName(nextName);
    setImageUrl(nextUrl);
    setResolvedImageUrl(nextUrl);
    setImageSuggestionsOpen(false);
    setImageSuggestions([]);
  };

  const handleDownloadAndUploadImage = async () => {
    setBusy(true);
    setStatus("");
    try {
      let uploaded = null;
      let compressedSizeKb = "";
      const activeProductName = getActiveImageProductName();

      try {
        const compressedFile = await downloadAndCompressImage(imageUrl, undefined, activeProductName);
        uploaded = await uploadProductImage(compressedFile, activeProductName, token);
        compressedSizeKb = Math.round(compressedFile.size / 1024);
      } catch (downloadError) {
        uploaded = await uploadProductImageFromUrl(imageUrl, activeProductName, token);
        compressedSizeKb = uploaded?.size ? Math.round(uploaded.size / 1024) : "";
      }

      if (!uploaded?.url) throw new Error("Upload completed without a URL");
      setResolvedImageUrl(uploaded.url);
      setStatus(
        `Image saved locally as WebP under 40 KB and uploaded.${
          compressedSizeKb ? ` Size: ${compressedSizeKb} KB.` : ""
        }`
      );
    } catch (error) {
      setStatus(error?.message || "Unable to prepare and upload image.");
    } finally {
      setBusy(false);
    }
  };

  const handleCalculateSellingPrice = () => {
    const sellingPrice = calculateSellingPrice(
      financialForm.price,
      financialForm.discount
    );

    if (sellingPrice === "") {
      setStatus("Enter price and discount to calculate selling price.");
      return;
    }

    setFinancialForm((prev) => ({
      ...prev,
      dprice: sellingPrice,
    }));
    setStatus("Selling price calculated from price and discount.");
  };

  const selectInventoryBarcode = (item) => {
    const batchId = inventoryForm.batch_id || makeBatchId();
    const expDate = inventoryForm.exp_date;
    const productCode = item.product_code || `MKP${item.product_id || item.id}`;
    const packQuantity = getBarcodeQuantity(item) || "";
    const packUnit = getBarcodeWeight(item) || "";
    const unitMatch = findCatalogUnit(units, packUnit);
    const name =
      getProductName(item) ||
      item.product_name_eng ||
      item.product_code ||
      inventorySearch ||
      "";
    const brandName =
      item.brand_name_english ||
      item.brand ||
      item.brand_name ||
      inventoryForm.brand_name ||
      "";
    const categoryName = getCategoryName(item) || inventoryForm.category_name || "";
    const image = getProductImageUrl(item);

    setSelectedInventoryBarcode(item);
    setExistingImageUrl(image);
    setResolvedImageUrl("");
    setImageUrl(image);
    if (name) resolveProductImageFromName(name);
    setInventorySearch(
      item.mk_barcode ||
        item.barcode ||
        name ||
        item.product_code ||
        ""
    );
    setInventoryLookupOpen(false);
    setInventoryForm((prev) =>
      applyHsnGstFallback(
        {
          ...prev,
          batch_id: batchId,
          product_name_eng: name || prev.product_name_eng || "",
          product_name_tel: item.product_name_tel || prev.product_name_tel || "",
          brand_name: brandName || prev.brand_name || "",
          category_name: categoryName || prev.category_name || "",
          hsn_code: item.hsn_code || item.hsncode || prev.hsn_code || "",
          gst_rate: item.gst_rate || item.gst || prev.gst_rate || "",
          vendor_barcode: item.barcode || prev.vendor_barcode || "",
          quantity: packQuantity || prev.quantity || "",
          unit_id: unitMatch?.id || prev.unit_id || "",
          unit_price: prev.unit_price || "",
          qty: makeWeightPack(packQuantity, packUnit) || prev.qty || "",
          no_of_units: prev.no_of_units || "1",
          sku_id:
            prev.sku_id ||
            makeSkuId({
              productCode,
              batchId,
              expDate,
            }),
        },
        name,
        categoryName,
        inventorySearch
      )
    );
    setStatus("Inventory product barcode selected. Enter stock details and save.");
  };

  const selectLegacyInventoryProduct = (legacyProduct) => {
    const name = getProductName(legacyProduct);
    const barcodeValue = getLegacyBarcode(legacyProduct);
    const image = getProductImageUrl(legacyProduct);

    setSelectedInventoryBarcode({
      ...legacyProduct,
      id: null,
      product_name_eng: name,
      product_name_tel: legacyProduct?.teluguname || legacyProduct?.telugu_name || "",
      brand_name_english: legacyProduct?.brand || legacyProduct?.brand_name || "",
      category_name_english: getCategoryName(legacyProduct),
      barcode: barcodeValue,
      quantity: splitWeightPack(getLegacyWeightPack(legacyProduct)).quantity,
      unit_short_code: splitWeightPack(getLegacyWeightPack(legacyProduct)).units,
      isLegacy: true,
    });
    const legacyPack = splitWeightPack(getLegacyWeightPack(legacyProduct));
    const unitMatch = findCatalogUnit(units, legacyPack.units);
    setExistingImageUrl(image);
    setResolvedImageUrl(image);
    setImageUrl(image);
    setInventorySearch(String(barcodeValue || name || ""));
    setInventoryLookupOpen(false);
    setLegacyInventoryMatches([]);
    setInventoryForm((prev) =>
      applyHsnGstFallback(
        {
          ...prev,
          product_name_eng: name || prev.product_name_eng,
          product_name_tel: legacyProduct?.teluguname || legacyProduct?.telugu_name || prev.product_name_tel,
          brand_name: legacyProduct?.brand || legacyProduct?.brand_name || prev.brand_name,
          category_name: getCategoryName(legacyProduct) || prev.category_name,
          hsn_code: legacyProduct?.hsncode || legacyProduct?.hsn_code || prev.hsn_code,
          gst_rate: legacyProduct?.gst || legacyProduct?.gstRate || prev.gst_rate,
          vendor_barcode: barcodeValue || prev.vendor_barcode,
          quantity: legacyPack.quantity || prev.quantity,
          unit_id: unitMatch?.id || prev.unit_id,
          qty: getLegacyWeightPack(legacyProduct) || prev.qty,
          unit_price: String(getLegacyPrice(legacyProduct) || prev.unit_price || ""),
          no_of_units: prev.no_of_units || "1",
        },
        name,
        getCategoryName(legacyProduct),
        inventorySearch
      )
    );
    resolveProductImageFromName(name);
    setStatus("Legacy product selected. Create catalog/product barcode details before inventory save if needed.");
  };

  const handleInventorySearchSubmit = async (event) => {
    event.preventDefault();

    const q = normalizeText(inventorySearch);
    const exact =
      catalogBarcodes.find(
        (item) =>
          normalizeText(item.mk_barcode) === q ||
          normalizeText(item.barcode) === q
      ) || inventoryLookupMatches[0];

    if (exact) {
      selectInventoryBarcode(exact);
      return;
    }

    if (legacyInventoryMatches[0]) {
      selectLegacyInventoryProduct(legacyInventoryMatches[0]);
      return;
    }

    try {
      const legacyMatches = await searchLegacyProducts(inventorySearch, token);
      if (legacyMatches[0]) {
        selectLegacyInventoryProduct(legacyMatches[0]);
        return;
      }
    } catch {}

    setSelectedInventoryBarcode(null);
    setStatus("No product barcode found in catalog for inventory migration.");
  };

  const ensureSupplyChainBase = async ({
    productName,
    productTeluguName,
    brandName,
    categoryName,
    hsnCode,
    gstRate,
    pack,
    mkBarcode,
    vendorBarcode,
    existingProductId,
    existingBrandId,
    existingCategoryId,
    existingUnitId,
    stageMode,
  }) => {
    if (stageMode) {
      markMigrationStage(stageMode, "catalog", "running", "Checking catalog product, brand, category and unit.");
    }

    if (!productName || !brandName || !categoryName) {
      throw new Error(
        `Product name, brand and category are required. Parsed product="${productName || "-"}", brand="${brandName || "-"}", category="${categoryName || "-"}".`
      );
    }

    if (!pack.quantity || !pack.units) {
      throw new Error(
        `Quantity / Weight must include both quantity and unit. Parsed quantity="${pack.quantity || "-"}", unit="${pack.units || "-"}".`
      );
    }

    const unitMatch = findCatalogUnit(units, pack.units);
    let brandMatch = catalogBrands.find(
      (brand) => normalizeText(brand.brand_name_english) === normalizeText(brandName)
    );
    let categoryMatch = catalogCategories.find(
      (category) =>
        normalizeText(category.category_name_english) === normalizeText(categoryName)
    );
    let productMatch = catalogProducts.find(
      (product) =>
        sameNormalizedText(product.product_name_eng, productName) ||
        sameNormalizedText(product.product_name_tel, productName) ||
        sameNormalizedText(product.product_code, productName)
    );
    const existingProductMatch = catalogProducts.find(
      (product) => String(product.id) === String(existingProductId)
    );
    const existingBrandMatch = catalogBrands.find(
      (brand) => String(brand.id) === String(existingBrandId)
    );
    const existingCategoryMatch = catalogCategories.find(
      (category) => String(category.id) === String(existingCategoryId)
    );
    const existingUnitMatch = units.find(
      (unit) => String(unit.id) === String(existingUnitId)
    );
    let productId = existingProductMatch?.id || productMatch?.id;
    let brandId = existingBrandMatch?.id || brandMatch?.id;
    let categoryId = existingCategoryMatch?.id || categoryMatch?.id;
    let unitId = existingUnitMatch?.id || unitMatch?.id;
    const catalogActions = [
      brandId ? "brand exists" : "brand missing",
      categoryId ? "category exists" : "category missing",
      productId ? "product exists" : "product missing",
      unitId ? "unit exists" : "unit missing",
    ];

    if (!brandId) {
      const createdBrand = await dispatch(
        createCatalogEntity({
          entity: "brands",
          payload: {
            brand_code: getNextReadableCode(catalogBrands, "brand_code", "MKB"),
            brand_name_english: brandName,
            brand_name_telugu: brandName,
          },
        })
      ).unwrap();
      brandId = getEntityId(createdBrand);
      catalogActions[0] = "brand inserted";
      dispatch(fetchCatalogEntity("brands"));
    }

    if (!categoryId) {
      const createdCategory = await dispatch(
        createCatalogEntity({
          entity: "categories",
          payload: {
            category_code: getNextReadableCode(catalogCategories, "category_code", "MKC"),
            category_name_english: categoryName,
            category_name_telugu: categoryName,
          },
        })
      ).unwrap();
      categoryId = getEntityId(createdCategory);
      catalogActions[1] = "category inserted";
      dispatch(fetchCatalogEntity("categories"));
    }

    if (!unitId) {
      const createdUnit = await dispatch(
        createCatalogEntity({
          entity: "units",
          payload: {
            unit_name: pack.units,
            unit_short_code: pack.units,
          },
        })
      ).unwrap();
      unitId = getEntityId(createdUnit);
      catalogActions[3] = "unit inserted";
      dispatch(fetchCatalogEntity("units"));
    }

    if (!productId) {
      const createdProduct = await dispatch(
        createCatalogEntity({
          entity: "products",
          payload: {
            product_code: getNextReadableCode(catalogProducts, "product_code", "MKP"),
            product_name_eng: productName,
            product_name_tel: productTeluguName || productName,
            gst_rate: gstRate || null,
            "hsn-code": hsnCode || null,
            brand_id: brandId || null,
            category_id: categoryId || null,
          },
        })
      ).unwrap();
      productId = getCatalogProductId(createdProduct);

      if (!productId) {
        const refreshedProducts = await dispatch(fetchCatalogEntity("products")).unwrap();
        const refreshedRows = normalizeRows(refreshedProducts, ["products"]);
        const refreshedMatch = refreshedRows.find(
          (product) =>
            sameNormalizedText(product.product_name_eng, productName) ||
            sameNormalizedText(product.product_name_tel, productName) ||
            sameNormalizedText(product.product_code, productName)
        );
        productId = refreshedMatch?.id;
      }

      catalogActions[2] = "product inserted";
      dispatch(fetchCatalogEntity("products"));
    }

    const productIdNumber = toRequiredNumber(productId);
    const brandIdNumber = toRequiredNumber(brandId);
    const categoryIdNumber = toRequiredNumber(categoryId);
    const unitIdNumber = toRequiredNumber(unitId);

    if (!productIdNumber || !brandIdNumber || !categoryIdNumber || !unitIdNumber) {
      const missing = [
        !productIdNumber ? "product" : "",
        !brandIdNumber ? "brand" : "",
        !categoryIdNumber ? "category" : "",
        !unitIdNumber ? "unit" : "",
      ]
        .filter(Boolean)
        .join(", ");
      throw new Error(`Catalog IDs are incomplete for ${missing}. Check product, brand, category and unit.`);
    }

    if (stageMode) {
      markMigrationStage(stageMode, "catalog", "done", catalogActions.join(", "));
      markMigrationStage(stageMode, "barcode", "running", "Checking product_barcode row.");
    }

    const finalMkBarcode =
      mkBarcode ||
      makeMkBarcode({
        product_id: productIdNumber,
        brand_id: brandIdNumber,
        category_id: categoryIdNumber,
        unit_id: unitIdNumber,
        quantity: pack.quantity,
      });

    let barcodeRow = catalogBarcodes.find(
      (item) =>
        String(item.product_id) === String(productIdNumber) &&
        String(item.brand_id) === String(brandIdNumber) &&
        String(item.category_id) === String(categoryIdNumber) &&
        String(item.unit_id) === String(unitIdNumber) &&
        Number(item.quantity) === Number(pack.quantity)
    );

    const barcodeInserted = !barcodeRow;

    if (!barcodeRow) {
      const createdBarcode = await dispatch(
        createCatalogEntity({
          entity: "product-barcodes",
          payload: {
            product_id: productIdNumber,
            brand_id: brandIdNumber,
            category_id: categoryIdNumber,
            unit_id: unitIdNumber,
            quantity: Number(pack.quantity),
            barcode: vendorBarcode || null,
            mk_barcode: finalMkBarcode,
          },
        })
      ).unwrap();
      barcodeRow = createdBarcode?.data || createdBarcode;
      dispatch(fetchCatalogEntity("product-barcodes"));
    }

    const productBarcodeId = toRequiredNumber(getEntityId(barcodeRow) || barcodeRow?.id);
    if (!productBarcodeId) throw new Error("Product barcode was not created correctly.");

    const barcodeProductId = toRequiredNumber(barcodeRow?.product_id) || productIdNumber;
    const barcodeBrandId = toRequiredNumber(barcodeRow?.brand_id) || brandIdNumber;
    const barcodeCategoryId = toRequiredNumber(barcodeRow?.category_id) || categoryIdNumber;
    const barcodeUnitId = toRequiredNumber(barcodeRow?.unit_id) || unitIdNumber;

    if (stageMode) {
      const reusedDifferentBarcode =
        String(barcodeProductId) !== String(productIdNumber) ||
        String(barcodeBrandId) !== String(brandIdNumber) ||
        String(barcodeCategoryId) !== String(categoryIdNumber) ||
        String(barcodeUnitId) !== String(unitIdNumber);
      markMigrationStage(
        stageMode,
        "barcode",
        barcodeInserted ? "inserted" : "done",
        reusedDifferentBarcode
          ? `Vendor barcode already existed. Reusing catalog barcode ${productBarcodeId}.`
          : barcodeInserted
            ? `Inserted barcode: ${finalMkBarcode}`
            : `Barcode ready: ${barcodeRow?.mk_barcode || finalMkBarcode}`
      );
    }

    return {
      productId: barcodeProductId,
      brandId: barcodeBrandId,
      categoryId: barcodeCategoryId,
      unitId: barcodeUnitId,
      productBarcodeId,
      mkBarcode: barcodeRow?.mk_barcode || finalMkBarcode,
      vendorBarcode: barcodeRow?.barcode || vendorBarcode || "",
    };
  };

  const handleInventoryMigrationSave = async () => {
    if (migrationInFlightRef.current && inventorySaveBusy) {
      setStatus("Inventory migration is already running.");
      return;
    }
    if (migrationInFlightRef.current) {
      migrationInFlightRef.current = false;
    }

    setStatus("Inventory migration started. Checking required fields.");
    resetMigrationStages("inventory");
    markMigrationStage("inventory", "start", "running", "Inventory migration clicked.");
    migrationInFlightRef.current = true;

    if (
      !inventoryForm.warehouse_id ||
      !inventoryForm.supplier_id ||
      !inventoryForm.qty ||
      !inventoryForm.exp_date
    ) {
      migrationInFlightRef.current = false;
      markMigrationStage("inventory", "start", "failed", "Required fields are missing.");
      setStatus("Warehouse, supplier, quantity and expiry date are required for inventory.");
      return;
    }

    markMigrationStage("inventory", "start", "done", "Inventory migration started.");
    setInventorySaveBusy(true);
    setBusy(true);
    let currentStage = "catalog";
    try {
      const selectedBarcode = selectedInventoryBarcode || {};
      const inventoryUnit = units.find((unit) => String(unit.id) === String(inventoryForm.unit_id));
      const pack = inventoryForm.quantity && inventoryUnit
        ? {
            quantity: inventoryForm.quantity,
            units: inventoryUnit.unit_short_code || inventoryUnit.unit_name || "",
          }
        : splitWeightPack(inventoryForm.qty);
      const inventoryUnitPrice = Number(inventoryForm.unit_price || 0);
      const migrationPurchaseUnitPrice = toWholeRupees(inventoryUnitPrice);
      const productName =
        inventoryForm.product_name_eng ||
        getProductName(selectedBarcode) ||
        selectedBarcode.product_name_eng ||
        selectedBarcode.product_name ||
        selectedBarcode.product_code ||
        inventorySearch ||
        "";
      const brandName =
        inventoryForm.brand_name ||
        selectedBarcode.brand_name_english ||
        selectedBarcode.brand ||
        selectedBarcode.brand_name ||
        "";
      const categoryName =
        inventoryForm.category_name ||
        selectedBarcode.category_name_english ||
        selectedBarcode.category ||
        selectedBarcode.category_name ||
        "";
      const missingCatalogFields = [
        !productName ? "product name" : "",
        !brandName ? "brand" : "",
        !categoryName ? "category" : "",
      ].filter(Boolean);

      if (missingCatalogFields.length > 0) {
        currentStage = "catalog";
        markMigrationStage(
          "inventory",
          "catalog",
          "failed",
          `Missing ${missingCatalogFields.join(", ")}. Fill the inventory form before updating.`
        );
        setStatus(
          `Cannot start catalog requests. Missing ${missingCatalogFields.join(", ")}.`
        );
        return;
      }

      if (!pack.quantity || !pack.units) {
        currentStage = "catalog";
        markMigrationStage(
          "inventory",
          "catalog",
          "failed",
          `Quantity / Weight must include both values. Parsed quantity="${pack.quantity || "-"}", unit="${pack.units || "-"}".`
        );
        setStatus(
          `Cannot start catalog requests. Quantity / Weight must include both values. Parsed quantity="${pack.quantity || "-"}", unit="${pack.units || "-"}".`
        );
        return;
      }
      const taxFallback = applyHsnGstFallback(
        {
          hsn_code:
            inventoryForm.hsn_code ||
            selectedBarcode.hsncode ||
            selectedBarcode.hsn_code,
          gst_rate:
            inventoryForm.gst_rate ||
            selectedBarcode.gst ||
            selectedBarcode.gstRate,
        },
        productName,
        categoryName,
        inventorySearch
      );
      setStatus("Checking catalog records for inventory migration.");
      const base = await ensureSupplyChainBase({
        productName,
        productTeluguName:
          inventoryForm.product_name_tel ||
          selectedBarcode.product_name_tel ||
          selectedBarcode.teluguname ||
          selectedBarcode.telugu_name ||
          null,
        brandName,
        categoryName,
        hsnCode: taxFallback.hsn_code,
        gstRate: taxFallback.gst_rate,
        pack,
        mkBarcode: "",
        vendorBarcode: inventoryForm.vendor_barcode || selectedBarcode.barcode,
        existingProductId: pickId(
          selectedBarcode.product_id,
          selectedBarcode.catalogProductId
        ),
        existingBrandId: pickId(
          selectedBarcode.brand_id,
          selectedBarcode.catalogBrandId
        ),
        existingCategoryId: pickId(
          selectedBarcode.category_id,
          selectedBarcode.catalogCategoryId
        ),
        existingUnitId: selectedBarcode.unit_id,
        stageMode: "inventory",
      });
      setInventoryForm((prev) => ({
        ...prev,
        vendor_barcode: prev.vendor_barcode || base.vendorBarcode,
      }));
      const inventoryImageUrl = resolvedImageUrl || existingImageUrl || imageUrl || "";

      if (inventoryImageUrl) {
        await dispatch(
          updateCatalogEntity({
            entity: "product-barcodes",
            id: base.productBarcodeId,
            payload: {
              image_url: inventoryImageUrl,
            },
          })
        ).unwrap();
        markMigrationStage(
          "inventory",
          "barcode",
          "updated",
          `Catalog barcode image updated: ${base.productBarcodeId}.`
        );
      }

      currentStage = "purchase";
      markMigrationStage("inventory", "purchase", "running", "Creating verified migration purchase request.");
      const purchaseOrder = await dispatch(
        createPurchaseOrderWithItems({
          supplier_id: Number(inventoryForm.supplier_id),
          warehouse_id: Number(inventoryForm.warehouse_id),
          expected_date: inventoryForm.exp_date,
          remarks: inventoryForm.remarks || "Inventory migration",
          status: "verified",
          bill_details: {
            created_from: "migration",
            source: "migration",
            image_url: inventoryImageUrl || null,
          },
          items: [
            {
              product_id: base.productId,
              category_id: base.categoryId,
              brand_id: base.brandId,
              unit_id: base.unitId,
              product_barcode_id: base.productBarcodeId,
              qty: Number(pack.quantity),
              no_of_units: Number(inventoryForm.no_of_units || 1),
              expected_unit_price: migrationPurchaseUnitPrice,
              actual_unit_price: migrationPurchaseUnitPrice,
              product_name: productName,
              product_code: selectedBarcode.product_code,
              category_name: categoryName,
              brand_name: brandName,
              unit_name: pack.units,
              mk_barcode: base.mkBarcode,
              barcode: base.vendorBarcode,
              image_url: inventoryImageUrl || null,
            },
          ],
        })
      ).unwrap();

      const order =
        purchaseOrder?.order ||
        purchaseOrder?.purchaseOrder ||
        purchaseOrder?.data?.order ||
        purchaseOrder?.data ||
        purchaseOrder;
      markMigrationStage("inventory", "purchase", "done", `Purchase request ready: ${order?.id || "created"}.`);
      const orderItem =
        asArray(purchaseOrder?.items)[0] ||
        asArray(purchaseOrder?.data?.items)[0] ||
        asArray(order?.items)[0];

      currentStage = "inventory";
      markMigrationStage(
        "inventory",
        "inventory",
        "running",
        "If stock exists, add no. of units; otherwise insert new inventory entry."
      );
      const inventoryResult = await dispatch(
        receiveVerifiedPurchaseToInventory({
          purchase_order_id: order?.id || null,
          purchase_order_item_id: orderItem?.id || null,
          product_barcode_id: base.productBarcodeId,
          product_id: base.productId,
          batch_id: inventoryForm.batch_id,
          sku_id:
            inventoryForm.sku_id ||
            makeSkuId({
              productCode: selectedBarcode.product_code || productName,
              batchId: inventoryForm.batch_id,
              expDate: inventoryForm.exp_date,
            }),
          warehouse_id: Number(inventoryForm.warehouse_id),
          supplier_id: Number(inventoryForm.supplier_id),
          stakeholders_id: Number(inventoryForm.supplier_id),
          qty: Number(pack.quantity || 0),
          no_of_units: Number(inventoryForm.no_of_units || 1),
          add_to_existing_units: true,
          merge_existing_inventory: true,
          unit_price: inventoryUnitPrice,
          mfg_date: inventoryForm.mfg_date || null,
          exp_date: inventoryForm.exp_date,
          source: "migration",
          image_url: inventoryImageUrl || null,
          remarks: inventoryForm.remarks || "Inventory migration",
        })
      ).unwrap();
      const inventoryProduct =
        inventoryResult?.inventoryProduct ||
        inventoryResult?.data?.inventoryProduct ||
        inventoryResult?.data ||
        inventoryResult;
      const inventoryProductId = getEntityId(inventoryProduct);
      markMigrationStage(
        "inventory",
        "inventory",
        "done",
        inventoryProductId
          ? `Inventory completed: ${inventoryProductId}. Existing units added or new entry inserted.`
          : "Inventory completed. Existing units added or new entry inserted."
      );
      dispatch(fetchInventoryProducts());
      dispatch(fetchPurchaseOrders());
      setStatus("Inventory migration completed.");
    } catch (error) {
      markMigrationStage("inventory", currentStage, "failed", error?.message || "Stage failed.");
      setStatus(error?.message || "Unable to update inventory.");
    } finally {
      setInventorySaveBusy(false);
      setBusy(false);
      migrationInFlightRef.current = false;
    }
  };

  const handleCreateNewProduct = async () => {
    await handleStockUpdate();
  };

  const renderTrackingMonitor = () => (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity size={19} className="text-amber-700" />
          <h2 className="font-bold text-gray-900">Migration Request Monitor</h2>
        </div>
        <button
          type="button"
          onClick={() => loadTrackingRequests()}
          disabled={trackingLoading}
          className={`${buttonClass} border bg-white px-3 text-gray-700 hover:bg-gray-50 disabled:text-gray-300`}
          title="Refresh migration requests"
        >
          <RefreshCw size={16} className={trackingLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="text-xs font-bold uppercase text-gray-500">
          Status
          <select
            value={trackingStatusFilter}
            onChange={(event) => setTrackingStatusFilter(event.target.value)}
            className={`${fieldClass} mt-1`}
          >
            <option value="failed">Failed</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="all">All</option>
          </select>
        </label>
        <div className="text-xs font-bold uppercase text-gray-500">
          {migrationMode === "outlet" ? "Outlet Filter" : "Monitor Scope"}
          <div className="mt-1 min-h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold normal-case text-gray-700">
            {migrationMode === "outlet"
              ? outlets.find((item) => String(item.id) === String(outletPostingForm.outlet_id))
                  ?.outlet_name ||
                outletPostingForm.outlet_id ||
                "All outlets"
              : "Inventory migration"}
          </div>
        </div>
      </div>

      {trackingMessage ? (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          {trackingMessage}
        </p>
      ) : null}

      <div className="max-h-72 overflow-auto rounded-lg border">
        {trackingRequests.map((request) => {
          const requestId = getRequestId(request);
          const requestStatus = getRequestStatus(request);
          const selected = String(requestId) === String(selectedTrackingRequestId);
          const requestTitle = getTrackingRequestTitle(request);
          const requestSubtitle = getTrackingRequestSubtitle(request);

          return (
            <button
              key={requestId || getRequestKey(request)}
              type="button"
              onClick={() => loadTrackingRequestDetails(request)}
              className={`block w-full border-b px-3 py-2 text-left last:border-b-0 hover:bg-blue-50 ${
                selected ? "bg-blue-50" : ""
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-bold text-gray-900">
                  {requestTitle}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${
                    isFailedStatus(requestStatus)
                      ? "bg-red-100 text-red-700"
                      : requestStatus === "completed"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {requestStatus || "unknown"}
                </span>
              </span>
              <span className="mt-1 block truncate text-xs text-gray-500">
                {requestSubtitle}
              </span>
              {request.error_message || request.error ? (
                <span className="mt-1 block truncate text-xs font-semibold text-red-700">
                  {request.error_message || request.error}
                </span>
              ) : null}
              {request.last_error_message ? (
                <span className="mt-1 block truncate text-xs font-semibold text-red-700">
                  {request.last_error_message}
                </span>
              ) : null}
            </button>
          );
        })}
        {!trackingLoading && trackingRequests.length === 0 ? (
          <div className="px-3 py-3 text-sm text-gray-500">
            No migration requests found for this filter.
          </div>
        ) : null}
        {trackingLoading ? (
          <div className="px-3 py-3 text-sm font-semibold text-blue-700">
            Loading requests...
          </div>
        ) : null}
      </div>

      {trackingSelectedRequest ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-lg border border-gray-200 p-3">
            <div className="mb-2 flex items-center gap-2">
              <ListChecks size={17} className="text-blue-700" />
              <h3 className="font-bold text-gray-900">Steps</h3>
            </div>
            <div className="space-y-2">
              {trackingSteps.map((step) => {
                const stepId = getStepId(step);
                const stepStatus = getStepStatus(step);
                const stepCode = String(step.step_code || step.code || "").toLowerCase();
                const canReceivePending =
                  stepStatus === "pending" &&
                  stepCode === "outlet_receive" &&
                  getRequestType(trackingSelectedRequest) === "inventory_dispatch_to_outlet";

                return (
                  <div
                    key={stepId || step.step_name || step.name}
                    className="rounded-lg border border-gray-100 bg-gray-50 p-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-gray-900">
                          {step.step_name || step.name || step.action || `Step ${stepId || "-"}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTrackingDate(step.updated_at || step.updatedAt || step.created_at)}
                        </div>
                      </div>
                      {isFailedStatus(stepStatus) ? (
                        <button
                          type="button"
                          onClick={() => handleReinitiateStep(step)}
                          disabled={String(reinitiatingStepId) === String(stepId)}
                          className={`${buttonClass} min-h-8 bg-red-600 px-3 text-xs text-white hover:bg-red-700 disabled:bg-gray-300`}
                        >
                          <RotateCcw size={14} />
                          Reinitiate
                        </button>
                      ) : canReceivePending ? (
                        <button
                          type="button"
                          onClick={() => handleReceivePendingTrackingStep(step)}
                          disabled={String(resumingStepId) === String(stepId)}
                          className={`${buttonClass} min-h-8 bg-green-600 px-3 text-xs text-white hover:bg-green-700 disabled:bg-gray-300`}
                        >
                          <RotateCcw size={14} />
                          {String(resumingStepId) === String(stepId)
                            ? "Receiving..."
                            : "Receive / Verify"}
                        </button>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase text-slate-700">
                          {stepStatus || "unknown"}
                        </span>
                      )}
                    </div>
                    {step.error_message || step.error ? (
                      <div className="mt-2 flex gap-2 rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        <span>{step.error_message || step.error}</span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {trackingSteps.length === 0 ? (
                <div className="text-sm text-gray-500">No steps recorded yet.</div>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Clock3 size={17} className="text-slate-700" />
              <h3 className="font-bold text-gray-900">Events</h3>
            </div>
            <div className="max-h-48 space-y-2 overflow-auto">
              {trackingEvents.map((event, index) => (
                <div key={event.id || event._id || index} className="text-xs">
                  <div className="font-bold text-gray-800">
                    {event.event_type || event.type || event.message || "Event"}
                  </div>
                  <div className="text-gray-500">
                    {formatTrackingDate(event.created_at || event.createdAt || event.event_at)}
                  </div>
                  {event.message && event.message !== event.event_type ? (
                    <div className="mt-1 text-gray-700">{event.message}</div>
                  ) : null}
                </div>
              ))}
              {trackingEvents.length === 0 ? (
                <div className="text-sm text-gray-500">No events recorded yet.</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );

  return (
    <StockManagerLayout>
      <main className="space-y-4">
        <section className="rounded-lg border bg-white p-4 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">Application Migration Helper</h1>
          <p className="mt-1 text-sm text-gray-500">
            Move stock into outlet Mongo or migrate scanned catalog barcode items into inventory.
          </p>
        </section>

        <section className="flex flex-wrap gap-2 rounded-lg border bg-white p-3 shadow-sm">
          <button
            type="button"
            onClick={() => setMigrationMode("outlet")}
            className={`${buttonClass} ${
              migrationMode === "outlet"
                ? "bg-blue-600 text-white"
                : "border bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <PackagePlus size={17} />
            Move To Outlet
          </button>
          <button
            type="button"
            onClick={() => setMigrationMode("inventory")}
            className={`${buttonClass} ${
              migrationMode === "inventory"
                ? "bg-blue-600 text-white"
                : "border bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Barcode size={17} />
            Inventory Migration
          </button>
        </section>

        {migrationMode === "outlet" ? (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(320px,0.95fr)_minmax(420px,1.4fr)]">
          <div className="space-y-4">
            <section className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Barcode size={19} className="text-blue-700" />
                <h2 className="font-bold text-gray-900">Start With Barcode</h2>
              </div>
              <form onSubmit={handleBarcodeSearch} className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <input
                    value={barcode}
                    onChange={(event) => {
                      setBarcode(event.target.value);
                      setProductLookupOpen(true);
                    }}
                    onFocus={() => {
                      if (productLookupMatches.length > 0 || legacyProductMatches.length > 0) {
                        setProductLookupOpen(true);
                      }
                    }}
                    className={fieldClass}
                    placeholder="Scan barcode or type product name"
                    autoFocus
                  />
                  {productLookupOpen &&
                  (productLookupMatches.length > 0 || legacyProductMatches.length > 0) ? (
                    <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-lg border bg-white shadow-lg">
                      {productLookupMatches.map((item) => {
                        const image = getProductImageUrl(item);
                        const firstBarcode = getProductBarcodes(item)[0] || "";
                        const weight = getProductSuggestionWeight(item);
                        const stockCount = getProductSuggestionStock(item);

                        return (
                          <button
                            key={`${pickId(item.id, item._id, item.mkid, getProductName(item))}-${firstBarcode}`}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectLookupProduct(item)}
                            className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-blue-50"
                          >
                            {image ? (
                              <img
                                src={image}
                                alt={getProductName(item) || "Product"}
                                className="h-10 w-10 rounded border object-cover"
                              />
                            ) : (
                              <span className="h-10 w-10 rounded border bg-gray-50" />
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-gray-900">
                                {getProductName(item) || "Unnamed product"}
                              </span>
                              <span className="block truncate text-xs text-gray-500">
                                {item.brand || getBrandName(getFirstBrand(item)) || "-"} |{" "}
                                {item.category || getCategoryName(item) || "-"} | {firstBarcode || "-"}
                              </span>
                              <span className="block truncate text-xs font-semibold text-blue-700">
                                Weight: {weight || "-"} | Stock: {stockCount ?? "-"}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                      {legacyProductMatches.map((item, index) => (
                        <button
                          key={`legacy-${index}-${getLegacyBarcode(item)}-${getProductName(item)}`}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectLegacyOutletProduct(item)}
                          className="flex w-full items-center gap-3 border-t px-3 py-2 text-left hover:bg-amber-50"
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded border bg-amber-50 text-xs font-bold text-amber-700">
                            L
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-gray-900">
                              {getProductName(item) || "Legacy product"}
                            </span>
                            <span className="block truncate text-xs text-gray-500">
                              {item.brand || item.brand_name || "-"} | {getCategoryName(item) || "-"} |{" "}
                              {getLegacyBarcode(item) || "-"}
                            </span>
                            <span className="block truncate text-xs font-semibold text-amber-700">
                              Legacy financials | Weight: {getLegacyWeightPack(item) || "-"}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300`}
                >
                  <Search size={17} />
                  Search
                </button>
              </form>
              {scanMessage ? (
                <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800">
                  {scanMessage}
                </p>
              ) : null}
            </section>

            <section className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <PackagePlus size={19} className="text-green-700" />
                <h2 className="font-bold text-gray-900">Product Name Path</h2>
              </div>
              <input
                value={productName}
                onChange={(event) => {
                  setProductName(event.target.value);
                  setProductForm((prev) => ({
                    ...prev,
                    product_name_eng: event.target.value,
                  }));
                }}
                className={fieldClass}
                placeholder="Type product name when barcode is not available"
              />
              <div className="mt-3 max-h-48 overflow-auto rounded-lg border">
                {matchingCatalogProducts.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleCatalogSelect(item)}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-blue-50 ${
                      String(selectedCatalogProductId) === String(item.id)
                        ? "bg-blue-50 font-bold text-blue-800"
                        : ""
                    }`}
                  >
                    {item.product_name_eng}
                    {item.product_code ? (
                      <span className="ml-2 text-xs text-gray-500">{item.product_code}</span>
                    ) : null}
                  </button>
                ))}
                {!catalogLoading && matchingCatalogProducts.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-gray-500">
                    No catalog product found. Use the form to create a new one.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Activity size={19} className="text-amber-700" />
                  <h2 className="font-bold text-gray-900">Migration Request Monitor</h2>
                </div>
                <button
                  type="button"
                  onClick={() => loadTrackingRequests()}
                  disabled={trackingLoading}
                  className={`${buttonClass} border bg-white px-3 text-gray-700 hover:bg-gray-50 disabled:text-gray-300`}
                  title="Refresh migration requests"
                >
                  <RefreshCw size={16} className={trackingLoading ? "animate-spin" : ""} />
                </button>
              </div>

              <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="text-xs font-bold uppercase text-gray-500">
                  Status
                  <select
                    value={trackingStatusFilter}
                    onChange={(event) => setTrackingStatusFilter(event.target.value)}
                    className={`${fieldClass} mt-1`}
                  >
                    <option value="failed">Failed</option>
                    <option value="running">Running</option>
                    <option value="completed">Completed</option>
                    <option value="all">All</option>
                  </select>
                </label>
                <div className="text-xs font-bold uppercase text-gray-500">
                  Outlet Filter
                  <div className="mt-1 min-h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold normal-case text-gray-700">
                    {outlets.find((item) => String(item.id) === String(outletPostingForm.outlet_id))
                      ?.outlet_name ||
                      outletPostingForm.outlet_id ||
                      "All outlets"}
                  </div>
                </div>
              </div>

              {trackingMessage ? (
                <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                  {trackingMessage}
                </p>
              ) : null}

              <div className="max-h-72 overflow-auto rounded-lg border">
                {trackingRequests.map((request) => {
                  const requestId = getRequestId(request);
                  const requestStatus = getRequestStatus(request);
                  const selected = String(requestId) === String(selectedTrackingRequestId);
                  const requestTitle = getTrackingRequestTitle(request);
                  const requestSubtitle = getTrackingRequestSubtitle(request);

                  return (
                    <button
                      key={requestId || getRequestKey(request)}
                      type="button"
                      onClick={() => loadTrackingRequestDetails(request)}
                      className={`block w-full border-b px-3 py-2 text-left last:border-b-0 hover:bg-blue-50 ${
                        selected ? "bg-blue-50" : ""
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-gray-900">
                          {requestTitle}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${
                            isFailedStatus(requestStatus)
                              ? "bg-red-100 text-red-700"
                              : requestStatus === "completed"
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {requestStatus || "unknown"}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-xs text-gray-500">
                        {requestSubtitle}
                      </span>
                        {request.error_message || request.error ? (
                          <span className="mt-1 block truncate text-xs font-semibold text-red-700">
                            {request.error_message || request.error}
                          </span>
                        ) : null}
                      {request.last_error_message ? (
                        <span className="mt-1 block truncate text-xs font-semibold text-red-700">
                          {request.last_error_message}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
                {!trackingLoading && trackingRequests.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-gray-500">
                    No migration requests found for this filter.
                  </div>
                ) : null}
                {trackingLoading ? (
                  <div className="px-3 py-3 text-sm font-semibold text-blue-700">
                    Loading requests...
                  </div>
                ) : null}
              </div>

              {trackingSelectedRequest ? (
                <div className="mt-3 space-y-3">
                  <div className="rounded-lg border border-gray-200 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <ListChecks size={17} className="text-blue-700" />
                      <h3 className="font-bold text-gray-900">Steps</h3>
                    </div>
                    <div className="space-y-2">
                      {trackingSteps.map((step) => {
                        const stepId = getStepId(step);
                        const stepStatus = getStepStatus(step);
                        const stepCode = String(step.step_code || step.code || "").toLowerCase();
                        const canReceivePending =
                          stepStatus === "pending" &&
                          stepCode === "outlet_receive" &&
                          getRequestType(trackingSelectedRequest) === "inventory_dispatch_to_outlet";

                        return (
                          <div
                            key={stepId || step.step_name || step.name}
                            className="rounded-lg border border-gray-100 bg-gray-50 p-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-bold text-gray-900">
                                  {step.step_name || step.name || step.action || `Step ${stepId || "-"}`}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatTrackingDate(step.updated_at || step.updatedAt || step.created_at)}
                                </div>
                              </div>
                              {isFailedStatus(stepStatus) ? (
                                <button
                                  type="button"
                                  onClick={() => handleReinitiateStep(step)}
                                  disabled={String(reinitiatingStepId) === String(stepId)}
                                  className={`${buttonClass} min-h-8 bg-red-600 px-3 text-xs text-white hover:bg-red-700 disabled:bg-gray-300`}
                                >
                                  <RotateCcw size={14} />
                                  Reinitiate
                                </button>
                              ) : canReceivePending ? (
                                <button
                                  type="button"
                                  onClick={() => handleReceivePendingTrackingStep(step)}
                                  disabled={String(resumingStepId) === String(stepId)}
                                  className={`${buttonClass} min-h-8 bg-green-600 px-3 text-xs text-white hover:bg-green-700 disabled:bg-gray-300`}
                                >
                                  <RotateCcw size={14} />
                                  {String(resumingStepId) === String(stepId)
                                    ? "Receiving..."
                                    : "Receive / Verify"}
                                </button>
                              ) : (
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase text-slate-700">
                                  {stepStatus || "unknown"}
                                </span>
                              )}
                            </div>
                            {step.error_message || step.error ? (
                              <div className="mt-2 flex gap-2 rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                <span>{step.error_message || step.error}</span>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                      {trackingSteps.length === 0 ? (
                        <div className="text-sm text-gray-500">No steps recorded yet.</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Clock3 size={17} className="text-slate-700" />
                      <h3 className="font-bold text-gray-900">Events</h3>
                    </div>
                    <div className="max-h-48 space-y-2 overflow-auto">
                      {trackingEvents.map((event, index) => (
                        <div key={event.id || event._id || index} className="text-xs">
                          <div className="font-bold text-gray-800">
                            {event.event_type || event.type || event.message || "Event"}
                          </div>
                          <div className="text-gray-500">
                            {formatTrackingDate(event.created_at || event.createdAt || event.event_at)}
                          </div>
                          {event.message && event.message !== event.event_type ? (
                            <div className="mt-1 text-gray-700">{event.message}</div>
                          ) : null}
                        </div>
                      ))}
                      {trackingEvents.length === 0 ? (
                        <div className="text-sm text-gray-500">No events recorded yet.</div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          </div>

          <section className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveAction("stock")}
                className={`${buttonClass} ${
                  activeAction === "stock"
                    ? "bg-blue-600 text-white"
                    : "border bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <CheckCircle2 size={17} />
                Update Stock
              </button>
              <button
                type="button"
                onClick={() => setActiveAction("edit")}
                className={`${buttonClass} ${
                  activeAction === "edit"
                    ? "bg-blue-600 text-white"
                    : "border bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Edit3 size={17} />
                Edit Product
              </button>
              <button
                type="button"
                onClick={() => setActiveAction("new")}
                className={`${buttonClass} ${
                  activeAction === "new"
                    ? "bg-blue-600 text-white"
                    : "border bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <PackagePlus size={17} />
                New Migration
              </button>
            </div>

            {scannedProduct ? (
              <div className="mb-4 grid grid-cols-1 gap-3 rounded-lg bg-gray-50 p-3 text-sm sm:grid-cols-[88px_repeat(3,1fr)]">
                <div>
                  <div className="text-xs font-bold uppercase text-gray-400">Image</div>
                  {existingImageUrl ? (
                    <img
                      src={existingImageUrl}
                      alt={getProductName(scannedProduct) || "Existing product"}
                      className="mt-1 h-16 w-16 rounded-lg border bg-white object-cover"
                    />
                  ) : (
                    <div className="mt-1 flex h-16 w-16 items-center justify-center rounded-lg border bg-white text-xs text-gray-400">
                      No image
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold uppercase text-gray-400">Product</div>
                  <div className="font-semibold text-gray-900">{getProductName(scannedProduct) || "-"}</div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase text-gray-400">Brand</div>
                  <div className="font-semibold text-gray-900">
                    {scannedProduct?.brand || getBrandName(selectedBrand) || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase text-gray-400">Financial</div>
                  <div className="font-semibold text-gray-900">
                    {makeWeightPack(
                      pickId(scannedProduct?.quantity, scannedProduct?.catalogQuantity, selectedFinancial?.quantity),
                      pickId(scannedProduct?.units, selectedFinancial?.units)
                    ) || "-"} | Rs {pickId(scannedProduct?.MRP, selectedFinancial?.price, "-")}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm font-medium text-gray-700">
                Product Name
                <input
                  value={productForm.product_name_eng}
                  onChange={(event) =>
                    setProductForm((prev) => ({
                      ...prev,
                      product_name_eng: event.target.value,
                    }))
                  }
                  className={`${fieldClass} mt-1`}
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Telugu Name
                <input
                  value={productForm.product_name_tel}
                  onChange={(event) =>
                    setProductForm((prev) => ({
                      ...prev,
                      product_name_tel: event.target.value,
                    }))
                  }
                  className={`${fieldClass} mt-1`}
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Brand
                <input
                  list="migration-brand-options"
                  value={productForm.brand_name}
                  onChange={(event) => handleBrandChange(event.target.value)}
                  className={`${fieldClass} mt-1`}
                  placeholder="Type or choose brand"
                />
                <datalist id="migration-brand-options">
                  {catalogBrands.map((item) => (
                    <option
                      key={item.id || item.brand_code || item.brand_name_english}
                      value={item.brand_name_english || ""}
                    />
                  ))}
                </datalist>
              </label>
              <label className="text-sm font-medium text-gray-700">
                Category
                <input
                  list="migration-category-options"
                  value={productForm.category_name}
                  onChange={(event) => handleCategoryChange(event.target.value)}
                  className={`${fieldClass} mt-1`}
                  placeholder="Type or choose category"
                />
                <datalist id="migration-category-options">
                  {catalogCategories.map((item) => (
                    <option
                      key={item.id || item.category_code || item.category_name_english}
                      value={item.category_name_english || ""}
                    />
                  ))}
                </datalist>
              </label>
              <label className="text-sm font-medium text-gray-700">
                HSN Code
                <input
                  value={productForm.hsn_code}
                  onChange={(event) =>
                    setProductForm((prev) => ({ ...prev, hsn_code: event.target.value }))
                  }
                  className={`${fieldClass} mt-1`}
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                GST Rate
                <input
                  type="number"
                  value={productForm.gst_rate}
                  onChange={(event) =>
                    setProductForm((prev) => ({ ...prev, gst_rate: event.target.value }))
                  }
                  className={`${fieldClass} mt-1`}
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Pack Quantity
                <input
                  type="number"
                  value={financialForm.quantity}
                  onChange={(event) =>
                    setFinancialForm((prev) => ({ ...prev, quantity: event.target.value }))
                  }
                  className={`${fieldClass} mt-1`}
                  placeholder="26"
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Pack Unit
                <select
                  value={financialForm.unit_id}
                  onChange={(event) =>
                    setFinancialForm((prev) => ({ ...prev, unit_id: event.target.value }))
                  }
                  className={`${fieldClass} mt-1`}
                >
                  <option value="">Select unit</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {getUnitLabel(unit)}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[11px] text-gray-500">
                  Choose from catalog units to avoid unit mismatch.
                </span>
              </label>
              <label className="text-sm font-medium text-gray-700">
                Pack Preview
                <input
                  value={makeWeightPack(
                    financialForm.quantity,
                    units.find((unit) => String(unit.id) === String(financialForm.unit_id))
                      ?.unit_short_code ||
                      units.find((unit) => String(unit.id) === String(financialForm.unit_id))
                        ?.unit_name
                  )}
                  readOnly
                  className={`${fieldClass} mt-1 bg-gray-100 font-semibold text-gray-700`}
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Price
                <input
                  type="number"
                  value={financialForm.price}
                  onChange={(event) =>
                    setFinancialForm((prev) => ({ ...prev, price: event.target.value }))
                  }
                  className={`${fieldClass} mt-1`}
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Selling Price
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    value={financialForm.dprice}
                    onChange={(event) =>
                      setFinancialForm((prev) => ({ ...prev, dprice: event.target.value }))
                    }
                    className={fieldClass}
                  />
                  <button
                    type="button"
                    onClick={handleCalculateSellingPrice}
                    className="min-h-10 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 hover:bg-blue-100"
                  >
                    Calc
                  </button>
                </div>
              </label>
              <label className="text-sm font-medium text-gray-700">
                Discount
                <input
                  type="number"
                  value={financialForm.discount}
                  onChange={(event) =>
                    setFinancialForm((prev) => ({ ...prev, discount: event.target.value }))
                  }
                  className={`${fieldClass} mt-1`}
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Count In Stock
                <input
                  type="number"
                  value={financialForm.countInStock}
                  onChange={(event) => handleOutletCountInStockChange(event.target.value)}
                  className={`${fieldClass} mt-1`}
                />
              </label>
            </div>

            <div className="mt-4 rounded-lg border p-3">
              <h3 className="mb-3 font-bold text-gray-900">Supply Chain Posting</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-sm font-medium text-gray-700">
                  Warehouse
                  <select
                    value={outletPostingForm.warehouse_id}
                    onChange={(event) =>
                      handleOutletPostingFormChange("warehouse_id", event.target.value)
                    }
                    className={`${fieldClass} mt-1`}
                  >
                    <option value="">Select warehouse</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.warehouse_name || warehouse.warehouse_code || warehouse.id}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Supplier
                  <select
                    value={outletPostingForm.supplier_id}
                    onChange={(event) =>
                      handleOutletPostingFormChange("supplier_id", event.target.value)
                    }
                    className={`${fieldClass} mt-1`}
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.stakeholder_name || supplier.stackholder_code || supplier.id}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Outlet
                  <select
                    value={outletPostingForm.outlet_id}
                    onChange={(event) =>
                      handleOutletPostingFormChange("outlet_id", event.target.value)
                    }
                    className={`${fieldClass} mt-1`}
                  >
                    <option value="">Select outlet</option>
                    {outlets.map((outlet) => (
                      <option key={outlet.id} value={outlet.id}>
                        {outlet.outlet_name || outlet.unit_code || outlet.id}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-gray-700">
                  No Of Units
                  <input
                    type="number"
                    value={outletPostingForm.no_of_units}
                    onChange={(event) =>
                      handleOutletPostingFormChange("no_of_units", event.target.value)
                    }
                    className={`${fieldClass} mt-1`}
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Unit Price
                  <input
                    type="number"
                    value={outletPostingForm.unit_price}
                    onChange={(event) =>
                      handleOutletPostingFormChange("unit_price", event.target.value)
                    }
                    className={`${fieldClass} mt-1`}
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Batch ID
                  <input
                    type="number"
                    value={outletPostingForm.batch_id}
                    onChange={(event) =>
                      handleOutletPostingFormChange("batch_id", event.target.value)
                    }
                    className={`${fieldClass} mt-1`}
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  MFG Date
                  <input
                    type="date"
                    value={outletPostingForm.mfg_date}
                    onChange={(event) =>
                      handleOutletPostingFormChange("mfg_date", event.target.value)
                    }
                    className={`${fieldClass} mt-1`}
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Expiry Date
                  <input
                    type="date"
                    value={outletPostingForm.exp_date}
                    onChange={(event) =>
                      handleOutletPostingFormChange("exp_date", event.target.value)
                    }
                    className={`${fieldClass} mt-1`}
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  SKU ID
                  <input
                    value={outletPostingForm.sku_id}
                    onChange={(event) =>
                      handleOutletPostingFormChange("sku_id", event.target.value)
                    }
                    className={`${fieldClass} mt-1`}
                  />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Vendor Barcode
                  <input
                    value={outletPostingForm.vendor_barcode}
                    onChange={(event) =>
                      handleOutletPostingFormChange("vendor_barcode", event.target.value)
                    }
                    className={`${fieldClass} mt-1`}
                  />
                </label>
                <label className="text-sm font-medium text-gray-700 md:col-span-2">
                  Remarks
                  <input
                    value={outletPostingForm.remarks}
                    onChange={(event) =>
                      handleOutletPostingFormChange("remarks", event.target.value)
                    }
                    className={`${fieldClass} mt-1`}
                  />
                </label>
              </div>
            </div>

            <MigrationStagePanel mode="outlet" stages={migrationStages.outlet} />

            <div className="mt-4 rounded-lg border p-3">
              <div className="mb-3 flex items-center gap-2">
                <ImagePlus size={18} className="text-cyan-700" />
                <h3 className="font-bold text-gray-900">Product Image</h3>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                <div className="relative">
                  <input
                    value={imageName}
                    onChange={(event) => {
                      setImageName(event.target.value);
                      setImageSuggestionsOpen(true);
                    }}
                    onFocus={() => {
                      if (imageSuggestions.length > 0) setImageSuggestionsOpen(true);
                    }}
                    className={fieldClass}
                    placeholder="Search Firebase by image name"
                  />
                  {imageSuggestionsOpen && imageSuggestions.length > 0 ? (
                    <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border bg-white shadow-lg">
                      {imageSuggestions.map((item) => (
                        <button
                          key={`${item.name || ""}-${item.imageUrl || item.url || ""}`}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleImageSuggestionSelect(item)}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-blue-50"
                        >
                          {item.imageUrl || item.url ? (
                            <img
                              src={item.imageUrl || item.url}
                              alt={item.name || "Product"}
                              className="h-10 w-10 rounded border object-cover"
                            />
                          ) : (
                            <span className="h-10 w-10 rounded border bg-gray-50" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-gray-900">
                              {item.name || "Unnamed image"}
                            </span>
                            <span className="block truncate text-xs text-gray-500">
                              {item.imageUrl || item.url || "-"}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={handleImageNameSearch}
                  disabled={busy}
                  className={`${buttonClass} bg-gray-800 text-white hover:bg-gray-900 disabled:bg-gray-300`}
                >
                  <Search size={17} />
                  Find
                </button>
                <input
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  className={fieldClass}
                  placeholder="Image URL"
                />
                <button
                  type="button"
                  onClick={handleDownloadAndUploadImage}
                  disabled={busy}
                  className={`${buttonClass} bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300`}
                >
                  <UploadCloud size={17} />
                  Upload
                </button>
              </div>
              {resolvedImageUrl ? (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={resolvedImageUrl}
                    alt={productForm.product_name_eng || "Product"}
                    className="h-16 w-16 rounded-lg border object-cover"
                  />
                  <input value={resolvedImageUrl} readOnly className={fieldClass} />
                </div>
              ) : null}
              {!resolvedImageUrl && existingImageUrl ? (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={existingImageUrl}
                    alt={productForm.product_name_eng || "Existing product"}
                    className="h-16 w-16 rounded-lg border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold uppercase text-gray-400">
                      Existing Image
                    </div>
                    <input value={existingImageUrl} readOnly className={fieldClass} />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {activeAction === "stock" ? (
                <button
                  type="button"
                  onClick={handleStockUpdate}
                  disabled={outletSaveBusy || productLoading}
                  className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300`}
                >
                  Update Mongo Stock
                </button>
              ) : null}
              {activeAction === "edit" ? (
                <button
                  type="button"
                  onClick={handleProductEdit}
                  disabled={productEditBusy}
                  className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300`}
                >
                  Save Catalog Then Mongo
                </button>
              ) : null}
              {activeAction === "new" ? (
                <button
                  type="button"
                  onClick={handleCreateNewProduct}
                  disabled={outletSaveBusy}
                  className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300`}
                >
                  Add To Catalog And Mongo
                </button>
              ) : null}
            </div>

            {status ? (
              <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">
                {status}
              </p>
            ) : null}
          </section>
        </section>
        ) : (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(360px,0.9fr)_minmax(460px,1.25fr)]">
          <div className="space-y-4">
            <section className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Barcode size={19} className="text-blue-700" />
                <h2 className="font-bold text-gray-900">Search Product Barcode</h2>
              </div>
              <form onSubmit={handleInventorySearchSubmit} className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <input
                    value={inventorySearch}
                    onChange={(event) => {
                      setInventorySearch(event.target.value);
                      setInventoryLookupOpen(true);
                    }}
                    onFocus={() => {
                      if (inventoryLookupMatches.length > 0 || legacyInventoryMatches.length > 0) {
                        setInventoryLookupOpen(true);
                      }
                    }}
                    className={fieldClass}
                    placeholder="Scan barcode or type inventory product name"
                  />
                  {inventoryLookupOpen &&
                  (inventoryLookupMatches.length > 0 || legacyInventoryMatches.length > 0) ? (
                    <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-lg border bg-white shadow-lg">
                      {inventoryLookupMatches.map((item) => (
                        <button
                          key={`${item.id}-${item.mk_barcode || item.barcode || ""}`}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectInventoryBarcode(item)}
                          className="block w-full px-3 py-2 text-left hover:bg-blue-50"
                        >
                          <span className="block truncate text-sm font-semibold text-gray-900">
                            {getProductName(item) || item.product_code || "Unnamed product"}
                          </span>
                          <span className="block truncate text-xs text-gray-500">
                            {item.brand_name_english || "-"} | {item.category_name_english || "-"} |{" "}
                            {item.mk_barcode || item.barcode || "-"}
                          </span>
                          <span className="block truncate text-xs font-semibold text-blue-700">
                            Qty: {getBarcodeQuantity(item) || "-"} | Weight: {getBarcodeWeight(item) || "-"} | Pack:{" "}
                            {getBarcodePackText(item) || "-"}
                          </span>
                        </button>
                      ))}
                      {legacyInventoryMatches.map((item, index) => (
                        <button
                          key={`legacy-inventory-${index}-${getLegacyBarcode(item)}-${getProductName(item)}`}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectLegacyInventoryProduct(item)}
                          className="block w-full border-t px-3 py-2 text-left hover:bg-amber-50"
                        >
                          <span className="block truncate text-sm font-semibold text-gray-900">
                            {getProductName(item) || "Legacy product"}
                          </span>
                          <span className="block truncate text-xs text-gray-500">
                            {item.brand || item.brand_name || "-"} | {getCategoryName(item) || "-"} |{" "}
                            {getLegacyBarcode(item) || "-"}
                          </span>
                          <span className="block truncate text-xs font-semibold text-amber-700">
                            Legacy financials | Pack: {getLegacyWeightPack(item) || "-"}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300`}
                >
                  <Search size={17} />
                  Search
                </button>
              </form>
            </section>

            {selectedInventoryBarcode ? (
              <section className="rounded-lg border bg-white p-4 shadow-sm">
                <h2 className="mb-3 font-bold text-gray-900">Selected Catalog Barcode</h2>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-semibold text-gray-500">Product:</span>{" "}
                    {inventoryForm.product_name_eng || selectedInventoryBarcode.product_name_eng || "-"}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500">Brand:</span>{" "}
                    {inventoryForm.brand_name || selectedInventoryBarcode.brand_name_english || "-"}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500">Category:</span>{" "}
                    {inventoryForm.category_name || selectedInventoryBarcode.category_name_english || "-"}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500">Barcode:</span>{" "}
                    {selectedInventoryBarcode.mk_barcode || selectedInventoryBarcode.barcode || "-"}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500">Quantity:</span>{" "}
                    {getBarcodeQuantity(selectedInventoryBarcode) || "-"}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500">Weight:</span>{" "}
                    {getBarcodeWeight(selectedInventoryBarcode) || "-"}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-500">Pack:</span>{" "}
                    {getBarcodePackText(selectedInventoryBarcode) || "-"}
                  </div>
                </div>
              </section>
            ) : null}

            {renderTrackingMonitor()}
          </div>

          <section className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="mb-4">
              <h2 className="font-bold text-gray-900">Inventory Stock Entry</h2>
              <p className="text-sm text-gray-500">
                Uses catalog product barcodes and updates the inventory table.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm font-medium text-gray-700">
                Product Name
                <input
                  value={inventoryForm.product_name_eng}
                  onChange={(event) =>
                    handleInventoryFormChange("product_name_eng", event.target.value)
                  }
                  className={`${fieldClass} mt-1`}
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Telugu Name
                <input
                  value={inventoryForm.product_name_tel}
                  onChange={(event) =>
                    handleInventoryFormChange("product_name_tel", event.target.value)
                  }
                  className={`${fieldClass} mt-1`}
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Brand
                <input
                  list="inventory-brand-options"
                  value={inventoryForm.brand_name}
                  onChange={(event) =>
                    handleInventoryFormChange("brand_name", event.target.value)
                  }
                  className={`${fieldClass} mt-1`}
                />
                <datalist id="inventory-brand-options">
                  {catalogBrands.map((brand) => (
                    <option
                      key={brand.id || brand.brand_code || brand.brand_name_english}
                      value={brand.brand_name_english || ""}
                    />
                  ))}
                </datalist>
              </label>
              <label className="text-sm font-medium text-gray-700">
                Category
                <input
                  list="inventory-category-options"
                  value={inventoryForm.category_name}
                  onChange={(event) =>
                    handleInventoryFormChange("category_name", event.target.value)
                  }
                  className={`${fieldClass} mt-1`}
                />
                <datalist id="inventory-category-options">
                  {catalogCategories.map((category) => (
                    <option
                      key={category.id || category.category_code || category.category_name_english}
                      value={category.category_name_english || ""}
                    />
                  ))}
                </datalist>
              </label>
              <label className="text-sm font-medium text-gray-700">
                HSN Code
                <input
                  value={inventoryForm.hsn_code}
                  onChange={(event) =>
                    handleInventoryFormChange("hsn_code", event.target.value)
                  }
                  className={`${fieldClass} mt-1`}
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                GST Rate
                <input
                  type="number"
                  value={inventoryForm.gst_rate}
                  onChange={(event) =>
                    handleInventoryFormChange("gst_rate", event.target.value)
                  }
                  className={`${fieldClass} mt-1`}
                />
              </label>
              <label className="text-sm font-medium text-gray-700 md:col-span-2">
                Vendor Barcode
                <input
                  value={inventoryForm.vendor_barcode}
                  onChange={(event) =>
                    handleInventoryFormChange("vendor_barcode", event.target.value)
                  }
                  className={`${fieldClass} mt-1`}
                  placeholder="Optional"
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Warehouse
                <select
                  value={inventoryForm.warehouse_id}
                  onChange={(event) =>
                    handleInventoryFormChange("warehouse_id", event.target.value)
                  }
                  className={`${fieldClass} mt-1`}
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.warehouse_name || warehouse.warehouse_code || warehouse.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-gray-700">
                Supplier
                <select
                  value={inventoryForm.supplier_id}
                  onChange={(event) =>
                    handleInventoryFormChange("supplier_id", event.target.value)
                  }
                  className={`${fieldClass} mt-1`}
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.stakeholder_name || supplier.stackholder_code || supplier.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-gray-700">
                Pack Quantity
                <input
                  type="number"
                  value={inventoryForm.quantity}
                  onChange={(event) =>
                    handleInventoryFormChange("quantity", event.target.value)
                  }
                  className={`${fieldClass} mt-1`}
                  placeholder="650"
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Pack Unit
                <select
                  value={inventoryForm.unit_id}
                  onChange={(event) =>
                    handleInventoryFormChange("unit_id", event.target.value)
                  }
                  className={`${fieldClass} mt-1`}
                >
                  <option value="">Select unit</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {getUnitLabel(unit)}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[11px] text-gray-500">
                  Choose from catalog units to avoid unit mismatch.
                </span>
              </label>
              <label className="text-sm font-medium text-gray-700">
                Pack Preview
                <input
                  value={
                    inventoryForm.qty ||
                    makeWeightPack(
                      inventoryForm.quantity,
                      units.find((unit) => String(unit.id) === String(inventoryForm.unit_id))
                        ?.unit_short_code ||
                        units.find((unit) => String(unit.id) === String(inventoryForm.unit_id))
                          ?.unit_name
                    )
                  }
                  readOnly
                  className={`${fieldClass} mt-1 bg-gray-100 font-semibold text-gray-700`}
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Batch ID
                <input
                  type="number"
                  value={inventoryForm.batch_id}
                  onChange={(event) =>
                    handleInventoryFormChange("batch_id", event.target.value)
                  }
                  className={`${fieldClass} mt-1`}
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                No Of Units
                <input
                  type="number"
                  value={inventoryForm.no_of_units}
                  onChange={(event) =>
                    handleInventoryFormChange("no_of_units", event.target.value)
                  }
                  className={`${fieldClass} mt-1`}
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Unit Price
                <input
                  type="number"
                  value={inventoryForm.unit_price}
                  onChange={(event) =>
                    handleInventoryFormChange("unit_price", event.target.value)
                  }
                  className={`${fieldClass} mt-1`}
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                MFG Date
                <input
                  type="date"
                  value={inventoryForm.mfg_date}
                  onChange={(event) =>
                    handleInventoryFormChange("mfg_date", event.target.value)
                  }
                  className={`${fieldClass} mt-1`}
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                Expiry Date
                <input
                  type="date"
                  value={inventoryForm.exp_date}
                  onChange={(event) =>
                    handleInventoryFormChange("exp_date", event.target.value)
                  }
                  className={`${fieldClass} mt-1`}
                />
              </label>
              <label className="text-sm font-medium text-gray-700">
                SKU ID
                <input
                  value={inventoryForm.sku_id}
                  onChange={(event) =>
                    handleInventoryFormChange("sku_id", event.target.value)
                  }
                  className={`${fieldClass} mt-1`}
                />
              </label>
              <label className="text-sm font-medium text-gray-700 md:col-span-2">
                Remarks
                <input
                  value={inventoryForm.remarks}
                  onChange={(event) =>
                    handleInventoryFormChange("remarks", event.target.value)
                  }
                  className={`${fieldClass} mt-1`}
                />
              </label>
            </div>

            <div className="mt-4 rounded-lg border p-3">
              <div className="mb-3 flex items-center gap-2">
                <ImagePlus size={18} className="text-cyan-700" />
                <h3 className="font-bold text-gray-900">Product Image</h3>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                <div className="relative">
                  <input
                    value={imageName}
                    onChange={(event) => {
                      setImageName(event.target.value);
                      setImageSuggestionsOpen(true);
                    }}
                    onFocus={() => {
                      if (imageSuggestions.length > 0) setImageSuggestionsOpen(true);
                    }}
                    className={fieldClass}
                    placeholder="Search Firebase by image name"
                  />
                  {imageSuggestionsOpen && imageSuggestions.length > 0 ? (
                    <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border bg-white shadow-lg">
                      {imageSuggestions.map((item) => (
                        <button
                          key={`${item.name || ""}-${item.imageUrl || item.url || ""}`}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleImageSuggestionSelect(item)}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-blue-50"
                        >
                          {item.imageUrl || item.url ? (
                            <img
                              src={item.imageUrl || item.url}
                              alt={item.name || "Product"}
                              className="h-10 w-10 rounded border object-cover"
                            />
                          ) : (
                            <span className="h-10 w-10 rounded border bg-gray-50" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-gray-900">
                              {item.name || "Unnamed image"}
                            </span>
                            <span className="block truncate text-xs text-gray-500">
                              {item.imageUrl || item.url || "-"}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={handleImageNameSearch}
                  disabled={busy}
                  className={`${buttonClass} bg-gray-800 text-white hover:bg-gray-900 disabled:bg-gray-300`}
                >
                  <Search size={17} />
                  Find
                </button>
                <input
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  className={fieldClass}
                  placeholder="Image URL"
                />
                <button
                  type="button"
                  onClick={handleDownloadAndUploadImage}
                  disabled={busy}
                  className={`${buttonClass} bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300`}
                >
                  <UploadCloud size={17} />
                  Upload
                </button>
              </div>
              {resolvedImageUrl ? (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={resolvedImageUrl}
                    alt={inventoryForm.product_name_eng || "Product"}
                    className="h-16 w-16 rounded-lg border object-cover"
                  />
                  <input value={resolvedImageUrl} readOnly className={fieldClass} />
                </div>
              ) : null}
              {!resolvedImageUrl && existingImageUrl ? (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={existingImageUrl}
                    alt={inventoryForm.product_name_eng || "Existing product"}
                    className="h-16 w-16 rounded-lg border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold uppercase text-gray-400">
                      Existing Image
                    </div>
                    <input value={existingImageUrl} readOnly className={fieldClass} />
                  </div>
                </div>
              ) : null}
            </div>

            <MigrationStagePanel mode="inventory" stages={migrationStages.inventory} />

            <div className="mt-4">
              <button
                type="button"
                onClick={handleInventoryMigrationSave}
                disabled={inventorySaveBusy}
                className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300`}
              >
                Update Inventory Table
              </button>
            </div>

            {status ? (
              <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">
                {status}
              </p>
            ) : null}
          </section>
        </section>
        )}
      </main>
    </StockManagerLayout>
  );
};

export default ApplicationMigrationHelperPage;
