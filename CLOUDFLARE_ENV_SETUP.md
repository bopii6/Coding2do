# Cloudflare Pages 环境变量配置

## 为什么需要配置环境变量？

你的 Supabase 凭据（URL 和 API Key）存储在 `.env.local` 文件中，但这个文件不会被推送到 GitHub（被 gitignore 忽略了）。

所以你需要在 Cloudflare Pages 的设置中手动添加这些环境变量。

## 配置步骤

1. **访问 Cloudflare Pages 项目设置**
   - 打开 https://dash.cloudflare.com
   - 进入你的 `coding2do` 项目
   - 点击 **Settings** 标签

2. **添加环境变量**
   - 在左侧菜单找到 **Environment variables**
   - 点击 **Add variable**

3. **添加第一个变量**
   - **Variable name**: `VITE_SUPABASE_URL`
   - **Value**: `https://jpmzxmpefrghhikiyrse.supabase.co`
   - **Environment**: 选择 **Production** 和 **Preview** (都勾选)
   - 点击 **Save**

4. **添加第二个变量**
   - 再次点击 **Add variable**
   - **Variable name**: `VITE_SUPABASE_ANON_KEY`
   - **Value**: `sb_publishable_TK9tHPuxMLUYGXgrfWSs3g_-bhelp-W`
   - **Environment**: 选择 **Production** 和 **Preview** (都勾选)
   - 点击 **Save**

5. **重新部署**
   - 返回 **Deployments** 标签
   - 找到最新的部署
   - 点击三个点 `...`，选择 **Retry deployment**

## 完成！

等待 1-2 分钟后，你的应用就会在生产环境中启用 Supabase 云端存储了！

访问你的网站：https://coding2do.pages.dev

现在你可以：
- ✅ 注册账号
- ✅ 登录后数据会自动同步到云端
- ✅ 在任何设备登录都能看到你的数据
