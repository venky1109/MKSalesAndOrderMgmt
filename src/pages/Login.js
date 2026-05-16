// src/pages/Login.js
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginPosUser } from '../features/auth/posUserSlice';
import { API_BASE_URL } from '../utils/apiConfig';
import logo from '../assests/ManaKiranaLogo1024x1024.png';

const LOCATIONS = ['YANAM','MURAMULLA','GOLLAVELLI','VADAPARRU','UPPALAGUPTHAM'];

const normalizeRole = (role) => String(role || '').trim().toUpperCase();
const normalizeUsername = (value) => String(value || '').trim().toLowerCase();

const readRoleFromPayload = (payload, username) => {
  const normalizedUsername = normalizeUsername(username);
  const users =
    (Array.isArray(payload) && payload) ||
    (Array.isArray(payload?.posUsers) && payload.posUsers) ||
    (Array.isArray(payload?.users) && payload.users) ||
    (Array.isArray(payload?.data) && payload.data) ||
    null;

  if (users) {
    const matchedUser = users.find((user) => normalizeUsername(user?.username) === normalizedUsername);
    return matchedUser?.role || null;
  }

  return (
    payload?.role ||
    payload?.user?.role ||
    payload?.posUser?.role ||
    payload?.data?.role ||
    null
  );
};

const fetchPosUserRole = async (username, signal) => {
  const trimmedUsername = username.trim();
  const encodedUsername = encodeURIComponent(trimmedUsername);

  try {
    const response = await fetch(`${API_BASE_URL}/posusers/role/${encodedUsername}`, {
      cache: 'no-store',
      signal,
    });
    if (!response.ok) return null;

    const data = await response.json().catch(() => null);
    const role = readRoleFromPayload(data, trimmedUsername);
    if (role) return normalizeRole(role);
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
  }

  return null;
};

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('');
  const [fallbackError, setFallbackError] = useState('');
  const [usernameRole, setUsernameRole] = useState(null);
  const dispatch = useDispatch();

  const { userInfo, loading, error } = useSelector((state) => state.posUser);
  const isDirectorLogin = normalizeRole(usernameRole) === 'DIRECTOR';

  const reloadApp = () => {
    window.location.reload();
  };

  useEffect(() => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setUsernameRole(null);
      return undefined;
    }

    const controller = new AbortController();
    const lookupTimer = setTimeout(() => {
      fetchPosUserRole(trimmedUsername, controller.signal)
        .then((role) => {
          setUsernameRole(role);
        })
        .catch((lookupError) => {
          if (lookupError?.name !== 'AbortError') {
            setUsernameRole(null);
          }
        });
    }, 300);

    return () => {
      clearTimeout(lookupTimer);
      controller.abort();
    };
  }, [username]);

  useEffect(() => {
    if (isDirectorLogin) {
      setLocation('');
    }
  }, [isDirectorLogin]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFallbackError('');

    if (!isDirectorLogin && !location) {
      setFallbackError('Please select a location.');
      return;
    }

    dispatch(loginPosUser({ username, password, location: isDirectorLogin ? '' : location }));
  };

  useEffect(() => {
    if (userInfo?.token) {
      const role = userInfo.role;

      if (['ADMIN', 'DIRECTOR'].includes(role)) {
        window.location.replace('/inventory/dashboard');
      } else if (['CASHIER', 'ONLINE_CASHIER', 'HYBRID_CASHIER'].includes(role)) {
        window.location.replace('/pos');
      } else if (role === 'STOCKMANAGER') {
        window.location.replace('/inventory');
      }
      else if (role === 'PACKING_AGENT') {
        window.location.replace('/packing');
      } else if (role === 'DISPATCH_AGENT') {
        window.location.replace('/dispatch');
      } else if (role === 'DELIVERY_AGENT') {
        window.location.replace('/delivery');
      } else {
        setFallbackError('⚠️ Please check your username and password. Role not authorized.');
      }
    }
  }, [userInfo]);

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

        {error && (
          <p className="whitespace-pre-line rounded-lg bg-red-50 p-3 text-center text-sm font-semibold text-red-600">
            {error}
          </p>
        )}
        {fallbackError && <p className="text-red-600 text-center font-semibold">{fallbackError}</p>}

        {(error || fallbackError) && (
          <button
            type="button"
            onClick={reloadApp}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-100"
          >
            Reload App
          </button>
        )}

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

        {!isDirectorLogin && (
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
        )}

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
