import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { clearCart } from "../features/cart/cartSlice";
import { useDispatch } from "react-redux";

const PaymentSuccessModal = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
const dispatch = useDispatch();
  const orderId = params.get("orderId");
  const amount = params.get("amount");
  const method = params.get("method") || "UPI";
  const status = "SUCCESS";

  const handleOk = () => {
    dispatch(clearCart());
    navigate("/"); // home / POS screen
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

        {/* Icon */}
        <div className="text-center">
          <div className="text-5xl mb-2">✅</div>
          <h2 className="text-xl font-bold text-green-600">
            Payment Successful
          </h2>
        </div>

        {/* Details */}
        <div className="mt-5 space-y-3 rounded-lg bg-gray-50 p-4 text-sm">

          <div className="flex justify-between">
            <span className="text-gray-500">Order ID</span>
            <span className="font-semibold">{orderId || "-"}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Amount</span>
            <span className="font-semibold">₹{amount || "-"}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Payment Method</span>
            <span className="font-semibold">{method}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Status</span>
            <span className="font-semibold text-green-600">{status}</span>
          </div>

        </div>

        {/* Button */}
        <button
          onClick={handleOk}
          className="mt-6 w-full rounded-lg bg-green-600 py-2 font-semibold text-white hover:bg-green-700"
        >
          OK
        </button>

      </div>
    </div>
  );
};

export default PaymentSuccessModal;
