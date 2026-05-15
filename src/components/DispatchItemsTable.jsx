import React from 'react';
import {
  formatDispatchDate,
  getDispatchItemBarcode,
  getDispatchItemBrand,
  getDispatchItemCategory,
  getDispatchItemProductName,
  getDispatchItemUnit,
} from '../utils/dispatchDisplay';

const DispatchItemsTable = ({ items = [], emptyColSpan = 8 }) => (
  <tbody>
    {items.map((item) => (
      <tr key={item.id || `${getDispatchItemBarcode(item)}-${item.exp_date}`} className="border-t">
        <td className="px-3 py-2 font-semibold">
          {getDispatchItemProductName(item)}
        </td>

        <td className="px-3 py-2">{getDispatchItemBarcode(item)}</td>

        <td className="px-3 py-2">{getDispatchItemCategory(item)}</td>

        <td className="px-3 py-2">{getDispatchItemBrand(item)}</td>

        <td className="px-3 py-2 text-center">{item.qty}</td>

        <td className="px-3 py-2 text-center">{getDispatchItemUnit(item)}</td>

        <td className="px-3 py-2">{formatDispatchDate(item.exp_date)}</td>

        <td className="px-3 py-2">{item.notes || '-'}</td>
      </tr>
    ))}

    {items.length === 0 && (
      <tr>
        <td colSpan={emptyColSpan} className="px-3 py-5 text-center text-gray-500">
          No items
        </td>
      </tr>
    )}
  </tbody>
);

export default DispatchItemsTable;
