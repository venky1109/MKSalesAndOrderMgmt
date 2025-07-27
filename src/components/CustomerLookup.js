import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCustomerByPhone, createCustomer } from '../features/customers/customerSlice';

function CustomerLookup({ token, onCustomerFound,reset  }) {
  const dispatch = useDispatch();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  const { customer } = useSelector((state) => state.customers || {});

  useEffect(() => {
  if (customer && !reset) {
    setName(customer.name);
    setEmail(customer.email || '');
    setAddress(customer.address || '');
    setNotFound(false);
    setError('');
    onCustomerFound?.(customer);
  }
}, [customer, onCustomerFound, reset]);

  useEffect(() => {
  if (reset) {
    setPhone('');
    setName('');
    setEmail('');
    setAddress('');
    setNotFound(false);
    setError('');
  }
}, [reset]);

  

  const handlePhoneBlur = async () => {
    if (phone.trim().length >= 10) {
      try {
        await dispatch(fetchCustomerByPhone({ phone, token })).unwrap();
      } catch (err) {
        setNotFound(true);
        setName('');
        setEmail('');
        setAddress('');
        setError('Customer not found. You can add new.');
      }
    }
  };

  const handleSaveIfNotFound = async () => {
    if (notFound && phone) {
      const defaultAddress = address || 'Walk-in';
      try {
        const result = await dispatch(
          createCustomer({
            name: name || 'Walk-in',
            phone,
            email,
            address: defaultAddress,
            token
          })
        ).unwrap();
        onCustomerFound?.(result);
        setNotFound(false);
        setError('');
      } catch (err) {
        setError(err.message || 'Failed to add customer');
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-700">👤 </span>

        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={handlePhoneBlur}
          placeholder="Mobile Number"
          className="px-2 py-1 border border-gray-300 rounded text-sm w-1/4"
          required
        />

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Customer Name (optional)"
          className="px-2 py-1 border border-gray-200 bg-gray-50 rounded text-sm w-1/4"
        />

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
          className="px-2 py-1 border border-gray-200 bg-gray-50 rounded text-sm w-1/4"
        />

        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Address (optional)"
          className="px-2 py-1 border border-gray-200 bg-gray-50 rounded text-sm w-1/4"
        />
      </div>

      {notFound && (
        <button
          onClick={handleSaveIfNotFound}
          className="text-sm text-white bg-blue-500 px-3 py-1 rounded hover:bg-blue-600"
        >
          ➕ Add New Customer
        </button>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}

export default CustomerLookup;
