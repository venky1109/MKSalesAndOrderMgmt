// src/layouts/POSLayout.jsx
import React from "react";
import HeaderPOS from "../components/HeaderPOS";

const POSLayout = ({ children }) => {
  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-100 overflow-hidden">
      {/* Header stays on top */}
      <div className="md:hidden shrink-0">
        <HeaderPOS />
      </div>

      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-hidden p-0 md:p-0">
        {children}
      </main>
    </div>
  );
};

export default POSLayout;