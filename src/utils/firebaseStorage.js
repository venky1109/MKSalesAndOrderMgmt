import axios from "axios";
import { API_BASE_URL } from "./apiConfig";

const BILL_UPLOAD_ENDPOINT =
  process.env.REACT_APP_BILL_UPLOAD_ENDPOINT || "/catalog-pg/bills/upload";
const BILL_SCAN_ENDPOINT =
  process.env.REACT_APP_BILL_SCAN_ENDPOINT || "/catalog-pg/bills/scan";

const getExtractedBillData = (data, payload = {}) =>
  payload.extracted ||
  payload.extractedData ||
  payload.bill_data ||
  payload.billData ||
  payload.scan ||
  payload.scanData ||
  payload.ocr ||
  payload.analysis ||
  payload.document ||
  payload.text ||
  payload.raw_text ||
  payload.rawText ||
  payload.content ||
  payload.items ||
  payload.line_items ||
  data?.extracted ||
  data?.extractedData ||
  data?.scan ||
  data?.scanData ||
  data?.ocr ||
  data?.analysis ||
  data?.document ||
  data?.text ||
  data?.raw_text ||
  data?.rawText ||
  data?.content ||
  data?.items ||
  data?.line_items ||
  data?.data?.extracted ||
  data?.data?.extractedData ||
  data?.data?.scan ||
  data?.data?.scanData ||
  data?.data?.ocr ||
  data?.data?.analysis ||
  data?.data?.document ||
  data?.data?.text ||
  data?.data?.raw_text ||
  data?.data?.rawText ||
  data?.data?.content ||
  data?.data?.items ||
  data?.data?.line_items ||
  null;

export const scanBillFile = async (file, billHint = "bill", token = "") => {
  if (!file) return null;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("billHint", billHint);

  try {
    const { data } = await axios.post(
      `${API_BASE_URL}${BILL_SCAN_ENDPOINT}`,
      formData,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "multipart/form-data",
        },
      }
    );
    const payload = data?.file || data?.data?.file || data?.data || data;
    return getExtractedBillData(data, payload);
  } catch (err) {
    if (err?.response?.status === 404 || err?.response?.status === 405) {
      return null;
    }
    throw err;
  }
};

export const uploadBillFile = async (file, billHint = "bill", token = "") => {
  if (!file) return null;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("billHint", billHint);

  const { data } = await axios.post(
    `${API_BASE_URL}${BILL_UPLOAD_ENDPOINT}`,
    formData,
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "multipart/form-data",
      },
    }
  );

  const payload = data?.file || data?.data?.file || data?.data || data;

  return {
    url: payload.url || payload.bill_file_url || payload.fileUrl,
    path: payload.path || payload.bill_file_path || payload.filePath,
    name:
      payload.name ||
      payload.originalName ||
      payload.bill_file_name ||
      payload.fileName ||
      file.name,
    originalName: payload.originalName || file.name,
    type: payload.type || payload.bill_file_type || payload.fileType || file.type,
    size: payload.size || file.size,
    bucket: payload.bucket,
    extracted: getExtractedBillData(data, payload),
  };
};
