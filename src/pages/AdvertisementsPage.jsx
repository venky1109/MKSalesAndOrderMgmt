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
  fetchAdvertisements,
  fetchRepositories,
  updateAdvertisement,
  uploadAdvertisementMedia,
} from '../features/marketing/advertisementSlice';

const templates = [
  {
    id: 'clearance_sale',
    name: 'Clearance Sale',
    saleType: 'clearance',
    className: 'bg-red-700 text-white',
    areas: ['hero', 'left', 'right'],
  },
  {
    id: 'dasara_template',
    name: 'Dasara Festival',
    saleType: 'festival',
    className: 'bg-amber-500 text-gray-950',
    areas: ['hero', 'offer', 'brand'],
  },
  {
    id: 'brand_spotlight',
    name: 'Brand Spotlight',
    saleType: 'brand',
    className: 'bg-slate-900 text-white',
    areas: ['hero', 'brand', 'product'],
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

const AdvertisementsPage = () => {
  const dispatch = useDispatch();
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

  const activeTemplate = useMemo(
    () => templates.find((template) => template.id === form.template) || templates[0],
    [form.template]
  );

  useEffect(() => {
    dispatch(fetchRepositories());
    dispatch(fetchAdvertisements());
  }, [dispatch]);

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

  const saveAdvertisement = async (nextStatus = form.status) => {
    if (!form.name.trim()) {
      alert('Enter advertisement name.');
      return;
    }

    const details = slides
      .filter((slide) => slide.media_path || slide.title || slide.product_name)
      .map(({ preview_url, ...slide }) => ({
        ...slide,
        repository_id: slide.repository_id || null,
        sequence: Number(slide.sequence || 1),
        duration_seconds: Number(slide.duration_seconds || 5),
        metadata: {
          template: form.template,
          target_area: slide.target_area,
        },
      }));

    await dispatch(
      createAdvertisement({
        advertisement: {
          ...form,
          status: nextStatus,
          outlet_id: form.outlet_id || null,
          priority: Number(form.priority || 1),
          sequence: Number(form.sequence || 1),
          timer_seconds: Number(form.timer_seconds || 10),
          generated_video_path:
            form.generated_video_path ||
            `/advertisements/${form.template}-${Date.now()}.mp4`,
          config: {
            template: form.template,
            areas: activeTemplate.areas,
            slides: details,
          },
        },
        details,
      })
    );

    setForm(defaultForm);
    setSlides([emptySlide(1)]);
  };

  const createRepo = async () => {
    if (!repoForm.name || !repoForm.connect_string) return;
    await dispatch(createRepository(repoForm));
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
                  Add Repository
                </button>
              </div>
              <div className="mt-3 max-h-44 overflow-auto divide-y text-sm">
                {repositories.map((repo) => (
                  <div key={repo.id} className="py-2">
                    <p className="font-semibold text-gray-900">{repo.name}</p>
                    <p className="text-xs text-gray-500">{repo.type} | {repo.connect_string}</p>
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
          </div>

          <div className="space-y-4">
            <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Templates</h2>
                <button
                  type="button"
                  onClick={addSlide}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold"
                >
                  <Plus size={15} />
                  Slide
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
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
                    <p className="text-xs text-gray-500">{template.areas.join(', ')}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
              <div className="space-y-3">
                {slides.map((slide, index) => (
                  <div key={index} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-bold text-gray-900">Slide {index + 1}</h3>
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
                      <input
                        value={slide.media_path}
                        onChange={(event) => updateSlide(index, { media_path: event.target.value })}
                        className="h-10 rounded-lg border px-3 text-sm md:col-span-2"
                        placeholder="Image/video path"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <aside className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="font-bold text-gray-900">TV Preview</h2>
                <div className={`mt-3 overflow-hidden rounded-lg ${activeTemplate.className}`}>
                  <div className="flex aspect-video flex-col justify-between p-5">
                    <div>
                      <p className="text-xs font-bold uppercase opacity-80">{form.sale_type}</p>
                      <h3 className="mt-1 text-3xl font-black">{form.name || activeTemplate.name}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {slides.slice(0, 2).map((slide, index) => (
                        <div key={index} className="min-h-24 rounded-md bg-white/20 p-2">
                          {slide.preview_url || slide.media_path ? (
                            slide.media_type === 'video' ? (
                              <video src={slide.preview_url || slide.media_path} className="h-20 w-full object-cover" muted />
                            ) : (
                              <img src={slide.preview_url || slide.media_path} alt="" className="h-20 w-full object-cover" />
                            )
                          ) : (
                            <ImagePlus size={28} />
                          )}
                          <p className="mt-1 truncate text-sm font-bold">{slide.title || slide.product_name || 'Offer'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => saveAdvertisement('draft')}
                    disabled={saving}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border text-sm font-semibold"
                  >
                    <Save size={16} />
                    Save Draft
                  </button>
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
