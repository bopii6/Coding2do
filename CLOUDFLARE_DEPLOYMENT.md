# Cloudflare Pages 部署指南

## 步骤 1: 登录 Cloudflare
访问 https://dash.cloudflare.com/ 并登录你的账号（如果没有账号，免费注册一个）

## 步骤 2: 创建新项目
1. 在左侧菜单选择 **Workers & Pages**
2. 点击 **Create application**
3. 选择 **Pages** 标签
4. 点击 **Connect to Git**

## 步骤 3: 连接 GitHub 仓库
1. 选择 **GitHub** 作为 Git 提供商
2. 授权 Cloudflare 访问你的 GitHub 账号
3. 选择仓库：**bopii6/Coding2do**

## 步骤 4: 配置构建设置
在构建配置页面填写以下信息：

- **Project name**: `coding-queue` (或任何你喜欢的名字)
- **Production branch**: `main`
- **Framework preset**: `Vite`
- **Build command**: `npm run build`
- **Build output directory**: `dist`

## 步骤 5: 部署
1. 点击 **Save and Deploy**
2. 等待 1-2 分钟，Cloudflare 会自动构建和部署你的应用
3. 部署完成后，你会得到一个类似这样的地址：
   - `https://coding-queue.pages.dev`

## 后续更新
每次你 `git push` 到 GitHub 的 `main` 分支，Cloudflare Pages 会自动重新部署最新版本！

## 优势
✅ 全球 CDN 加速  
✅ 自动 HTTPS  
✅ 每次推送自动部署  
✅ 完全免费
