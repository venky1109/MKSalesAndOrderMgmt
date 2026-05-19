import axios from "axios";

import { API_BASE_URL } from "./apiConfig";

const IMAGE_SEARCH_ENDPOINT =
  process.env.REACT_APP_PRODUCT_IMAGE_SEARCH_ENDPOINT ||
  "/catalog-pg/product-images/search";

const IMAGE_UPLOAD_ENDPOINT =
  process.env.REACT_APP_PRODUCT_IMAGE_UPLOAD_ENDPOINT ||
  "/catalog-pg/product-images/upload";

const IMAGE_UPLOAD_FROM_URL_ENDPOINT =
  process.env.REACT_APP_PRODUCT_IMAGE_UPLOAD_FROM_URL_ENDPOINT ||
  "/catalog-pg/product-images/upload-from-url";

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

const PRODUCT_IMAGE_MAX_BYTES = 40 * 1024;

const makeSafeImageFileName = (value) => {
  const baseName = String(value || "migration-product")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${baseName || "migration-product"}.webp`;
};

const normalizeUploadedImagePayload = (data) => {
  const payload = data?.image || data?.file || data?.data?.image || data?.data || data;
  const url = payload?.url || payload?.imageUrl || payload?.downloadURL;

  return url ? { ...payload, url } : payload;
};

export const findProductImageByName = async (imageName, token = "") => {
  const name = String(imageName || "").trim();
  if (!name) return null;

  const { data } = await axios.get(
    `${API_BASE_URL}${IMAGE_SEARCH_ENDPOINT}?name=${encodeURIComponent(name)}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );

  const payload = data?.image || data?.data?.image || data?.data || data;
  const url = payload?.url || payload?.imageUrl || payload?.downloadURL;

  return url ? { ...payload, url } : null;
};

export const searchProductImageSuggestions = async (imageName, token = "") => {
  const name = String(imageName || "").trim();
  if (!name) return [];

  const { data } = await axios.get(
    `${API_BASE_URL}${IMAGE_SEARCH_ENDPOINT}?name=${encodeURIComponent(name)}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );

  const suggestions = data?.suggestions || data?.images || data?.data?.suggestions || data?.data?.images || [];
  return Array.isArray(suggestions) ? suggestions : [];
};

export const downloadAndCompressImage = async (
  imageUrl,
  maxBytes = PRODUCT_IMAGE_MAX_BYTES,
  fileNameHint = "migration-product"
) => {
  const source = String(imageUrl || "").trim();
  if (!source) throw new Error("Image URL is required");

  const response = await fetch(source);
  if (!response.ok) throw new Error("Unable to download image");

  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  let scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
  let quality = 0.82;
  let output = null;

  for (let attempt = 0; attempt < 18; attempt += 1) {
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    output = await canvasToBlob(canvas, "image/webp", quality);
    if (output && output.size <= maxBytes) break;

    if (quality > 0.38) {
      quality -= 0.08;
    } else {
      scale *= 0.78;
      quality = 0.72;
    }
  }

  if (!output) throw new Error("Unable to compress image");
  if (output.size > maxBytes) {
    throw new Error(
      `Unable to reduce image below ${Math.round(maxBytes / 1024)} KB. Try a smaller source image.`
    );
  }

  return new File([output], makeSafeImageFileName(fileNameHint), {
    type: "image/webp",
  });
};

export const uploadProductImage = async (file, productName = "product", token = "") => {
  if (!file) return null;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("productName", productName);

  const { data } = await axios.post(
    `${API_BASE_URL}${IMAGE_UPLOAD_ENDPOINT}`,
    formData,
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return normalizeUploadedImagePayload(data);
};

export const uploadProductImageFromUrl = async (
  imageUrl,
  productName = "product",
  token = "",
  maxBytes = PRODUCT_IMAGE_MAX_BYTES
) => {
  const source = String(imageUrl || "").trim();
  if (!source) throw new Error("Image URL is required");

  const { data } = await axios.post(
    `${API_BASE_URL}${IMAGE_UPLOAD_FROM_URL_ENDPOINT}`,
    {
      imageUrl: source,
      productName,
      maxBytes,
      fileName: makeSafeImageFileName(productName),
      outputType: "image/webp",
    },
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );

  return normalizeUploadedImagePayload(data);
};
