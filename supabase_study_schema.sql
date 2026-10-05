-- ==============================================================================
-- 📚 MHENT STUDY - SUPABASE DATABASE SCHEMA
-- Dán và chạy script này tại: Supabase Dashboard > SQL Editor > New Query
-- Project: https://supabase.com/dashboard/project/hwklqefdwskmwwyofthb/sql
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

CREATE INDEX IF NOT EXISTS idx_study_decks_lang ON public.study_decks(lang);
CREATE INDEX IF NOT EXISTS idx_study_decks_user ON public.study_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_study_decks_updated ON public.study_decks(updated_at DESC);

ALTER TABLE public.study_decks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cho phép tất cả đọc bộ bài công khai" ON public.study_decks;
CREATE POLICY "Cho phép tất cả đọc bộ bài công khai" ON public.study_decks
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Cho phép thêm và cập nhật bộ bài" ON public.study_decks;
CREATE POLICY "Cho phép thêm và cập nhật bộ bài" ON public.study_decks
    FOR ALL USING (true) WITH CHECK (true);


-- 2. BẢNG TỪ ĐIỂN AI THÔNG MINH (AISA Smart Dictionary Cache & Knowledge Base)
CREATE TABLE IF NOT EXISTS public.study_dictionary (
    id TEXT PRIMARY KEY, -- vd: "en_opportunity", "ko_사랑", "ja_桜"
    lang TEXT NOT NULL,  -- 'en', 'ko', 'ja', 'zh'
    word TEXT NOT NULL,
    phonetic TEXT DEFAULT '',
    pos TEXT DEFAULT 'noun',
    pos_label TEXT DEFAULT 'Danh từ',
    meaning TEXT NOT NULL,
    example TEXT DEFAULT '',
    example_trans TEXT DEFAULT '',
    word_family JSONB DEFAULT '{"noun":"","verb":"","adj":"","adv":""}'::jsonb,
    collocations JSONB DEFAULT '[]'::jsonb,
    synonyms JSONB DEFAULT '[]'::jsonb,
    details JSONB DEFAULT '{}'::jsonb,
    search_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_dict_lang_word ON public.study_dictionary(lang, word);
CREATE INDEX IF NOT EXISTS idx_study_dict_word ON public.study_dictionary(word);
CREATE INDEX IF NOT EXISTS idx_study_dict_search_count ON public.study_dictionary(search_count DESC);

ALTER TABLE public.study_dictionary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cho phép tất cả đọc từ điển" ON public.study_dictionary;
CREATE POLICY "Cho phép tất cả đọc từ điển" ON public.study_dictionary
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Cho phép thêm và cập nhật từ điển" ON public.study_dictionary;
CREATE POLICY "Cho phép thêm và cập nhật từ điển" ON public.study_dictionary
    FOR ALL USING (true) WITH CHECK (true);


-- 3. BẢNG HỌC QUA BÀI HÁT TƯƠNG TÁC (Music Lyrics Hub - Sentence by Sentence)
CREATE TABLE IF NOT EXISTS public.study_songs (
    id TEXT PRIMARY KEY, -- Slug vd: "until-i-found-you-stephen-sanchez", "spring-day-bts"
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    lang TEXT NOT NULL DEFAULT 'en', -- 'en', 'ko', 'ja', 'zh'
    thumbnail TEXT DEFAULT '',
    youtube_id TEXT DEFAULT '',
    audio_url TEXT DEFAULT '',
    duration INT DEFAULT 0,
    synced_lyrics JSONB NOT NULL DEFAULT '[]'::jsonb, 
    -- Mảng câu: [{ id: 1, startTime: 12.3, endTime: 15.8, text: "...", phonetic: "...", translation: "...", words: [{ word: "...", meaning: "...", phonetic: "...", pos: "..." }] }]
    plain_lyrics TEXT DEFAULT '',
    views INT DEFAULT 1,
    likes INT DEFAULT 0,
    official_version JSONB DEFAULT '{}'::jsonb,
    community_versions JSONB DEFAULT '[]'::jsonb,
    -- Bản cộng đồng: [{ id: "...", author: "Mỹ Anh", authorUid: "...", title: "...", synced_lyrics: [...], likes: 0, createdAt: "..." }]
    created_by TEXT DEFAULT 'AISA AI',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_songs_lang ON public.study_songs(lang);
CREATE INDEX IF NOT EXISTS idx_study_songs_views ON public.study_songs(views DESC);
CREATE INDEX IF NOT EXISTS idx_study_songs_artist ON public.study_songs(artist);

ALTER TABLE public.study_songs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cho phép tất cả đọc bài hát" ON public.study_songs;
CREATE POLICY "Cho phép tất cả đọc bài hát" ON public.study_songs
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Cho phép thêm và cập nhật bài hát" ON public.study_songs;
CREATE POLICY "Cho phép thêm và cập nhật bài hát" ON public.study_songs
    FOR ALL USING (true) WITH CHECK (true);
