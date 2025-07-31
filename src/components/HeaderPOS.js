import { useDispatch, useSelector } from "react-redux";
import { Link } from 'react-router-dom';
import { logout } from "../features/auth/posUserSlice";
import logo from "../assests/ManaKiranaLogo1024x1024.png";
import { useState } from "react";

function HeaderPOS({ onSidebarToggle }) {
  const dispatch = useDispatch();
  const name = useSelector((state) => state.posUser.userInfo?.username);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem("posUserInfo");
    window.location.href = "/login";
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

        {/* Right side: Greeting + Logout */}
        <div className="flex items-center space-x-4">
          {/* Desktop View */}
          <span className="hidden md:inline text-gray-800 font-medium"> Hi {name}</span>
          <button
            onClick={handleLogout}
            className="hidden md:inline bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
          >
           Logout
          </button>

          {/* Mobile View - Hamburger */}
          <div className="md:hidden relative">
            <button
              className="text-2xl"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label="Toggle Mobile Menu"
            >
              ☰
            </button>
            {showMobileMenu && (
              <div className="absolute right-0 mt-2 w-44 bg-white border rounded shadow-lg z-50">
                <div className="p-2 border-b text-gray-700 font-medium">Hi {name}</div>
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
