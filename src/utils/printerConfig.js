export const PRINTER_SETTINGS_ROUTE = "/printer-settings";
export const INVOICE_PRINTER_KEY = "invoicePrinter";
export const POS_DEVICES_KEY = "posDevices";

export const PRINTER_PROFILES = [
  {
    id: "thermal-58",
    label: "58 mm thermal",
    paperSize: "58mm",
    receiptWidth: "54mm",
    imageWidth: "58mm",
    captureWidth: "54mm",
    pageSize: "58mm auto",
    paymentPrintWidth: 352,
  },
  {
    id: "thermal-80",
    label: "80 mm thermal",
    paperSize: "80mm",
    receiptWidth: "76mm",
    imageWidth: "80mm",
    captureWidth: "76mm",
    pageSize: "80mm auto",
    paymentPrintWidth: 576,
  },
  {
    id: "browser-default",
    label: "Browser default printer",
    paperSize: "Auto",
    receiptWidth: "72mm",
    imageWidth: "100%",
    captureWidth: "72mm",
    pageSize: "auto",
    paymentPrintWidth: 576,
  },
];

export const DEFAULT_PRINTER_PROFILE = PRINTER_PROFILES[0];

export const getPrinterProfile = (profileId) =>
  PRINTER_PROFILES.find((profile) => profile.id === profileId) ||
  DEFAULT_PRINTER_PROFILE;

export const getInvoicePrinterSettings = () => {
  if (typeof window === "undefined") {
    return {
      profileId: DEFAULT_PRINTER_PROFILE.id,
      printerName: "",
      printerId: "",
    };
  }

  try {
    const saved = window.localStorage.getItem(INVOICE_PRINTER_KEY);
    if (!saved) {
      return {
        profileId: DEFAULT_PRINTER_PROFILE.id,
        printerName: "",
        printerId: "",
      };
    }

    const parsed = JSON.parse(saved);
    return {
      ...parsed,
      profileId: getPrinterProfile(parsed.profileId).id,
      printerName: parsed.printerName || parsed.name || "",
      printerId: parsed.printerId || "",
    };
  } catch {
    return {
      profileId: DEFAULT_PRINTER_PROFILE.id,
      printerName: "",
      printerId: "",
    };
  }
};

export const saveInvoicePrinterSettings = (settings) => {
  const current = getInvoicePrinterSettings();
  const next = {
    ...current,
    ...settings,
    profileId: getPrinterProfile(settings.profileId || current.profileId).id,
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(INVOICE_PRINTER_KEY, JSON.stringify(next));
  return next;
};

export const clearInvoicePrinterSettings = () => {
  window.localStorage.removeItem(INVOICE_PRINTER_KEY);
};

export const getPOSDevices = () => {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(POS_DEVICES_KEY);
    const devices = saved ? JSON.parse(saved) : [];
    return Array.isArray(devices) ? devices : [];
  } catch {
    return [];
  }
};

export const savePOSDevice = (device) => {
  const devices = getPOSDevices();
  const id =
    device.id ||
    `${device.type}-${device.connection || "manual"}-${Date.now()}`;
  const nextDevice = {
    ...device,
    id,
    name: device.name || "POS Device",
    addedAt: device.addedAt || new Date().toISOString(),
  };
  const nextDevices = [
    nextDevice,
    ...devices.filter(
      (item) => !(item.id === id || item.name === nextDevice.name)
    ),
  ];

  window.localStorage.setItem(POS_DEVICES_KEY, JSON.stringify(nextDevices));
  return nextDevice;
};

export const removePOSDevice = (deviceId) => {
  const nextDevices = getPOSDevices().filter((device) => device.id !== deviceId);
  window.localStorage.setItem(POS_DEVICES_KEY, JSON.stringify(nextDevices));
  return nextDevices;
};

export const openPrinterSettingsWindow = () => {
  const win = window.open(
    PRINTER_SETTINGS_ROUTE,
    "printerSettings",
    "width=520,height=720,top=80,left=120"
  );

  if (!win) {
    alert("Popup blocked. Please allow popups for this site.");
  }
};
