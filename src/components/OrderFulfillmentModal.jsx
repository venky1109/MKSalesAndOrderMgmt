import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWarehouses } from '../features/inventory/stockManagerInventorySlice';
import { fetchDeliveryPosUsers } from '../features/orders/orderSlice';

const defaultValues = {
  packed: true,
  dispatched: true,
  delivered: true,
  packingWarehouseId: '',
  dispatchUserId: '',
  deliveryUserId: '',
};

const userLabel = (user) =>
  user?.username ||
  user?.name ||
  user?.fullName ||
  user?.phoneNo ||
  user?.mobile ||
  `User ${user?._id || user?.id || ''}`;

const warehouseLabel = (warehouse) =>
  warehouse?.warehouse_name ||
  warehouse?.name ||
  warehouse?.warehouse_code ||
  `Warehouse ${warehouse?.id || ''}`;

const warehouseLocation = (warehouse) =>
  warehouse?.location ||
  warehouse?.address ||
  warehouse?.city ||
  warehouse?.warehouse_location ||
  warehouse?.warehouse_name ||
  warehouse?.name ||
  warehouse?.warehouse_code ||
  '';

const warehouseOptionLabel = (warehouse) =>
  [warehouseLabel(warehouse), warehouseLocation(warehouse)]
    .filter(Boolean)
    .join(' - ');

const getFocusableElements = (root) =>
  Array.from(
    root?.querySelectorAll(
      'button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) || []
  ).filter((element) => element.offsetParent !== null);

const buildOptions = (form, warehouses, deliveryUsers) => {
  const packingWarehouse = warehouses.find(
    (warehouse) => String(warehouse.id) === String(form.packingWarehouseId)
  );
  const dispatchUser = deliveryUsers.find(
    (user) => String(user._id || user.id) === String(form.dispatchUserId)
  );
  const deliveryUser = deliveryUsers.find(
    (user) => String(user._id || user.id) === String(form.deliveryUserId)
  );

  return {
    isPacked: form.packed,
    isDispatched: form.dispatched,
    isDelivered: form.delivered,
    packed: form.packed,
    dispatched: form.dispatched,
    delivered: form.delivered,
    packingWarehouseId: form.packed ? null : form.packingWarehouseId,
    packingWarehouseName: form.packed ? '' : warehouseLabel(packingWarehouse),
    packingWarehouseLocation: form.packed
      ? ''
      : warehouseLocation(packingWarehouse),
    dispatchPosUserId: form.dispatched ? null : form.dispatchUserId,
    dispatchPosUserName: form.dispatched ? '' : userLabel(dispatchUser),
    deliveryPosUserId: form.delivered ? null : form.deliveryUserId,
    deliveryPosUserName: form.delivered ? '' : userLabel(deliveryUser),
    fulfillment: {
      packed: form.packed,
      dispatched: form.dispatched,
      delivered: form.delivered,
      packingWarehouse: form.packed
        ? null
        : {
            id: form.packingWarehouseId,
            name: warehouseLabel(packingWarehouse),
            location: warehouseLocation(packingWarehouse),
          },
      dispatchUser: form.dispatched
        ? null
        : {
            id: form.dispatchUserId,
            name: userLabel(dispatchUser),
          },
      deliveryUser: form.delivered
        ? null
        : {
            id: form.deliveryUserId,
            name: userLabel(deliveryUser),
          },
    },
  };
};

const OrderFulfillmentModal = ({
  open,
  onCancel,
  onConfirm,
  confirmLabel = 'Continue',
}) => {
  const dispatch = useDispatch();
  const formRef = useRef(null);
  const token = useSelector((state) => state.posUser?.userInfo?.token);
  const {
    warehouses = [],
    loading: warehousesLoading = false,
  } = useSelector((state) => state.stockManagerInventory || {});
  const {
    deliveryPosUsers = [],
    deliveryPosUsersLoading = false,
    deliveryPosUsersError = '',
  } = useSelector((state) => state.orders || {});

  const [form, setForm] = useState(defaultValues);

  useEffect(() => {
    if (!open) return;
    setForm(defaultValues);
  }, [open]);

  useEffect(() => {
    if (!open || !token) return;

    dispatch(fetchWarehouses());
    dispatch(fetchDeliveryPosUsers());
  }, [dispatch, open, token]);

  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      const firstControl = getFocusableElements(formRef.current)[0];
      firstControl?.focus();
    }, 0);

    return () => clearTimeout(timer);
  }, [open]);

  const visibleDeliveryUsers = useMemo(
    () => (Array.isArray(deliveryPosUsers) ? deliveryPosUsers : []),
    [deliveryPosUsers]
  );

  if (!open) return null;

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleConfirm = () => {
    if (!form.packed && !form.packingWarehouseId) {
      alert('Please select warehouse for packing.');
      return;
    }

    if (!form.dispatched && !form.dispatchUserId) {
      alert('Please select POS delivery user for dispatch.');
      return;
    }

    if (!form.delivered && !form.deliveryUserId) {
      alert('Please select POS delivery user for delivery.');
      return;
    }

    onConfirm(buildOptions(form, warehouses, visibleDeliveryUsers));
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel?.();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusableElements = getFocusableElements(formRef.current);
    if (!focusableElements.length) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-3">
      <form
        ref={formRef}
        className="w-full max-w-lg overflow-hidden rounded-2xl border bg-white shadow-2xl"
        onKeyDown={handleKeyDown}
        onSubmit={(e) => {
          e.preventDefault();
          handleConfirm();
        }}
      >
        <div className="bg-[#ff8a00] px-5 py-4">
          <h2 className="text-lg font-bold text-white">Order Status</h2>
          <p className="mt-1 text-xs font-semibold text-orange-50">
            Keep Yes for completed steps. Select No to assign the next team.
          </p>
        </div>

        <div className="space-y-4 px-5 py-5">
          <StatusRow
            label="Packed"
            value={form.packed}
            onChange={(value) => update('packed', value)}
          />
          {!form.packed && (
            <SelectField
              label="Warehouse for packing"
              value={form.packingWarehouseId}
              onChange={(value) => update('packingWarehouseId', value)}
              loading={warehousesLoading}
              emptyText="No warehouses found"
            >
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouseOptionLabel(warehouse)}
                </option>
              ))}
            </SelectField>
          )}

          <StatusRow
            label="Dispatched"
            value={form.dispatched}
            onChange={(value) => update('dispatched', value)}
          />
          {!form.dispatched && (
            <SelectField
              label="POS delivery user for dispatch"
              value={form.dispatchUserId}
              onChange={(value) => update('dispatchUserId', value)}
              loading={deliveryPosUsersLoading}
              emptyText="No delivery users found"
              error={deliveryPosUsersError}
            >
              {visibleDeliveryUsers.map((user) => (
                <option key={user._id || user.id} value={user._id || user.id}>
                  {userLabel(user)}
                </option>
              ))}
            </SelectField>
          )}

          <StatusRow
            label="Delivered"
            value={form.delivered}
            onChange={(value) => update('delivered', value)}
          />
          {!form.delivered && (
            <SelectField
              label="POS delivery user for delivery"
              value={form.deliveryUserId}
              onChange={(value) => update('deliveryUserId', value)}
              loading={deliveryPosUsersLoading}
              emptyText="No delivery users found"
              error={deliveryPosUsersError}
            >
              {visibleDeliveryUsers.map((user) => (
                <option key={user._id || user.id} value={user._id || user.id}>
                  {userLabel(user)}
                </option>
              ))}
            </SelectField>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t bg-gray-50 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="h-10 rounded-xl border border-[#FFD700] bg-[#ff8a00] px-5 text-sm font-bold text-white hover:bg-[#e57b00]"
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
};

const StatusRow = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
    <span className="text-sm font-bold text-gray-800">{label}</span>
    <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-gray-300 bg-white text-sm font-bold">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`h-9 px-4 ${value ? 'bg-green-600 text-white' : 'text-gray-700'}`}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`h-9 px-4 ${!value ? 'bg-red-600 text-white' : 'text-gray-700'}`}
      >
        No
      </button>
    </div>
  </div>
);

const SelectField = ({
  label,
  value,
  onChange,
  children,
  loading,
  emptyText,
  error,
}) => (
  <div>
    <label className="mb-1.5 block text-xs font-bold text-gray-600">
      {label}
    </label>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
    >
      <option value="">{loading ? 'Loading...' : 'Select'}</option>
      {children}
    </select>
    {!loading && !React.Children.count(children) ? (
      <p className="mt-1 text-xs font-semibold text-red-600">
        {error || emptyText}
      </p>
    ) : null}
  </div>
);

export default OrderFulfillmentModal;
