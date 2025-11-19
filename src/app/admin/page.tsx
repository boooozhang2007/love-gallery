"use client";
import { useState } from "react";
import { Trash2, Upload, Loader2, Image as ImageIcon, X } from "lucide-react";
import imageCompression from "browser-image-compression";
import type { Photo } from "@/lib/r2";

export default function Admin() {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  
  // 状态管理
  const [files, setFiles] = useState<File[]>([]); // 改为数组存储多文件
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(""); // 进度提示文字
  
  // 表单数据
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

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // 将 FileList 转为 Array 并追加到现有列表中
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  // 移除某个待上传文件
  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  // 核心：压缩并上传
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;
    setUploading(true);

    try {
      let successCount = 0;
      let failCount = 0;

      // 遍历所有文件逐个处理
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(`正在处理第 ${i + 1} / ${files.length} 张...`);

        try {
          // 1. 前端压缩 (目标：小于 4MB 以适应 Vercel 限制，最大宽/高 1920px)
          console.log(`原图大小: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
          
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 4,          // 限制在 4MB 以内
            maxWidthOrHeight: 1920,// 限制分辨率，适合 Web 展示
            useWebWorker: true,
          });

          console.log(`压缩后: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);

          // 2. 准备上传数据
          const formData = new FormData();
          formData.append("file", compressedFile);
          // 如果是多图，描述可以加上序号，或者一样
          formData.append("caption", files.length > 1 ? `${caption} (${i + 1})` : caption); 
          formData.append("location", location);
          formData.append("category", category);

          // 3. 发送请求
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

      // 全部结束
      alert(`处理完成！\n成功: ${successCount} 张\n失败: ${failCount} 张`);
      setFiles([]); // 清空待上传列表
      setCaption(""); 
      setLocation("");
      fetchPhotos(); // 刷新列表

    } catch (error: any) {
      alert("上传流程发生意外错误: " + error.message);
    } finally {
      setUploading(false);
      setProgress("");
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
        <div className="bg-white p-8 rounded-2xl shadow-xl w-96 border border-rose-100">
          <h2 className="text-2xl font-bold text-rose-900 mb-6 text-center">Admin Login</h2>
          <input type="password" placeholder="Password" className="w-full p-3 border border-rose-200 rounded-lg mb-4 focus:ring-2 focus:ring-rose-400" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button onClick={checkLogin} className="w-full bg-rose-500 text-white py-3 rounded-lg hover:bg-rose-600 transition">Enter</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Gallery Control Panel</h1>
          <a href="/" className="text-rose-500 hover:underline">返回首页 →</a>
        </div>

        {/* 上传区域 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Upload size={20} className="text-rose-500"/> 批量上传照片
          </h2>
          
          <form onSubmit={handleUpload} className="space-y-4">
            {/* 文件选择区 */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition cursor-pointer relative">
              <input 
                type="file" 
                multiple // 允许选择多张
                accept="image/*" 
                onChange={handleFileSelect} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="text-gray-500">
                <ImageIcon className="mx-auto h-10 w-10 text-gray-400 mb-2"/>
                <p>点击选择多张照片 (支持自动压缩)</p>
              </div>
            </div>

            {/* 待上传预览列表 */}
            {files.length > 0 && (
              <div className="flex gap-2 overflow-x-auto py-2">
                {files.map((f, i) => (
                  <div key={i} className="relative flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg border overflow-hidden group">
                    <img src={URL.createObjectURL(f)} className="w-full h-full object-cover opacity-70" />
                    <button 
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                    >
                      <X size={12}/>
                    </button>
                  </div>
                ))}
                <div className="flex items-center justify-center text-sm text-gray-500 w-20">
                  共 {files.length} 张
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input type="text" placeholder="这一组照片的描述 (例如: 三亚之旅)" required value={caption} onChange={e => setCaption(e.target.value)} className="p-3 border rounded-lg w-full"/>
              <input type="text" placeholder="地点 (例如: 海边)" required value={location} onChange={e => setLocation(e.target.value)} className="p-3 border rounded-lg w-full"/>
              <select value={category} onChange={e => setCategory(e.target.value)} className="p-3 border rounded-lg w-full">
                <option value="daily">🏠 日常</option>
                <option value="travel">✈️ 旅游</option>
              </select>
            </div>

            <button 
              disabled={uploading || files.length === 0} 
              type="submit" 
              className="w-full bg-rose-500 text-white rounded-lg py-3 font-medium hover:bg-rose-600 disabled:bg-rose-300 flex justify-center items-center gap-2 transition"
            >
              {uploading ? (
                <>
                  <Loader2 className="animate-spin" /> {progress}
                </>
              ) : (
                `开始上传 (${files.length} 张)`
              )}
            </button>
          </form>
        </div>

        {/* 列表区域 (保持不变) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4">缩略图</th>
                <th className="p-4">信息</th>
                <th className="p-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {photos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <img src={p.url} className="w-16 h-16 object-cover rounded-lg bg-gray-200" loading="lazy" />
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{p.caption}</div>
                    <div className="text-xs text-gray-400">{p.location} · {new Date(p.date).toLocaleDateString()}</div>
                  </td>
                  <td className="p-4">
                    <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 p-2">
                      <Trash2 size={18} />
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