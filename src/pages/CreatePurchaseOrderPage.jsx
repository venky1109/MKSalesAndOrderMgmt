import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import StockManagerLayout from '../components/StockManagerLayout';
import CreatePurchaseOrderSection from '../components/CreatePurchaseOrderSection';
import PurchaseOrdersStatusSections from '../components/PurchaseOrdersStatusSections';

import {
  fetchCatalogProducts,
  fetchBrands,
  fetchUnits,
  fetchSuppliers,
  fetchWarehouses,
  fetchPurchaseOrders,
  fetchCategories,
  fetchCatalogBarcodes,
} from '../features/inventory/stockManagerInventorySlice';

const CreatePurchaseOrderPage = () => {
  const dispatch = useDispatch();

  const { userInfo } = useSelector((state) => state.posUser || {});

  const {
    catalogProducts = [],
    catalogBarcodes = [],
    categories = [],
    brands = [],
    units = [],
    suppliers = [],
    warehouses = [],
    purchaseOrders = [],
    loading = false,
    error = null,
    successMessage = null,
  } = useSelector((state) => state.stockManagerInventory || {});

  useEffect(() => {
    if (userInfo?.token) {
      dispatch(fetchCatalogProducts());
      dispatch(fetchCategories());
      dispatch(fetchBrands());
      dispatch(fetchUnits());
      dispatch(fetchSuppliers());
      dispatch(fetchWarehouses());
      dispatch(fetchPurchaseOrders());
      dispatch(fetchCatalogBarcodes());
    }
  }, [dispatch, userInfo?.token]);

  return (
    <StockManagerLayout>
      <main className="p-4 space-y-4">
        <section className="space-y-4">
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <h1 className="text-xl font-bold">Purchase Orders</h1>
            <p className="text-sm text-gray-500">
              Create supplier-wise purchase orders and verify received products.
            </p>
          </div>

          {loading && (
            <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg">
              Loading catalogue data...
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg">
              {successMessage}
            </div>
          )}

          <CreatePurchaseOrderSection
            productBarcodes={catalogBarcodes}
            categories={categories}
            brands={brands}
            units={units}
            suppliers={suppliers}
            warehouses={warehouses}
          />

          <PurchaseOrdersStatusSections purchaseOrders={purchaseOrders} />
        </section>
      </main>
    </StockManagerLayout>
  );
};

export default CreatePurchaseOrderPage;