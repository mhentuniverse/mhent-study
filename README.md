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
│   └── practice/               # Thư mục phòng luyện tập
│       ├── index.html          # Menu chọn chế độ luyện tập
│       ├── vocab.html          # Sổ tay từ vựng tương tác thông minh
│       ├── flashcards.html     # Flashcards 3D lật thẻ không gian
│       └── quiz.html           # Đấu trường Quiz Tổng Hợp 7 chế độ & Minigame
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

## 📱 Đóng Gói Thành App Đa Nền Tảng (PC, Android, iOS, PWA)

Dự án **MHEnt. Study** đã được thiết lập quy trình đóng gói đa nền tảng hoàn chỉnh tương tự mô hình `mhent-aisa`:

### 1. 💻 Ứng Dụng Máy Tính Windows (Desktop PC - .exe)
- **Động cơ**: Electron + `electron-builder` với Local Static Server tích hợp (chống lỗi CORS, hỗ trợ đầy đủ YouTube IFrame Player & Web Audio API).
- **Chạy thử nghiệm trên Desktop**:
  - Nhấp đúp file: [`start-desktop.bat`](file:///c:/Users/Yorutsuki%20Yurika/Documents/Miyazaki%20Haruto%20Entertainment%20Co.,%20Ltd.%20-%20Project%20MHEnt.%20Universe/mhent-study/start-desktop.bat) hoặc gõ `npm start`.
- **Đóng gói file cài đặt `.exe`**:
  - Nhấp đúp file: [`build-desktop.bat`](file:///c:/Users/Yorutsuki%20Yurika/Documents/Miyazaki%20Haruto%20Entertainment%20Co.,%20Ltd.%20-%20Project%20MHEnt.%20Universe/mhent-study/build-desktop.bat) hoặc gõ `npm run dist`.
  - Kết quả xuất ra thư mục [`dist/`](file:///c:/Users/Yorutsuki%20Yurika/Documents/Miyazaki%20Haruto%20Entertainment%20Co.,%20Ltd.%20-%20Project%20MHEnt.%20Universe/mhent-study/dist):
    - `MHEnt Study Setup 1.0.0.exe`: Bộ cài đặt chính thức (Installer với shortcut Desktop & Start Menu).
    - `MHEnt Study 1.0.0.exe`: Bản Portable (chạy ngay không cần cài đặt).

---

### 2. 🤖 Ứng Dụng Android (Google Play & File .apk)
- **Động cơ**: **Capacitor Android** (`@capacitor/android`) chuẩn hóa với Gradle.
- **Thư mục Project Native**: [`android/`](file:///c:/Users/Yorutsuki%20Yurika/Documents/Miyazaki%20Haruto%20Entertainment%20Co.,%20Ltd.%20-%20Project%20MHEnt.%20Universe/mhent-study/android).
- **Đồng bộ mã nguồn Web mới nhất vào Android**:
  ```bash
  npm run cap:sync
  ```
- **Mở bằng Android Studio để Build / Run trên điện thoại thật hoặc giả lập**:
  ```bash
  npm run cap:open:android
  ```
- **Build APK thủ công bằng Gradle** (yêu cầu máy có Java 17):
  ```bash
  cd android
  ./gradlew assembleDebug    # Tạo app-debug.apk
  ./gradlew assembleRelease  # Tạo app-release.apk sẵn sàng phát hành CH Play
  ```
- **Tự động Build APK qua GitHub Actions**:
  - Dự án đã tích hợp sẵn workflow [`.github/workflows/build-apps.yml`](file:///c:/Users/Yorutsuki%20Yurika/Documents/Miyazaki%20Haruto%20Entertainment%20Co.,%20Ltd.%20-%20Project%20MHEnt.%20Universe/mhent-study/.github/workflows/build-apps.yml).
  - Khi push code lên GitHub, GitHub Actions sẽ tự động biên dịch và tạo link tải trực tiếp file `.apk` và `.exe`.

---

### 3. 🍎 Ứng Dụng iOS (iPhone / iPad - App Store & TestFlight)
- **Động cơ**: **Capacitor iOS** (`@capacitor/ios`) chuẩn hóa với Xcode Workspace.
- **Thư mục Project Native**: [`ios/App/`](file:///c:/Users/Yorutsuki%20Yurika/Documents/Miyazaki%20Haruto%20Entertainment%20Co.,%20Ltd.%20-%20Project%20MHEnt.%20Universe/mhent-study/ios/App).
- **Mở bằng Xcode trên máy macOS**:
  ```bash
  npm run cap:open:ios
  ```
- Tại Xcode: Chọn Signing & Capabilities, cắm iPhone hoặc chọn Simulator rồi bấm **Run (Cmd + R)** để chạy hoặc **Archive** để phát hành lên Apple App Store / TestFlight.

---

### 4. 🌐 Cài Đặt Trực Tiếp Dạng PWA (Progressive Web App)
- Đã trang bị đầy đủ [`manifest.json`](file:///c:/Users/Yorutsuki%20Yurika/Documents/Miyazaki%20Haruto%20Entertainment%20Co.,%20Ltd.%20-%20Project%20MHEnt.%20Universe/mhent-study/manifest.json) và [`sw.js`](file:///c:/Users/Yorutsuki%20Yurika/Documents/Miyazaki%20Haruto%20Entertainment%20Co.,%20Ltd.%20-%20Project%20MHEnt.%20Universe/mhent-study/sw.js).
- Mở web trên Chrome / Safari / Edge, bấm vào biểu tượng **"Cài đặt ứng dụng (Install App)"** trên thanh địa chỉ hoặc menu chia sẻ để ghim app vào màn hình chính điện thoại hoặc thanh Taskbar máy tính mà không cần tải file nặng.

---

© 2026 **Miyazaki Haruto Entertainment Co., Ltd. - Project MHEnt. Universe**. All Rights Reserved.
