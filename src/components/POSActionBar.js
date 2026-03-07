import React, { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../features/auth/posUserSlice";
import { publishQueuedOrdersSequential } from "../features/orders/orderSlice";
import { pingBackend } from "../utils/network";
import { clearCart } from "../features/cart/cartSlice";
import CreateOrderButton from "./CreateOrderButton";
import logo from "../assests/ManaKiranaLogo1024x1024.png";

function AppModal({
  open,
  title,
  message,
  type = "info",
  onClose,
  onConfirm,
  confirmText = "OK",
  cancelText = "Cancel",
  showCancel = false,
  children,
}) {
  if (!open) return null;

  const accent =
    type === "error"
      ? "bg-red-600"
      : type === "success"
      ? "bg-green-600"
      : type === "warning"
      ? "bg-orange-500"
      : "bg-yellow-600";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-[fadeIn_.15s_ease-out]">
        <div className={`${accent} px-4 py-3`}>
          <h3 className="text-white text-base font-bold">{title}</h3>
        </div>

        <div className="px-4 py-4">
          {message ? (
            <p className="text-sm text-gray-700 whitespace-pre-line">{message}</p>
          ) : null}

          {children ? <div className="mt-3">{children}</div> : null}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t bg-gray-50">
          {showCancel && (
            <button
              onClick={onClose}
              className="h-10 px-4 rounded-xl border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-100 transition"
            >
              {cancelText}
            </button>
          )}

          <button
            onClick={onConfirm || onClose}
            className={`h-10 px-4 rounded-xl text-white font-semibold transition ${accent} hover:opacity-90`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ open, message, type = "info" }) {
  if (!open || !message) return null;

  const tone =
    type === "error"
      ? "bg-red-600"
      : type === "success"
      ? "bg-green-600"
      : type === "warning"
      ? "bg-orange-500"
      : "bg-slate-800";

  return (
    <div className="fixed top-4 right-4 z-[9999]">
      <div className={`${tone} text-white px-4 py-3 rounded-xl shadow-xl text-sm font-medium max-w-sm`}>
        {message}
      </div>
    </div>
  );
}

export default function POSActionsBar() {
  const dispatch = useDispatch();

  const posUserInfo = useSelector((s) => s.posUser.userInfo);
  const token = posUserInfo?.token;
  const name = posUserInfo?.username || "";

  const queueCount = useSelector((s) => s.orders?.queueCount ?? 0);
  const publishStatus = useSelector((s) => s.orders?.publishStatus || "idle");
  const isPublishing = publishStatus === "loading";

  const cartItems = useSelector((s) => s.cart.items || []);
  const cartTotal = useSelector((s) => s.cart.total || 0);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "info",
  });

  const [infoModal, setInfoModal] = useState({
    open: false,
    title: "",
    message: "",
    type: "info",
  });

  const [clearCartModalOpen, setClearCartModalOpen] = useState(false);

  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [holdPhone, setHoldPhone] = useState("");
  const [holdError, setHoldError] = useState("");

  const showToast = useCallback((message, type = "info") => {
    setToast({ open: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false }));
    }, 2500);
  }, []);

  const showInfoModal = useCallback((title, message, type = "info") => {
    setInfoModal({
      open: true,
      title,
      message,
      type,
    });
  }, []);

  const closeInfoModal = useCallback(() => {
    setInfoModal((prev) => ({ ...prev, open: false }));
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem("posUserInfo");
    window.location.href = "/login";
  };

  const handleClearCart = useCallback(() => {
    if (cartItems.length === 0) {
      showToast("Cart already empty.", "warning");
      return;
    }

    setClearCartModalOpen(true);
  }, [cartItems, showToast]);

  const confirmClearCart = useCallback(() => {
    dispatch(clearCart());
    localStorage.removeItem("cart");
    setClearCartModalOpen(false);
    showToast("Cart cleared successfully.", "success");
  }, [dispatch, showToast]);

  const handlePublish = async () => {
    if (!navigator.onLine) {
      showInfoModal(
        "No Network",
        "Connect to the internet to publish orders.",
        "warning"
      );
      return;
    }

    const ok = await pingBackend(undefined, 2000, token);
    if (!ok) {
      showInfoModal(
        "Backend Unreachable",
        "Check the API server and try again.",
        "error"
      );
      return;
    }

    if (!queueCount) {
      showToast("No queued orders to publish.", "warning");
      return;
    }

    try {
      const res = await dispatch(
        publishQueuedOrdersSequential({ token })
      ).unwrap();

      const message = res?.published
        ? `Published ${res.published} order(s).${
            res.failed ? ` ${res.failed} failed.` : ""
          }`
        : "No queued orders to publish.";

      showInfoModal(
        res?.published ? "Publish Complete" : "Nothing to Publish",
        message,
        res?.failed ? "warning" : "success"
      );
    } catch (e) {
      showInfoModal(
        "Publish Failed",
        e?.message || String(e),
        "error"
      );
    }
  };

  const handleHold = useCallback(() => {
    if (cartItems.length === 0) {
      showToast("Cart is empty.", "error");
      return;
    }

    setHoldPhone("");
    setHoldError("");
    setHoldModalOpen(true);
  }, [cartItems, showToast]);

  const confirmHold = useCallback(() => {
    if (!/^\d{10}$/.test(holdPhone)) {
      setHoldError("Please enter a valid 10-digit phone number.");
      return;
    }

    localStorage.setItem(
      `hold${holdPhone}`,
      JSON.stringify({ items: cartItems, total: cartTotal })
    );

    dispatch(clearCart());
    setHoldModalOpen(false);
    setHoldPhone("");
    setHoldError("");
    showToast(`Cart placed on hold for ${holdPhone}.`, "success");
  }, [holdPhone, cartItems, cartTotal, dispatch, showToast]);

  const baseBtn =
    "rounded-xl font-bold transition active:translate-y-[1px] whitespace-nowrap";
  const orangeBtn =
    "bg-[#ff8a00] text-white border border-[#FFD700] hover:bg-[#e57b00]";
  const mobileBtn = "h-10 px-3 text-xs shrink-0";
  const desktopBtn = "w-full h-11 text-sm";

  return (
    <>
      <Toast open={toast.open} message={toast.message} type={toast.type} />

      <AppModal
        open={infoModal.open}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        onClose={closeInfoModal}
        confirmText="OK"
      />

      <AppModal
        open={clearCartModalOpen}
        title="Clear Entire Cart"
        message="Are you sure you want to remove all items from the cart?"
        type="warning"
        onClose={() => setClearCartModalOpen(false)}
        onConfirm={confirmClearCart}
        confirmText="Clear Cart"
        cancelText="Cancel"
        showCancel
      />

      <AppModal
        open={holdModalOpen}
        title="Hold Order"
        type="info"
        onClose={() => {
          setHoldModalOpen(false);
          setHoldPhone("");
          setHoldError("");
        }}
        onConfirm={confirmHold}
        confirmText="Save Hold"
        cancelText="Cancel"
        showCancel
      >
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            Customer Phone Number
          </label>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={holdPhone}
            onChange={(e) => {
              const onlyDigits = e.target.value.replace(/\D/g, "");
              setHoldPhone(onlyDigits);
              if (holdError) setHoldError("");
            }}
            placeholder="Enter 10-digit phone number"
            className="w-full h-11 rounded-xl border border-gray-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          {holdError ? (
            <p className="text-sm text-red-600 font-medium">{holdError}</p>
          ) : null}
        </div>
      </AppModal>

      <div className="w-full h-full bg-white">
        {/* Mobile bottom bar */}
        <div className="md:hidden border-t bg-white px-2 py-2">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <div className="shrink-0">
              <div className="p-[2px] rounded-full bg-[#FFD700]">
                <img
                  src={logo}
                  alt="ManaKirana"
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-[#FFD700]"
                  draggable="false"
                />
              </div>
            </div>

            <button
              onClick={handlePublish}
              disabled={isPublishing || !queueCount || !navigator.onLine}
              className={[
                baseBtn,
                mobileBtn,
                "text-white shrink-0",
                queueCount && !isPublishing && navigator.onLine
                  ? "bg-indigo-600 hover:bg-indigo-700 border border-indigo-300"
                  : "bg-gray-400 border border-gray-300 cursor-not-allowed",
              ].join(" ")}
              title={
                !navigator.onLine
                  ? "Offline – connect to publish"
                  : queueCount
                  ? "Publish queued orders"
                  : "No queued orders"
              }
            >
              {isPublishing ? "Publishing…" : "Publish"}
              {queueCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center text-[8px] bg-white text-indigo-700 rounded-full min-w-[20px] h-5 px-1">
                  {queueCount}
                </span>
              )}
            </button>

            <button
              onClick={handleHold}
              className={[baseBtn, orangeBtn, mobileBtn].join(" ")}
            >
              Hold
            </button>

            <button
              onClick={handleClearCart}
              className={[
                baseBtn,
                mobileBtn,
                "bg-red-600 text-white border border-red-300 hover:bg-red-700",
              ].join(" ")}
            >
              Clear Cart
            </button>

            <button className={[baseBtn, orangeBtn, mobileBtn].join(" ")}>
              Multi
            </button>

            <button className={[baseBtn, orangeBtn, mobileBtn].join(" ")}>
              UPI
            </button>

            <div className="shrink-0 h-10 [&>*]:h-full [&>*]:rounded-xl [&>*]:px-3 [&>*]:text-xs [&>*]:font-bold">
              <CreateOrderButton />
            </div>

            <div className="shrink-0 text-xs text-gray-700 font-semibold px-2">
              Hi {name}
            </div>

            <button
              onClick={handleLogout}
              className="shrink-0 h-10 px-3 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Desktop action bar */}
        <div className="hidden md:flex h-full w-full flex-col bg-[#f9fafb]">
          {/* Logo */}
          <div className="shrink-0 flex items-center justify-center px-2 py-3 border-b bg-white">
            <div className="p-[2px] rounded-full bg-[#FFD700]">
              <img
                src={logo}
                alt="ManaKirana"
                className="h-16 w-16 rounded-full object-cover ring-2 ring-[#FFD700]"
                draggable="false"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex-1 min-h-0 px-2 py-2 flex flex-col gap-1.5">
            <button
              onClick={handlePublish}
              disabled={isPublishing || !queueCount || !navigator.onLine}
              className={[
                "w-full h-9 rounded-lg border font-semibold text-xs text-white transition",
                queueCount && !isPublishing && navigator.onLine
                  ? "bg-slate-500 hover:bg-slate-600 border-slate-300"
                  : "bg-gray-400 border-gray-300 cursor-not-allowed",
              ].join(" ")}
              title={
                !navigator.onLine
                  ? "Offline – connect to publish"
                  : queueCount
                  ? "Publish queued orders"
                  : "No queued orders"
              }
            >
              <div className="flex items-center justify-center gap-1">
                <span>{isPublishing ? "Publishing…" : "Publish"}</span>
                {queueCount > 0 && (
                  <span className="inline-flex items-center justify-center text-[7px] bg-white text-slate-700 rounded-full min-w-[16px] h-4 px-1">
                    {queueCount}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={handleHold}
              className={[baseBtn, orangeBtn, "h-9 text-xs", desktopBtn].join(
                " "
              )}
            >
              Hold
            </button>

            <button
              onClick={handleClearCart}
              className={[
                baseBtn,
                desktopBtn,
                "h-9 text-xs bg-red-600 text-white border border-red-300 hover:bg-red-700",
              ].join(" ")}
            >
              Clear Cart
            </button>

            <button
              className={[baseBtn, orangeBtn, "h-9 text-xs", desktopBtn].join(
                " "
              )}
            >
              Multi
            </button>

            <button
              className={[baseBtn, orangeBtn, "h-9 text-xs", desktopBtn].join(
                " "
              )}
            >
              UPI
            </button>

            <div className="w-full [&>*]:w-full [&>*]:h-9 [&>*]:rounded-lg [&>*]:font-semibold [&>*]:text-xs">
              <CreateOrderButton />
            </div>
          </div>

          {/* Bottom user panel */}
          <div className="shrink-0 border-t bg-white px-2 py-3">
            <div className="text-center text-[15px] text-green-700 font-semibold truncate">
              Hi {name}
            </div>

            <button
              onClick={handleLogout}
              className="mt-2 w-full h-10 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
}