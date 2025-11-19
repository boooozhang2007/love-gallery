"use client";
import { useState, useEffect } from "react";
import { Trash2, Upload, Loader2, Image as ImageIcon, X } from "lucide-react";
import imageCompression from "browser-image-compression";
import type { Photo } from "@/lib/r2";

export default function Admin() {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("daily");

  const checkLogin = () => {
    if (password) setIsLoggedIn(true);
    fetchPhotos();
  };

  const fetchPhotos = () => {
    fetch("/api/photos").then(r => r.json()).then(setPhotos);
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;
    setUploading(true);

    try {
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(`正在处理第 ${i + 1} / ${files.length} 张...`);

        try {
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 4,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          });

          const formData = new FormData();
          formData.append("file", compressedFile);
          formData.append("caption", files.length > 1 ? `${caption} (${i + 1})` : caption); 
          formData.append("location", location);
          formData.append("category", category);

          const res = await fetch("/api/photos", {
            method: "POST",
            headers: { "Authorization": password },
            body: formData,
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "Server Error");
          }
          
          successCount++;
        } catch (err) {
          console.error(`文件 ${file.name} 上传失败:`, err);
          failCount++;
        }
      }

      alert(`处理完成！\n成功: ${successCount} 张\n失败: ${failCount} 张`);
      setFiles([]); setCaption(""); setLocation("");
      fetchPhotos();
    } catch (error: any) {
      alert("上传流程发生意外错误: " + error.message);
    } finally {
      setUploading(false); setProgress("");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这张回忆吗？")) return;
    await fetch("/api/photos", {
      method: "DELETE",
      headers: { "Authorization": password },
      body: JSON.stringify({ id }),
    });
    fetchPhotos();
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-96 border border-rose-200">
          <h2 className="text-2xl font-bold text-rose-900 mb-6 text-center">管理员登录</h2>
          <input 
            type="password" 
            placeholder="请输入密码" 
            className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-rose-400 text-gray-900" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
          <button onClick={checkLogin} className="w-full bg-rose-500 text-white py-3 rounded-lg hover:bg-rose-600 transition font-bold">确认</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">后台管理面板</h1>
          <a href="/" className="text-rose-600 font-medium hover:underline">返回首页 →</a>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Upload size={20} className="text-rose-500"/> 批量上传照片
          </h2>
          
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition cursor-pointer relative bg-gray-50">
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={handleFileSelect} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="text-gray-500">
                <ImageIcon className="mx-auto h-10 w-10 text-gray-400 mb-2"/>
                <p className="text-gray-600 font-medium">点击选择多张照片 (自动压缩)</p>
              </div>
            </div>

            {files.length > 0 && (
              <div className="flex gap-2 overflow-x-auto py-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                {files.map((f, i) => (
                  <div key={i} className="relative flex-shrink-0 w-20 h-20 bg-white rounded-lg border border-gray-300 overflow-hidden group">
                    <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700 transition shadow-sm"
                    >
                      <X size={12}/>
                    </button>
                  </div>
                ))}
                <div className="flex items-center justify-center text-sm text-gray-600 font-medium w-20">
                  共 {files.length} 张
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 修复：文字颜色设为 text-gray-900，边框加深 border-gray-300 */}
              <input 
                type="text" 
                placeholder="描述 (例如: 三亚之旅)" 
                required 
                value={caption} 
                onChange={e => setCaption(e.target.value)} 
                className="p-3 border border-gray-300 rounded-lg w-full text-gray-900 placeholder:text-gray-400 focus:border-rose-500 outline-none"
              />
              <input 
                type="text" 
                placeholder="地点 (例如: 海边)" 
                required 
                value={location} 
                onChange={e => setLocation(e.target.value)} 
                className="p-3 border border-gray-300 rounded-lg w-full text-gray-900 placeholder:text-gray-400 focus:border-rose-500 outline-none"
              />
              <select 
                value={category} 
                onChange={e => setCategory(e.target.value)} 
                className="p-3 border border-gray-300 rounded-lg w-full text-gray-900 focus:border-rose-500 outline-none bg-white"
              >
                <option value="daily">🏠 日常</option>
                <option value="travel">✈️ 旅游</option>
              </select>
            </div>

            <button 
              disabled={uploading || files.length === 0} 
              type="submit" 
              className="w-full bg-rose-500 text-white rounded-lg py-3 font-bold text-lg hover:bg-rose-600 disabled:bg-rose-300 flex justify-center items-center gap-2 transition shadow-sm"
            >
              {uploading ? (
                <><Loader2 className="animate-spin" /> {progress}</>
              ) : (
                `开始上传 (${files.length} 张)`
              )}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-sm text-gray-700">
            <thead className="bg-gray-100 border-b border-gray-200 text-gray-900 font-bold uppercase text-xs tracking-wider">
              <tr>
                <th className="p-4">图片</th>
                <th className="p-4">信息详情</th>
                <th className="p-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {photos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition">
                  <td className="p-4">
                    <img src={p.url} className="w-16 h-16 object-cover rounded-lg border border-gray-200" loading="lazy" />
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-gray-900 text-base mb-1">{p.caption}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      <span>📍 {p.location}</span>
                      <span>📅 {new Date(p.date).toLocaleDateString()}</span>
                    </div>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${p.category === 'travel' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                      {p.category === 'travel' ? '旅行' : '日常'}
                    </span>
                  </td>
                  <td className="p-4">
                    <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition" title="删除">
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}