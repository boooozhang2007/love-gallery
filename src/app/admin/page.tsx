"use client";
import { useState, useEffect } from "react";
import { Trash2, Upload, Loader2 } from "lucide-react";
import type { Photo } from "@/lib/r2";

export default function Admin() {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("daily");

  const checkLogin = () => {
    // 简单的前端校验，真正的保护在 API 层
    if (password) setIsLoggedIn(true);
    fetchPhotos();
  };

  const fetchPhotos = () => {
    fetch("/api/photos").then(r => r.json()).then(setPhotos);
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("caption", caption);
    formData.append("location", location);
    formData.append("category", category);

    const res = await fetch("/api/photos", {
      method: "POST",
      headers: { "Authorization": password },
      body: formData,
    });

    const data = await res.json(); // 解析返回的 JSON

    if (res.ok) {
      setFile(null); setCaption(""); setLocation("");
      fetchPhotos();
      alert("上传成功！");
    } else {
      // 弹出具体的后端错误信息
      alert(`上传失败: ${data.error}`);
    }
    setLoading(false);
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
          <input
            type="password"
            placeholder="Enter Password"
            className="w-full p-3 border border-rose-200 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-rose-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button onClick={checkLogin} className="w-full bg-rose-500 text-white py-3 rounded-lg hover:bg-rose-600 transition">
            Enter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Gallery Control Panel</h1>
            <a href="/" className="text-rose-500 hover:underline">返回首页 →</a>
        </div>

        {/* Upload Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Upload size={20} className="text-rose-500"/> 上传新照片
          </h2>
          <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100"/>
            </div>
            <input type="text" placeholder="描述 (例如: 第一次看日出)" required value={caption} onChange={e => setCaption(e.target.value)} className="p-2 border rounded-lg"/>
            <input type="text" placeholder="地点 (例如: 三亚)" required value={location} onChange={e => setLocation(e.target.value)} className="p-2 border rounded-lg"/>
            <select value={category} onChange={e => setCategory(e.target.value)} className="p-2 border rounded-lg">
              <option value="daily">🏠 日常</option>
              <option value="travel">✈️ 旅游</option>
            </select>
            <button disabled={loading} type="submit" className="bg-rose-500 text-white rounded-lg py-2 font-medium hover:bg-rose-600 flex justify-center items-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : "Upload"}
            </button>
          </form>
        </div>

        {/* List Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4">Image</th>
                <th className="p-4">Info</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {photos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <img src={p.url} className="w-16 h-16 object-cover rounded-lg bg-gray-200" />
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{p.caption}</div>
                    <div className="text-xs text-gray-400">{p.location} · {new Date(p.date).toLocaleDateString()}</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.category === 'travel' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                      {p.category}
                    </span>
                  </td>
                  <td className="p-4">
                    <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition">
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