import POSLayout from "../layouts/POSLayout";
import BillingSection from "../components/BillingSection";
import ProductList from "../components/ProductList";
import POSActionsBar from "../components/POSActionBar";
import Footer from "../components/Footer";

function POS() {
  return (
    <div className="h-screen overflow-hidden bg-[#efefef] p-1 md:p-2">
      <POSLayout>
        <main
          className="
            h-full min-h-0
            flex flex-col overflow-hidden
            md:grid md:grid-cols-[minmax(0,1.7fr)_88px_minmax(0,1.1fr)] md:gap-2
          "
        >
          {/* Billing */}
          <section className="min-h-0 min-w-0 flex flex-col overflow-hidden rounded-md border border-black/10 bg-white">
            <div className="min-h-0 flex-1 overflow-hidden">
              <BillingSection />
            </div>

            <div className="shrink-0 border-t bg-white">
              <Footer />
            </div>
          </section>

          {/* Actions */}
          <section
            className="
              fixed bottom-0 left-0 right-0 z-50
              border-t border-black/10 bg-white
              shadow-[0_-2px_10px_rgba(0,0,0,0.08)]
              md:static md:min-h-0 md:h-full md:w-full
              md:overflow-hidden md:rounded-md md:border md:bg-white
              md:shadow-none
            "
          >
            <POSActionsBar />
          </section>

          {/* Products */}
          <section
            className="
              hidden md:flex
              min-h-0 min-w-0
              flex-col overflow-hidden
              rounded-md border border-black/10 bg-gray-50
            "
          >
            <ProductList />
          </section>
        </main>
      </POSLayout>
    </div>
  );
}

export default POS;