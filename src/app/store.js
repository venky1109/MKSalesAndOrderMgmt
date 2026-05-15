import { configureStore } from '@reduxjs/toolkit';
import posUserReducer from '../features/auth/posUserSlice';
import productReducer from '../features/products/productSlice';
import customerReducer from '../features/customers/customerSlice';
import cartReducer from '../features/cart/cartSlice';
import orderReducer from '../features/orders/orderSlice';
import orderItemsReducer from '../features/orderItems/orderItemSlice';
import paymentReducer from '../features/payment/paymentSlice';
import productFiltersReducer from '../features/products/productFiltersSlice';
import stockManagerInventoryReducer from '../features/inventory/stockManagerInventorySlice'
import catalogCrudReducer from '../features/inventory/catalogCrudSlice';
import inventoryMovementReducer from '../features/inventory/inventoryMovementSlice';
import inventoryDashboardReducer from '../features/inventory/inventoryDashboardSlice';
import topProductsReportReducer from '../features/reports/topProductsReportSlice';
const stateMutationLogger = store => next => action => {
  const result = next(action);
  const state = store.getState();

  if (typeof state.orders.all !== 'object' || !Array.isArray(state.orders.all)) {
    console.error(`❌ Corrupted state.orders.all after ${action.type}:`, state.orders.all);
  }

  return result;
};

export const store = configureStore({
  reducer: {
    posUser: posUserReducer,
    products: productReducer,
    customers: customerReducer,
    cart: cartReducer,
    orders: orderReducer,
    productFilters: productFiltersReducer,
    orderItems: orderItemsReducer,
    payment: paymentReducer,
    stockManagerInventory: stockManagerInventoryReducer,
    catalogCrud:catalogCrudReducer,
    inventoryMovement: inventoryMovementReducer,
    inventoryDashboard: inventoryDashboardReducer,
    topProductsReport: topProductsReportReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(stateMutationLogger),
});
