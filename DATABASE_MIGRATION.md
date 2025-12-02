# 数据库迁移说明

## 问题说明

之前的代码尝试向 `tasks` 和 `history` 表插入 `priority_weight` 字段，但数据库 schema 中没有这个字段，导致 400 Bad Request 错误。

## 解决方案

已更新数据库 schema 和代码，添加了完整的错误处理和用户反馈。

## 迁移步骤

### 1. 如果您是新建数据库

直接运行 `supabase-schema.sql` 文件即可，它已经包含了 `priority_weight` 字段。

### 2. 如果您已有现有数据库

运行 `supabase-migration.sql` 文件来添加缺失的字段：

1. 登录 Supabase Dashboard
2. 进入 SQL Editor
3. 复制 `supabase-migration.sql` 的内容
4. 粘贴并执行

### 3. 验证迁移

运行以下 SQL 查询来验证字段是否已添加：

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('tasks', 'history') 
AND column_name = 'priority_weight';
```

应该看到两行结果，分别对应 `tasks` 和 `history` 表。

## 代码改进

1. ✅ 添加了 Toast 通知组件，操作成功/失败都会有提示
2. ✅ 所有数据库操作都添加了错误处理
3. ✅ 使用乐观更新策略，操作立即响应
4. ✅ 如果数据库操作失败，会自动回滚本地状态
5. ✅ 更新了数据库 schema，添加了 `priority_weight` 字段

## 测试建议

迁移完成后，请测试以下操作：

- [ ] 创建新任务
- [ ] 完成任务（点击对号）
- [ ] 删除任务
- [ ] 编辑任务
- [ ] 恢复历史记录
- [ ] 创建/删除/重命名项目
- [ ] 修改任务优先级

如果操作失败，现在会显示错误提示，而不是静默失败。

