import React from 'react';
import { ExternalLink } from 'lucide-react';

import StockManagerLayout from '../components/StockManagerLayout';

const PWA_URL = 'https://www.manakirana.com';
const ONLINE_URL = 'https://manakirana.online';

const PwaLinkPage = () => (
  <StockManagerLayout>
    <main className="space-y-4">
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">ManaKirana PWA</h1>
        <p className="mt-1 text-sm text-gray-500">
          Open the ManaKirana web app from the ecosystem applications menu.
        </p>
      </section>

      <section className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <a
            href={PWA_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"
          >
            <ExternalLink size={18} />
            Open www.manakirana.com
          </a>
          <a
            href={ONLINE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 text-sm font-bold text-white hover:bg-green-700"
          >
            <ExternalLink size={18} />
            Open manakirana.online
          </a>
        </div>
      </section>
    </main>
  </StockManagerLayout>
);

export default PwaLinkPage;
