import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import {
  createInventoryDispatchOrder,
  fetchInventoryDispatchOrders,
  fetchInventoryProducts,
  fetchStockTransactions,
} from '../features/inventory/stockManagerInventorySlice';
import {
  getDispatchDestinationLabel,
  getDispatchItemBrand,
  getDispatchItemProductName,
  getWarehouseLabel,
} from '../utils/dispatchDisplay';

// const getDateOnly = (value) => {
//   if (!value) return '';
//   const text = String(value).trim();
//   const match = text.match(/(\d{4})-(\d{2})-(\d{2})/);
//   return match ? match[0] : '';
// };

const CreateDispatchOrderSection = ({
  inventoryProducts = [],
  catalogBarcodes = [],
  dispatchStakeholders = [],
  warehouses = [],
  outlets = [],
  loading = false,
  ratePlans = [],
}) => {
  const dispatch = useDispatch();

  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [destinationType, setDestinationType] = useState('outlet');
  const [destinationId, setDestinationId] = useState('');
  const [expectedDispatchAt, setExpectedDispatchAt] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const inventorySearchRef = useRef(null);

  useEffect(() => {
    const closeSuggestionsOnOutsideClick = (event) => {
      if (
        inventorySearchRef.current &&
        !inventorySearchRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', closeSuggestionsOnOutsideClick);

    return () => {
      document.removeEventListener('mousedown', closeSuggestionsOnOutsideClick);
    };
  }, []);

  const destinations = useMemo(() => {
    if (destinationType === 'internal_packing') {
      return [{ id: 'internal-packing', name: 'Internal Packing Dept' }];
    }

    if (destinationType === 'warehouse') return warehouses;
    if (destinationType === 'outlet') return outlets;
    if (destinationType === 'vendor' || destinationType === 'customer') {
      return dispatchStakeholders.filter((stakeholder) =>
        String(stakeholder.stakeholder_type || '')
          .toLowerCase()
          .includes(destinationType)
      );
    }
    return [];
  }, [destinationType, warehouses, outlets, dispatchStakeholders]);

  const sourceWarehouse = warehouses.find(
    (w) => String(w.id) === String(sourceWarehouseId)
  );

  const selectedDestination = destinations.find(
    (d) => String(d.id) === String(destinationId)
  );

  const isInternalPacking = destinationType === 'internal_packing';
  const ratePlansByBarcodeId = useMemo(
    () =>
      (ratePlans || []).reduce((acc, plan) => {
        const key = String(plan.product_barcode_id);
        const list = acc.get(key) || [];
        list.push(plan);
        acc.set(key, list);
        return acc;
      }, new Map()),
    [ratePlans]
  );

  const normalizeText = (value) =>
    String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();

  const normalizeUnit = (value) =>
    String(value || '').toLowerCase().replace(/\./g, '').replace(/\s+/g, '');

  const formatPackUnit = (item) =>
    [
      item.barcode_quantity || item.quantity || item.catalog_quantity,
      item.unit_short_code || item.unit_name || item.units || item.unit,
    ]
      .filter(Boolean)
      .join(' ') || '-';

  const formatDecimal = (value, digits = 3) => {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) return '0';

    return numeric.toFixed(digits).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  };

  const getItemUnitQtyInGrams = (item) => {
    const qty = Number(item.barcode_quantity || item.quantity || 1);
    const unit = normalizeUnit(item.unit_short_code || item.unit_name || item.units);

    if (unit.startsWith('kg')) return qty * 1000;
    if (unit.startsWith('gm') || unit.startsWith('gms') || unit === 'g') return qty;

    return qty;
  };

  const firstNumber = (...values) => {
    for (const value of values) {
      if (value === undefined || value === null || value === '') continue;

      const numeric = Number(String(value).replace(/,/g, '').trim());
      if (Number.isFinite(numeric) && numeric > 0) return numeric;
    }

    return 0;
  };

  const getSourceUnitPrice = (item) => {
    const inventoryMatch = inventoryProducts.find(
      (row) =>
        String(row.id || row.inventory_product_id) ===
        String(item.inventory_product_id)
    );

    const price = firstNumber(
      item.source_unit_price,
      item.purchase_price,
      item.purchasePrice,
      item.cost_price,
      item.costPrice,
      item.buying_price,
      item.buyingPrice,
      item.unit_cost,
      item.unitCost,
      item.unit_price ||
        item.unitPrice,
      item.landing_cost,
      item.landingCost,
      item.price,
      item.dprice,
      item.selling_price,
      inventoryMatch?.purchase_price,
      inventoryMatch?.purchasePrice,
      inventoryMatch?.cost_price,
      inventoryMatch?.costPrice,
      inventoryMatch?.buying_price,
      inventoryMatch?.buyingPrice,
      inventoryMatch?.unit_cost,
      inventoryMatch?.unitCost,
      inventoryMatch?.unit_price,
      inventoryMatch?.unitPrice,
      inventoryMatch?.landing_cost,
      inventoryMatch?.landingCost,
      inventoryMatch?.price,
      inventoryMatch?.dprice,
      inventoryMatch?.selling_price
    );

    if (price > 0) return price;

    const totalAmount = firstNumber(
      item.total_purchase_amount,
      item.totalPurchaseAmount,
      item.purchase_amount,
      item.purchaseAmount,
      item.total_cost,
      item.totalCost,
      inventoryMatch?.total_purchase_amount,
      inventoryMatch?.totalPurchaseAmount,
      inventoryMatch?.purchase_amount,
      inventoryMatch?.purchaseAmount,
      inventoryMatch?.total_cost,
      inventoryMatch?.totalCost
    );

    const availableUnits = Number(item.available_units || item.no_of_units || 0);

    if (totalAmount > 0 && availableUnits > 0) {
      return totalAmount / availableUnits;
    }

    return 0;
  };

  const getPackingBarcodeMatches = (item) => {
    const productId = String(item.product_id || item.catalog_product_id || '');
    const productName = normalizeText(item.product_name);
    const productNameWithoutBrand = normalizeText(
      String(item.product_name || '').replace(item.brand_name_english || item.brand_name || '', '')
    );
    const brandName = normalizeText(item.brand_name_english || item.brand_name);
    const categoryName = normalizeText(item.category_name_english || item.category_name);

    return catalogBarcodes
      .filter((barcode) => {
        const barcodeProductId = String(
          barcode.product_id || barcode.catalog_product_id || ''
        );
        const sameProductId = productId && barcodeProductId === productId;
        const barcodeName = normalizeText(
            barcode.product_name_eng ||
              barcode.product_name ||
              barcode.name ||
              barcode.productName
          );
        const sameName =
          productName &&
          (barcodeName === productName ||
            (productNameWithoutBrand && barcodeName === productNameWithoutBrand) ||
            (!barcodeName && sameProductId));
        const sameBrand =
          !brandName ||
          normalizeText(
            barcode.brand_name_english || barcode.brand_name || barcode.brand
          ) === brandName;
        const sameCategory =
          !categoryName ||
          normalizeText(
            barcode.category_name_english ||
              barcode.category_name ||
              barcode.category
          ) === categoryName;

        return sameName && sameBrand && sameCategory;
      })
      .sort((a, b) => getItemUnitQtyInGrams(a) - getItemUnitQtyInGrams(b));
  };

  const getConfiguredSourceUnits = (item) => {
    const sourceGrams = getItemUnitQtyInGrams(item);

    if (!sourceGrams) return Number(item.no_of_units || 0);

    const configuredGrams = (item.packing_configs || []).reduce(
      (sum, config) =>
        sum +
        getItemUnitQtyInGrams(config) * Number(config.pack_count || 0),
      0
    );

    if (!configuredGrams) return 0;

    return Number((configuredGrams / sourceGrams).toFixed(3));
  };

  const getConfiguredPackGrams = (item) =>
    (item.packing_configs || []).reduce(
      (sum, config) =>
        sum + getItemUnitQtyInGrams(config) * Number(config.pack_count || 0),
      0
    );

  const getRemainingSourceUnits = (item) =>
    Number(item.available_units || 0) - getConfiguredSourceUnits(item);

  const getPackingUsageText = (item) => {
    if (!(item.packing_configs || []).length) {
      return `No packing selected | Available: ${formatDecimal(
        item.available_units
      )} x ${formatPackUnit(item)}`;
    }

    return `Used: ${formatDecimal(getConfiguredSourceUnits(item))} x ${formatPackUnit(
      item
    )} (${formatDecimal(getConfiguredPackGrams(item), 0)} GMS) | Remaining: ${formatDecimal(
      getRemainingSourceUnits(item)
    )} x ${formatPackUnit(item)} | Available: ${formatDecimal(item.available_units)}`;
  };

  const getLooseQtyPerUnit = (item) => {
    const qty = Number(item.barcode_quantity || item.quantity || item.catalog_quantity || 0);
    const unit = normalizeUnit(item.unit_short_code || item.unit_name || item.units || item.unit);

    return unit === 'qty' && qty > 1 ? qty : 0;
  };

  const getRatePlansForConfig = (config) =>
    ratePlansByBarcodeId.get(String(config.product_barcode_id)) || [];

  const applyRatePlanToConfig = (config, ratePlan) => ({
    ...config,
    rate_plan_id: ratePlan?.id || '',
    rate_for: ratePlan?.rate_for || '',
    gst_rate: ratePlan?.gst_rate || '',
    margin_percentage: ratePlan?.margin_percentage || '',
    labour_percentage: ratePlan?.labour_percentage || '',
    transport_percentage: ratePlan?.transport_percentage || '',
    load_percentage: ratePlan?.load_percentage || '',
    unload_percentage: ratePlan?.unload_percentage || '',
    notes: ratePlan?.notes || config.notes || null,
  });

  const getDispatchUnitsFromEntry = (item) => {
    if (isInternalPacking) return getConfiguredSourceUnits(item);

    const looseQtyPerUnit = getLooseQtyPerUnit(item);
    if (item.dispatch_entry_mode === 'qty' && looseQtyPerUnit) {
      return Number((Number(item.dispatch_qty || 0) / looseQtyPerUnit).toFixed(3));
    }

    return Number(item.no_of_units || 0);
  };

  const getSourceUnitsForPayload = (item) => getDispatchUnitsFromEntry(item);

  const getPackingSummary = (item) =>
    (item.packing_configs || [])
      .map((config) =>
        [
          `${config.product_name || item.product_name} ${formatPackUnit(config)}`,
          `x ${Number(config.pack_count || 0)}`,
          config.rate_plan_id ? `RatePlan ${config.rate_plan_id}` : '',
        ].join(' ')
      )
      .join('; ');

  const inventoryRows = useMemo(() => {
    return inventoryProducts
      .filter((item) => {
        const availableUnits = Number(item.no_of_units || item.count_in_stock || 0);
        const sameWarehouse =
          !sourceWarehouseId ||
          String(item.warehouse_id) === String(sourceWarehouseId);
        const entityType = String(item.business_entity_type || '').toLowerCase();
        const isPackingStock =
          entityType.includes('internal_packing') ||
          entityType.includes('packing');
        const hidePackedStockAsSource = isInternalPacking && isPackingStock;

        return (
          availableUnits > 0 &&
          sameWarehouse &&
          item.is_active !== false &&
          item.product_barcode_id &&
          !hidePackedStockAsSource
        );
      })
      .map((item) => {
        const expDateOnly =  item.exp_date
      

        return {
          ...item,
          inventory_product_id: item.id,
          exp_date_only: expDateOnly,
          available_units: Number(item.no_of_units || item.count_in_stock || 0),
          product_barcode_id: item.product_barcode_id,
          display_barcode: item.mk_barcode || item.bar_code || item.barcode || '',
          display_product_name: getDispatchItemProductName(item),
          searchText: [
            item.product_code,
            getDispatchItemProductName(item),
            item.product_name,
            item.product_name_eng,
            item.product_name_tel,
            item.mk_barcode,
            item.bar_code,
            item.barcode,
            getDispatchItemBrand(item),
            item.brand_name_english,
            item.category_name_english,
            item.unit_name,
            item.unit_short_code,
            expDateOnly,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
        };
      });
  }, [inventoryProducts, sourceWarehouseId, isInternalPacking]);

  const suggestions = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!sourceWarehouseId) return [];
    if (!value) return inventoryRows.slice(0, 20);

    return inventoryRows.filter((row) => row.searchText.includes(value)).slice(0, 20);
  }, [inventoryRows, search, sourceWarehouseId]);

  const getDestinationLabel = (item) =>
    getDispatchDestinationLabel(item, destinationType);

  const getAlreadyAddedUnits = (row) => {
    return items
      .filter(
        (item) =>
          String(item.inventory_product_id) === String(row.inventory_product_id)
      )
      .reduce((sum, item) => sum + Number(item.no_of_units || 0), 0);
  };

  const addInventoryItem = (inventoryRow) => {
    if (!sourceWarehouseId) {
      alert('Please select source warehouse first');
      return;
    }

    const availableUnits = Number(
      inventoryRow.available_units || inventoryRow.no_of_units || 0
    );

    const alreadyAddedUnits = getAlreadyAddedUnits(inventoryRow);
    const remainingUnits = availableUnits - alreadyAddedUnits;
    const initialUnits = remainingUnits >= 1 ? 1 : Number(remainingUnits.toFixed(3));

    if (initialUnits <= 0) {
      alert(`Only ${availableUnits} units available.`);
      return;
    }

    const newItem = {
      inventory_product_id: Number(inventoryRow.inventory_product_id),
      product_barcode_id: Number(inventoryRow.product_barcode_id),

      mk_barcode: inventoryRow.mk_barcode || inventoryRow.bar_code || inventoryRow.barcode || '',
      barcode: inventoryRow.barcode || inventoryRow.bar_code || '',
      barcode_quantity: inventoryRow.barcode_quantity || '',
      mkid: inventoryRow.mkid || inventoryRow.MKID || inventoryRow.sku_id || '',
      product_id: inventoryRow.product_id || inventoryRow.catalog_product_id || '',
      purchase_price: inventoryRow.purchase_price,
      purchasePrice: inventoryRow.purchasePrice,
      cost_price: inventoryRow.cost_price,
      costPrice: inventoryRow.costPrice,
      buying_price: inventoryRow.buying_price,
      buyingPrice: inventoryRow.buyingPrice,
      unit_cost: inventoryRow.unit_cost,
      unitCost: inventoryRow.unitCost,
      unit_price: inventoryRow.unit_price,
      unitPrice: inventoryRow.unitPrice,
      landing_cost: inventoryRow.landing_cost,
      landingCost: inventoryRow.landingCost,
      price: inventoryRow.price,
      dprice: inventoryRow.dprice,
      selling_price: inventoryRow.selling_price,
      total_purchase_amount: inventoryRow.total_purchase_amount,
      totalPurchaseAmount: inventoryRow.totalPurchaseAmount,
      purchase_amount: inventoryRow.purchase_amount,
      purchaseAmount: inventoryRow.purchaseAmount,
      total_cost: inventoryRow.total_cost,
      totalCost: inventoryRow.totalCost,

      product_code: inventoryRow.product_code,
      product_name: getDispatchItemProductName(inventoryRow),

      brand_name_english: getDispatchItemBrand(inventoryRow),
      category_name_english: inventoryRow.category_name_english,
      unit_short_code: inventoryRow.unit_short_code,
      unit_name: inventoryRow.unit_name,

      exp_date: inventoryRow.exp_date_only,
      available_units: availableUnits,

      qty: initialUnits,
      no_of_units: initialUnits,
      dispatch_entry_mode: 'units',
      dispatch_qty: '',
      notes: '',
      packing_configs: [],
    };

    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          String(item.inventory_product_id) ===
          String(newItem.inventory_product_id)
      );

        if (existingIndex !== -1) {
          return prev.map((item, index) =>
            index === existingIndex
              ? {
                  ...item,
                  qty: Number(item.qty || 0) + initialUnits,
                  no_of_units: Number(item.no_of_units || 0) + initialUnits,
                  dispatch_entry_mode: item.dispatch_entry_mode || 'units',
                }
              : item
        );
      }

      return [...prev, newItem];
    });

    setSearch('');
    setShowSuggestions(false);
  };

  const updateItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        if (field === 'no_of_units' || field === 'qty') {
          const nextUnits = Number(value || 0);

          if (nextUnits > Number(item.available_units || 0)) {
            alert(`Only ${Number(item.available_units || 0)} units available.`);
            return item;
          }

          return {
            ...item,
            qty: nextUnits,
            no_of_units: nextUnits,
          };
        }

        if (field === 'dispatch_entry_mode') {
          return {
            ...item,
            dispatch_entry_mode: value,
            dispatch_qty: '',
            qty: value === 'qty' ? 0 : Number(item.no_of_units || 1),
            no_of_units: value === 'qty' ? 0 : Number(item.no_of_units || 1),
          };
        }

        if (field === 'dispatch_qty') {
          const looseQtyPerUnit = getLooseQtyPerUnit(item);
          const nextQty = Number(value || 0);
          const maxQty = Number(item.available_units || 0) * looseQtyPerUnit;

          if (looseQtyPerUnit && nextQty > maxQty) {
            alert(`Only ${formatDecimal(maxQty, 0)} qty available.`);
            return item;
          }

          const nextUnits = looseQtyPerUnit
            ? Number((nextQty / looseQtyPerUnit).toFixed(3))
            : nextQty;

          return {
            ...item,
            dispatch_qty: value,
            qty: nextUnits,
            no_of_units: nextUnits,
          };
        }

        return { ...item, [field]: value };
      })
    );
  };

  const addPackingConfig = (itemIndex, barcodeConfig) => {
    setItems((prev) =>
      prev.map((item, index) => {
        if (index !== itemIndex) return item;

        const alreadyAdded = (item.packing_configs || []).some(
          (config) =>
            String(config.product_barcode_id) ===
            String(barcodeConfig.id || barcodeConfig.product_barcode_id)
        );

        if (alreadyAdded) return item;

        const availableRatePlans =
          ratePlansByBarcodeId.get(
            String(barcodeConfig.id || barcodeConfig.product_barcode_id)
          ) || [];
        const ratePlan = availableRatePlans[0] || null;

        const newConfig = applyRatePlanToConfig({
          product_barcode_id: Number(
            barcodeConfig.id || barcodeConfig.product_barcode_id
          ),
          mk_barcode:
            barcodeConfig.mk_barcode ||
            barcodeConfig.mkBarcode ||
            barcodeConfig.MKBarcode ||
            barcodeConfig.bar_code ||
            barcodeConfig.barcode ||
              '',
          bar_code: barcodeConfig.bar_code || '',
          barcode: barcodeConfig.barcode || barcodeConfig.bar_code || '',
          product_name:
            barcodeConfig.product_name_eng ||
            barcodeConfig.product_name ||
            item.product_name,
          barcode_quantity:
            barcodeConfig.barcode_quantity || barcodeConfig.quantity || '',
          unit_short_code:
            barcodeConfig.unit_short_code ||
            barcodeConfig.unit_name ||
            barcodeConfig.units ||
            '',
          pack_count: 1,
        }, ratePlan);

        return {
          ...item,
          packing_configs: [...(item.packing_configs || []), newConfig],
        };
      })
    );
  };

  const updatePackingConfig = (itemIndex, configIndex, field, value) => {
    setItems((prev) =>
      prev.map((item, index) => {
        if (index !== itemIndex) return item;

        return {
          ...item,
          packing_configs: (item.packing_configs || []).map((config, cIndex) =>
            cIndex === configIndex
              ? field === 'rate_plan_id'
                ? applyRatePlanToConfig(
                    config,
                    getRatePlansForConfig(config).find(
                      (plan) => String(plan.id) === String(value)
                    ) || null
                  )
                : { ...config, [field]: value }
              : config
          ),
        };
      })
    );
  };

  const removePackingConfig = (itemIndex, configIndex) => {
    setItems((prev) =>
      prev.map((item, index) => {
        if (index !== itemIndex) return item;

        return {
          ...item,
          packing_configs: (item.packing_configs || []).filter(
            (_, cIndex) => cIndex !== configIndex
          ),
        };
      })
    );
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!sourceWarehouseId) {
      alert('Please select source warehouse');
      return;
    }

    if (!destinationId) {
      alert('Please select destination');
      return;
    }

    if (items.length === 0) {
      alert('Please add at least one product');
      return;
    }

    const invalidItem = items.find(
      (item) =>
        !item.inventory_product_id ||
        !item.product_barcode_id ||
        !item.exp_date ||
        Number(getSourceUnitsForPayload(item) || 0) <= 0 ||
        Number(getSourceUnitsForPayload(item) || 0) > Number(item.available_units || 0)
    );

    if (invalidItem) {
      alert('Dispatch item is invalid. Check barcode, expiry and available units.');
      return;
    }

    if (isInternalPacking) {
      const invalidPackingConfig = items.find(
        (item) =>
          !(item.packing_configs || []).length ||
          (item.packing_configs || []).some(
            (config) =>
              !config.product_barcode_id ||
              Number(config.pack_count || 0) <= 0 ||
              !config.rate_plan_id
          )
      );

      if (invalidPackingConfig) {
        alert(
          'Please add valid packing configurations and select a rate plan for every internal packing item.'
        );
        return;
      }
    }

    const payload = {
      source: `warehouse:${sourceWarehouseId}:${getWarehouseLabel(sourceWarehouse)}`,
      destination: `${destinationType}:${destinationId}:${getDestinationLabel(
        selectedDestination
      )}`,
      warehouse_id: Number(sourceWarehouseId),
      source_warehouse_id: Number(sourceWarehouseId),
      outlet_id: destinationType === 'outlet' ? Number(destinationId) : undefined,
      expected_dispatch_at: expectedDispatchAt || null,
      dispatch_notes: dispatchNotes || null,
      dispatch_status: destinationType === 'internal_packing' ? 'sent' : 'draft',
      items: items.map((item) => ({
        inventory_product_id: Number(item.inventory_product_id),
        product_barcode_id: Number(item.product_barcode_id),
        qty: getSourceUnitsForPayload(item),
        no_of_units: getSourceUnitsForPayload(item),
        exp_date: item.exp_date,
        notes: isInternalPacking
          ? getPackingSummary(item) || item.notes || null
          : item.notes || null,
        source_unit_price: isInternalPacking
          ? Number(getSourceUnitPrice(item) || 0)
          : undefined,
        packing_configurations: isInternalPacking
          ? (item.packing_configs || []).map((config) => ({
              product_barcode_id: Number(config.product_barcode_id),
              mk_barcode: config.mk_barcode || null,
              bar_code: config.bar_code || null,
              barcode: config.barcode || config.bar_code || null,
              product_name: config.product_name || item.product_name,
              barcode_quantity: Number(config.barcode_quantity || 0),
              unit_short_code: config.unit_short_code || null,
              pack_count: Number(config.pack_count || 0),
              rate_plan_id: config.rate_plan_id
                ? Number(config.rate_plan_id)
                : null,
            }))
          : undefined,
      })),
    };

    const result = await dispatch(createInventoryDispatchOrder(payload));

    if (createInventoryDispatchOrder.fulfilled.match(result)) {
      dispatch(fetchInventoryDispatchOrders());
      dispatch(fetchInventoryProducts());
      dispatch(fetchStockTransactions());

      setSourceWarehouseId('');
      setDestinationType('outlet');
      setDestinationId('');
      setExpectedDispatchAt('');
      setDispatchNotes('');
      setSearch('');
      setShowSuggestions(false);
      setItems([]);
    }
  };

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-4 rounded-xl bg-blue-50 p-4">
        <h2 className="text-lg font-bold text-blue-900">Create Dispatch</h2>
        <p className="text-sm text-blue-700">
          Send available inventory to outlets, stakeholders, warehouses or the internal packing dept.
        </p>
      </div>

      <form onSubmit={submitHandler} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Source Warehouse
            </label>
            <select
              value={sourceWarehouseId}
              onChange={(e) => {
                setSourceWarehouseId(e.target.value);
                setSearch('');
                setShowSuggestions(false);
                setItems([]);
              }}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="">Select warehouse</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.warehouse_code} - {warehouse.warehouse_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Dispatch To
            </label>
            <select
              value={destinationType}
              onChange={(e) => {
                setDestinationType(e.target.value);
                setDestinationId(
                  e.target.value === 'internal_packing' ? 'internal-packing' : ''
                );
              }}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="outlet">Outlet</option>
              <option value="internal_packing">Internal Packing Dept</option>
              <option value="vendor">Vendor</option>
              <option value="customer">Customer</option>
              <option value="warehouse">Warehouse</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Destination
            </label>
            <select
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              disabled={destinationType === 'internal_packing'}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="">Select destination</option>
              {destinations.map((destination) => (
                <option key={destination.id} value={destination.id}>
                  {getDestinationLabel(destination)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Expected Dispatch
            </label>
            <input
              type="datetime-local"
              value={expectedDispatchAt}
              onChange={(e) => setExpectedDispatchAt(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">
            Dispatch Notes
          </label>
          <textarea
            value={dispatchNotes}
            onChange={(e) => setDispatchNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Optional notes"
          />
        </div>

        <div className="rounded-xl border bg-slate-50 p-4">
          <label className="mb-1 block text-sm font-bold text-gray-700">
            Add Product From Inventory
          </label>

          <div ref={inventorySearchRef} className="relative">
            <input
              value={search}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(true);
              }}
              disabled={!sourceWarehouseId}
              placeholder={
                sourceWarehouseId
                  ? 'Search by barcode, product name, product code, brand, expiry...'
                  : 'Select source warehouse first'
              }
              className="w-full rounded-lg border px-3 py-3 text-sm disabled:bg-gray-100"
            />

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border bg-white shadow-lg">
                {suggestions.map((row) => (
                  <button
                    key={`${row.inventory_product_id}-${row.product_barcode_id}`}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addInventoryItem(row)}
                    className="block w-full border-b px-3 py-3 text-left hover:bg-blue-50"
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <div className="font-bold text-gray-900">
                          {row.display_product_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Inv ID: {row.inventory_product_id} | Code:{' '}
                          {row.product_code || '-'} | Barcode:{' '}
                          {row.display_barcode || '-'} | Exp:{' '}
                          {row.exp_date_only || '-'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Brand: {row.brand_name_english || '-'} | Category:{' '}
                          {row.category_name_english || '-'}
                        </div>
                      </div>

                      <div className="text-right text-xs">
                        <div className="font-semibold text-green-700">
                          Available: {formatDecimal(row.available_units)}
                        </div>
                        <div className="text-gray-500">
                          {formatPackUnit(row)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-2 text-left">Product</th>
                <th className="p-2 text-left">Barcode</th>
                <th className="p-2 text-left">Brand</th>
                <th className="p-2 text-left">Category</th>
                <th className="p-2 text-center">Expiry</th>
                <th className="p-2 text-center">Available</th>
                <th className="p-2 text-center">Dispatch By</th>
                <th className="p-2 text-center">Dispatch Units</th>
                <th className="p-2 text-center">Unit</th>
                <th className="p-2 text-left">Notes</th>
                <th className="p-2 text-center">Remove</th>
              </tr>
            </thead>

            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="11" className="p-6 text-center text-gray-500">
                    No products added
                  </td>
                </tr>
              ) : (
                items.map((item, index) => {
                  const looseQtyPerUnit = getLooseQtyPerUnit(item);
                  const dispatchUnits = getDispatchUnitsFromEntry(item);

                  return (
                    <tr
                      key={`${item.inventory_product_id}-${index}`}
                      className="border-t"
                    >
                    <td className="p-2">
                      <div className="font-semibold">
                        {[item.product_code, item.product_name].filter(Boolean).join(' - ')}
                      </div>
                      <div className="text-xs text-gray-500">
                        Inventory ID: {item.inventory_product_id}
                      </div>
                    </td>

                    <td className="p-2">{item.mk_barcode || item.barcode || '-'}</td>
                    <td className="p-2">{item.brand_name_english || '-'}</td>
                    <td className="p-2">{item.category_name_english || '-'}</td>
                    <td className="p-2 text-center">{item.exp_date || '-'}</td>

                    <td className="p-2 text-center font-bold text-green-700">
                      {formatDecimal(item.available_units)}
                    </td>

                    <td className="p-2 text-center">
                      {looseQtyPerUnit ? (
                        <select
                          value={item.dispatch_entry_mode || 'units'}
                          onChange={(e) =>
                            updateItem(index, 'dispatch_entry_mode', e.target.value)
                          }
                          className="rounded border px-2 py-1 text-sm"
                        >
                          <option value="units">Units</option>
                          <option value="qty">Qty</option>
                        </select>
                      ) : (
                        <span className="text-gray-500">Units</span>
                      )}
                    </td>

                    <td className="p-2 text-center">
                      <input
                        type="number"
                        min={
                          isInternalPacking || item.dispatch_entry_mode === 'qty'
                            ? '0.001'
                            : Number(item.available_units || 0) < 1
                              ? '0.001'
                              : '1'
                        }
                        step={
                          isInternalPacking || item.dispatch_entry_mode === 'qty'
                            ? '0.001'
                            : Number(item.available_units || 0) < 1
                              ? '0.001'
                              : '1'
                        }
                        max={
                          item.dispatch_entry_mode === 'qty' && looseQtyPerUnit
                            ? Number(item.available_units || 0) * looseQtyPerUnit
                            : item.available_units
                        }
                        value={
                          isInternalPacking
                            ? formatDecimal(getConfiguredSourceUnits(item))
                            : item.dispatch_entry_mode === 'qty'
                              ? item.dispatch_qty
                            : item.no_of_units
                        }
                        onChange={(e) =>
                          updateItem(
                            index,
                            item.dispatch_entry_mode === 'qty'
                              ? 'dispatch_qty'
                              : 'no_of_units',
                            e.target.value
                          )
                        }
                        readOnly={isInternalPacking}
                        className="w-24 rounded border px-2 py-1 text-center"
                      />
                      {item.dispatch_entry_mode === 'qty' && looseQtyPerUnit ? (
                        <div className="mt-1 text-[11px] text-gray-500">
                          {formatDecimal(dispatchUnits)} units
                        </div>
                      ) : null}
                    </td>

                    <td className="p-2 text-center">
                      {item.dispatch_entry_mode === 'qty' && looseQtyPerUnit
                        ? `QTY (${formatDecimal(looseQtyPerUnit, 0)} / ${formatPackUnit(item)})`
                        : formatPackUnit(item)}
                    </td>

                    <td className="p-2">
                      <input
                        value={item.notes || ''}
                        onChange={(e) => updateItem(index, 'notes', e.target.value)}
                        className="w-44 rounded border px-2 py-1"
                        placeholder="Optional"
                      />
                    </td>

                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="rounded-lg bg-red-100 px-3 py-1 text-red-700 hover:bg-red-200"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {isInternalPacking && items.length > 0 && (
          <div className="rounded-xl border bg-white p-4">
            <div className="mb-3">
              <h3 className="text-base font-bold text-gray-900">
                Packing Configuration
              </h3>
              <p className="text-sm text-gray-500">
                Choose pack sizes from product barcodes. Count stays on the dispatch; prices and percentages come from catalog rate plans.
              </p>
            </div>

            <div className="space-y-5">
              {items.map((item, itemIndex) => {
                const matches = getPackingBarcodeMatches(item);
                const selectedConfigIds = new Set(
                  (item.packing_configs || []).map((config) =>
                    String(config.product_barcode_id)
                  )
                );

                return (
                  <div key={`packing-${item.inventory_product_id}-${itemIndex}`}>
                    <div className="mb-2 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_320px] md:items-end">
                      <div>
                        <div className="font-bold text-gray-900">
                          {[item.product_code, item.product_name]
                            .filter(Boolean)
                            .join(' - ')}
                          </div>
                          <div className="text-xs text-gray-500">
                          {getPackingUsageText(item)}
                          </div>
                        </div>

                      <label className="block text-xs font-semibold text-gray-600">
                        Source Unit Cost
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.source_unit_price || getSourceUnitPrice(item) || ''}
                          onChange={(e) =>
                            updateItem(itemIndex, 'source_unit_price', e.target.value)
                          }
                          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                          placeholder="Cost per source pack"
                        />
                      </label>

                      <select
                        value=""
                        onChange={(e) => {
                          const selected = matches.find(
                            (match) =>
                              String(match.id || match.product_barcode_id) ===
                              e.target.value
                          );
                          if (selected) addPackingConfig(itemIndex, selected);
                        }}
                        className="w-full rounded-lg border px-3 py-2 text-sm md:w-80"
                      >
                        <option value="">
                          {matches.length
                            ? 'Add packing size'
                            : 'No product barcode pack sizes found'}
                        </option>
                        {matches.map((match) => {
                          const id = String(match.id || match.product_barcode_id);
                          return (
                            <option
                              key={id}
                              value={id}
                              disabled={selectedConfigIds.has(id)}
                            >
                              {[
                                match.product_name_eng ||
                                  match.product_name ||
                                  item.product_name,
                                formatPackUnit(match),
                                  match.mk_barcode ||
                                    match.mkBarcode ||
                                    match.MKBarcode ||
                                    match.bar_code ||
                                    match.barcode,
                              ]
                                .filter(Boolean)
                                .join(' | ')}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="overflow-x-auto rounded-lg border">
                      <table className="min-w-[1180px] w-full text-xs">
                        <thead className="bg-gray-100 text-gray-700">
                          <tr>
                            <th className="p-2 text-left">Product</th>
                            <th className="p-2 text-left">Pack Size</th>
                            <th className="p-2 text-center">Pack Count</th>
                            <th className="p-2 text-left">Rate Plan</th>
                            <th className="p-2 text-center">GST %</th>
                            <th className="p-2 text-center">Margin %</th>
                            <th className="p-2 text-center">Labour %</th>
                            <th className="p-2 text-center">Transport %</th>
                            <th className="p-2 text-center">Load %</th>
                            <th className="p-2 text-center">Unload %</th>
                            <th className="p-2 text-center">Remove</th>
                          </tr>
                        </thead>

                        <tbody>
                          {(item.packing_configs || []).length === 0 ? (
                            <tr>
                              <td
                                colSpan="11"
                                className="p-4 text-center text-gray-500"
                              >
                                Add at least one packing size for this item.
                              </td>
                            </tr>
                          ) : (
                            item.packing_configs.map((config, configIndex) => {
                              const configRatePlans = getRatePlansForConfig(config);

                              return (
                              <tr
                                key={`${config.product_barcode_id}-${configIndex}`}
                                className="border-t"
                              >
                                <td className="p-2 font-semibold">
                                  {config.mk_barcode ||
                                    config.mkBarcode ||
                                    config.MKBarcode ||
                                    config.bar_code ||
                                    config.barcode ||
                                    '-'}
                                </td>
                                  <td className="p-2">
                                    {config.product_name || item.product_name} -{' '}
                                    {formatPackUnit(config)}
                                  </td>
                                <td className="p-2 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={config.pack_count}
                                    onChange={(e) =>
                                      updatePackingConfig(
                                        itemIndex,
                                        configIndex,
                                        'pack_count',
                                        e.target.value
                                      )
                                    }
                                    className="w-20 rounded border px-2 py-1 text-center"
                                  />
                                </td>
                                <td className="p-2">
                                  <select
                                    value={config.rate_plan_id || ''}
                                    onChange={(e) =>
                                      updatePackingConfig(
                                        itemIndex,
                                        configIndex,
                                        'rate_plan_id',
                                        e.target.value
                                      )
                                    }
                                    className="w-40 rounded border px-2 py-1"
                                  >
                                    <option value="">Select rate</option>
                                    {configRatePlans.map((plan) => (
                                      <option key={plan.id} value={plan.id}>
                                        {[
                                          plan.rate_for,
                                          plan.gst_rate ? `GST ${plan.gst_rate}%` : null,
                                        ]
                                          .filter(Boolean)
                                          .join(' | ')}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                {[
                                  'gst_rate',
                                  'margin_percentage',
                                  'labour_percentage',
                                  'transport_percentage',
                                  'load_percentage',
                                  'unload_percentage',
                                ].map((field) => (
                                  <td key={field} className="p-2 text-center">
                                    {config[field] || 0}
                                  </td>
                                ))}
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removePackingConfig(itemIndex, configIndex)
                                    }
                                    className="rounded-lg bg-red-100 px-3 py-1 text-red-700 hover:bg-red-200"
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-700 px-5 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'CDR'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default CreateDispatchOrderSection;
