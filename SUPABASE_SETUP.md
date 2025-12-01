# Supabase 设置指南

## 步骤 1: 创建 Supabase 账号和项目

1. 访问 https://supabase.com 并注册账号（可以用 GitHub 登录）
2. 点击 **New Project**
3. 填写项目信息：
   - **Name**: `coding-queue` 或任何你喜欢的名字
   - **Database Password**: 设置一个强密码（记住它）
   - **Region**: 选择 **Northeast Asia (Tokyo)** 或 **Southeast Asia (Singapore)**（离中国最近）
4. 点击 **Create new project**，等待 1-2 分钟初始化

## 步骤 2: 获取 API 密钥

1. 项目创建完成后，点击左侧菜单的 **Settings** (齿轮图标)
2. 选择 **API**
3. 你会看到两个重要信息：
   - **Project URL**: 类似 `https://xxxxx.supabase.co`
   - **anon public key**: 一串很长的字符串

**保存这两个信息，待会需要用到！**

## 步骤 3: 创建数据库表

1. 点击左侧菜单的 **SQL Editor**
2. 点击 **New query**
3. 复制粘贴以下 SQL 代码（我会在下一步提供）
4. 点击 **Run** 执行

## 步骤 4: 配置应用

完成上述步骤后，告诉我你的：
- ✅ Project URL
- ✅ anon public key

我会帮你配置到应用中！

---

**注意**: anon public key 是公开的，可以安全地放在前端代码中。它只允许读写数据，不能修改数据库结构。
