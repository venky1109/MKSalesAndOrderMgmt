import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  CreditCard,
  QrCode,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { fetchPOSOrders } from "../features/orders/orderSlice";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const todayValue = () => new Date().toISOString().slice(0, 10);

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizeMethod = (method) => {
  const value = String(method || "Unknown").trim();
  const lower = value.toLowerCase();

  if (lower.includes("cash")) return "Cash";
  if (lower.includes("qr") || lower.includes("upi")) return "QR / UPI";
  if (lower.includes("cc") || lower.includes("credit")) return "Credit Card";
  if (lower.includes("dc") || lower.includes("debit")) return "Debit Card";
  if (lower.includes("food") || lower.includes("fc")) return "Food Card";
  if (lower.includes("pluxee")) return "PLuxee";

  return value;
};

const methodIcon = {
  Cash: Banknote,
  "QR / UPI": QrCode,
  "Credit Card": CreditCard,
  "Debit Card": CreditCard,
  "Food Card": WalletCards,
  PLuxee: WalletCards,
  Unknown: WalletCards,
};

export default function AccountsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const posUserInfo = useSelector((s) => s.posUser.userInfo);
  const orders = useSelector((s) => s.orders?.posOrdersList || []);
  const loading = useSelector((s) => s.orders?.posOrdersListLoading || false);
  const error = useSelector((s) => s.orders?.posOrdersListError || "");

  const [fromDate, setFromDate] = useState(todayValue());
  const [toDate, setToDate] = useState(todayValue());
  const [settledAt, setSettledAt] = useState("");

  const settlementKey = useMemo(
    () =>
      `accountsSettlement:${posUserInfo?.username || "cashier"}:${fromDate}:${toDate}`,
    [fromDate, posUserInfo?.username, toDate]
  );

  const loadAccounts = useCallback(async () => {
    if (fromDate === todayValue() && toDate === todayValue()) {
      await dispatch(fetchPOSOrders({ mode: "today" }));
      return;
    }

    await dispatch(
      fetchPOSOrders({ mode: "custom", from: fromDate, to: toDate })
    );
  }, [dispatch, fromDate, toDate]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    setSettledAt(localStorage.getItem(settlementKey) || "");
  }, [settlementKey]);

  const summary = useMemo(() => {
    const grouped = {};

    for (const order of orders) {
      const method = normalizeMethod(order.paymentMethod);
      if (!grouped[method]) {
        grouped[method] = {
          method,
          count: 0,
          amount: 0,
        };
      }

      grouped[method].count += 1;
      grouped[method].amount += Number(order.totalPrice || 0);
    }

    return Object.values(grouped).sort((a, b) => b.amount - a.amount);
  }, [orders]);

  const totals = useMemo(
    () => ({
      orders: orders.length,
      amount: orders.reduce(
        (sum, order) => sum + Number(order.totalPrice || 0),
        0
      ),
      cash: orders
        .filter((order) => normalizeMethod(order.paymentMethod) === "Cash")
        .reduce((sum, order) => sum + Number(order.totalPrice || 0), 0),
      digital: orders
        .filter((order) => normalizeMethod(order.paymentMethod) !== "Cash")
        .reduce((sum, order) => sum + Number(order.totalPrice || 0), 0),
    }),
    [orders]
  );

  const markSettled = () => {
    const nextSettledAt = new Date().toISOString();
    localStorage.setItem(settlementKey, nextSettledAt);
    setSettledAt(nextSettledAt);
  };

  return (
    <div className="h-screen overflow-y-auto bg-slate-100 p-3 md:p-5">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <button
              onClick={() => navigate("/pos")}
              className="mb-3 inline-flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft size={16} />
              POS
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Finance Settlement
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Check payment totals by cash, QR scan, cards, and other modes.
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
            <div className="font-bold text-gray-800">
              {posUserInfo?.username || "Cashier"}
            </div>
            <div className="text-gray-500">{posUserInfo?.location || "-"}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-lg border bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
          <label className="block">
            <span className="text-sm font-bold text-gray-700">From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-gray-700">To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200"
            />
          </label>

          <button
            onClick={loadAccounts}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-700 px-4 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            <RefreshCw size={16} />
            {loading ? "Loading" : "Refresh"}
          </button>

          <button
            onClick={markSettled}
            disabled={!orders.length}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 text-sm font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            <CheckCircle2 size={16} />
            Settle Duty
          </button>
        </div>

        {settledAt ? (
          <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            Settled at {formatDateTime(settledAt)}
          </div>
        ) : null}

        {error ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">Orders</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {totals.orders}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">
              Total Collection
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {money(totals.amount)}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">
              Cash to Settle
            </div>
            <div className="mt-2 text-2xl font-bold text-green-700">
              {money(totals.cash)}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">
              QR / Card Total
            </div>
            <div className="mt-2 text-2xl font-bold text-indigo-700">
              {money(totals.digital)}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {summary.length ? (
            summary.map((item) => {
              const Icon = methodIcon[item.method] || WalletCards;
              return (
                <div
                  key={item.method}
                  className="rounded-lg border bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                        <Icon size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">
                          {item.method}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.count} order{item.count === 1 ? "" : "s"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-lg font-bold text-gray-900">
                      {money(item.amount)}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border bg-white p-4 text-sm text-gray-500 shadow-sm md:col-span-3">
              No payment data found for this period.
            </div>
          )}
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="border-b px-4 py-3 text-sm font-bold text-gray-800">
            Payment Details
          </div>
         <div className="max-h-[70vh] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Order ID</th>
                  <th className="px-3 py-2 text-left">Customer</th>
                  <th className="px-3 py-2 text-left">Payment</th>
                  <th className="px-3 py-2 text-left">Cashier</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-3 py-8 text-center">
                      Loading payments...
                    </td>
                  </tr>
                ) : orders.length ? (
                  orders.map((order) => (
                    <tr key={order._id || order.MK_order_id} className="border-t">
                      <td className="px-3 py-2">
                        {formatDateTime(order.createdAt)}
                      </td>
                      <td className="px-3 py-2">
                        {order.MK_order_id || order._id || "-"}
                      </td>
                      <td className="px-3 py-2">{order.phoneNo || "-"}</td>
                      <td className="px-3 py-2">
                        {order.paymentMethod || "-"}
                      </td>
                      <td className="px-3 py-2">
                        {order.posUserName || posUserInfo?.username || "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {money(order.totalPrice)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-3 py-8 text-center text-gray-500"
                    >
                      No payments found.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t bg-yellow-100 font-bold">
                  <td colSpan="5" className="px-3 py-3 text-right">
                    Total
                  </td>
                  <td className="px-3 py-3 text-right">
                    {money(totals.amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
