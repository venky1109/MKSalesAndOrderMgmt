import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import StockManagerLayout from '../components/StockManagerLayout';
import CreateDispatchOrderSection from '../components/CreateDispatchOrderSection';
import DispatchOrdersSection from '../components/DispatchOrdersSection';

import {
  fetchSuppliers,
  fetchWarehouses,
  fetchOutlets,
  fetchInventoryProducts,
  fetchInventoryDispatchOrders,
} from '../features/inventory/stockManagerInventorySlice';

const DispatchPage = () => {
  const dispatch = useDispatch();

  const { userInfo } = useSelector((state) => state.posUser || {});

  const {
    inventoryProducts = [],
    suppliers = [],
    warehouses = [],
    outlets = [],
    inventoryDispatchOrders = [],
    inventoryDispatchLoading = false,
    inventoryDispatchError = null,
    inventoryDispatchSuccess = null,
  } = useSelector((state) => state.stockManagerInventory || {});

  useEffect(() => {
    if (userInfo?.token) {
      dispatch(fetchInventoryProducts());
      dispatch(fetchSuppliers());
      dispatch(fetchWarehouses());
      dispatch(fetchOutlets());
      dispatch(fetchInventoryDispatchOrders());
    }
  }, [dispatch, userInfo?.token]);

  return (
    <StockManagerLayout>
      <main className="space-y-4 p-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h1 className="text-xl font-bold">Inventory Dispatch</h1>
          <p className="text-sm text-gray-500">
            Dispatch only available stock from inventory to outlets, stakeholders and warehouses.
          </p>
        </div>

        {inventoryDispatchError && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-red-700">
            {inventoryDispatchError}
          </div>
        )}

        {inventoryDispatchSuccess && (
          <div className="rounded-lg bg-green-50 px-4 py-3 text-green-700">
            {inventoryDispatchSuccess}
          </div>
        )}

        <CreateDispatchOrderSection
          inventoryProducts={inventoryProducts}
          suppliers={suppliers}
          warehouses={warehouses}
          outlets={outlets}
          loading={inventoryDispatchLoading}
        />

        <DispatchOrdersSection
          orders={inventoryDispatchOrders}
          loading={inventoryDispatchLoading}
        />
      </main>
    </StockManagerLayout>
  );
};

export default DispatchPage;