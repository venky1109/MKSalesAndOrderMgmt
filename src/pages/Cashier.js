function Cashier() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 to-yellow-200 p-10">
      <h1 className="text-4xl font-bold text-yellow-700 mb-6">💳 POS Billing Screen</h1>
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <p className="text-gray-700">Scan or search product to begin billing.</p>
        <input
          type="text"
          placeholder="Scan or enter barcode..."
          className="mt-4 w-full border border-yellow-400 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />
      </div>
    </div>
  );
}
export default Cashier;
