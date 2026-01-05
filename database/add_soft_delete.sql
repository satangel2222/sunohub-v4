-- 添加软删除字段到 songs 表
ALTER TABLE songs 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_songs_deleted_at ON songs(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_songs_deleted_by ON songs(deleted_by) WHERE deleted_by IS NOT NULL;

-- 更新 RLS 策略: 普通用户只能看到未删除的歌曲
DROP POLICY IF EXISTS "Songs are viewable by everyone" ON songs;
CREATE POLICY "Songs are viewable by everyone" ON songs
    FOR SELECT
    USING (deleted_at IS NULL);

-- 管理员可以查看所有歌曲(包括已删除)
CREATE POLICY "Admins can view all songs including deleted" ON songs
    FOR SELECT
    USING (
        auth.jwt() ->> 'email' = '774frank1@gmail.com'
    );

-- 用户只能删除自己的歌曲
DROP POLICY IF EXISTS "Users can delete own songs" ON songs;
CREATE POLICY "Users can delete own songs" ON songs
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 管理员可以删除任何歌曲
CREATE POLICY "Admins can delete any song" ON songs
    FOR UPDATE
    USING (auth.jwt() ->> 'email' = '774frank1@gmail.com')
    WITH CHECK (auth.jwt() ->> 'email' = '774frank1@gmail.com');

-- 创建删除历史视图
CREATE OR REPLACE VIEW deleted_songs_view AS
SELECT 
    s.*,
    u.email as deleted_by_email
FROM songs s
LEFT JOIN auth.users u ON s.deleted_by = u.id
WHERE s.deleted_at IS NOT NULL
ORDER BY s.deleted_at DESC;

-- 授权访问视图
GRANT SELECT ON deleted_songs_view TO authenticated;

-- 添加注释
COMMENT ON COLUMN songs.deleted_at IS '软删除时间戳,NULL表示未删除';
COMMENT ON COLUMN songs.deleted_by IS '执行删除操作的用户ID';
COMMENT ON VIEW deleted_songs_view IS '删除历史视图,包含删除者邮箱信息';
