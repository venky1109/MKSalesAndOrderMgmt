import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  CircleDollarSign,
  ClipboardList,
  ReceiptText,
  LogOut,
  LayoutDashboard,
  Package,
  BookImage,
  ShoppingCart,
  ShoppingBag,
  Truck,
  UserCircle,
  ExternalLink,
  PackagePlus,
  Warehouse,
  MonitorPlay,
  RotateCcw,
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

const navSections = [
  {
    items: [
      { to: '/inventory/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Catalog',
    items: [{ to: '/ecosystem/catalog', label: 'Catalog', icon: BookImage }],
  },
  {
    title: 'Inventory',
    items: [
      { to: '/ecosystem', label: 'Ecosystem', icon: Package, end: true },
      {
        to: '/ecosystem/purchase-orders/create',
        label: 'Purchase Orders',
        icon: ClipboardList,
      },
      { to: '/ecosystem/stock', label: 'Stock', icon: Warehouse },
      { to: '/ecosystem/dispatch', label: 'Dispatch', icon: Truck },
      { to: '/ecosystem/rollback', label: 'Rollback', icon: RotateCcw },
    ],
  },
  {
    title: 'Accounts',
    items: [
      {
        to: { pathname: '/accounts/finance', search: '?from=inventory' },
        label: 'Finance',
        icon: CircleDollarSign,
      },
      {
        to: '/accounts/bills',
        label: 'Bills & Expenses',
        icon: ReceiptText,
      },
    ],
  },
  {
    title: 'Applications',
    items: [
      {
        to: { pathname: '/pos', search: '?from=inventory' },
        label: 'POS',
        icon: ShoppingCart,
      },
      { to: '/orders/manage', label: 'Order Management', icon: ShoppingBag },
      { to: '/advertisements', label: 'Advertisements', icon: MonitorPlay },
      { to: '/packing', label: 'Packing', icon: Package },
      { to: '/dispatch', label: 'Dispatch', icon: Truck },
      { to: '/delivery', label: 'Delivery', icon: Truck },
      { to: '/applications/migration-helper', label: 'Manual Migration', icon: PackagePlus },
      { to: '/applications/pwa', label: 'PWA', icon: ExternalLink },
    ],
  },
];

const NavigationLinks = ({ onNavigate }) => (
  <nav className="space-y-2 text-sm">
    {navSections.map((section, sectionIndex) => (
      <React.Fragment key={section.title || sectionIndex}>
        {section.title ? <div className={navGroupClass}>{section.title}</div> : null}
        {section.items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={`${section.title || 'main'}-${label}`}
            to={to}
            end={end}
            onClick={onNavigate}
            className={navLinkClass}
          >
            <div className={navItemClass}>
              <Icon size={18} /> {label}
            </div>
          </NavLink>
        ))}
      </React.Fragment>
    ))}
  </nav>
);

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
      <section className="relative z-[100] bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="ManaKirana"
              className="h-11 w-11 rounded-full object-cover"
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
              <div className="absolute right-0 z-[110] mt-2 max-h-[calc(100vh-92px)] w-72 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                <div className="border-b px-3 py-2">
                  <div className="truncate text-sm font-bold text-gray-900">
                    {userInfo?.username || 'User'}
                  </div>
                  <div className="truncate text-xs text-gray-500">
                    {userInfo?.role || '-'} {userInfo?.location ? `| ${userInfo.location}` : ''}
                  </div>
                </div>
                <div className="border-b py-2 md:hidden">
                  <NavigationLinks onNavigate={() => setProfileOpen(false)} />
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
          <NavigationLinks />
        </aside>

        <section className="overflow-y-auto p-4 pb-10 md:p-6 md:pb-12">{children}</section>
      </section>
    </main>
  );
};

export default StockManagerLayout;
