# Love Gallery 💖 - 专属情侣照片墙

一个基于 Next.js 构建的浪漫照片画廊应用，用于记录和展示情侣之间的美好回忆。支持瀑布流展示、分类筛选、后台批量上传和 Cloudflare R2 对象存储。

## ✨ 功能特性

- **📸 精美画廊**: 采用瀑布流布局，支持图片懒加载和优雅的加载动画。
- **🏷️ 分类筛选**: 支持按“全部”、“旅行”、“日常”等类别筛选照片。
- **🔍 大图预览**: 点击照片可查看高清大图，支持沉浸式浏览。
- **❤️ 互动特效**: 页面包含漂浮爱心动画，营造浪漫氛围。
- **🛡️ 后台管理**: 
  - 独立的 `/admin` 管理页面。
  - 简单的密码鉴权保护。
  - 支持批量选择和上传照片。
  - 上传前自动压缩图片，节省存储空间和带宽。
  - 支持删除已上传的照片。
- **☁️ 云端存储**: 使用 Cloudflare R2 存储图片和元数据，低成本且高速。

## 🛠️ 技术栈

- **框架**: [Next.js 15+](https://nextjs.org/) (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **动画**: Framer Motion
- **图标**: Lucide React
- **存储**: Cloudflare R2 (AWS SDK v3)
- **工具**: browser-image-compression (图片压缩)

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/boooozhang2007/love-gallery.git
cd love-gallery
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

在项目根目录下创建一个 `.env.local` 文件，并填入以下配置：

```env
# Cloudflare R2 配置
R2_ACCOUNT_ID=你的Cloudflare账户ID
R2_ACCESS_KEY_ID=你的R2_Access_Key_ID
R2_SECRET_ACCESS_KEY=你的R2_Secret_Access_Key
R2_BUCKET_NAME=你的存储桶名称

# 公开访问域名 (需要在 R2 存储桶中配置自定义域名或使用 R2 dev 域名)
NEXT_PUBLIC_R2_DOMAIN=https://你的域名.com

# 后台管理密码
ADMIN_PASSWORD=设置一个后台登录密码
```

### 4. 运行开发服务器

```bash
npm run dev
```

打开浏览器访问 [http://localhost:3000](http://localhost:3000) 查看首页。
访问 [http://localhost:3000/admin](http://localhost:3000/admin) 进入后台管理页面。

## 📦 部署指南 (Vercel)

本项目针对 Vercel 部署进行了优化。

1. 将代码推送到 GitHub。
2. 在 [Vercel](https://vercel.com) 导入项目。
3. 在 Vercel 项目设置的 **Environment Variables** 中添加上述所有环境变量。
4. 点击 **Deploy**。

## 📝 使用说明

### 后台管理
1. 访问 `/admin` 路径。
2. 输入在环境变量 `ADMIN_PASSWORD` 中设置的密码。
3. **上传照片**:
   - 点击上传区域选择一张或多张照片。
   - 填写描述（Caption）、地点（Location）和选择分类（Category）。
   - 点击“开始上传”，系统会自动压缩图片并上传到 R2。
4. **管理照片**:
   - 列表下方会显示所有已上传的照片。
   - 点击垃圾桶图标可删除照片。

### 数据存储结构
所有数据存储在 R2 Bucket 中：
- `photos/`: 存放图片文件。
- `metadata.json`: 存放所有照片的元数据（JSON 数组）。

## 🤝 贡献

欢迎提交 Issue 或 Pull Request 来改进这个项目！

## 📄 许可证

MIT
