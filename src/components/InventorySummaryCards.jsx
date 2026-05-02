import React from 'react';
import { Package, AlertTriangle, ClipboardList, RefreshCcw } from 'lucide-react';

const InventorySummaryCards = ({ products = [], purchaseOrders = [], transactions = [] }) => {
  const lowStockCount = products.filter(
    (item) => Number(item.count_in_stock || 0) <= 5
  ).length;

  const pendingPOs = purchaseOrders.filter(
    (po) => ['draft', 'created', 'pending'].includes(String(po.status).toLowerCase())
  ).length;

  const cards = [
    {
      title: 'Total Products',
      value: products.length,
      icon: Package,
    },
    {
      title: 'Low Stock',
      value: lowStockCount,
      icon: AlertTriangle,
    },
    {
      title: 'Pending POs',
      value: pendingPOs,
      icon: ClipboardList,
    },
    {
      title: 'Transactions',
      value: transactions.length,
      icon: RefreshCcw,
    },
  ];

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div key={card.title} className="bg-white rounded-xl shadow-sm p-4 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.title}</p>
                <h3 className="text-2xl font-bold">{card.value}</h3>
              </div>
              <Icon className="text-green-700" size={28} />
            </div>
          </div>
        );
      })}
    </section>
  );
};

export default InventorySummaryCards;