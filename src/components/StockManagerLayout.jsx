import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  CircleDollarSign,
  ClipboardList,
  LogOut,
  LayoutDashboard,
  Package,
  BookImage,
  ShoppingCart,
  ShoppingBag,
  Truck,
  UserCircle,
  ExternalLink,
} from 'lucide-react';
import { logout } from '../features/auth/posUserSlice';
import logo from '../assests/ManaKiranaLogo1024x1024.png';

const navLinkClass = ({ isActive }) =>
  `block rounded-lg px-4 py-2 text-sm font-medium ${
    isActive
      ? 'bg-blue-100 text-blue-800'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  }`;

const navItemClass = 'flex items-center gap-2 font-medium';
const navGroupClass =
  'px-2 pt-2 text-[11px] font-bold uppercase tracking-wide text-gray-400';

const StockManagerLayout = ({ children }) => {
  const dispatch = useDispatch();
  const userInfo = useSelector((state) => state.posUser?.userInfo);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    window.location.replace('/login');
  };

  return (
    <main className="h-screen overflow-hidden bg-gray-100">
      <section className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="ManaKirana"
              className="h-9 w-9 rounded-full object-cover"
              draggable="false"
            />
            <div>
              <h2 className="text-xl font-bold">ManaKirana Ecosystem</h2>
              <p className="text-sm text-gray-500">
                Stock, purchases and dispatch in one place
              </p>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((open) => !open)}
              className="flex h-11 min-w-[132px] items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <UserCircle size={22} />
              <span className="hidden max-w-[160px] truncate sm:inline">
                {userInfo?.username || 'Profile'}
              </span>
            </button>

            {profileOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                <div className="border-b px-3 py-2">
                  <div className="truncate text-sm font-bold text-gray-900">
                    {userInfo?.username || 'User'}
                  </div>
                  <div className="truncate text-xs text-gray-500">
                    {userInfo?.role || '-'} {userInfo?.location ? `| ${userInfo.location}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid h-[calc(100vh-73px)] grid-cols-1 md:grid-cols-[230px_1fr]">
        <aside className="hidden overflow-y-auto bg-white border-r p-4 md:block">
          <nav className="space-y-2 text-sm">
            <NavLink to="/inventory/dashboard" className={navLinkClass}>
              <div className={navItemClass}>
                <LayoutDashboard size={18} /> Dashboard
              </div>
            </NavLink>

            <div className={navGroupClass}>Catalog</div>
            <NavLink to="/ecosystem/catalog" className={navLinkClass}>
              <div className={navItemClass}>
                <BookImage size={18} /> Catalog
              </div>
            </NavLink>

            <div className={navGroupClass}>Inventory</div>
            <NavLink to="/ecosystem" end className={navLinkClass}>
              <div className={navItemClass}>
                <Package size={18} /> Ecosystem
              </div>
            </NavLink>
            <NavLink to="/ecosystem/purchase-orders/create" className={navLinkClass}>
              <div className={navItemClass}>
                <ClipboardList size={18} />
                Purchase Orders
              </div>
            </NavLink>
            <NavLink to="/ecosystem/dispatch" className={navLinkClass}>
              <div className={navItemClass}>
                <Truck size={18} />
                Dispatch
              </div>
            </NavLink>

            <div className={navGroupClass}>Accounts</div>
            <NavLink
              to={{ pathname: '/accounts/finance', search: '?from=inventory' }}
              className={navLinkClass}
            >
              <div className={navItemClass}>
                <CircleDollarSign size={18} />
                Finance
              </div>
            </NavLink>

            <div className={navGroupClass}>Applications</div>
            <NavLink
              to={{ pathname: '/pos', search: '?from=inventory' }}
              className={navLinkClass}
            >
              <div className={navItemClass}>
                <ShoppingCart size={18} />
                POS
              </div>
            </NavLink>
            <NavLink to="/orders/manage" className={navLinkClass}>
              <div className={navItemClass}>
                <ShoppingBag size={18} />
                Order Management
              </div>
            </NavLink>
            <NavLink to="/packing" className={navLinkClass}>
              <div className={navItemClass}>
                <Package size={18} />
                Packing
              </div>
            </NavLink>
            <NavLink to="/dispatch" className={navLinkClass}>
              <div className={navItemClass}>
                <Truck size={18} />
                Dispatch
              </div>
            </NavLink>
            <NavLink to="/delivery" className={navLinkClass}>
              <div className={navItemClass}>
                <Truck size={18} />
                Delivery
              </div>
            </NavLink>
            <NavLink to="/applications/pwa" className={navLinkClass}>
              <div className={navItemClass}>
                <ExternalLink size={18} />
                PWA
              </div>
            </NavLink>
          </nav>
        </aside>

        <section className="overflow-y-auto p-4 pb-10 md:p-6 md:pb-12">{children}</section>
      </section>
    </main>
  );
};

export default StockManagerLayout;
