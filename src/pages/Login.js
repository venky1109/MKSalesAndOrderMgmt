// src/pages/Login.js
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginPosUser } from '../features/auth/posUserSlice';
import { useNavigate } from 'react-router-dom';
import logo from '../assests/ManaKiranaLogo1024x1024.png';

const LOCATIONS = ['YANAM','MURAMULLA','GOLLAVELLI','VADAPARRU','UPPALAGUPTHAM'];

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('');
  const [fallbackError, setFallbackError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { userInfo, loading, error } = useSelector((state) => state.posUser);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFallbackError('');

    if (!location) {
      setFallbackError('Please select a location.');
      return;
    }

    dispatch(loginPosUser({ username, password, location }));
  };

  useEffect(() => {
    if (userInfo?.token) {
      const role = userInfo.role;

      if (['CASHIER', 'ONLINE_CASHIER', 'HYBRID_CASHIER'].includes(role)) {
        navigate('/pos');
      } else if (role === 'PACKING_AGENT') {
        navigate('/packing');
      } else if (role === 'DISPATCH_AGENT') {
        navigate('/dispatch');
      } else if (role === 'DELIVERY_AGENT') {
        navigate('/delivery');
      } else {
        setFallbackError('⚠️ Please check your username and password. Role not authorized.');
      }
    }
  }, [userInfo, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-100 to-green-50 flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md space-y-6"
      >
        <h1 className="text-3xl font-extrabold text-center text-green-700">
          <img
            src={logo}
            alt="logo"
            className="mx-auto mb-2 h-16 w-16 rounded-full object-cover"
          />
          Manakirana <br />
          <span className="text-lg font-medium text-gray-500">Sales & Order Management</span>
        </h1>

        {error && <p className="text-red-600 text-center font-semibold">{error}</p>}
        {fallbackError && <p className="text-red-600 text-center font-semibold">{fallbackError}</p>}

        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
          required
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
          required
        />

        {/* Location Dropdown */}
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 text-sm bg-white text-gray-400"
          required
        >
          <option value="" disabled >Select Location</option>
          {LOCATIONS.map((loc) => (
            <option key={loc} value={loc}>{loc} </option>
          ))}
        </select>

        <button
          type="submit"
          className={`w-full py-3 rounded-lg text-white font-semibold transition duration-300 ${
            loading ? 'bg-blue-green cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
          }`}
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

export default Login;
