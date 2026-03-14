import React, { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../features/auth/posUserSlice";
import {
  publishQueuedOrdersSequential,
  fetchPOSOrders,
  fetchPOSOrderDetails,
} from "../features/orders/orderSlice";
import { pingBackend } from "../utils/network";
import UpiPaymentModal from "../components/UpiPaymentModal";
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
  size = "max-w-md",
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
      <div
        className={`w-full ${size} overflow-hidden rounded-2xl bg-white shadow-2xl animate-[fadeIn_.15s_ease-out]`}
      >
        <div className={`${accent} flex items-center justify-between px-4 py-3`}>
          <h3 className="text-base font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-lg font-bold text-white">
            ×
          </button>
        </div>

        <div className="max-h-[80vh] overflow-auto px-4 py-4">
          {message ? (
            <p className="whitespace-pre-line text-sm text-gray-700">{message}</p>
          ) : null}

          {children ? <div className="mt-3">{children}</div> : null}
        </div>

        {(onConfirm || showCancel) && (
          <div className="flex justify-end gap-2 border-t bg-gray-50 px-4 py-3">
            {showCancel && (
              <button
                onClick={onClose}
                className="h-10 rounded-xl border border-gray-300 bg-white px-4 font-semibold text-gray-700 transition hover:bg-gray-100"
              >
                {cancelText}
              </button>
            )}

            {onConfirm && (
              <button
                onClick={onConfirm}
                className={`h-10 rounded-xl px-4 font-semibold text-white transition hover:opacity-90 ${accent}`}
              >
                {confirmText}
              </button>
            )}
          </div>
        )}
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
    <div className="fixed right-4 top-4 z-[9999]">
      <div
        className={`${tone} max-w-sm rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl`}
      >
        {message}
      </div>
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hr = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${day}-${month}-${year} ${hr}:${min}`;
}

export default function POSActionsBar() {
  const dispatch = useDispatch();

  const posUserInfo = useSelector((s) => s.posUser.userInfo);
  const token = posUserInfo?.token;
  const name = posUserInfo?.username || "";
  const role = posUserInfo?.role || "";
  const location = posUserInfo?.location || "";

  const queueCount = useSelector((s) => s.orders?.queueCount ?? 0);
  const publishStatus = useSelector((s) => s.orders?.publishStatus || "idle");
  const isPublishing = publishStatus === "loading";

  const cartItems = useSelector((s) => s.cart.items || []);
  const cartTotal = useSelector((s) => s.cart.total || 0);

  const posOrdersList = useSelector((s) => s.orders?.posOrdersList || []);
  const posOrdersListLoading = useSelector(
    (s) => s.orders?.posOrdersListLoading || false
  );
  const posOrderDetails = useSelector((s) => s.orders?.posOrderDetails || null);
  const posOrderDetailsLoading = useSelector(
    (s) => s.orders?.posOrderDetailsLoading || false
  );

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

  const [ordersModalOpen, setOrdersModalOpen] = useState(false);
  const [ordersView, setOrdersView] = useState("list");
  const [orderFilterMode, setOrderFilterMode] = useState("latest");
  const [searchPhone, setSearchPhone] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showUpiModal, setShowUpiModal] = useState(false);
  

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
      showInfoModal("Publish Failed", e?.message || String(e), "error");
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

  const openOrdersModal = useCallback(async () => {
    setOrdersModalOpen(true);
    setOrdersView("list");
    setOrderFilterMode("latest");
    try {
      await dispatch(fetchPOSOrders({ mode: "latest" })).unwrap();
    } catch (e) {
      showToast(e?.message || "Failed to load orders", "error");
    }
  }, [dispatch, showToast]);

  const loadOrders = useCallback(
    async (mode) => {
      try {
        setOrdersView("list");
        setOrderFilterMode(mode);

        if (mode === "latest") {
          await dispatch(fetchPOSOrders({ mode: "latest" })).unwrap();
        } else if (mode === "today") {
          await dispatch(fetchPOSOrders({ mode: "today" })).unwrap();
        } else if (mode === "phone") {
          if (!/^\d{10}$/.test(searchPhone)) {
            showToast("Enter valid 10-digit phone number.", "warning");
            return;
          }
          await dispatch(
            fetchPOSOrders({ mode: "phone", phone: searchPhone })
          ).unwrap();
        } else if (mode === "custom") {
          if (!fromDate || !toDate) {
            showToast("Select from and to dates.", "warning");
            return;
          }
          await dispatch(
            fetchPOSOrders({ mode: "custom", from: fromDate, to: toDate })
          ).unwrap();
        }
      } catch (e) {
        showToast(e?.message || "Failed to load orders", "error");
      }
    },
    [dispatch, searchPhone, fromDate, toDate, showToast]
  );

  const handleOpenOrderDetails = useCallback(
    async (id) => {
      try {
        await dispatch(fetchPOSOrderDetails(id)).unwrap();
        setOrdersView("details");
      } catch (e) {
        showToast(e?.message || "Failed to load order details", "error");
      }
    },
    [dispatch, showToast]
  );

  const baseBtn =
    "rounded-xl font-bold transition active:translate-y-[1px] whitespace-nowrap";
  const orangeBtn =
    "bg-[#ff8a00] text-white border border-[#FFD700] hover:bg-[#e57b00]";
  const mobileBtn = "h-10 px-3 text-xs shrink-0";
  const desktopBtn = "w-full h-11 text-sm";

  const ordersTotalAmount = (posOrdersList || []).reduce(
    (sum, order) => sum + Number(order.totalPrice || 0),
    0
  );

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
            className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          {holdError ? (
            <p className="text-sm font-medium text-red-600">{holdError}</p>
          ) : null}
        </div>
      </AppModal>

      <AppModal
        open={ordersModalOpen}
        title={ordersView === "list" ? "Orders" : "Order Details"}
        type="info"
        onClose={() => {
          setOrdersModalOpen(false);
          setOrdersView("list");
        }}
        size="max-w-6xl"
      >
        {ordersView === "list" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => loadOrders("latest")}
                className={`h-10 rounded-xl border px-4 text-sm font-semibold ${
                  orderFilterMode === "latest"
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-gray-300 bg-white text-gray-700"
                }`}
              >
                Last 10 Orders
              </button>

              <button
                onClick={() => loadOrders("today")}
                className={`h-10 rounded-xl border px-4 text-sm font-semibold ${
                  orderFilterMode === "today"
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-gray-300 bg-white text-gray-700"
                }`}
              >
                Today Orders
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-xl border bg-gray-50 p-3">
                <div className="mb-2 text-sm font-bold text-gray-700">
                  Search by Phone
                </div>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    maxLength={10}
                    value={searchPhone}
                    onChange={(e) =>
                      setSearchPhone(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="10-digit phone"
                    className="h-10 flex-1 rounded-lg border border-gray-300 px-3 text-sm"
                  />
                  <button
                    onClick={() => loadOrders("phone")}
                    className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white"
                  >
                    Search
                  </button>
                </div>
              </div>

              <div className="rounded-xl border bg-gray-50 p-3 md:col-span-2">
                <div className="mb-2 text-sm font-bold text-gray-700">
                  Search by Custom Dates
                </div>
                <div className="flex flex-col gap-2 md:flex-row">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                  />
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                  />
                  <button
                    onClick={() => loadOrders("custom")}
                    className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white"
                  >
                    Get Orders
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-slate-50 p-3">
              <div className="flex flex-wrap gap-4 text-sm font-semibold text-gray-700">
                <div>
                  <span className="text-gray-500">Logged in as:</span> {name || "-"}
                </div>
                <div>
                  <span className="text-gray-500">Role:</span> {role || "-"}
                </div>
                <div>
                  <span className="text-gray-500">Location:</span> {location || "-"}
                </div>
              </div>
            </div>

            <div className="overflow-auto rounded-xl border">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100">
  <tr>
    <th className="px-3 py-2 text-left">S.No</th>
    <th className="px-3 py-2 text-left">Date</th>
    <th className="px-3 py-2 text-left">Order ID</th>
    <th className="px-3 py-2 text-left">Source</th>
    <th className="px-3 py-2 text-left">POS User</th>
    <th className="px-3 py-2 text-left">Location</th>
    <th className="px-3 py-2 text-left">Customer Phone Number</th>
    <th className="px-3 py-2 text-left">Paid</th>
    <th className="px-3 py-2 text-left">Mode</th>
    <th className="px-3 py-2 text-right">Order Amount</th>
  </tr>
</thead>

                <tbody>
                  {posOrdersListLoading ? (
                    <tr>
                      <td colSpan="10" className="px-3 py-6 text-center text-gray-500">
                        Loading orders...
                      </td>
                    </tr>
                  ) : posOrdersList.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-3 py-6 text-center text-gray-500">
                        No orders found.
                      </td>
                    </tr>
                  ) : (
                    posOrdersList.map((order, index) => {
                      // console.log("Order Row:", order);
                      return (
                      <tr
  key={order._id}
  onClick={() => handleOpenOrderDetails(order._id)}
  className="cursor-pointer border-t hover:bg-yellow-50"
>
  <td className="px-3 py-2">{index + 1}</td>

  <td className="px-3 py-2">{formatDateTime(order.createdAt)}</td>

  <td className="px-3 py-2">
    {order.MK_order_id || order._id}
  </td>

  <td className="px-3 py-2">
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${
        order.source === "ONLINE"
          ? "bg-blue-100 text-blue-700"
          : "bg-orange-100 text-orange-700"
      }`}
    >
      {order.source || "-"}
    </span>
  </td>

  <td className="px-3 py-2">{order.posUserName || "-"}</td>

  <td className="px-3 py-2">{order.posLocation || "-"}</td>

  <td className="px-3 py-2">{order.phoneNo || "-"}</td>

  {/* Paid Status */}
  <td className="px-3 py-2">
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${
        order.isPaid
          ? "bg-green-100 text-green-700"
          : "bg-yellow-100 text-yellow-700"
      }`}
    >
      {order.isPaid ? "Paid" : "Unpaid"}
    </span>
  </td>

  {/* Payment Mode */}
  <td className="px-3 py-2">
    {order.paymentMethod || "-"}
  </td>

  <td className="px-3 py-2 text-right">
    ₹{Number(order.totalPrice || 0).toFixed(2)}
  </td>
</tr>

                    )})
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-yellow-100 font-bold">
                    <td colSpan="9" className="px-3 py-3 text-right">
                      Total Amount
                    </td>
                    <td className="px-3 py-3 text-right">
                      ₹{ordersTotalAmount.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setOrdersView("list")}
                className="h-10 rounded-xl bg-gray-200 px-4 text-sm font-semibold text-gray-800"
              >
                Back
              </button>
            </div>

            {posOrderDetailsLoading ? (
              <div className="py-10 text-center text-gray-500">
                Loading order details...
              </div>
            ) : posOrderDetails ? (
              <>
                <div className="grid grid-cols-1 gap-3 rounded-xl border bg-slate-50 p-3 md:grid-cols-2">
                  <div className="text-sm font-semibold">
                    <span className="text-gray-500">Order ID:</span>{" "}
                    {posOrderDetails.MK_order_id || posOrderDetails._id}
                  </div>

                  <div className="text-sm font-semibold">
                    <span className="text-gray-500">Phone Number:</span>{" "}
                    {posOrderDetails.phoneNo || "-"}
                  </div>

                  <div className="text-sm font-semibold">
                    <span className="text-gray-500">Source:</span>{" "}
                    {posOrderDetails.source || "-"}
                  </div>

                  <div className="text-sm font-semibold">
                    <span className="text-gray-500">POS User:</span>{" "}
                    {posOrderDetails.posUserName || "-"}
                  </div>

                  <div className="text-sm font-semibold">
                    <span className="text-gray-500">Location:</span>{" "}
                    {posOrderDetails.posLocation || "-"}
                  </div>

                  <div className="text-sm font-semibold">
                    <span className="text-gray-500">Created At:</span>{" "}
                    {formatDateTime(posOrderDetails.createdAt)}
                  </div>
                </div>

                <div className="overflow-auto rounded-xl border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-3 py-2 text-left">S.No</th>
                        <th className="px-3 py-2 text-left">Item</th>
                        <th className="px-3 py-2 text-left">Weight</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Price/oneqty</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(posOrderDetails.items || []).map((item) => (
                        <tr key={item.sNo} className="border-t">
                          <td className="px-3 py-2">{item.sNo}</td>
                          <td className="px-3 py-2">{item.item}</td>
                          <td className="px-3 py-2">{item.weight}</td>
                          <td className="px-3 py-2 text-right">{item.qty}</td>
                          <td className="px-3 py-2 text-right">
                            ₹{Number(item.pricePerQty || 0).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            ₹{Number(item.amount || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-yellow-50 font-bold">
                        <td colSpan="5" className="px-3 py-3 text-right">
                          Total Amount
                        </td>
                        <td className="px-3 py-3 text-right">
                          ₹{Number(posOrderDetails.totalPrice || 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            ) : (
              <div className="py-10 text-center text-gray-500">No details found.</div>
            )}
          </div>
        )}
      </AppModal>

      {showUpiModal && (
        <UpiPaymentModal
          onClose={() => setShowUpiModal(false)}
          cartItems={cartItems}
          customer={null}
          totals={{
            itemsPrice: Number(cartTotal || 0),
            shippingPrice: 0,
            totalPrice: Number(cartTotal || 0),
          }}
        />
      )}

      <div className="h-full w-full bg-white">
        <div className="border-t bg-white px-2 py-2 md:hidden">
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
            <div className="shrink-0">
              <div className="rounded-full bg-[#FFD700] p-[2px]">
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
                "shrink-0 text-white",
                queueCount && !isPublishing && navigator.onLine
                  ? "border border-indigo-300 bg-indigo-600 hover:bg-indigo-700"
                  : "cursor-not-allowed border border-gray-300 bg-gray-400",
              ].join(" ")}
            >
              {isPublishing ? "Publishing…" : "Publish"}
              {queueCount > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1 text-[8px] text-indigo-700">
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

            <button
              onClick={openOrdersModal}
              className={[baseBtn, orangeBtn, mobileBtn].join(" ")}
            >
              Orders
            </button>

            <button className={[baseBtn, orangeBtn, mobileBtn].join(" ")}>
              Multi
            </button>

            <button
              type="button"
              className={[baseBtn, orangeBtn, mobileBtn].join(" ")}
              onClick={() => setShowUpiModal(true)}
            >
              UPI
            </button>

            <div className="shrink-0 h-10 [&>*]:h-full [&>*]:rounded-xl [&>*]:px-3 [&>*]:text-xs [&>*]:font-bold">
              <CreateOrderButton />
            </div>

            <div className="shrink-0 px-2 text-xs font-semibold text-gray-700">
              Hi {name}
            </div>

            <button
              onClick={handleLogout}
              className="shrink-0 h-10 rounded-xl bg-red-600 px-3 text-xs font-bold text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="hidden h-full w-full flex-col bg-[#f9fafb] md:flex">
          <div className="shrink-0 border-b bg-white px-2 py-3">
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-[#FFD700] p-[2px]">
                <img
                  src={logo}
                  alt="ManaKirana"
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-[#FFD700]"
                  draggable="false"
                />
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-1.5 px-2 py-2">
            <button
              onClick={handlePublish}
              disabled={isPublishing || !queueCount || !navigator.onLine}
              className={[
                "h-9 w-full rounded-lg border text-xs font-semibold text-white transition",
                queueCount && !isPublishing && navigator.onLine
                  ? "border-slate-300 bg-slate-500 hover:bg-slate-600"
                  : "cursor-not-allowed border-gray-300 bg-gray-400",
              ].join(" ")}
            >
              <div className="flex items-center justify-center gap-1">
                <span>{isPublishing ? "Publishing…" : "Publish"}</span>
                {queueCount > 0 && (
                  <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white px-1 text-[7px] text-slate-700">
                    {queueCount}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={handleHold}
              className={[baseBtn, orangeBtn, "h-9 text-xs", desktopBtn].join(" ")}
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
              onClick={openOrdersModal}
              className={[baseBtn, orangeBtn, "h-9 text-xs", desktopBtn].join(" ")}
            >
              Orders
            </button>

            <button
              className={[baseBtn, orangeBtn, "h-9 text-xs", desktopBtn].join(" ")}
            >
              Multi
            </button>

            <button
              type="button"
              onClick={() => setShowUpiModal(true)}
              className={[baseBtn, orangeBtn, "h-9 text-xs", desktopBtn].join(" ")}
            >
              UPI
            </button>

            <div className="w-full [&>*]:h-9 [&>*]:w-full [&>*]:rounded-lg [&>*]:text-xs [&>*]:font-semibold">
              <CreateOrderButton />
            </div>
          </div>

          <div className="shrink-0 border-t bg-white px-2 py-3">
            <div className="truncate text-center text-[15px] font-semibold text-green-700">
              Hi {name}
            </div>
            <div className="mt-1 truncate text-center text-xs text-gray-600">
              {role || "-"} {location ? `• ${location}` : ""}
            </div>

            <button
              onClick={handleLogout}
              className="mt-2 h-10 w-full rounded-xl bg-red-600 text-sm font-bold text-white transition hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
}