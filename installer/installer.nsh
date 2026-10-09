; ================================================================
; MHEnt Study — Custom NSIS Include Script (.nsh)
; Miyazaki Haruto Entertainment Co., Ltd.
; ================================================================

; Abort confirmation dialog
!define MUI_ABORTWARNING
!define MUI_ABORTWARNING_TEXT "Bạn có chắc muốn hủy cài đặt MHEnt Study không?"

; License page configuration
!define MUI_LICENSEPAGE_TEXT_TOP "Vui lòng đọc kỹ Điều Khoản Sử Dụng của MHEnt Study trước khi cài đặt."
!define MUI_LICENSEPAGE_TEXT_BOTTOM "Nếu bạn đồng ý với các điều khoản, chọn 'Tôi đồng ý' và nhấn Tiếp tục."
!define MUI_LICENSEPAGE_CHECKBOX

; Finish page configuration
!define MUI_FINISHPAGE_TITLE "Cài đặt hoàn tất! 🎉"
!define MUI_FINISHPAGE_TEXT "MHEnt Study đã được cài đặt thành công!$\r$\n$\r$\nBắt đầu hành trình học ngoại ngữ của bạn ngay bây giờ. Bộ thẻ từ vựng của 4 ngôn ngữ đang chờ bạn!$\r$\n$\r$\nNhấn Hoàn tất để đóng trình cài đặt."
!define MUI_FINISHPAGE_RUN_TEXT "Mở MHEnt Study ngay bây giờ"
!define MUI_FINISHPAGE_LINK "Truy cập study.mhentuniverse.com"
!define MUI_FINISHPAGE_LINK_LOCATION "https://study.mhentuniverse.com/download"

; Custom Welcome Page with MHEnt Study intro
!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Chào mừng bạn đến với MHEnt Study!"
  !define MUI_WELCOMEPAGE_TEXT "Trình cài đặt sẽ hướng dẫn bạn cài đặt $(^NameDA) lên máy tính.$\r$\n$\r$\nMHEnt Study là không gian học ngoại ngữ đa vũ trụ — Tiếng Hàn, Nhật, Trung và Anh — với tính năng học offline và đồng bộ đám mây.$\r$\n$\r$\nNhấn Tiếp tục để bắt đầu cài đặt."
  !insertmacro MUI_PAGE_WELCOME
!macroend
