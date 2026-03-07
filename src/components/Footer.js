import React from "react";
import { useSelector } from "react-redux";

function Footer() {
  const cartTotalDiscount = useSelector((s) => s.cart.totalDiscount || 0);
  const cartTotalRaw = useSelector((s) => s.cart.totalRawAmount || 0);
  const cartTotal = useSelector((s) => s.cart.total || 0);

  return (
    <footer className="w-full bg-[#faf9f5] rounded-md border border-gray-200">
      <div className="px-3 py-2">
        {/* Top totals section */}
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          {/* Total MRP */}
          <div className="flex items-center justify-between md:justify-start gap-2">
            <span className="text-gray-800 font-semibold text-sm sm:text-base md:text-lg whitespace-nowrap">
              Total MRP:
            </span>
            <span className="font-semibold text-base sm:text-lg md:text-2xl text-gray-900 tabular-nums whitespace-nowrap">
              ₹ {Number(cartTotalRaw || 0).toFixed(2)}
            </span>
          </div>

          {/* Due */}
          <div className="flex items-center justify-between md:justify-end gap-2">
            <span className="text-gray-800 font-semibold text-lg sm:text-xl md:text-2xl whitespace-nowrap">
              Due:
            </span>
            <span className="text-green-700 font-bold text-2xl sm:text-3xl md:text-4xl tabular-nums whitespace-nowrap">
              ₹ {Number(cartTotal || 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Discount row */}
        <div className="mt-2 pt-2 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-1 sm:gap-2">
          <span className="text-gray-800 font-semibold text-md sm:text-base md:text-xl">
            Discount Benefit on invoice:
         
          {/* <span className="font-semibold text-base sm:text-lg md:text-2xl text-gray-900 tabular-nums whitespace-nowrap"> */}
            ₹ {Number(cartTotalDiscount || 0).toFixed(2)}
          </span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;