import React, { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../features/auth/posUserSlice";
import { publishQueuedOrdersSequential } from "../features/orders/orderSlice";
import { pingBackend } from "../utils/network";
import { clearCart } from "../features/cart/cartSlice";
import CreateOrderButton from "./CreateOrderButton";
import logo from "../assests/ManaKiranaLogo1024x1024.png";

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

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem("posUserInfo");
    window.location.href = "/login";
  };
const handleClearCart = useCallback(() => {
  if (cartItems.length === 0) {
    alert("Cart already empty.");
    return;
  }

  const ok = window.confirm("⚠️ Clear entire cart?");
  if (!ok) return;

  dispatch(clearCart());
  localStorage.removeItem("cart"); // remove persisted cart if stored

  // alert("🧹 Cart cleared.");
}, [dispatch, cartItems]);
  const handlePublish = async () => {
    if (!navigator.onLine) {
      alert("⚠️ No network. Connect to the internet to publish orders.");
      return;
    }

    const ok = await pingBackend(undefined, 2000, token);
    if (!ok) {
      alert("⚠️ Backend unreachable. Check the API server and try again.");
      return;
    }

    if (!queueCount) return;

    try {
      const res = await dispatch(
        publishQueuedOrdersSequential({ token })
      ).unwrap();

      alert(
        res?.published
          ? `✅ Published ${res.published} order(s).${
              res.failed ? ` ${res.failed} failed.` : ""
            }`
          : "No queued orders to publish."
      );
    } catch (e) {
      alert("❌ Publish failed: " + (e?.message || e));
    }
  };

  const handleHold = useCallback(() => {
    if (cartItems.length === 0) {
      alert("❌ Cart is empty!");
      return;
    }

    const phone = prompt("📱 Enter customer phone number (10 digits):");
    if (!phone || !/^\d{10}$/.test(phone)) {
      alert("⚠️ Please enter a valid 10-digit phone number.");
      return;
    }

    localStorage.setItem(
      `hold${phone}`,
      JSON.stringify({ items: cartItems, total: cartTotal })
    );
    dispatch(clearCart());
  }, [cartItems, cartTotal, dispatch]);

  const baseBtn =
    "rounded-xl font-bold transition active:translate-y-[1px] whitespace-nowrap";
  const orangeBtn =
    "bg-[#ff8a00] text-white border border-[#FFD700] hover:bg-[#e57b00]";
  const mobileBtn = "h-10 px-3 text-xs shrink-0";
  const desktopBtn = "w-full h-11 text-sm";

  return (
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

  <button className={[baseBtn, orangeBtn, "h-9 text-xs", desktopBtn].join(" ")}>
    Multi
  </button>

  <button className={[baseBtn, orangeBtn, "h-9 text-xs", desktopBtn].join(" ")}>
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
  );
}