import React from 'react';

const PaymentResultCard = ({
  accent = 'green',
  icon,
  title,
  description,
  rows = [],
  children,
}) => {
  const tone = {
    green: {
      text: 'text-green-600',
      panel: 'bg-green-50',
    },
    red: {
      text: 'text-red-600',
      panel: 'bg-red-50',
    },
  }[accent] || {
    text: 'text-gray-700',
    panel: 'bg-gray-50',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="text-center">
          {icon ? <div className="mb-2 text-5xl">{icon}</div> : null}
          <h2 className={`text-xl font-bold ${tone.text}`}>{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          ) : null}
        </div>

        <div className={`mt-5 space-y-3 rounded-lg ${tone.panel} p-4 text-sm`}>
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4">
              <span className="text-gray-500">{row.label}</span>
              <span
                className={`${
                  row.alignRight ? 'text-right ' : ''
                }break-all font-semibold ${row.valueClassName || ''}`}
              >
                {row.value || '-'}
              </span>
            </div>
          ))}
        </div>

        {children}
      </div>
    </div>
  );
};

export default PaymentResultCard;
