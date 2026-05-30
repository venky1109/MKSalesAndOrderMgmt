import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  ImagePlus,
  MonitorPlay,
  Plus,
  Save,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import StockManagerLayout from '../components/StockManagerLayout';
import {
  createAdvertisement,
  createRepository,
  deleteAdvertisement,
  deleteRepository,
  fetchAdvertisements,
  fetchRepositories,
  updateAdvertisement,
  updateRepository,
  uploadAdvertisementMedia,
} from '../features/marketing/advertisementSlice';
import { fetchAllProducts } from '../features/products/productSlice';

const templates = [
  {
    id: 'clearance_sale',
    name: 'Clearance Sale',
    saleType: 'clearance',
    className: 'bg-gradient-to-br from-red-800 via-red-600 to-amber-400 text-white',
    areas: ['hero', 'left', 'right'],
    productsPerSlide: 2,
  },
  {
    id: 'dasara_template',
    name: 'Dasara Festival',
    saleType: 'festival',
    className: 'bg-gradient-to-br from-yellow-300 via-orange-500 to-gray-900 text-white',
    areas: ['hero', 'offer', 'brand'],
    productsPerSlide: 4,
  },
  {
    id: 'brand_spotlight',
    name: 'Brand Spotlight',
    saleType: 'brand',
    className: 'bg-gradient-to-br from-emerald-800 via-green-600 to-yellow-300 text-white',
    areas: ['hero', 'brand', 'product'],
    productsPerSlide: 6,
  },
  {
    id: 'price_blast',
    name: 'Price Blast',
    saleType: 'offer',
    className: 'bg-gradient-to-br from-fuchsia-800 via-rose-600 to-orange-300 text-white',
    areas: ['hero', 'price', 'product'],
    productsPerSlide: 2,
  },
  {
    id: 'fresh_market',
    name: 'Fresh Market',
    saleType: 'fresh',
    className: 'bg-gradient-to-br from-lime-700 via-emerald-500 to-cyan-300 text-white',
    areas: ['hero', 'fresh', 'product'],
    productsPerSlide: 4,
  },
  {
    id: 'premium_gold',
    name: 'Premium Gold',
    saleType: 'premium',
    className: 'bg-gradient-to-br from-zinc-950 via-stone-800 to-yellow-500 text-white',
    areas: ['hero', 'brand', 'product'],
    productsPerSlide: 6,
  },
];

const emptySlide = (sequence = 1) => ({
  title: '',
  description: '',
  product_name: '',
  brand_name: '',
  media_type: 'image',
  media_path: '',
  preview_url: '',
  target_area: 'hero',
  sequence,
  duration_seconds: 6,
  repository_id: '',
  financial_search: '',
  selected_financial: null,
});

const defaultForm = {
  name: '',
  outlet_id: '',
  template: 'clearance_sale',
  sale_type: 'clearance',
  type: 'html',
  priority: 1,
  sequence: 1,
  timer_seconds: 10,
  start_date: '',
  end_date: '',
  status: 'draft',
  generated_video_path: '',
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const getProductBarcodeId = (financial = {}) =>
  [
    financial.product_barcode_id,
    financial.productBarcodeId,
    financial.catalogProductBarcodeId,
    financial.product_barcode_id_fk,
    financial.barcode_id,
    financial.catalog_barcode_id,
    financial.mkid,
  ]
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => String(value ?? '').trim())
    .find(Boolean) || '';

const money = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

const flattenFinancials = (products) =>
  asArray(products).flatMap((product) =>
    asArray(product?.details).flatMap((detail) =>
      asArray(detail?.financials).map((financial) => {
        const quantityText = [financial?.quantity, financial?.units]
          .filter((item) => item !== null && item !== undefined && item !== '')
          .join(' ');

        const mrp = Number(financial?.price || 0);
        const salePrice = Number(financial?.dprice || financial?.price || 0);
        const computedDiscount =
          mrp > 0 && salePrice > 0 && salePrice < mrp
            ? Math.round(((mrp - salePrice) / mrp) * 100)
            : 0;
        const enteredDiscount = Number(financial?.Discount || financial?.discount || 0);

        return {
          key: [product?._id, detail?._id, financial?._id].filter(Boolean).join(':'),
          productId: product?._id || '',
          brandId: detail?._id || '',
          financialId: financial?._id || '',
          productName: product?.name || '',
          category: product?.category || '',
          brandName: detail?.brand || '',
          quantity: financial?.quantity || '',
          units: financial?.units || '',
          quantityText,
          mrp,
          salePrice,
          discountPercent: Math.max(computedDiscount, enteredDiscount),
          discountAmount: Math.max(mrp - salePrice, 0),
          stock: Number(financial?.countInStock || 0),
          barcode: getProductBarcodeId(financial),
          image: detail?.images?.[0]?.image || '',
        };
      })
    )
  );

const getFinancialLabel = (item) =>
  [
    item.productName,
    item.brandName,
    item.quantityText,
    item.salePrice ? money(item.salePrice) : '',
    item.barcode ? `ID ${item.barcode}` : '',
  ]
    .filter(Boolean)
    .join(' | ');

const AdvertisementsPage = () => {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.posUser?.userInfo?.token);
  const products = useSelector((state) => state.products?.all || []);
  const { repositories, items, loading, saving, error, successMessage } = useSelector(
    (state) => state.advertisements || {}
  );
  const [form, setForm] = useState(defaultForm);
  const [slides, setSlides] = useState([emptySlide(1)]);
  const [repoForm, setRepoForm] = useState({
    name: 'Local Advertisement Store',
    type: 'local',
    for_scope: 'advertisement',
    connect_string: '/uploads/advertisements',
  });
  const [editingRepoId, setEditingRepoId] = useState(null);
  const [editingAdId, setEditingAdId] = useState(null);
  const [minimumDiscount, setMinimumDiscount] = useState(5);
  const [productSearch, setProductSearch] = useState('');
  const [tvScreenUrl, setTvScreenUrl] = useState('');

  const activeTemplate = useMemo(
    () => templates.find((template) => template.id === form.template) || templates[0],
    [form.template]
  );
  const financialOptions = useMemo(() => flattenFinancials(products), [products]);
  const previewSlide = slides.find((slide) => slide.product_name || slide.title || slide.media_path) || slides[0];
  const highDiscountProducts = useMemo(
    () =>
      financialOptions
        .filter(
          (item) =>
            item.mrp > 0 &&
            item.salePrice > 0 &&
            item.salePrice < item.mrp &&
            item.discountPercent >= Number(minimumDiscount || 0)
        )
        .sort((a, b) => {
          if (b.discountPercent !== a.discountPercent) {
            return b.discountPercent - a.discountPercent;
          }
          if (b.discountAmount !== a.discountAmount) {
            return b.discountAmount - a.discountAmount;
          }
          return b.stock - a.stock;
        })
        .slice(0, 20),
    [financialOptions, minimumDiscount]
  );
  const displayedProducts = useMemo(() => {
    const query = String(productSearch || '').trim().toLowerCase();
    if (!query) return highDiscountProducts;

    return financialOptions
      .filter((item) =>
        [
          item.productName,
          item.brandName,
          item.quantityText,
          item.barcode,
          item.category,
          item.salePrice,
          item.mrp,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query)
      )
      .sort((a, b) => {
        if (b.discountPercent !== a.discountPercent) {
          return b.discountPercent - a.discountPercent;
        }
        return b.stock - a.stock;
      })
      .slice(0, 30);
  }, [financialOptions, highDiscountProducts, productSearch]);

  useEffect(() => {
    dispatch(fetchRepositories());
    dispatch(fetchAdvertisements());
  }, [dispatch]);

  useEffect(() => {
    if (token) {
      dispatch(fetchAllProducts({ token, localFirst: true }));
    }
  }, [dispatch, token]);

  const updateForm = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const updateSlide = (index, patch) => {
    setSlides((prev) =>
      prev.map((slide, slideIndex) =>
        slideIndex === index ? { ...slide, ...patch } : slide
      )
    );
  };

  const addSlide = () => {
    setSlides((prev) => [...prev, emptySlide(prev.length + 1)]);
  };

  const addMediaSlide = () => {
    setSlides((prev) => [
      ...prev,
      {
        ...emptySlide(prev.length + 1),
        title: 'Brand message',
        target_area: 'media',
      },
    ]);
  };

  const removeSlide = (index) => {
    setSlides((prev) =>
      prev
        .filter((_, slideIndex) => slideIndex !== index)
        .map((slide, slideIndex) => ({ ...slide, sequence: slideIndex + 1 }))
    );
  };

  const handleTemplateSelect = (template) => {
    setForm((prev) => ({
      ...prev,
      template: template.id,
      sale_type: template.saleType,
      name: prev.name || template.name,
    }));
    setSlides((prev) =>
      prev.map((slide, index) => ({
        ...slide,
        target_area: template.areas[index % template.areas.length],
      }))
    );
  };

  const handleFile = async (index, file) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    updateSlide(index, {
      media_type: file.type.startsWith('video') ? 'video' : 'image',
      preview_url: previewUrl,
    });

    try {
      const uploaded = await dispatch(uploadAdvertisementMedia(file)).unwrap();
      updateSlide(index, {
        media_type: uploaded.media_type,
        media_path: uploaded.media_path,
        preview_url: previewUrl,
      });
    } catch (uploadError) {
      alert(`Upload failed: ${uploadError}`);
    }
  };

  const buildAdvertisementPayload = (nextStatus = form.status) => {
    if (!form.name.trim()) {
      return null;
    }

    const details = slides
      .filter((slide) => slide.media_path || slide.title || slide.product_name)
      .map(({ preview_url, financial_search, selected_financial, ...slide }) => ({
        ...slide,
        repository_id: slide.repository_id || null,
        sequence: Number(slide.sequence || 1),
        duration_seconds: Number(slide.duration_seconds || 5),
        metadata: {
          template: form.template,
          target_area: slide.target_area,
          mongo_product_id: selected_financial?.productId || null,
          mongo_brand_id: selected_financial?.brandId || null,
          mongo_financial_id: selected_financial?.financialId || null,
          quantity: selected_financial?.quantity || null,
          units: selected_financial?.units || null,
          mrp: selected_financial?.mrp || null,
          sale_price: selected_financial?.salePrice || null,
          barcode: selected_financial?.barcode || null,
        },
      }));

    const advertisement = {
      ...form,
      status: nextStatus,
      outlet_id: form.outlet_id || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      priority: Number(form.priority || 1),
      sequence: Number(form.sequence || 1),
      timer_seconds: Number(form.timer_seconds || 10),
      generated_video_path:
        form.generated_video_path ||
        `/advertisements/${form.template}-${Date.now()}.mp4`,
      config: {
        template: form.template,
        areas: activeTemplate.areas,
        products_per_slide: activeTemplate.productsPerSlide,
        tv_screen_url: tvScreenUrl.trim() || null,
        slides: details,
      },
    };

    return { advertisement, details };
  };

  const resetAdvertisementForm = () => {
    setForm(defaultForm);
    setSlides([emptySlide(1)]);
    setTvScreenUrl('');
    setEditingAdId(null);
  };

  const saveAdvertisement = async (nextStatus = form.status) => {
    const payload = buildAdvertisementPayload(nextStatus);

    if (!payload) {
      alert('Enter advertisement name.');
      return;
    }

    if (editingAdId) {
      await dispatch(
        updateAdvertisement({
          id: editingAdId,
          payload: {
            ...payload.advertisement,
            details: payload.details,
          },
        })
      );
    } else {
      await dispatch(createAdvertisement(payload));
    }

    resetAdvertisementForm();
  };

  const getHadavidiTvUrl = () => {
    const url = new URL('https://hadavidi-manakirana.web.app/');
    url.searchParams.set('tv_screen', '1');
    url.searchParams.set('live_sync', '1');
    if (tvScreenUrl.trim()) {
      url.searchParams.set('tv_url', tvScreenUrl.trim());
    }
    return url.toString();
  };

  const openHadavidiTvScreen = () => {
    window.open(getHadavidiTvUrl(), '_blank', 'noopener,noreferrer');
  };

  const handleTvScreenFile = async (file) => {
    if (!file) return;
    try {
      const uploaded = await dispatch(uploadAdvertisementMedia(file)).unwrap();
      setTvScreenUrl(uploaded.media_path);
    } catch (uploadError) {
      alert(`Upload failed: ${uploadError}`);
    }
  };

  const createRepo = async () => {
    if (!repoForm.name || !repoForm.connect_string) return;
    if (editingRepoId) {
      await dispatch(updateRepository({ id: editingRepoId, payload: repoForm }));
      setEditingRepoId(null);
    } else {
      await dispatch(createRepository(repoForm));
    }
    setRepoForm({
      name: 'Local Advertisement Store',
      type: 'local',
      for_scope: 'advertisement',
      connect_string: '/uploads/advertisements',
    });
  };

  const editRepo = (repo) => {
    setEditingRepoId(repo.id);
    setRepoForm({
      name: repo.name || '',
      type: repo.type || 'local',
      for_scope: repo.for_scope || 'advertisement',
      connect_string: repo.connect_string || '',
    });
  };

  const removeRepo = async (repo) => {
    if (!window.confirm(`Remove repository ${repo.name}?`)) return;
    await dispatch(deleteRepository(repo.id));
    if (String(editingRepoId) === String(repo.id)) {
      setEditingRepoId(null);
    }
  };

  const editAdvertisement = (item) => {
    const itemTemplate =
      templates.find((template) => template.id === item.template) || templates[0];
    setEditingAdId(item.id);
    setForm({
      name: item.name || '',
      outlet_id: item.outlet_id || '',
      template: item.template || 'clearance_sale',
      sale_type: item.sale_type || '',
      type: item.type || 'html',
      priority: item.priority || 1,
      sequence: item.sequence || 1,
      timer_seconds: item.timer_seconds || 10,
      start_date: item.start_date ? String(item.start_date).slice(0, 10) : '',
      end_date: item.end_date ? String(item.end_date).slice(0, 10) : '',
      status: item.status || 'draft',
      generated_video_path: item.generated_video_path || '',
    });
    setTvScreenUrl(item.config?.tv_screen_url || item.config?.tvUrl || item.config?.screen_url || '');
    setSlides(
      (item.details?.length ? item.details : [emptySlide(1)]).map((detail, index) => ({
        title: detail.title || '',
        description: detail.description || '',
        product_name: detail.product_name || '',
        brand_name: detail.brand_name || '',
        media_type: detail.media_type || 'image',
        media_path: detail.media_path || '',
        preview_url: '',
        target_area: detail.target_area || itemTemplate.areas[index % itemTemplate.areas.length],
        sequence: detail.sequence || index + 1,
        duration_seconds: detail.duration_seconds || 6,
        repository_id: detail.repository_id || '',
        financial_search: detail.product_name || '',
        selected_financial: null,
      }))
    );
  };

  const selectFinancial = (slideIndex, financial) => {
    const sequence = slides[slideIndex]?.sequence || slideIndex + 1;
    updateSlide(slideIndex, makeSlideFromFinancial(financial, sequence));
  };

  const makeSlideFromFinancial = (financial, sequence) => {
    const priceText =
      financial.salePrice && financial.mrp && financial.salePrice < financial.mrp
        ? `${money(financial.salePrice)} instead of ${money(financial.mrp)}`
        : money(financial.salePrice || financial.mrp);

    return {
      ...emptySlide(sequence),
      title: financial.productName,
      description: priceText,
      product_name: financial.productName,
      brand_name: financial.brandName,
      media_type: financial.image ? 'image' : 'image',
      media_path: financial.image,
      target_area: activeTemplate.areas[(sequence - 1) % activeTemplate.areas.length],
      financial_search: getFinancialLabel(financial),
      selected_financial: financial,
    };
  };

  const addFinancialAsSlide = (financial) => {
    setSlides((prev) => [...prev, makeSlideFromFinancial(financial, prev.length + 1)]);
  };

  const addTopDiscountSlides = () => {
    const nextProducts = highDiscountProducts.slice(0, 5);
    if (!nextProducts.length) return;
    setSlides(nextProducts.map((financial, index) => makeSlideFromFinancial(financial, index + 1)));
    setForm((prev) => ({
      ...prev,
      name: prev.name || 'High Discount Offers',
      sale_type: prev.sale_type || 'clearance',
    }));
  };

  const applyFinancialToSlide = (slideIndex, mode) => {
    const financial = slides[slideIndex]?.selected_financial;
    if (!financial) return;

    const priceText =
      financial.salePrice && financial.mrp && financial.salePrice < financial.mrp
        ? `${money(financial.salePrice)} instead of ${money(financial.mrp)}`
        : money(financial.salePrice || financial.mrp);

    const patchByMode = {
      name: {
        title: financial.productName,
        product_name: financial.productName,
      },
      brand: {
        brand_name: financial.brandName,
      },
      price: {
        description: priceText,
      },
      image: {
        media_type: financial.image ? 'image' : slides[slideIndex].media_type,
        media_path: financial.image || slides[slideIndex].media_path,
      },
      all: {
        title: financial.productName,
        product_name: financial.productName,
        brand_name: financial.brandName,
        description: priceText,
        media_type: financial.image ? 'image' : slides[slideIndex].media_type,
        media_path: financial.image || slides[slideIndex].media_path,
      },
    };

    updateSlide(slideIndex, patchByMode[mode] || {});
  };

  const getFinancialSuggestions = (searchText) => {
    const query = String(searchText || '').trim().toLowerCase();
    if (!query) return [];

    return financialOptions
      .filter((item) =>
        [
          item.productName,
          item.brandName,
          item.quantityText,
          item.barcode,
          item.category,
          item.salePrice,
        ]
          .join(' ')
          .toLowerCase()
          .includes(query)
      )
      .slice(0, 12);
  };

  return (
    <StockManagerLayout>
      <main className="space-y-4">
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Advertisements</h1>
              <p className="text-sm text-gray-500">
                Prepare smart TV slides, sale campaigns, brand videos and outlet playlists.
              </p>
            </div>
            <button
              type="button"
              onClick={() => saveAdvertisement('active')}
              disabled={saving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-gray-400"
            >
              <MonitorPlay size={16} />
              Publish to Hadavidi
            </button>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}
        {successMessage ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            {successMessage}
          </div>
        ) : null}
        <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="font-bold text-gray-900">Repository Catalog</h2>
              <div className="mt-3 space-y-2">
                <input
                  value={repoForm.name}
                  onChange={(event) => setRepoForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="h-10 w-full rounded-lg border px-3 text-sm"
                  placeholder="Repository name"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={repoForm.type}
                    onChange={(event) => setRepoForm((prev) => ({ ...prev, type: event.target.value }))}
                    className="h-10 rounded-lg border px-3 text-sm"
                  >
                    <option value="local">Local</option>
                    <option value="database">Database</option>
                    <option value="firebaserepo">Firebase Repo</option>
                    <option value="cloudrepo">Cloud Repo</option>
                  </select>
                  <input
                    value={repoForm.for_scope}
                    onChange={(event) =>
                      setRepoForm((prev) => ({ ...prev, for_scope: event.target.value }))
                    }
                    className="h-10 rounded-lg border px-3 text-sm"
                    placeholder="For"
                  />
                </div>
                <input
                  value={repoForm.connect_string}
                  onChange={(event) =>
                    setRepoForm((prev) => ({ ...prev, connect_string: event.target.value }))
                  }
                  className="h-10 w-full rounded-lg border px-3 text-sm"
                  placeholder="Connect string"
                />
                <button
                  type="button"
                  onClick={createRepo}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gray-900 text-sm font-semibold text-white"
                >
                  <Plus size={16} />
                  {editingRepoId ? 'Update Repository' : 'Add Repository'}
                </button>
                {editingRepoId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRepoId(null);
                      setRepoForm({
                        name: 'Local Advertisement Store',
                        type: 'local',
                        for_scope: 'advertisement',
                        connect_string: '/uploads/advertisements',
                      });
                    }}
                    className="h-10 w-full rounded-lg border text-sm font-semibold text-gray-700"
                  >
                    Cancel Edit
                  </button>
                ) : null}
              </div>
              <div className="mt-3 max-h-44 overflow-auto divide-y text-sm">
                {repositories.map((repo) => (
                  <div key={repo.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{repo.name}</p>
                      <p className="truncate text-xs text-gray-500">{repo.type} | {repo.connect_string}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => editRepo(repo)}
                        className="rounded-md border px-2 py-1 text-xs font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRepo(repo)}
                        className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="font-bold text-gray-900">Campaign</h2>
              <div className="mt-3 grid gap-2">
                <input
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  className="h-10 rounded-lg border px-3 text-sm"
                  placeholder="Advertisement name"
                />
                <input
                  value={form.outlet_id}
                  onChange={(event) => updateForm('outlet_id', event.target.value)}
                  className="h-10 rounded-lg border px-3 text-sm"
                  placeholder="Outlet ID, blank for all"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={form.priority}
                    onChange={(event) => updateForm('priority', event.target.value)}
                    className="h-10 rounded-lg border px-3 text-sm"
                    placeholder="Priority"
                  />
                  <input
                    type="number"
                    value={form.timer_seconds}
                    onChange={(event) => updateForm('timer_seconds', event.target.value)}
                    className="h-10 rounded-lg border px-3 text-sm"
                    placeholder="Timer seconds"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(event) => updateForm('start_date', event.target.value)}
                    className="h-10 rounded-lg border px-3 text-sm"
                  />
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(event) => updateForm('end_date', event.target.value)}
                    className="h-10 rounded-lg border px-3 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-gray-900">Products to Advertise</h2>
                  <p className="text-xs text-gray-500">Highest discount products from product financials.</p>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={minimumDiscount}
                  onChange={(event) => setMinimumDiscount(event.target.value)}
                  className="h-9 w-20 rounded-lg border px-2 text-sm"
                  aria-label="Minimum discount percent"
                />
              </div>
              <button
                type="button"
                onClick={addTopDiscountSlides}
                disabled={!highDiscountProducts.length}
                className="mt-3 h-9 w-full rounded-lg bg-blue-700 text-sm font-semibold text-white disabled:bg-gray-300"
              >
                Use Top Discount Products
              </button>
              <input
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                className="mt-3 h-10 w-full rounded-lg border px-3 text-sm"
                placeholder="Search products by name, brand, barcode"
              />
              <div className="mt-3 max-h-80 space-y-2 overflow-auto">
                {displayedProducts.length ? (
                  displayedProducts.map((product) => (
                    <div
                      key={product.key}
                      className="flex items-center gap-3 rounded-lg border border-gray-100 p-2"
                    >
                      {product.image ? (
                        <img
                          src={product.image}
                          alt=""
                          className="h-12 w-12 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-100">
                          <ImagePlus size={18} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-gray-900">
                          {product.productName}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {product.brandName} | {product.quantityText || 'Qty'} | Stock {product.stock}
                        </p>
                        <p className="text-xs font-bold text-green-700">
                          {product.discountPercent}% off | {money(product.salePrice)} / MRP {money(product.mrp)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addFinancialAsSlide(product)}
                        className="shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold"
                      >
                        Add
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed p-3 text-sm text-gray-500">
                    No products found for this search.
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="space-y-4">
            <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Templates</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addSlide}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold"
                  >
                    <Plus size={15} />
                    Product slide
                  </button>
                  <button
                    type="button"
                    onClick={addMediaSlide}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-gray-900 px-3 text-sm font-semibold text-white"
                  >
                    <Upload size={15} />
                    Media slide
                  </button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleTemplateSelect(template)}
                    className={`rounded-lg border p-3 text-left ${
                      form.template === template.id ? 'border-blue-600 ring-2 ring-blue-100' : ''
                    }`}
                  >
                    <div className={`flex aspect-video items-center justify-center rounded-md ${template.className}`}>
                      <span className="text-lg font-black uppercase">{template.name}</span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-gray-900">{template.name}</p>
                    <p className="text-xs text-gray-500">
                      {template.productsPerSlide} product{template.productsPerSlide === 1 ? '' : 's'} per slide
                    </p>
                  </button>
                ))}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
              <div className="space-y-3">
                {slides.map((slide, index) => (
                  <div key={index} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900">Slide {index + 1}</h3>
                        <p className="text-xs font-semibold text-gray-500">
                          Template: {activeTemplate.name}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSlide(index)}
                        disabled={slides.length === 1}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 disabled:text-gray-300"
                        aria-label="Remove slide"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="relative md:col-span-2">
                        <input
                          value={slide.financial_search}
                          onChange={(event) =>
                            updateSlide(index, {
                              financial_search: event.target.value,
                              selected_financial: null,
                            })
                          }
                          className="h-10 w-full rounded-lg border px-3 text-sm"
                          placeholder="Search Mongo product financial"
                        />
                        {slide.financial_search && !slide.selected_financial ? (
                          <div className="absolute z-40 mt-1 max-h-72 w-full overflow-auto rounded-lg border bg-white shadow-lg">
                            {getFinancialSuggestions(slide.financial_search).map((financial) => (
                              <button
                                key={financial.key}
                                type="button"
                                onClick={() => selectFinancial(index, financial)}
                                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-blue-50"
                              >
                                {financial.image ? (
                                  <img
                                    src={financial.image}
                                    alt=""
                                    className="h-10 w-10 rounded-md object-cover"
                                  />
                                ) : (
                                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100">
                                    <ImagePlus size={18} />
                                  </div>
                                )}
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold text-gray-900">
                                    {financial.productName}
                                  </span>
                                  <span className="block truncate text-xs text-gray-500">
                                    {financial.brandName} | {financial.quantityText} | {money(financial.salePrice)} | Stock {financial.stock}
                                  </span>
                                </span>
                              </button>
                            ))}
                            {getFinancialSuggestions(slide.financial_search).length === 0 ? (
                              <div className="px-3 py-2 text-sm text-gray-500">
                                No matching financials
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      {slide.selected_financial ? (
                        <div className="flex flex-wrap gap-2 rounded-lg border border-blue-100 bg-blue-50 p-2 md:col-span-2">
                          {[
                            ['all', 'Show all'],
                            ['name', 'Show product'],
                            ['brand', 'Show brand'],
                            ['price', 'Show price'],
                            ['image', 'Show image'],
                          ].map(([mode, label]) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => applyFinancialToSlide(index, mode)}
                              className="rounded-md bg-white px-3 py-1.5 text-xs font-bold text-blue-800 shadow-sm"
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      <input
                        value={slide.title}
                        onChange={(event) => updateSlide(index, { title: event.target.value })}
                        className="h-10 rounded-lg border px-3 text-sm"
                        placeholder="Slide title"
                      />
                      <input
                        value={slide.product_name}
                        onChange={(event) => updateSlide(index, { product_name: event.target.value })}
                        className="h-10 rounded-lg border px-3 text-sm"
                        placeholder="Product name"
                      />
                      <input
                        value={slide.brand_name}
                        onChange={(event) => updateSlide(index, { brand_name: event.target.value })}
                        className="h-10 rounded-lg border px-3 text-sm"
                        placeholder="Brand"
                      />
                      <select
                        value={slide.target_area}
                        onChange={(event) => updateSlide(index, { target_area: event.target.value })}
                        className="h-10 rounded-lg border px-3 text-sm"
                      >
                        {slide.target_area === 'media' ? <option value="media">media</option> : null}
                        {activeTemplate.areas.map((area) => (
                          <option key={area} value={area}>{area}</option>
                        ))}
                      </select>
                      <select
                        value={slide.repository_id}
                        onChange={(event) => updateSlide(index, { repository_id: event.target.value })}
                        className="h-10 rounded-lg border px-3 text-sm"
                      >
                        <option value="">Default repository</option>
                        {repositories.map((repo) => (
                          <option key={repo.id} value={repo.id}>{repo.name}</option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={slide.sequence}
                          onChange={(event) => updateSlide(index, { sequence: event.target.value })}
                          className="h-10 rounded-lg border px-3 text-sm"
                          placeholder="Sequence"
                        />
                        <input
                          type="number"
                          value={slide.duration_seconds}
                          onChange={(event) => updateSlide(index, { duration_seconds: event.target.value })}
                          className="h-10 rounded-lg border px-3 text-sm"
                          placeholder="Timer"
                        />
                      </div>
                      <textarea
                        value={slide.description}
                        onChange={(event) => updateSlide(index, { description: event.target.value })}
                        className="h-20 rounded-lg border px-3 py-2 text-sm md:col-span-2"
                        placeholder="Offer text"
                      />
                      <label
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          handleFile(index, event.dataTransfer.files?.[0]);
                        }}
                        className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-500 md:col-span-2"
                      >
                        <Upload size={22} />
                        <span className="mt-2 font-semibold">Drag image/video here or choose file</span>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          className="hidden"
                          onChange={(event) => handleFile(index, event.target.files?.[0])}
                        />
                      </label>
                      <div className="grid gap-2 md:col-span-2 md:grid-cols-[1fr_auto]">
                        <input
                          value={slide.media_path}
                          onChange={(event) => updateSlide(index, { media_path: event.target.value })}
                          className="h-10 rounded-lg border px-3 text-sm"
                          placeholder="Image/video path"
                        />
                        <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold text-gray-700">
                          <Upload size={16} />
                          Choose local
                          <input
                            type="file"
                            accept="image/*,video/*"
                            className="hidden"
                            onChange={(event) => handleFile(index, event.target.files?.[0])}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <aside className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="font-bold text-gray-900">TV Preview</h2>
                <div className={`mt-3 overflow-hidden rounded-lg ${activeTemplate.className}`}>
                  <div className="relative flex aspect-video flex-col justify-between p-5 pt-14">
                    <img
                      src="/images/ManaKiranaLogo1024x1024.png"
                      alt="ManaKirana"
                      className="absolute left-4 top-4 h-9 w-9 rounded-full bg-white object-contain p-1"
                    />
                    <div>
                      <p className="text-[10px] font-bold uppercase opacity-80">{form.sale_type}</p>
                      <h3 className="mt-1 text-3xl font-black">{form.name || activeTemplate.name}</h3>
                    </div>
                    <div className="min-h-32 rounded-md bg-white/20 p-2">
                      {previewSlide?.preview_url || previewSlide?.media_path ? (
                        previewSlide.media_type === 'video' ? (
                          <video
                            src={previewSlide.preview_url || previewSlide.media_path}
                            className="h-24 w-full object-contain"
                            muted
                          />
                        ) : (
                          <img
                            src={previewSlide.preview_url || previewSlide.media_path}
                            alt=""
                            className="h-24 w-full object-contain"
                          />
                        )
                      ) : (
                        <ImagePlus size={28} />
                      )}
                      <p className="mt-1 truncate text-sm font-bold">
                        {previewSlide?.product_name || previewSlide?.title || 'Offer'}
                      </p>
                      <p className="truncate text-[11px] font-semibold opacity-80">
                        {activeTemplate.productsPerSlide} product{activeTemplate.productsPerSlide === 1 ? '' : 's'} per TV slide
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => saveAdvertisement('active')}
                    disabled={saving}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-gray-400"
                  >
                    <MonitorPlay size={16} />
                    Publish to Hadavidi
                  </button>
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                    <p className="text-sm font-bold text-blue-950">Hadavidi TV Screen</p>
                    <input
                      value={tvScreenUrl}
                      onChange={(event) => setTvScreenUrl(event.target.value)}
                      className="mt-2 h-10 w-full rounded-lg border px-3 text-sm"
                      placeholder="YouTube URL or uploaded video path"
                    />
                    <label className="mt-2 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border bg-white text-sm font-semibold text-blue-700">
                      <Upload size={16} />
                      Choose local video
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(event) => handleTvScreenFile(event.target.files?.[0])}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={openHadavidiTvScreen}
                      className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 text-sm font-semibold text-white hover:bg-blue-800"
                    >
                      <MonitorPlay size={16} />
                      Open TV Screen
                    </button>
                    <p className="mt-2 break-all text-xs font-semibold text-blue-700">
                      {getHadavidiTvUrl()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => saveAdvertisement('draft')}
                    disabled={saving}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border text-sm font-semibold"
                  >
                    <Save size={16} />
                    {editingAdId ? 'Update Draft' : 'Save Draft'}
                  </button>
                  {editingAdId ? (
                    <button
                      type="button"
                      onClick={resetAdvertisementForm}
                      className="h-10 w-full rounded-lg border text-sm font-semibold text-gray-700"
                    >
                      Cancel Advertisement Edit
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => updateForm('type', form.type === 'video' ? 'html' : 'video')}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gray-900 text-sm font-semibold text-white"
                  >
                    <Video size={16} />
                    Output: {form.type}
                  </button>
                </div>
              </aside>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b px-4 py-3">
                <h2 className="font-bold text-gray-900">Published Playlists</h2>
              </div>
              <div className="max-h-72 overflow-auto divide-y divide-gray-100">
                {loading ? (
                  <div className="p-4 text-sm text-gray-500">Loading...</div>
                ) : items.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">No advertisements yet.</div>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          {item.template} | {item.status} | {item.details?.length || 0} slide(s)
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => editAdvertisement(item)}
                          className="rounded-lg border px-3 py-2 text-sm font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            dispatch(
                              updateAdvertisement({
                                id: item.id,
                                payload: { status: item.status === 'active' ? 'draft' : 'active' },
                              })
                            )
                          }
                          className="rounded-lg border px-3 py-2 text-sm font-semibold"
                        >
                          {item.status === 'active' ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          type="button"
                          onClick={() => dispatch(deleteAdvertisement(item.id))}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                          aria-label="Delete advertisement"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </section>
      </main>
    </StockManagerLayout>
  );
};

export default AdvertisementsPage;
