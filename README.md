# 🎓 MHEnt. Study Universe (`study.mhentuniverse.com`)

> Cổng học ngoại ngữ đa năng 4 thứ tiếng (Hàn - Nhật - Trung - Anh) thuộc hệ sinh thái **Miyazaki Haruto Entertainment Co., Ltd. - Project MHEnt. Universe**.

---

### 1. 📝 Sổ Tay Từ Vựng Thông Minh (Active Recall & Spaced Repetition)
- **Tự động kiểm tra đúng / sai theo thời gian thực (Active Recall):** Người học tự gõ lại từ vựng vào ô kiểm tra; hệ thống so sánh tức thì và báo **"맞음 • Đúng ✨"** (âm thanh *ding!*) hoặc **"틀림 • Sai ❌"**.
- **Chu kỳ 4 lần ôn tập ngắt quãng (Spaced Repetition):** 4 ô checkbox tương ứng mức độ ghi nhớ (0% ➔ 25% ➔ 50% ➔ 75% ➔ 100% Hoàn thành).
- **Dashboard Thống kê Live:** Tự động đếm Tổng số từ, Số từ đã thuộc, Số từ cần ôn, và thanh tiến độ % toàn bộ giáo trình cùng Mascot động viên.
- **Phát âm chuẩn bản xứ 1-Click:** Tích hợp Web Speech Synthesis API cho cả 4 thứ tiếng (Hàn, Nhật, Trung, Anh) hoàn toàn miễn phí.

### 2. 📁 Studio Cá Nhân & Tự Tạo Bài Học
- Người dùng có thể tự thêm từ vựng, tự chọn loại từ (Danh từ, Động từ, Tính từ), nghĩa tiếng Việt và câu ví dụ.
- Lưu trữ cục bộ qua LocalStorage và sẵn sàng đồng bộ Cloud (Firebase / Supabase).

### 3. 📤 Hệ Thống Chia Sẻ & Sao Chép (Clone) 2 Kiểu
- **Kiểu 1 (Share Link + Popup Clone):** Tạo liên kết chia sẻ dạng `study.mhentuniverse.com/shared/?data=...`. Khi người nhận mở link:
  - Xem trước nội dung bộ bài.
  - Hiện popup hỏi: *"Bạn có muốn sao chép (Clone) bộ giáo trình này vào tài khoản cá nhân không?"*.
  - Bấm **"Đồng ý sao chép"** -> Bản sao độc lập được tạo trong tài khoản người nhận để tự do học và chỉnh sửa.
- **Kiểu 2 (Drive-like Shared Vault):** Xem các bộ bài trong mục "Được chia sẻ với tôi" và bấm Clone bất kỳ lúc nào.

### 4. 🧠 Phòng Thi Trí Tuệ Nhân Tạo (AI Exam)
- Tự động sinh đề kiểm tra trắc nghiệm và điền từ dựa trên chính kho từ vựng người học đã nhập.
- Tự chấm điểm và hiển thị đáp án giải thích.

---

## 📂 Kiến Trúc Dự Án (Directory Structure)

```text
mhent-study/
│
├── index.html                  # Sảnh chính Portal (Dashboard 4 ngôn ngữ, Streak, Tính năng nổi bật)
├── vercel.json                 # Cấu hình Clean URLs và Vercel routing
│
├── ko/                         # 🇰🇷 VŨ TRỤ TIẾNG HÀN
│   ├── index.html              # Hub tiếng Hàn & Studio quản lý Decks
│   ├── alphabet.html           # Bảng chữ cái Hangeul tương tác (Nghe phát âm từng chữ)
│   ├── exam.html               # Phòng thi thử nghiệm AI
│   └── practice/               # Thư mục phòng luyện tập
│       ├── index.html          # Menu chọn chế độ luyện tập
│       ├── vocab.html          # Sổ tay từ vựng tương tác thông minh
│       └── flashcards.html     # Flashcards 3D lật thẻ không gian
│
├── ja/                         # 🇯🇵 VŨ TRỤ TIẾNG NHẬT
│   ├── index.html              # Hub tiếng Nhật
│   └── alphabet.html           # Bảng Hiragana & Katakana
│
├── zh/                         # 🇨🇳 VŨ TRỤ TIẾNG TRUNG
│   └── index.html              # Hub tiếng Trung & Bảng Pinyin
│
├── en/                         # 🇬🇧 VŨ TRỤ TIẾNG ANH
│   └── index.html              # Hub tiếng Anh & Bảng phiên âm IPA
│
├── shared/                     # Cổng tiếp nhận link chia sẻ & Popup Clone
│   └── index.html
│
├── css/
│   ├── theme.css               # Biến màu MHEnt, Dark/Light Mode, Glassmorphism, Font CJK
│   ├── layout.css              # Thanh điều hướng Navbar, Breadcrumbs, Modals, Toasts
│   └── vocab-sheet.css         # Phong cách bảng từ vựng thông minh MHEnt Universe
│
├── js/
│   ├── config.js               # Cấu hình tập trung Firebase & Supabase (đồng bộ MHEnt)
│   ├── ui-kit.js               # Toast thông báo, Theme toggle, Hiệu ứng âm thanh Web Audio
│   ├── speech.js               # Engine phát âm bản xứ đa ngôn ngữ (Web Speech API)
│   ├── storage.js              # Quản lý Deck, Lưu tiến độ học, Chuỗi Streak, Thuật toán Clone
│   └── vocab-sheet.js          # Engine xử lý Sổ từ vựng (Kiểm tra đúng sai, 4 checkbox, Live Stats)
│
└── data/                       # Dữ liệu mẫu ban đầu
    ├── sample-ko.js            # Bộ từ vựng tiếng Hàn mẫu (나라, 도시, 베트남, 한국...)
    ├── sample-ja.js            # Bộ từ vựng tiếng Nhật mẫu (N5)
    ├── sample-zh.js            # Bộ từ vựng tiếng Trung mẫu (HSK)
    └── sample-en.js            # Bộ từ vựng tiếng Anh mẫu
```

© 2026 **Miyazaki Haruto Entertainment Co., Ltd. - Project MHEnt. Universe**. All Rights Reserved.
