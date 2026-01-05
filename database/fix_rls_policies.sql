-- 修复 RLS 策略冲突问题
-- 确保软删除功能正常工作

-- 1. 删除可能冲突的旧策略
DROP POLICY IF EXISTS "Allow Public Update" ON songs;
DROP POLICY IF EXISTS "Enable update for all users" ON songs;

-- 2. 确保用户可以软删除自己的歌曲
DROP POLICY IF EXISTS "Users can delete own songs" ON songs;
CREATE POLICY "Users can delete own songs" ON songs
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. 确保管理员可以删除任何歌曲
DROP POLICY IF EXISTS "Admins can delete any song" ON songs;
CREATE POLICY "Admins can delete any song" ON songs
    FOR UPDATE
    USING (auth.jwt() ->> 'email' = '774frank1@gmail.com')
    WITH CHECK (auth.jwt() ->> 'email' = '774frank1@gmail.com');

-- 4. 允许所有人更新播放量和评分(但不包括删除字段)
CREATE POLICY "Allow public stats update" ON songs
    FOR UPDATE
    USING (true)
    WITH CHECK (
        -- 只允许更新这些字段
        (deleted_at IS NULL OR deleted_at = OLD.deleted_at) AND
        (deleted_by IS NULL OR deleted_by = OLD.deleted_by)
    );

-- 验证策略
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'songs'
ORDER BY policyname;
