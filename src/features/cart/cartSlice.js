import { createSlice } from '@reduxjs/toolkit';

const loadCartFromStorage = () => {
  try {
    const serializedCart = localStorage.getItem('cart');
    if (serializedCart === null) return undefined;
    return JSON.parse(serializedCart);
  } catch (e) {
    console.warn('Failed to load cart from storage:', e);
    return undefined;
  }
};





const saveCartToStorage = (state) => {
  try {
    localStorage.setItem('cart', JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save cart to storage:', e);
  }
};

const initialState = loadCartFromStorage() || {
  items: [],
  total: 0,
  totalQty: 0,
  totalDiscount: 0,
  totalRawAmount: 0 
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
  addToCart: (state, action) => {
  const product = action.payload;

  if (!Array.isArray(state.items)) {
    state.items = [];
  }

  // ✅ Validate input
  if (!product || !product.id || !product.MRP || !product.productName) {
    console.warn("🛑 Invalid product object", product);
    return;
  }

  // ✅ Composite match: productId + brandId + financialId
  const existingItem = state.items.find(
    item =>
      item.productId === product.id &&
      item.brandId === product.brandId &&
      item.financialId === product.financialId
  );
  

  if (existingItem) {
    // Prevent stock overflow
    if (existingItem.stock <= 0) {
      alert("❌ Stock unavailable for this item.");
      return;
    }

    existingItem.qty += 1;
    existingItem.stock -= 1;

    // const discountAmount = existingItem.price * (existingItem.discount / 100);
    existingItem.subtotal = parseFloat(
      ((existingItem.dprice) * existingItem.qty).toFixed(2)
    );
  } else {
    const stock = parseInt(product.countInStock || product.qty || 0);
    if (stock <= 0) {
      alert("❌ Stock unavailable for this item.");
      return;
    }

    const discount = product.discount || 0;
    // const discountAmount = product.dprice
    const subtotal = parseFloat((product.dprice).toFixed(2));

    const newItem = {
      id: product.id, // composite ID like productId-brandId-financialId
      item: product.productName,
      stock: stock - 1,
      quantity: product.quantity,
      price: product.MRP,
      catalogQuantity: product.catalogQuantity,
      discount,
      subtotal,
      units: product.units,
      image: product.image || '',
      brand: product.brand,
      brandId: product.brandId,
      financialId: product.financialId,
      dprice:product.dprice,
      productId: product._id || product.productId || product.id.split('-')[0],
      qty:1
    };

    state.items.push(newItem);
  }

  // 🧮 Recalculate totals
  let total = 0;
  let totalQty = 0;
  let totalDiscount = 0;
  let totalRawAmount = 0;

  for (const item of state.items) {
    const rawAmount = item.price * item.qty;
    // const itemDiscount = item.dprice;

    totalRawAmount += rawAmount;
    total += (item.dprice) * item.qty;
    totalQty += item.qty;
    totalDiscount += (item.price-item.dprice) * item.qty;
  }

  state.totalRawAmount = parseFloat(totalRawAmount.toFixed(2));
  state.total = parseFloat(total.toFixed(2));
  state.totalQty = totalQty;
  state.totalDiscount = parseFloat(totalDiscount.toFixed(2));

  // 💾 Persist to localStorage
  saveCartToStorage(state);
}

,
    updateQty: (state, action) => {
  const { productId, brandId, financialId, qty } = action.payload;

  if (
    !productId ||
    !brandId ||
    !financialId ||
    typeof qty !== "number" ||
    isNaN(qty) ||
    qty < 0
  ) {
    console.warn("🛑 Invalid quantity update", action.payload);
    return;
  }

  const itemIndex = state.items.findIndex(
    (i) =>
      i.productId === productId &&
      i.brandId === brandId &&
      i.financialId === financialId
  );

  if (itemIndex === -1) {
    console.warn("⚠️ Item not found in cart for update:", action.payload);
    return;
  }

  const item = state.items[itemIndex];
  const originalQty = Number(item.qty || 0);
  const nextQty = Number(qty);
  const diff = nextQty - originalQty;

  if (nextQty === 0) {
    state.items.splice(itemIndex, 1);
  } else {
    if (diff > 0 && Number(item.stock || 0) < diff) {
      alert("❌ Not enough stock available.");
      return;
    }

    item.qty = nextQty;
    item.stock -= diff;
    item.subtotal = parseFloat(
      (Number(item.dprice || 0) * nextQty).toFixed(2)
    );
  }

  state.total = 0;
  state.totalQty = 0;
  state.totalDiscount = 0;
  state.totalRawAmount = 0;

  for (const i of state.items) {
    const rowQty = Number(i.qty || 0);
    const rawAmount = Number(i.price || 0) * rowQty;
    const billedAmount = Number(i.dprice || 0) * rowQty;

    state.total += billedAmount;
    state.totalQty += rowQty;
    state.totalRawAmount += rawAmount;
    state.totalDiscount += rawAmount - billedAmount;
  }

  state.total = parseFloat(state.total.toFixed(2));
  state.totalDiscount = parseFloat(state.totalDiscount.toFixed(2));
  state.totalRawAmount = parseFloat(state.totalRawAmount.toFixed(2));

  saveCartToStorage(state);
},
    removeFromCart: (state, action) => {
      const { productId, brandId, financialId } = action.payload;
        state.items = state.items.filter(
    item =>
      item.productId !== productId ||
      item.brandId !== brandId ||
      item.financialId !== financialId
  );  // 🔁 Recalculate totals
  state.total = state.items.reduce((sum, item) => sum + item.subtotal, 0);
  state.total = parseFloat(state.total.toFixed(2));

  state.totalRawAmount = state.items.reduce((sum, item) => sum + item.price * item.qty, 0);
  state.totalRawAmount = parseFloat(state.totalRawAmount.toFixed(2));

  state.totalDiscount = state.items.reduce(
    (sum, item) => sum + ((item.price-item.dprice) * item.qty),
    0
  );
  state.totalDiscount = parseFloat(state.totalDiscount.toFixed(2));

  state.totalQty = state.items.reduce((sum, item) => sum + item.qty, 0);

  saveCartToStorage(state);
},
    clearCart: (state) => {
      state.items = [];
      state.total = 0;
      state.totalQty = 0;
      state.totalDiscount = 0;
      state.totalRawAmount=0;
      localStorage.removeItem('cart');
    },

    setCart: (state, action) => {
  const { items, total } = action.payload;
  state.items = items;
  state.total = total;
  state.totalQty = items.reduce((sum, item) => sum + item.qty, 0);
  state.totalDiscount = items.reduce((sum, item) => sum + (item.price - item.dprice) * item.qty, 0);
  state.totalRawAmount = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  // ✅ Save to localStorage inside reducer as well
  try {
    localStorage.setItem('cart', JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save cart to storage:', e);
  }
}

  }
});

export const { setCart } = cartSlice.actions;

export const { addToCart, updateQty, removeFromCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;