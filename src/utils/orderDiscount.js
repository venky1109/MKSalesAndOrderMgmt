export const MAX_ORDER_DISCOUNT_PERCENT = 1.5;
export const ORDER_DISCOUNT_ROLES = ['SUPERVISOR', 'ADMIN', 'DIRECTOR'];
export const APPROVED_DISCOUNT_MESSAGE = 'Crossing the approved discount mark.';

export const toWholeRupees = (value) => Math.floor(Number(value || 0));

export const normalizeDiscountPercentage = (value) => {
  const numericValue = Number(value || 0);

  if (Number.isNaN(numericValue) || numericValue < 0) {
    return {
      percentage: 0,
      clamped: false,
    };
  }

  if (numericValue > MAX_ORDER_DISCOUNT_PERCENT) {
    return {
      percentage: MAX_ORDER_DISCOUNT_PERCENT,
      clamped: true,
    };
  }

  return {
    percentage: numericValue,
    clamped: false,
  };
};

export const calculateOrderDiscount = (total, percentageValue) => {
  const { percentage, clamped } = normalizeDiscountPercentage(percentageValue);
  const orderTotal = toWholeRupees(total);
  const rawDiscountAmount = (orderTotal * percentage) / 100;
  const discountAmount = toWholeRupees(rawDiscountAmount);
  const totalAfterDiscount = toWholeRupees(orderTotal - discountAmount);

  return {
    discountPercentage: Number(percentage.toFixed(2)),
    discountAmount,
    totalAfterDiscount,
    orderTotal,
    clamped,
  };
};

export const getOrderItemsTotal = (items = []) =>
  items.reduce((sum, item) => {
    const amount =
      item?.amount ??
      item?.subtotal ??
      Number(item?.qty || item?.quantityOrdered || 0) *
        Number(item?.pricePerQty || item?.price || item?.dprice || 0);

    return sum + Number(amount || 0);
  }, 0);

export const getOrderDiscountSummary = (order = {}, totalBeforeDiscount) => {
  const detailItems = Array.isArray(order.items)
    ? order.items
    : Array.isArray(order.orderItems)
    ? order.orderItems
    : [];
  const derivedItemsTotal = getOrderItemsTotal(detailItems);
  const hasEditableTotal =
    totalBeforeDiscount !== undefined && totalBeforeDiscount !== null;

  if (hasEditableTotal) {
    return calculateOrderDiscount(
      totalBeforeDiscount,
      order.discountPercentage || 0
    );
  }

  if (derivedItemsTotal > 0) {
    return calculateOrderDiscount(
      derivedItemsTotal,
      order.discountPercentage || 0
    );
  }

  const discountPercentage = Number(order.discountPercentage || 0);
  const rawStoredDiscountAmount = Number(order.discountAmount || 0);
  const totalAfterDiscount = toWholeRupees(order.totalPrice || order.total || 0);

  if (discountPercentage > 0 && rawStoredDiscountAmount > 0) {
    const estimatedOrderTotal = Math.ceil(
      totalAfterDiscount + rawStoredDiscountAmount
    );

    return calculateOrderDiscount(estimatedOrderTotal, discountPercentage);
  }

  const discountAmount = toWholeRupees(rawStoredDiscountAmount);

  return {
    discountPercentage: Number(discountPercentage.toFixed(2)),
    discountAmount,
    totalAfterDiscount,
    orderTotal: toWholeRupees(totalAfterDiscount + discountAmount),
    clamped: discountPercentage > MAX_ORDER_DISCOUNT_PERCENT,
  };
};

export const normalizeOrderDiscountPayload = (payload = {}, totalBeforeDiscount) => {
  const hasDiscountFields =
    Object.prototype.hasOwnProperty.call(payload, 'discountPercentage') ||
    Object.prototype.hasOwnProperty.call(payload, 'discountAmount');

  if (!hasDiscountFields) {
    return payload;
  }

  const discountPercentage = Number(payload.discountPercentage || 0);

  if (!discountPercentage) {
    return {
      ...payload,
      discountPercentage: 0,
      discountAmount: 0,
    };
  }

  const payloadItemsTotal = getOrderItemsTotal(payload.orderItems || payload.items || []);
  const explicitBaseTotal =
    totalBeforeDiscount ??
    payload.itemsPrice ??
    (payloadItemsTotal || undefined);
  const baseTotal =
    explicitBaseTotal ||
    Number(payload.totalPrice || 0) + Number(payload.discountAmount || 0);
  const discount = calculateOrderDiscount(baseTotal, discountPercentage);

  return {
    ...payload,
    itemsPrice: discount.orderTotal,
    discountPercentage: discount.discountPercentage,
    discountAmount: discount.discountAmount,
    totalPrice: discount.totalAfterDiscount,
  };
};
