"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m, useReducedMotion } from "framer-motion";
import { Calendar, MapPin, Sparkles, X } from "lucide-react";
import FloatingHearts from "@/components/FloatingHearts";
import type { Photo } from "@/lib/r2";
import { DEFAULT_CATEGORY_SUGGESTIONS, getCategoryLabel, getCategoryTone, uniqueNonEmpty } from "@/lib/photo-taxonomy";

const LIGHTBOX_TRANSITION = {
  type: "spring",
  stiffness: 250,
  damping: 28,
  mass: 0.92,
} as const;

const SHEET_TRANSITION = {
  type: "spring",
  stiffness: 220,
  damping: 26,
  mass: 0.98,
} as const;

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getImageLayoutId(photoId: string) {
  return `photo-image-${photoId}`;
}

function getCollectionLabel(collection: string) {
  return collection.trim() || "未命名专栏";
}

type FilterChipProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

function FilterChip({ active, label, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-4 py-2 text-sm font-medium transition duration-300 backdrop-blur-xl",
        active
          ? "border-white/70 bg-white text-rose-900 shadow-[0_18px_60px_rgba(255,255,255,0.35)]"
          : "border-white/35 bg-white/20 text-white/88 hover:bg-white/28",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

type PhotoCardProps = {
  photo: Photo;
  onOpen: (photo: Photo) => void;
  priority?: boolean;
};

const PhotoCard = memo(function PhotoCard({ photo, onOpen, priority = false }: PhotoCardProps) {
  return (
    <article
      className="photo-card break-inside-avoid mb-5 overflow-hidden rounded-[30px] border border-white/55 bg-white/72 shadow-[0_18px_60px_rgba(167,86,111,0.14)] backdrop-blur-2xl"
    >
      <button
        type="button"
        onClick={() => onOpen(photo)}
        className="group block w-full text-left cursor-zoom-in"
        aria-label={`查看 ${photo.caption}`}
      >
        <div className="relative overflow-hidden rounded-[30px]">
          <m.img
            layoutId={getImageLayoutId(photo.id)}
            transition={LIGHTBOX_TRANSITION}
            src={photo.url}
            alt={photo.caption}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "low"}
            decoding="async"
            draggable={false}
            className="h-auto w-full bg-rose-100 object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0)_48%,rgba(20,16,30,0.18)_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold tracking-[-0.02em] text-stone-800">{photo.caption}</p>
              <p className="mt-1 text-sm text-stone-500">{photo.collection ? getCollectionLabel(photo.collection) : "回忆碎片"}</p>
            </div>
            <span className={["shrink-0 rounded-full px-3 py-1 text-xs font-medium", getCategoryTone(photo.category)].join(" ")}>
              {getCategoryLabel(photo.category)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} />
              {photo.location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={14} />
              {formatDate(photo.date)}
            </span>
          </div>
        </div>
      </button>
    </article>
  );
});

export default function Home() {
  const reduceMotion = useReducedMotion();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCollection, setSelectedCollection] = useState<string>("all");
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPhotos() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/photos", {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("照片加载失败");
        }

        const data = (await response.json()) as Photo[];
        setPhotos(Array.isArray(data) ? data : []);
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") return;
        setError(fetchError instanceof Error ? fetchError.message : "加载失败，请稍后重试");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadPhotos();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedPhoto) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedPhoto(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedPhoto]);

  const categories = useMemo(
    () => uniqueNonEmpty(["all", ...DEFAULT_CATEGORY_SUGGESTIONS, ...photos.map((photo) => photo.category)]),
    [photos]
  );

  const allCollections = useMemo(() => uniqueNonEmpty(photos.map((photo) => photo.collection)), [photos]);

  const collectionOptions = useMemo(() => {
    const scopedPhotos =
      selectedCategory === "all"
        ? photos
        : photos.filter((photo) => photo.category === selectedCategory);

    return uniqueNonEmpty(["all", ...scopedPhotos.map((photo) => photo.collection)]);
  }, [photos, selectedCategory]);

  useEffect(() => {
    if (selectedCategory !== "all" && !categories.includes(selectedCategory)) {
      setSelectedCategory("all");
    }
  }, [categories, selectedCategory]);

  useEffect(() => {
    if (selectedCollection !== "all" && !collectionOptions.includes(selectedCollection)) {
      setSelectedCollection("all");
    }
  }, [collectionOptions, selectedCollection]);

  const filteredPhotos = useMemo(() => {
    return photos.filter((photo) => {
      const matchCategory = selectedCategory === "all" || photo.category === selectedCategory;
      const matchCollection = selectedCollection === "all" || photo.collection === selectedCollection;
      return matchCategory && matchCollection;
    });
  }, [photos, selectedCategory, selectedCollection]);

  const openPhoto = useCallback((photo: Photo) => {
    setSelectedPhoto(photo);
  }, []);

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig transition={LIGHTBOX_TRANSITION} reducedMotion="user">
        <div className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,#ffe7ef_0%,#fff9fb_32%,#f7f2ff_100%)] text-stone-800 selection:bg-rose-200/70">
          <FloatingHearts />

          <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.92)_0%,rgba(255,255,255,0)_70%)]" />

          <header className="relative z-10 mx-auto max-w-6xl px-4 pb-8 pt-12 sm:px-6 lg:px-8 lg:pt-16">
            <m.div
              initial={reduceMotion ? undefined : { opacity: 0, y: 18 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
              className="overflow-hidden rounded-[36px] border border-white/60 bg-white/58 p-6 shadow-[0_24px_90px_rgba(168,93,120,0.16)] backdrop-blur-3xl sm:p-8 lg:p-10"
            >
              <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-4 py-1.5 text-sm font-medium text-rose-700 shadow-[0_8px_28px_rgba(255,255,255,0.6)]">
                    <Sparkles size={16} />
                    Memories in an iOS-like flow
                  </div>
                  <h1 className="text-4xl font-semibold tracking-[-0.05em] text-stone-900 sm:text-5xl lg:text-6xl">
                    Our Memories
                  </h1>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-stone-600 sm:text-base">
                    收集每一次心动、出发和停留。现在支持自定义分类与专栏，点开照片时也会像 iPhone 相册一样更顺滑地收放。
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
                  <div className="rounded-[28px] border border-white/70 bg-white/70 p-4 backdrop-blur-2xl">
                    <p className="text-xs uppercase tracking-[0.24em] text-stone-400">Photos</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-stone-900">{photos.length}</p>
                  </div>
                  <div className="rounded-[28px] border border-white/70 bg-white/70 p-4 backdrop-blur-2xl">
                    <p className="text-xs uppercase tracking-[0.24em] text-stone-400">Collections</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-stone-900">
                      {allCollections.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex flex-wrap gap-3">
                  {categories.map((category) => (
                    <FilterChip
                      key={category}
                      active={selectedCategory === category}
                      label={category === "all" ? "全部分类" : getCategoryLabel(category)}
                      onClick={() => {
                        setSelectedCategory(category);
                        setSelectedCollection("all");
                      }}
                    />
                  ))}
                </div>

                {collectionOptions.length > 1 && (
                  <div className="flex flex-wrap gap-3">
                    {collectionOptions.map((collection) => (
                      <button
                        key={collection}
                        type="button"
                        onClick={() => setSelectedCollection(collection)}
                        className={[
                          "rounded-full px-4 py-2 text-sm font-medium transition duration-300",
                          selectedCollection === collection
                            ? "bg-stone-900 text-white shadow-[0_12px_36px_rgba(17,24,39,0.22)]"
                            : "bg-white/70 text-stone-600 hover:bg-white",
                        ].join(" ")}
                      >
                        {collection === "all" ? "全部专栏" : getCollectionLabel(collection)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </m.div>
          </header>

          <main className="relative z-10 mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
            {error ? (
              <div className="rounded-[32px] border border-red-100 bg-white/85 p-8 text-center shadow-[0_18px_60px_rgba(120,54,54,0.08)] backdrop-blur-xl">
                <p className="text-lg font-medium text-stone-900">照片加载失败</p>
                <p className="mt-2 text-sm text-stone-500">{error}</p>
              </div>
            ) : loading && photos.length === 0 ? (
              <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="mb-5 break-inside-avoid overflow-hidden rounded-[30px] border border-white/60 bg-white/65 p-4 shadow-[0_16px_60px_rgba(167,86,111,0.1)] backdrop-blur-2xl"
                  >
                    <div className="aspect-[4/5] animate-pulse rounded-[24px] bg-rose-100/70" />
                    <div className="mt-4 h-5 w-2/3 animate-pulse rounded-full bg-rose-100/70" />
                    <div className="mt-3 h-4 w-1/2 animate-pulse rounded-full bg-rose-100/60" />
                  </div>
                ))}
              </div>
            ) : filteredPhotos.length === 0 ? (
              <div className="rounded-[32px] border border-white/60 bg-white/70 p-10 text-center shadow-[0_20px_70px_rgba(167,86,111,0.12)] backdrop-blur-2xl">
                <p className="text-lg font-medium text-stone-900">这个分类下还没有照片</p>
                <p className="mt-2 text-sm text-stone-500">试试切换分类或专栏看看。</p>
              </div>
            ) : (
              <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
                {filteredPhotos.map((photo, index) => (
                  <PhotoCard key={photo.id} photo={photo} onOpen={openPhoto} priority={index < 4} />
                ))}
              </div>
            )}
          </main>

          <footer className="relative z-10 px-4 pb-8 text-center text-sm text-stone-400 sm:px-6 lg:px-8">
            Made with love, softened with glass and spring.
          </footer>

          <AnimatePresence>
            {selectedPhoto && (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,18,28,0.44)] px-4 py-6 backdrop-blur-[20px]"
                onClick={() => setSelectedPhoto(null)}
              >
                <m.div
                  initial={reduceMotion ? undefined : { opacity: 0 }}
                  animate={reduceMotion ? undefined : { opacity: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="relative w-full max-w-5xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedPhoto(null)}
                    className="absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/15 text-white/90 shadow-[0_12px_30px_rgba(15,15,20,0.26)] transition hover:bg-black/24"
                    aria-label="关闭预览"
                  >
                    <X size={20} />
                  </button>

                  <div className="overflow-hidden rounded-[34px] border border-white/28 bg-[rgba(255,255,255,0.18)] shadow-[0_30px_120px_rgba(15,15,30,0.34)] backdrop-blur-2xl">
                    <div className="px-4 pb-4 pt-14 sm:px-6 sm:pb-6 sm:pt-16">
                      <div className="overflow-hidden rounded-[28px] bg-[rgba(255,255,255,0.12)]">
                        <m.img
                          layoutId={getImageLayoutId(selectedPhoto.id)}
                          transition={LIGHTBOX_TRANSITION}
                          src={selectedPhoto.url}
                          alt={selectedPhoto.caption}
                          decoding="async"
                          draggable={false}
                          className="mx-auto max-h-[72vh] w-auto max-w-full object-contain"
                        />
                      </div>

                      <m.div
                        initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
                        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                        exit={reduceMotion ? undefined : { opacity: 0, y: 10 }}
                        transition={{ ...SHEET_TRANSITION, delay: reduceMotion ? 0 : 0.04 }}
                        className="mt-4 rounded-[28px] border border-white/28 bg-[rgba(255,255,255,0.18)] p-4 text-white backdrop-blur-xl sm:p-5"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-2xl font-semibold tracking-[-0.03em]">{selectedPhoto.caption}</h2>
                              <span className="rounded-full bg-white/18 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/20">
                                {getCategoryLabel(selectedPhoto.category)}
                              </span>
                              {selectedPhoto.collection && (
                                <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-medium text-white/78 ring-1 ring-white/15">
                                  {getCollectionLabel(selectedPhoto.collection)}
                                </span>
                              )}
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-white/72">
                              <span className="inline-flex items-center gap-1.5">
                                <MapPin size={14} />
                                {selectedPhoto.location}
                              </span>
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar size={14} />
                                {formatDate(selectedPhoto.date)}
                              </span>
                            </div>
                          </div>

                          <div className="rounded-full bg-white/12 px-3 py-2 text-xs font-medium text-white/70 ring-1 ring-white/15">
                            点空白处返回
                          </div>
                        </div>
                      </m.div>
                    </div>
                  </div>
                </m.div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
