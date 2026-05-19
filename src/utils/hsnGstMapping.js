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
