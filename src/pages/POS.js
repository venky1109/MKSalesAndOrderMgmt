import POSLayout from '../layouts/POSLayout'
// import Footer from '../components/Footer';
import BillingSection from '../components/BillingSection';
// import ProductList from '../components/ProductList';


function POS() {
  return (
    <div className="flex flex-col h-screen">
  <POSLayout>
    <main className="flex flex-col md:flex-row flex-1 overflow-hidden">
      
      {/* Billing Left - 80% height */}
      <div className="w-full md:w-1/2 border-b md:border-b-0 md:border-r overflow-y-auto  md:h-full">
        <BillingSection />
      </div>
{/* 
     
      <div className="w-full md:w-1/2 overflow-y-auto bg-gray-50 h-[20vh] md:h-full">
        <ProductList />
      </div> */}

    </main>
  </POSLayout>
</div>

  );
}

export default POS;
