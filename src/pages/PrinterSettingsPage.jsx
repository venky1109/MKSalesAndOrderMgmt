import React, { useEffect, useMemo, useState } from "react";
import {
  clearInvoicePrinterSettings,
  DEFAULT_PRINTER_PROFILE,
  getInvoicePrinterSettings,
  getPOSDevices,
  getPrinterProfile,
  PRINTER_PROFILES,
  removePOSDevice,
  saveInvoicePrinterSettings,
  savePOSDevice,
} from "../utils/printerConfig";

const defaultSettings = {
  printerId: "",
  printerName: "",
  profileId: DEFAULT_PRINTER_PROFILE.id,
};

export default function PrinterSettingsPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [devices, setDevices] = useState([]);
  const [savedMessage, setSavedMessage] = useState("");

  const printers = useMemo(
    () => devices.filter((device) => device.type === "printer"),
    [devices]
  );
  const scanners = useMemo(
    () => devices.filter((device) => device.type === "scanner"),
    [devices]
  );

  useEffect(() => {
    setSettings(getInvoicePrinterSettings());
    setDevices(getPOSDevices());
  }, []);

  const selectedProfile = getPrinterProfile(settings.profileId);

  const showMessage = (message) => {
    setSavedMessage(message);
    setTimeout(() => setSavedMessage(""), 2500);
  };

  const refreshDevices = () => {
    setDevices(getPOSDevices());
  };

  const addBluetoothDevice = async (type) => {
    try {
      if (!navigator.bluetooth) {
        alert("Bluetooth pairing is not supported in this browser.");
        return;
      }

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
      });

      const savedDevice = savePOSDevice({
        id: device.id,
        name:
          device.name ||
          (type === "printer" ? "Bluetooth Printer" : "Bluetooth Scanner"),
        type,
        connection: "bluetooth",
      });

      refreshDevices();

      if (type === "printer") {
        setSettings((prev) => ({
          ...prev,
          printerId: savedDevice.id,
          printerName: savedDevice.name,
        }));
      }

      showMessage(
        `${type === "printer" ? "Printer" : "Barcode scanner"} added.`
      );
    } catch (error) {
      console.error(error);
      alert("Device selection cancelled or failed.");
    }
  };

  const addHidScanner = async () => {
    try {
      if (!navigator.hid) {
        alert("USB/HID scanner pairing is not supported in this browser.");
        return;
      }

      const selectedDevices = await navigator.hid.requestDevice({
        filters: [],
      });
      const device = selectedDevices?.[0];
      if (!device) return;

      savePOSDevice({
        id: `hid-${device.vendorId}-${device.productId}`,
        name: device.productName || "USB Barcode Scanner",
        type: "scanner",
        connection: "usb-hid",
      });

      refreshDevices();
      showMessage("Barcode scanner added.");
    } catch (error) {
      console.error(error);
      alert("Scanner selection cancelled or failed.");
    }
  };

  const handlePrinterChange = (printerId) => {
    const selectedPrinter = printers.find((printer) => printer.id === printerId);
    setSettings((prev) => ({
      ...prev,
      printerId,
      printerName: selectedPrinter?.name || "",
    }));
  };

  const saveSettings = () => {
    const selectedPrinter = printers.find(
      (printer) => printer.id === settings.printerId
    );
    const next = saveInvoicePrinterSettings({
      printerId: selectedPrinter?.id || "",
      printerName: selectedPrinter?.name || "",
      profileId: settings.profileId,
    });

    setSettings(next);
    showMessage("Printer settings saved for invoice printing.");
  };

  const clearSettings = () => {
    clearInvoicePrinterSettings();
    setSettings(defaultSettings);
    showMessage("Printer settings cleared.");
  };

  const removeDevice = (device) => {
    const nextDevices = removePOSDevice(device.id);
    setDevices(nextDevices);

    if (device.id === settings.printerId) {
      setSettings((prev) => ({
        ...prev,
        printerId: "",
        printerName: "",
      }));
    }

    showMessage(`${device.name} removed.`);
  };

  const testPrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <h1 className="text-xl font-bold text-gray-800">Printer Settings</h1>

        <p className="mt-1 text-sm text-gray-500">
          Save invoice printer and POS scanner devices for this browser.
        </p>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-bold text-gray-700">
              Invoice printer
            </span>
            <select
              value={settings.printerId || ""}
              onChange={(e) => handlePrinterChange(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200"
            >
              <option value="">Choose in browser print dialog</option>
              {printers.map((printer) => (
                <option key={printer.id} value={printer.id}>
                  {printer.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-gray-700">
              Invoice paper size
            </span>
            <select
              value={settings.profileId}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  profileId: e.target.value,
                }))
              }
              className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200"
            >
              {PRINTER_PROFILES.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            onClick={() => addBluetoothDevice("printer")}
            className="h-11 rounded-lg bg-slate-700 px-3 text-sm font-bold text-white hover:bg-slate-800"
          >
            Add Bluetooth Printer
          </button>

          <button
            onClick={() => addBluetoothDevice("scanner")}
            className="h-11 rounded-lg bg-indigo-600 px-3 text-sm font-bold text-white hover:bg-indigo-700"
          >
            Add Bluetooth Scanner
          </button>

          <button
            onClick={addHidScanner}
            className="h-11 rounded-lg bg-blue-600 px-3 text-sm font-bold text-white hover:bg-blue-700 sm:col-span-2"
          >
            Add USB Barcode Scanner
          </button>
        </div>

        <div className="mt-5 rounded-lg border bg-slate-50 p-4">
          <div className="text-sm font-bold text-gray-700">
            Current invoice print setup
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Printer: {settings.printerName || "Choose in browser print dialog"}
          </div>
          <div className="mt-1 text-sm text-gray-600">
            Paper: {selectedProfile.label}
          </div>
        </div>

        <div className="mt-5 rounded-lg border bg-white p-4">
          <div className="text-sm font-bold text-gray-700">Saved scanners</div>
          {scanners.length ? (
            <div className="mt-2 space-y-2">
              {scanners.map((scanner) => (
                <div
                  key={scanner.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-gray-700">
                      {scanner.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {scanner.connection}
                    </div>
                  </div>
                  <button
                    onClick={() => removeDevice(scanner)}
                    className="shrink-0 rounded-md border border-red-200 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-sm text-gray-500">
              No scanner saved yet.
            </div>
          )}
        </div>

        {savedMessage ? (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
            {savedMessage}
          </div>
        ) : null}

        <button
          onClick={saveSettings}
          className="mt-5 h-11 w-full rounded-lg bg-slate-700 text-sm font-bold text-white hover:bg-slate-800"
        >
          Save Printer Settings
        </button>

        <button
          onClick={testPrint}
          className="mt-3 h-11 w-full rounded-lg bg-blue-600 text-sm font-bold text-white hover:bg-blue-700"
        >
          Test Browser Printer
        </button>

        <button
          onClick={clearSettings}
          className="mt-3 h-11 w-full rounded-lg bg-red-600 text-sm font-bold text-white hover:bg-red-700"
        >
          Clear Printer Settings
        </button>

        <button
          onClick={() => window.close()}
          className="mt-3 h-10 w-full rounded-lg border border-gray-300 bg-white text-sm font-bold text-gray-700 hover:bg-gray-100"
        >
          Close
        </button>

        <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
          The browser will still ask you to choose the actual printer. Most
          barcode scanners work like a keyboard after pairing, so keep the scan
          field focused while billing.
        </div>
      </div>
    </div>
  );
}
