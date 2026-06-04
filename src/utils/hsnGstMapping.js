const normalizeLookupText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");

export const HSN_GST_PRODUCT_MAPPING = [
  {
    key: "salt",
    keywords: ["salt", "iodized salt", "iodised salt", "rock salt", "sendha namak", "kala namak"],
    hsn_code: "2501",
    gst_rate: "0",
    source:
      "CBIC GST Goods and Services Rates: HSN 2501 salt including table salt and pure sodium chloride listed under Nil rate.",
    source_url: "https://cbic-gst.gov.in/gst-goods-services-rates.html",
  },
  {
    key: "vermicelli",
    keywords: ["vermicelli", "seviyan", "semiya", "semia", "semai", "sevai", "shevaya"],
    hsn_code: "1902",
    gst_rate: "5",
    source:
      "CBIC GST Goods and Services Rates: HSN 1902 Seviyan (vermicelli) listed at 5% IGST / 2.5% CGST + 2.5% SGST.",
    source_url: "https://cbic-gst.gov.in/gst-goods-services-rates.html",
  },
  {
    key: "sugar",
    keywords: ["sugar", "crystal sugar", "big crystal sugar", "white sugar", "refined sugar"],
    hsn_code: "1701",
    gst_rate: "",
    source:
      "CBIC GST Goods and Services Rates: HSN 1701 covers cane or beet sugar and chemically pure sucrose in solid form. GST rate can vary by classification/packaging, so only HSN is auto-filled here.",
    source_url: "https://cbic-gst.gov.in/gst-goods-services-rates.html",
  },
  {
    key: "star-anise",
    keywords: [
      "anasa puvvu",
      "anasapuvvu",
      "అనాస పువ్వు",
      "star anise",
      "anise",
      "aniseed",
      "badian",
    ],
    hsn_code: "0909",
    gst_rate: "",
    source:
      "CBIC GST HSN heading 0909 covers seeds of anise, badian, fennel, coriander, cumin or caraway; juniper berries. GST rate can vary by exact form/classification, so only HSN is auto-filled here.",
    source_url: "https://cbic-gst.gov.in/gst-goods-services-rates.html",
  },
];

export const findHsnGstMapping = (...values) => {
  const lookupText = normalizeLookupText(values.filter(Boolean).join(" "));
  if (!lookupText) return null;

  return (
    HSN_GST_PRODUCT_MAPPING.find((entry) =>
      entry.keywords.some((keyword) => {
        const normalizedKeyword = normalizeLookupText(keyword);
        return new RegExp(`(^| )${normalizedKeyword.replace(/\s+/g, " ")}( |$)`).test(
          lookupText
        );
      })
    ) || null
  );
};

export const applyHsnGstFallback = (values, ...lookupValues) => {
  const mapping = findHsnGstMapping(...lookupValues);
  if (!mapping) return values;

  return {
    ...values,
    hsn_code: values.hsn_code || mapping.hsn_code,
    gst_rate: values.gst_rate || mapping.gst_rate,
  };
};
