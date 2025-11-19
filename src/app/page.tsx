"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Calendar, X } from "lucide-react";
import type { Photo } from "@/lib/r2";

export default function Home() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [filter, setFilter] = useState<"all" | "travel" | "daily">("all");
  // 新增：用于控制当前选中的大图
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    fetch("/api/photos").then((res) => res.json()).then(setPhotos);
  }, []);

  const filteredPhotos = filter === "all" ? photos : photos.filter((p) => p.category === filter);

  return (
    <div className="min-h-screen bg-rose-50 text-gray-800 font-sans selection:bg-rose-200">
      {/* Header */}
      <header className="py-12 text-center px-4">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-bold text-rose-900 mb-3"
        >
          Our Memories 💖
        </motion.h1>
        <p className="text-rose-700 italic">收集时光的碎片，关于我和你的每一天</p>
        
        {/* Filter Tabs */}
        <div className="mt-8 flex justify-center gap-4">
          {["all", "travel", "daily"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === f ? "bg-rose-400 text-white shadow-lg" : "bg-white text-rose-600 hover:bg-rose-100"
              }`}
            >
              {f === "all" ? "全部" : f === "travel" ? "✈️ 旅行" : "🏠 日常"}
            </button>
          ))}
        </div>
      </header>

      {/* Gallery Grid */}
      <main className="max-w-6xl mx-auto px-4 pb-20">
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {filteredPhotos.map((photo, idx) => (
            <motion.div
              key={photo.id}
              layoutId={photo.id} // 关键：用于平滑过渡动画
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="break-inside-avoid bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 border-2 border-rose-100 cursor-zoom-in group"
              onClick={() => setSelectedPhoto(photo)}
            >
              <div className="overflow-hidden">
                <img 
                  src={photo.url} 
                  alt={photo.caption} 
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500" 
                  loading="lazy" 
                />
              </div>
              <div className="p-4">
                <p className="text-gray-700 font-medium mb-2">{photo.caption}</p>
                <div className="flex items-center justify-between text-xs text-rose-400">
                  <div className="flex items-center gap-1">
                    <MapPin size={14} />
                    <span>{photo.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={14} />
                    <span>{new Date(photo.date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        {filteredPhotos.length === 0 && (
          <div className="text-center py-20 text-rose-300">加载中或暂无照片...</div>
        )}
      </main>

      <footer className="text-center py-6 text-rose-300 text-sm">
        Made with ❤️ for My Girlfriend
      </footer>

      {/* Lightbox (图片放大查看器) */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setSelectedPhoto(null)} // 点击背景关闭
          >
            {/* 关闭按钮 */}
            <button className="absolute top-6 right-6 text-white/70 hover:text-white p-2 bg-black/20 rounded-full transition">
              <X size={32} />
            </button>

            <div 
              className="relative max-w-5xl w-full max-h-screen flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()} // 点击图片本身不关闭
            >
              <motion.img
                layoutId={selectedPhoto.id}
                src={selectedPhoto.url}
                className="max-h-[80vh] w-auto object-contain rounded-lg shadow-2xl"
              />
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-4 text-center text-white"
              >
                <h3 className="text-xl font-bold">{selectedPhoto.caption}</h3>
                <p className="text-sm text-white/60 flex items-center justify-center gap-2 mt-1">
                   <MapPin size={14} /> {selectedPhoto.location} · {new Date(selectedPhoto.date).toLocaleDateString()}
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}