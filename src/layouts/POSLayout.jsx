// src/layouts/POSLayout.jsx
import React from "react";
// import Sidebar from "../components/Sidebar";
import HeaderPOS from "../components/HeaderPOS";

const POSLayout = ({ children }) => {
  // const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} /> */}

      <div className="flex-1 bg-gray-100">
        <HeaderPOS />
        <main className="p-4">{children}</main>
      </div>
    </div>
  );
};

export default POSLayout;
