/*
  # 添加用户数据隔离功能

  这个迁移文件将为现有的表添加 user_id 字段，实现用户数据隔离。
  由于现有表可能已有数据，我们需要：
  1. 添加 user_id 字段
  2. 更新索引
  3. 更新安全策略
  4. 处理现有数据（如果有的话）
*/

-- 为 activities 表添加 user_id 字段
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 为 current_activities 表添加 user_id 字段
ALTER TABLE current_activities 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 为 activity_stats 表添加 user_id 字段
ALTER TABLE activity_stats 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 为 multi_timers 表添加 user_id 字段
ALTER TABLE multi_timers 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 更新 multi_timers 表的唯一约束
-- 先删除旧的约束
ALTER TABLE multi_timers DROP CONSTRAINT IF EXISTS multi_timers_timer_name_key;
-- 添加新的复合唯一约束
ALTER TABLE multi_timers ADD CONSTRAINT multi_timers_user_timer_unique UNIQUE (user_id, timer_name);

-- 更新 activity_stats 表的唯一约束
-- 先删除旧的约束
ALTER TABLE activity_stats DROP CONSTRAINT IF EXISTS activity_stats_date_activity_name_key;
-- 添加新的复合唯一约束
ALTER TABLE activity_stats ADD CONSTRAINT activity_stats_user_date_activity_unique UNIQUE (user_id, date, activity_name);

-- 添加用户ID相关的索引
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_current_activities_user_id ON current_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_stats_user_id ON activity_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_multi_timers_user_id ON multi_timers(user_id);

-- 删除旧的安全策略
DROP POLICY IF EXISTS "Allow all operations on activities" ON activities;
DROP POLICY IF EXISTS "Allow all operations on current_activities" ON current_activities;
DROP POLICY IF EXISTS "Allow all operations on activity_stats" ON activity_stats;
DROP POLICY IF EXISTS "Allow all operations on multi_timers" ON multi_timers;

-- 创建新的基于用户ID的安全策略
CREATE POLICY "Users can only access their own activities"
    ON activities
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only access their own current_activities"
    ON current_activities
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only access their own activity_stats"
    ON activity_stats
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only access their own multi_timers"
    ON multi_timers
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 注意：现有数据中的 user_id 字段将为 NULL
-- 这些数据将无法通过新的安全策略访问
-- 如果需要保留现有数据，请手动为它们分配用户ID
