import React from 'react';
import { NavLink } from 'react-router-dom';
import { Package, ClipboardList, Truck, RefreshCcw,BookImage } from 'lucide-react';

const StockManagerLayout = ({ children }) => {
  return (
    <main className="min-h-screen bg-gray-100">
      <section className="bg-white border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <Package className="text-green-700" size={28} />
          <div>
            <h2 className="text-xl font-bold">ManaKirana Stock Manager</h2>
            <p className="text-sm text-gray-500">
              Inventory, purchases, dispatch and stock control
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-[230px_1fr]">
        <aside className="bg-white border-r p-4 hidden md:block">
          <nav className="space-y-3 text-sm">
            {/* <div className="flex items-center gap-2 font-medium text-gray-700">
              <Package size={18} /> Inventory
            </div> */}
 
               <NavLink
            to="/inventory"
            className={({ isActive }) =>
              `block px-4 py-2 rounded-lg text-sm font-medium ${
                isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          ><div className="flex items-center gap-2 font-medium text-gray-700">
           <Package size={18} /> Inventory
           </div>
          </NavLink>
                     <NavLink
  to="/stock-manager/catalog"
  className={({ isActive }) =>
              `block px-4 py-2 rounded-lg text-sm font-medium ${
                isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
  }
>
<div className="flex items-center gap-2 font-medium text-gray-700">
 <BookImage size={18}/> Catalog
 </div>
</NavLink>
<NavLink
  to="/stock-manager/purchase-orders/create"
   className={({ isActive }) =>
              `block px-4 py-2 rounded-lg text-sm font-medium ${
                isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
  }
><div className="flex items-center gap-2 font-medium text-gray-700">
  <ClipboardList size={18} />
  Purchase Orders
  </div>
</NavLink>
            <NavLink
  to="/inventory/dispatch"
 className={({ isActive }) =>
              `block px-4 py-2 rounded-lg text-sm font-medium ${
                isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
  }
>
  <div className="flex items-center gap-2 font-medium text-gray-700"> <Truck size={18} />
  Dispatch</div>
 
</NavLink>
            <div className="flex items-center gap-2 font-medium text-gray-700">
              <RefreshCcw size={18} /> Transactions
            </div>
          </nav>
        </aside>

        <section className="p-4 md:p-6">{children}</section>
      </section>
    </main>
  );
};

export default StockManagerLayout;