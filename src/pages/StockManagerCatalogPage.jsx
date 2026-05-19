import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import CatalogCrudSection from '../components/catalog/CatalogCrudSection';
import { fetchCatalogEntity } from '../features/inventory/catalogCrudSlice';
import StockManagerLayout from '../components/StockManagerLayout';

const catalogSections = [
  {
    key: 'products',
    title: 'Products',
    entity: 'products',
    fields: [
      { name: 'product_code', label: 'Product Code', required: true },
      {
        name: 'product_name_eng',
        label: 'Product Name English',
        required: true,
      },
      { name: 'product_name_tel', label: 'Product Name Telugu' },
      { name: 'hsn-code', label: 'HSN Code' },
      { name: 'gst_rate', label: 'GST Rate', type: 'number' },
    ],
  },
  {
    key: 'brands',
    title: 'Brands',
    entity: 'brands',
    fields: [
        { name: 'brand_code', label: 'Brand Code', required: true },
      { name: 'brand_name_english', label: 'Brand Name English', required: true },
      { name: 'brand_name_telugu', label: 'Brand Name Telugu' },
    //   { name: 'description', label: 'Description' },
    ],
  },
  {
    key: 'categories',
    title: 'Categories',
    entity: 'categories',
    fields: [
        { name: 'category_code', label: 'Category Code', required: true },
      {
        name: 'category_name_english',
        label: 'Category Name English',
        required: true,
      },
      { name: 'category_name_telugu', label: 'Category Name Telugu' },
    //   { name: 'description', label: 'Description' },
    ],
  },
  {
    key: 'employees',
    title: 'Employees',
    entity: 'employees',
  fields: [
    { name: 'emp_code', label: 'Employee Code', required: true },

    { name: 'first_name', label: 'First Name', required: true },
    { name: 'last_name', label: 'Last Name' },

    { name: 'phone', label: 'Phone' },
    { name: 'email', label: 'Email' },

    { name: 'department', label: 'Department' },
    { name: 'designation', label: 'Designation' },

    { name: 'salary', label: 'Salary', type: 'number' },

    { name: 'date_of_joining', label: 'Date of Joining', type: 'date' },

    { name: 'is_active', label: 'Active', type: 'checkbox' },

    // 🔒 Read-only system fields
    { name: 'created_at', label: 'Created At', readOnly: true },
    { name: 'updated_at', label: 'Updated At', readOnly: true },
  ],
  },
  {
    key: 'outlets',
    title: 'Outlets',
    entity: 'outlets',
    fields: [
      { name: 'outlet_name', label: 'Outlet Name', required: true },
      { name: 'address', label: 'Address' },
      { name: 'phone', label: 'Phone' },
    ],
  },
  {
    key: 'units',
    title: 'Units',
    entity: 'units',
    fields: [
      { name: 'unit_name', label: 'Unit Name', required: true },
      { name: 'unit_short_code', label: 'Unit Short Code' },
    ],
  },
  {
    key: 'stakeholders',
    title: 'Stakeholders',
    entity: 'stakeholders',
    fields: [
      { name: 'stackholder_code', label: 'Stakeholder Code', required: true },
      { name: 'stakeholder_name', label: 'Stakeholder Name', required: true },
      { name: 'stakeholder_type', label: 'Type' },
      { name: 'phone', label: 'Phone' },
      { name: 'email', label: 'Email' },
      { name: 'address', label: 'Address' },
    ],
  },
 {
  key: 'warehouses',
  title: 'Warehouses',
  entity: 'warehouses',
  fields: [
    { name: 'warehouse_code', label: 'Warehouse Code', required: true },
    { name: 'warehouse_name', label: 'Warehouse Name', required: true },
    { name: 'address', label: 'Address' },
    { name: 'phone', label: 'Phone' },
  ],
},
  {
    key: 'product_barcodes',
    title: 'Product Barcodes',
    entity: 'product-barcodes',
    fields: [
      {
        name: 'product_id',
        label: 'Product',
        type: 'select',
        optionsKey: 'products',
        valueKey: 'id',
        labelKey: 'product_name_eng',
        required: true,
      },
      {
        name: 'brand_id',
        label: 'Brand',
        type: 'select',
        optionsKey: 'brands',
        valueKey: 'id',
        labelKey: 'brand_name_english',
        required: true,
      },
      {
        name: 'category_id',
        label: 'Category',
        type: 'select',
        optionsKey: 'categories',
        valueKey: 'id',
        labelKey: 'category_name_english',
        required: true,
      },
      {
        name: 'unit_id',
        label: 'Unit',
        type: 'select',
        optionsKey: 'units',
        valueKey: 'id',
        labelKey: 'unit_name',
        required: true,
      },
      { name: 'quantity', label: 'Quantity', type: 'number', required: true },
      { name: 'barcode', label: 'Barcode' },
      { name: 'mk_barcode', label: 'MK Barcode', required: true },

      { name: 'product_name_eng', label: 'Product Name', readOnly: true },
      { name: 'product_code', label: 'Product Code', readOnly: true },
      { name: 'brand_name_english', label: 'Brand Name', readOnly: true },
      { name: 'category_name_english', label: 'Category Name', readOnly: true },
      { name: 'unit_name', label: 'Unit Name', readOnly: true },
      { name: 'unit_short_code', label: 'Unit Code', readOnly: true },
      { name: 'is_active', label: 'Active', type: 'checkbox', readOnly: true },
      { name: 'created_at', label: 'Created At', readOnly: true },
      { name: 'updated_at', label: 'Updated At', readOnly: true },
    ],
  },
];

const StockManagerCatalogPage = () => {
  const dispatch = useDispatch();

  const { data = {} } = useSelector((state) => state.catalogCrud || {});
  const [activeKey, setActiveKey] = useState('products');

  useEffect(() => {
    dispatch(fetchCatalogEntity('products'));
    dispatch(fetchCatalogEntity('brands'));
    dispatch(fetchCatalogEntity('categories'));
    dispatch(fetchCatalogEntity('units'));
    dispatch(fetchCatalogEntity('employees'));
    dispatch(fetchCatalogEntity('outlets'));
    dispatch(fetchCatalogEntity('stakeholders'));
    dispatch(fetchCatalogEntity('warehouses'));
    dispatch(fetchCatalogEntity('product-barcodes'));
  }, [dispatch]);

  const catalogOptions = {
    products: data.products || [],
    brands: data.brands || [],
    categories: data.categories || [],
    units: data.units || [],
    employees: data.employees || [],
    outlets: data.outlets || [],
    stakeholders: data.stakeholders || [],
    warehouses: data.warehouses || [],
  };

  const activeSection = catalogSections.find((item) => item.key === activeKey);

  return (
    <StockManagerLayout>
    <main className="p-4 space-y-4">
      <section className="bg-white border rounded-xl shadow-sm p-4">
        <h1 className="text-xl font-bold text-gray-800">
          Catalog Management
        </h1>
        <p className="text-sm text-gray-500">
          Manage catalog products, brands, categories, employees, outlets,
          units, stakeholders, warehouses and product barcodes.
        </p>
      </section>

      <section className="flex gap-2 overflow-x-auto pb-2">
        {catalogSections.map((section) => (
          <button
            key={section.key}
            type="button"
            onClick={() => setActiveKey(section.key)}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap ${
              activeKey === section.key
                ? 'bg-blue-600 text-white'
                : 'bg-white border text-gray-700 hover:bg-gray-100'
            }`}
          >
            {section.title}
          </button>
        ))}
      </section>

      {activeSection && (
        <CatalogCrudSection
          title={activeSection.title}
          entity={activeSection.entity}
          fields={activeSection.fields}
          catalogOptions={catalogOptions}
        />
      )}
    </main>
    </StockManagerLayout>
  );
};

export default StockManagerCatalogPage;
