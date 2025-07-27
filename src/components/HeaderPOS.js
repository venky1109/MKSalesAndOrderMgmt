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
    <header className="bg-gray-200 text-red-800 p-3 shadow-md w-full relative">
      <div className="flex justify-between items-center">
        {/* Logo and Shop Name */}
        <div className="flex items-center space-x-3">
          <Link to="/pos">
            <img
              src={logo}
              alt="ManaKirana Logo"
              className="h-10 w-10 rounded-full object-cover cursor-pointer"
            />
          </Link>
          <h1 className="text-lg md:text-xl font-bold">
            {process.env.REACT_APP_SHOP_NAME || "ManaKirana"} POS
          </h1>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center space-x-4">
          {/* Desktop Greeting and Logout */}
          <span className="hidden md:inline-block font-medium">Hi {name}</span>
          <button
            onClick={handleLogout}
            className="hidden md:inline-block bg-red-800 text-white px-3 py-1 rounded hover:bg-red-700"
          >
            Logout
          </button>

          {/* Hamburger Menu (Mobile only) */}
          <div className="md:hidden relative">
            <button
              className="text-2xl focus:outline-none"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label="Toggle Mobile Menu"
            >
              ☰
            </button>
            {showMobileMenu && (
              <div className="absolute right-0 mt-2 bg-white border rounded shadow-lg w-40 z-50">
                <div className="p-2 border-b font-medium text-gray-700">
                  Hi {name}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-100"
                >
                  🔓 Logout
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
