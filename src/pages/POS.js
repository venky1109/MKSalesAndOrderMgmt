import POSLayout from '../layouts/POSLayout'
import Footer from '../components/Footer';
import BillingSection from '../components/BillingSection';
import ProductList from '../components/ProductList';

function POS() {
  return (
    <div className="flex flex-col h-screen">
      <POSLayout >

      <main className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Billing Left */}
        <div className="w-full md:w-1/2 border-b md:border-b-0 md:border-r overflow-y-auto max-h-[50vh] md:max-h-full">
          <BillingSection />
        </div>

        {/* Product List Right */}
        <div className="w-full md:w-1/2 overflow-y-auto bg-gray-50 max-h-[50vh] md:max-h-full">
          <ProductList />
        </div>
      </main>

      <Footer />
      </POSLayout>
    </div>
  );
}

export default POS;
