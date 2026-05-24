export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "https://mkbackend.onrender.com/api";

if (typeof window !== "undefined") {
  window.MK_API_BASE_URL = API_BASE_URL;
  window.MK_REACT_APP_API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
}

if (process.env.NODE_ENV === "development") {
  console.log("REACT_APP_API_BASE_URL:", process.env.REACT_APP_API_BASE_URL);
  console.log("API_BASE_URL:", API_BASE_URL);
}

export const getAppOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : "";

export const getNetworkFailureMessage = (action) => {
  const origin = getAppOrigin();

  return [
    `${action} failed before reaching the server.`,
    `App origin: ${origin || "unknown"}`,
    `API: ${API_BASE_URL}`,
    "Allow this app origin in backend CORS, then reopen the installed PWA.",
  ].join("\n");
};
