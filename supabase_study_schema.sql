-- ==============================================================================
-- 📚 MHENT STUDY - SUPABASE DATABASE SCHEMA
-- Dán và chạy script này tại: Supabase Dashboard > SQL Editor > New Query
-- Project: https://supabase.com/dashboard/project/ctzkgchjheirxwejctvl/sql
-- ==============================================================================

-- 1. BẢNG BỘ TỪ VỰNG & GIÁO TRÌNH HỌC TẬP (Study Decks)
CREATE TABLE IF NOT EXISTS public.study_decks (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    lang TEXT NOT NULL DEFAULT 'ko', -- 'ko' (Hàn), 'ja' (Nhật), 'zh' (Trung), 'en' (Anh)
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    author TEXT DEFAULT 'Học viên MHEnt',
    words JSONB DEFAULT '[]'::jsonb,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TẠO INDEX TĂNG TỐC TRUY VẤN
CREATE INDEX IF NOT EXISTS idx_study_decks_lang ON public.study_decks(lang);
CREATE INDEX IF NOT EXISTS idx_study_decks_user ON public.study_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_study_decks_updated ON public.study_decks(updated_at DESC);

-- 3. BẬT ROW LEVEL SECURITY (RLS)
ALTER TABLE public.study_decks ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES CHO PHÉP ĐỌC VÀ CHIA SẺ
CREATE POLICY "Cho phép tất cả đọc bộ bài công khai" ON public.study_decks
    FOR SELECT USING (is_public = TRUE OR user_id = auth.uid()::text OR true);

CREATE POLICY "Cho phép thêm và cập nhật bộ bài" ON public.study_decks
    FOR ALL USING (true) WITH CHECK (true);
