// src/layouts/POSLayout.jsx
import React from "react";
import HeaderPOS from "../components/HeaderPOS";
import Footer from "../components/Footer"

const POSLayout = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header stays on top */}
      <HeaderPOS />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-2 sm:p-4">
        {children}
      </main>
      <Footer/>
    </div>
  );
};

export default POSLayout;
