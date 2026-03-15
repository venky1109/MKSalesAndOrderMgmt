import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { clearCart } from "../features/cart/cartSlice";

const PaymentFailurePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [params] = useSearchParams();

  const orderId = params.get("orderId");
  const amount = params.get("amount");
  const status = params.get("status") || "FAILED";
  const reason = params.get("reason");

  const handleOk = () => {
    dispatch(clearCart()); // optional
    localStorage.removeItem("cartItems"); // optional
    navigate("/");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

        {/* Icon + Title */}
        <div className="text-center">
          <div className="mb-2 text-5xl">❌</div>
          <h2 className="text-xl font-bold text-red-600">
            Payment Failed
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            The payment could not be completed
          </p>
        </div>

        {/* Details */}
        <div className="mt-5 space-y-3 rounded-lg bg-red-50 p-4 text-sm">

          <div className="flex justify-between">
            <span className="text-gray-500">Order ID</span>
            <span className="font-semibold">{orderId || "-"}</span>
          </div>
         <div className="flex justify-between">
            <span className="text-gray-500">amount</span>
            <span className="font-semibold">{amount || "-"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Status</span>
            <span className="font-semibold text-red-600">
              {status}
            </span>
          </div>

          {reason && (
            <div className="flex justify-between">
              <span className="text-gray-500">Reason</span>
              <span className="font-semibold">{reason}</span>
            </div>
          )}

        </div>

        {/* Button */}
        <button
          onClick={handleOk}
          className="mt-6 w-full rounded-lg bg-red-600 py-2 font-semibold text-white hover:bg-red-700"
        >
          OK
        </button>

      </div>
    </div>
  );
};

export default PaymentFailurePage;