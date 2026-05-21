const isBlank = (value) => value === undefined || value === null || value === '';

const compareText = (left, right) =>
  String(left || '').localeCompare(String(right || ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  });

const compareNumbers = (left, right) => {
  const leftNumber = Number(left);
  const rightNumber = Number(right);

  if (!Number.isFinite(leftNumber) || !Number.isFinite(rightNumber)) {
    return compareText(left, right);
  }

  return leftNumber - rightNumber;
};

const compareDates = (left, right) => {
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();

  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) {
    return compareText(left, right);
  }

  return leftTime - rightTime;
};

const compareValues = (left, right, type = 'text') => {
  if (isBlank(left) && isBlank(right)) return 0;
  if (isBlank(left)) return 1;
  if (isBlank(right)) return -1;

  if (type === 'number') return compareNumbers(left, right);
  if (type === 'date') return compareDates(left, right);

  return compareText(left, right);
};

export const getNextSortConfig = (currentConfig, key) => ({
  key,
  direction:
    currentConfig.key === key && currentConfig.direction === 'asc' ? 'desc' : 'asc',
});

export const sortRows = (rows, sortConfig, columns) => {
  const column = columns.find((item) => item.key === sortConfig.key);
  if (!column) return rows;

  return [...rows].sort((left, right) => {
    const result = compareValues(
      column.getValue(left),
      column.getValue(right),
      column.type
    );

    return sortConfig.direction === 'asc' ? result : -result;
  });
};
