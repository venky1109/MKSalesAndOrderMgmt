import { useDispatch, useSelector } from "react-redux";
import { Link } from 'react-router-dom';
import { logout ,getPosUserBalance} from "../features/auth/posUserSlice";
import logo from "../assests/ManaKiranaLogo1024x1024.png";
import { useState, useMemo,useEffect } from "react";

function HeaderPOS({ onSidebarToggle }) {
  const dispatch = useDispatch();
 const posUserInfo = useSelector((state) => state.posUser.userInfo);
  const name = posUserInfo?.username || '';
  // console.log(posUserInfo._id)
  // const balance = userInfo?.balance ?? 0; // ← balance from login payload or subsequent updates
    const [balance, setBalance] = useState(posUserInfo?.balance ?? 0);

  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
  if (posUserInfo?.balance !== undefined) {
    setBalance(posUserInfo.balance);
  }
}, [posUserInfo?.balance]);


  // Format Rupees nicely
  const earningsText = useMemo(() => {
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(balance);
    } catch {
      // Fallback if Intl fails
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
  // console.log(posUserInfo)
  if (newState && posUserInfo?._id) {
    // dispatch(getPosUserBalance(posUserInfo._id,posUserInfo.token)); // updates Redux
    dispatch(getPosUserBalance());

  }
};

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

        {/* Right side: Greeting + Earnings + Logout */}
        <div className="flex items-center space-x-4">
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
              <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-50">
                <div className="p-2 border-b text-gray-700 font-medium">Hi {name}</div>
                <div className="px-4 py-2 text-sm text-green-800 bg-green-50 border-b">
                  <div className="font-medium">Earnings</div>
                  <div className="font-bold">{earningsText}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-100"
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
