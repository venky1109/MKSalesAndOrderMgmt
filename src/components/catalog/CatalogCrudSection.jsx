import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  fetchCatalogEntity,
  createCatalogEntity,
  updateCatalogEntity,
  deleteCatalogEntity,
} from '../../features/inventory/catalogCrudSlice';

const emptyFromFields = (fields) =>
  fields.reduce((acc, field) => {
    acc[field.name] = field.type === 'checkbox' ? false : '';
    return acc;
  }, {});

const formatDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleString();
};

const entityCodeConfig = {
  products: { field: 'product_code', prefix: 'MKP' },
  warehouses: { field: 'warehouse_code', prefix: 'MKW' },
  brands: { field: 'brand_code', prefix: 'MKB' },
  categories: { field: 'category_code', prefix: 'MKC' },
  outlets: { field: 'unit_code', prefix: 'MKO' },
  stakeholders: { field: 'stackholder_code', prefix: 'MKS' },
  units: { field: 'unit_code', prefix: 'MKU' },
  employees: { field: 'emp_code', prefix: 'MKE' },
};

const getNextReadableCode = (rows = [], codeField, prefix) => {
  let max = 0;

  rows.forEach((row) => {
    const code = String(row?.[codeField] || '').trim();

    if (code.startsWith(prefix)) {
      const num = parseInt(code.replace(prefix, ''), 10);
      if (!Number.isNaN(num)) max = Math.max(max, num);
    }
  });

  return `${prefix}${String(max + 1).padStart(3, '0')}`;
};

const makeMkBarcode = ({
  product_id,
  brand_id,
  category_id,
  unit_id,
  quantity,
}) => {
  const pad = (num, size) => String(num || '').padStart(size, '0');

  return (
    '890' +
    pad(product_id, 4) +
    pad(brand_id, 3) +
    pad(category_id, 2) +
    pad(unit_id, 2) +
    pad(parseInt(quantity || 0, 10), 3)
  );
};

const SuggestionInput = ({
  field,
  value,
  options = [],
  getOptionLabel,
  onChange,
  required,
  disabled,
}) => {
  const wrapperRef = useRef(null);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);

  const selectedItem = useMemo(
    () =>
      options.find(
        (item) => String(item[field.valueKey]) === String(value ?? '')
      ),
    [options, field.valueKey, value]
  );

  useEffect(() => {
    if (selectedItem) {
      setText(getOptionLabel(field, selectedItem));
    }
  }, [selectedItem, field, getOptionLabel]);

  useEffect(() => {
    if (!value) {
      setText('');
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const q = text.trim().toLowerCase();

    if (!q) return options.slice(0, 30);

    return options
      .filter((item) =>
        getOptionLabel(field, item).toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [options, text, field, getOptionLabel]);

  const handleSelect = (item) => {
    onChange(field.name, item[field.valueKey]);
    setText(getOptionLabel(field, item));
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={text}
        required={required}
        disabled={disabled}
        placeholder={`Type ${field.label}`}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        className="border rounded-lg px-3 py-2 text-sm w-full disabled:bg-gray-100"
      />

      {open && !disabled && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-white shadow-lg">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((item) => (
              <button
                key={item[field.valueKey]}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(item)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
              >
                {getOptionLabel(field, item)}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              No matching records
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CatalogCrudSection = ({
  title,
  entity,
  idKey = 'id',
  fields,
  catalogOptions = {},
}) => {
  const dispatch = useDispatch();

  const { data = {}, loading } = useSelector(
    (state) => state.catalogCrud || {}
  );

  const rows = useMemo(() => data[entity] || [], [data, entity]);
  const codeConfig = entityCodeConfig[entity];

  const getInitialForm = useCallback(() => {
    const empty = emptyFromFields(fields);

    if (codeConfig) {
      empty[codeConfig.field] = getNextReadableCode(
        rows,
        codeConfig.field,
        codeConfig.prefix
      );
    }

    return empty;
  }, [fields, codeConfig, rows]);

  const [form, setForm] = useState(() => getInitialForm());
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: idKey,
    direction: 'asc',
  });

  useEffect(() => {
    dispatch(fetchCatalogEntity(entity));
  }, [dispatch, entity]);

  useEffect(() => {
    setForm(getInitialForm());
    setEditingId(null);
    setSearch('');
    setSortConfig({
      key: idKey,
      direction: 'asc',
    });
  }, [getInitialForm, entity, idKey]);

  useEffect(() => {
    if (!codeConfig || editingId) return;

    setForm((prev) => ({
      ...prev,
      [codeConfig.field]: getNextReadableCode(
        rows,
        codeConfig.field,
        codeConfig.prefix
      ),
    }));
  }, [rows, codeConfig, editingId]);

  const handleChange = useCallback(
    (name, value) => {
      setForm((prev) => {
        const next = { ...prev, [name]: value };

        if (
          entity === 'product-barcodes' &&
          ['product_id', 'brand_id', 'category_id', 'unit_id', 'quantity'].includes(
            name
          )
        ) {
          next.mk_barcode = makeMkBarcode(next);
        }

        return next;
      });
    },
    [entity]
  );

  const resetForm = () => {
    setForm(getInitialForm());
    setEditingId(null);
  };

  const buildPayload = () => {
    const payload = {};

    fields.forEach((field) => {
      if (field.name !== 'id') {
        payload[field.name] =
          form[field.name] === '' ? null : form[field.name];
      }
    });

    return payload;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = buildPayload();

    if (editingId) {
      dispatch(updateCatalogEntity({ entity, id: editingId, payload }));
    } else {
      dispatch(createCatalogEntity({ entity, payload }));
    }

    resetForm();
  };

  const handleEdit = (row) => {
    const nextForm = {};

    fields.forEach((field) => {
      nextForm[field.name] =
        row[field.name] ?? (field.type === 'checkbox' ? false : '');
    });

    setForm(nextForm);
    setEditingId(row[idKey]);
  };

  const handleDelete = (row) => {
    if (window.confirm(`Delete this ${title}?`)) {
      dispatch(deleteCatalogEntity({ entity, id: row[idKey] }));
    }
  };

  const getOptionLabel = useCallback((field, item) => {
    if (!item) return '';

    if (field.optionsKey === 'products') {
      return `${item.product_name_eng || ''} ${
        item.product_code ? `(${item.product_code})` : ''
      }`.trim();
    }

    if (field.optionsKey === 'brands') {
      return `${item.brand_name_english || ''} ${
        item.brand_code ? `(${item.brand_code})` : ''
      }`.trim();
    }

    if (field.optionsKey === 'categories') {
      return `${item.category_name_english || ''} ${
        item.category_code ? `(${item.category_code})` : ''
      }`.trim();
    }

    if (field.optionsKey === 'units') {
      return `${item.unit_name || ''} ${
        item.unit_short_code ? `(${item.unit_short_code})` : ''
      }`.trim();
    }

    return item[field.labelKey] || item.name || item.id || '';
  }, []);

  const getCellValue = useCallback(
    (row, field) => {
      const value = row[field.name];

      if (entity === 'employees' && field.name === 'first_name') {
        return `${row.first_name || ''} ${row.last_name || ''}`.trim();
      }

      if (entity === 'product-barcodes') {
        if (field.name === 'product_id') {
          return `${row.product_name_eng || row.product_id || ''} ${
            row.product_code ? `(${row.product_code})` : ''
          }`.trim();
        }

        if (field.name === 'brand_id') {
          return row.brand_name_english || row.brand_id || '';
        }

        if (field.name === 'category_id') {
          return row.category_name_english || row.category_id || '';
        }

        if (field.name === 'unit_id') {
          return `${row.unit_name || row.unit_id || ''} ${
            row.unit_short_code ? `(${row.unit_short_code})` : ''
          }`.trim();
        }
      }

      if (field.type === 'checkbox') {
        return value ? 'true' : 'false';
      }

      if (field.name === 'created_at' || field.name === 'updated_at') {
        return formatDate(value);
      }

      return value ?? '';
    },
    [entity]
  );

  const visibleTableFields = useMemo(
    () =>
      fields.filter((field) => {
        if (entity === 'employees' && field.name === 'last_name') return false;
        return true;
      }),
    [fields, entity]
  );

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase();

    return rows.filter((row) =>
      Object.values(row).some((value) =>
        String(value ?? '').toLowerCase().includes(q)
      )
    );
  }, [rows, search]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }

      return {
        key,
        direction: 'asc',
      };
    });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const sortedRows = useMemo(() => {
    const list = [...filteredRows];

    list.sort((a, b) => {
      const field = visibleTableFields.find(
        (item) => item.name === sortConfig.key
      );

      const aValue =
        sortConfig.key === idKey
          ? a[idKey]
          : getCellValue(a, field || { name: sortConfig.key });

      const bValue =
        sortConfig.key === idKey
          ? b[idKey]
          : getCellValue(b, field || { name: sortConfig.key });

      if (aValue === null || aValue === undefined || aValue === '') return 1;
      if (bValue === null || bValue === undefined || bValue === '') return -1;

      const aDate = Date.parse(aValue);
      const bDate = Date.parse(bValue);

      const aNum = Number(aValue);
      const bNum = Number(bValue);

      let result = 0;

      if (
        String(sortConfig.key).includes('date') ||
        sortConfig.key === 'created_at' ||
        sortConfig.key === 'updated_at'
      ) {
        result =
          (Number.isNaN(aDate) ? 0 : aDate) -
          (Number.isNaN(bDate) ? 0 : bDate);
      } else if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        result = aNum - bNum;
      } else {
        result = String(aValue).localeCompare(String(bValue), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }

      return sortConfig.direction === 'asc' ? result : -result;
    });

    return list;
  }, [filteredRows, sortConfig, idKey, visibleTableFields, getCellValue]);

  return (
    <section className="bg-white rounded-xl shadow-sm border p-4 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <p className="text-sm text-gray-500">
            Create, update, view and delete {title}
          </p>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${title}`}
          className="border rounded-lg px-3 py-2 text-sm w-full md:w-64"
        />
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-4 gap-3"
      >
        {fields.map((field) => {
          const isAutoCodeField =
            codeConfig && field.name === codeConfig.field;

          return (
            <div key={field.name}>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {field.label}
              </label>

              {field.type === 'select' ? (
                <SuggestionInput
                  field={field}
                  value={form[field.name]}
                  options={catalogOptions[field.optionsKey] || []}
                  getOptionLabel={getOptionLabel}
                  onChange={handleChange}
                  required={field.required}
                  disabled={field.readOnly || isAutoCodeField}
                />
              ) : field.type === 'checkbox' ? (
                <input
                  type="checkbox"
                  checked={Boolean(form[field.name])}
                  onChange={(e) => handleChange(field.name, e.target.checked)}
                  disabled={field.readOnly || isAutoCodeField}
                  className="mt-3"
                />
              ) : (
                <input
                  type={field.type || 'text'}
                  value={form[field.name] ?? ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  required={field.required}
                  readOnly={field.readOnly || isAutoCodeField}
                  className={`border rounded-lg px-3 py-2 text-sm w-full ${
                    field.readOnly || isAutoCodeField
                      ? 'bg-gray-100 text-gray-700 font-semibold'
                      : ''
                  }`}
                  placeholder={field.label}
                />
              )}

              {isAutoCodeField && !editingId && (
                <p className="text-[11px] text-green-600 mt-1">
                  Auto generated next code
                </p>
              )}
            </div>
          );
        })}

        {entity === 'product-barcodes' && (
          <div className="flex items-end">
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  mk_barcode: makeMkBarcode(prev),
                }))
              }
              className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm"
            >
              Generate MK Barcode
            </button>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
          >
            {editingId ? 'Update' : 'Create'}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-200 px-4 py-2 rounded-lg text-sm"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="overflow-auto border rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th
                onClick={() => handleSort(idKey)}
                className="text-left px-3 py-2 border-b cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap"
              >
                ID {getSortIcon(idKey)}
              </th>

              {visibleTableFields.map((field) => (
                <th
                  key={field.name}
                  onClick={() => handleSort(field.name)}
                  className="text-left px-3 py-2 border-b cursor-pointer select-none hover:bg-gray-100 whitespace-nowrap"
                >
                  {field.label} {getSortIcon(field.name)}
                </th>
              ))}

              <th className="text-right px-3 py-2 border-b">Actions</th>
            </tr>
          </thead>

          <tbody>
            {sortedRows.map((row) => (
              <tr key={row[idKey]} className="hover:bg-gray-50">
                <td className="px-3 py-2 border-b">{row[idKey]}</td>

                {visibleTableFields.map((field) => (
                  <td
                    key={field.name}
                    className={`px-3 py-2 border-b ${
                      codeConfig?.field === field.name
                        ? 'font-semibold text-blue-700'
                        : ''
                    }`}
                  >
                    {String(getCellValue(row, field))}
                  </td>
                ))}

                <td className="px-3 py-2 border-b text-right space-x-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(row)}
                    className="text-blue-600"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(row)}
                    className="text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {!loading && sortedRows.length === 0 && (
              <tr>
                <td
                  colSpan={visibleTableFields.length + 2}
                  className="text-center text-gray-500 px-3 py-6"
                >
                  No records found
                </td>
              </tr>
            )}

            {loading && (
              <tr>
                <td
                  colSpan={visibleTableFields.length + 2}
                  className="text-center text-gray-500 px-3 py-6"
                >
                  Loading...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default CatalogCrudSection;
