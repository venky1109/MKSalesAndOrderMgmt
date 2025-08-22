// 📁 src/components/HeaderPOS.jsx
import { useDispatch, useSelector } from "react-redux";
import { Link } from 'react-router-dom';
import { logout, getPosUserBalance } from "../features/auth/posUserSlice";
import { publishQueuedOrdersSequential } from "../features/orders/orderSlice"; // 👈 add this
import logo from "../assests/ManaKiranaLogo1024x1024.png";
import { useState, useMemo, useEffect } from "react";
import { pingBackend } from "../utils/network";

function HeaderPOS({ onSidebarToggle }) {
  const dispatch = useDispatch();
  const posUserInfo = useSelector((state) => state.posUser.userInfo);
  const token = posUserInfo?.token;
  const name = posUserInfo?.username || '';

  // queue/publish state from orders slice
  const queueCount = useSelector((s) => s.orders?.queueCount ?? 0);
  const publishStatus = useSelector((s) => s.orders?.publishStatus || 'idle');
  const isPublishing = publishStatus === 'loading';

  // balance
  const [balance, setBalance] = useState(posUserInfo?.balance ?? 0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    if (posUserInfo?.balance !== undefined) setBalance(posUserInfo.balance);
  }, [posUserInfo?.balance]);

  const earningsText = useMemo(() => {
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(balance);
    } catch {
      return `₹${Number(balance).toLocaleString('en-IN')}`;
    }
  }, [balance]);

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem("posUserInfo");
    window.location.href = "/login";
  };

  const handleMenuToggle = () => {
    const newState = !showMobileMenu;
    setShowMobileMenu(newState);
    if (newState && posUserInfo?._id) {
      dispatch(getPosUserBalance());
    }
  };

  const handlePublish = async () => {
     if (!navigator.onLine) {
  alert('⚠️ No network. Connect to the internet to publish orders.');
    return;
  }
   const ok = await pingBackend(undefined, 2000, token); 
    if (!ok) {
    alert('⚠️ Backend unreachable. Check the API server and try again.');
    return;
  }
    if (!queueCount) return;
    try {
      const res = await dispatch(publishQueuedOrdersSequential({ token })).unwrap();
      setShowMobileMenu(false);
      alert(
        res?.published
          ? `✅ Published ${res.published} order(s).${res.failed ? ` ${res.failed} failed.` : ''}`
          : 'No queued orders to publish.'
      );
    } catch (e) {
      alert('❌ Publish failed: ' + (e?.message || e));
    }
  };

  const publishBtnClasses =
    `relative px-3 py-1 rounded-md text-white transition
     ${queueCount && !isPublishing ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'}`;

  return (
    <header className="bg-white shadow-md p-3 sticky top-0 z-50">
      <div className="flex justify-between items-center">
        {/* Logo and Title */}
        <div className="flex items-center space-x-3">
          <Link to="/pos">
            <img
              src={logo}
              alt="ManaKirana Logo"
              className="h-10 w-10 rounded-full object-cover"
            />
          </Link>
          <h1 className="text-lg md:text-xl font-bold text-green-700">
            {process.env.REACT_APP_SHOP_NAME || "ManaKirana"} POS
          </h1>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Publish Orders (desktop) */}
          <button
            onClick={handlePublish}
            disabled={isPublishing || !queueCount || !navigator.onLine}
            // className={publishBtnClasses}
            className={`hidden md:inline-flex ${publishBtnClasses}`}
            title={
              !navigator.onLine
                ? 'Offline – connect to publish'
                : queueCount
                ? 'Publish queued orders'
                : 'No queued orders'
            }
          >
            {isPublishing ? 'Publishing…' : 'Publish Orders'}
            {queueCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center text-xs bg-white text-indigo-700 rounded-full w-6 h-6">
                {queueCount}
              </span>
            )}
          </button>

          {/* Earnings pill (desktop) */}
          <div className="hidden md:flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-semibold">
            <span className="mr-2">Earnings</span>
            <span className="font-bold">{earningsText}</span>
          </div>

          {/* Greeting (desktop) */}
          <span className="hidden md:inline text-gray-800 font-medium">Hi {name}</span>

          {/* Logout (desktop) */}
          <button
            onClick={handleLogout}
            className="hidden md:inline bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
          >
            Logout
          </button>

          {/* Mobile Menu */}
          <div className="md:hidden relative">
            <button
              className="text-2xl"
              onClick={handleMenuToggle}
              aria-label="Toggle Mobile Menu"
            >
              ☰
            </button>
            {showMobileMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white border rounded shadow-lg z-50">
                <div className="p-2 border-b text-gray-700 font-medium">Hi {name}</div>

                {/* Publish Orders (mobile) */}
                <button
                  onClick={handlePublish}
                  disabled={isPublishing || !queueCount || !navigator.onLine}
                  className={`w-full text-left px-4 py-2 text-md bg-indigo-50 ${queueCount ? 'text-indigo-700 hover:bg-indigo-100' : 'text-gray-400 cursor-not-allowed'}`}
                >
                  {isPublishing ? 'Publishing…' : `Publish Orders : ${queueCount ? ` [${queueCount}]` : '0'}`}
                </button>

                <div className="px-4 py-2 text-sm text-green-800 bg-green-50 border-y">
                <div className="flex items-baseline font-medium gap-2">
  <div>Earnings:</div>
  <div className="font-bold">{earningsText}</div>
</div>

                  {/* <div className="font-bold">{earningsText}</div> */}
                </div>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-red-700 bg-red-50 hover:bg-red-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default HeaderPOS;
