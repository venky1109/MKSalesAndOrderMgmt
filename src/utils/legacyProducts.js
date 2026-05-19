import axios from "axios";

import { API_BASE_URL } from "./apiConfig";

const normalizeArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.suggestions)) return payload.suggestions;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.suggestions)) return payload.data.suggestions;
  return [];
};

export const searchLegacyProducts = async (query, token = "") => {
  const q = String(query || "").trim();
  if (!q || q.length < 2) return [];

  const { data } = await axios.get(
    `${API_BASE_URL}/catalog-pg/legacy-products/secondary-suggestions?q=${encodeURIComponent(q)}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );

  return normalizeArray(data);
};
