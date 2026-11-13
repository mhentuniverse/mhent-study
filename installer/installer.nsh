; ================================================================
; MHEnt. Study — Custom NSIS Include Script (.nsh)
; Miyazaki Haruto Entertainment Co., Ltd.
; ================================================================

!include "nsDialogs.nsh"
!include "LogicLib.nsh"

!ifdef BUILD_UNINSTALLER
  ; ==============================================================
  ; CẤU HÌNH TRÌNH GỠ CÀI ĐẶT (UNINSTALLER - 100% TIẾNG VIỆT)
  ; ==============================================================
  !define MUI_UNTEXT_WELCOME_INFO_TITLE "Chào mừng bạn đến với trình gỡ cài đặt MHEnt. Study"
  !define MUI_UNTEXT_WELCOME_INFO_TEXT "Trình gỡ cài đặt sẽ hướng dẫn bạn gỡ bỏ MHEnt. Study khỏi máy tính.$\r$\n$\r$\nTrước khi bắt đầu, vui lòng đảm bảo rằng ứng dụng MHEnt. Study đã được đóng hoàn toàn.$\r$\n$\r$\nNhấn Tiếp tục để bắt đầu gỡ cài đặt."

  !define MUI_UNCONFIRMPAGE_TEXT_TOP "MHEnt. Study sẽ được gỡ bỏ khỏi thư mục sau. Nhấn Gỡ cài đặt để tiếp tục:"
  
  !define MUI_UNTEXT_FINISH_INFO_TITLE "Gỡ cài đặt hoàn tất! 👋"
  !define MUI_UNTEXT_FINISH_INFO_TEXT "MHEnt. Study đã được gỡ bỏ thành công khỏi máy tính của bạn.$\r$\n$\r$\nCảm ơn bạn đã đồng hành và học tập cùng MHEnt. Study! Chúc bạn luôn thành công trên con đường chinh phục ngoại ngữ.$\r$\n$\r$\nNhấn Hoàn tất để đóng cửa sổ."

  !define MUI_UNABORTWARNING
  !define MUI_UNABORTWARNING_TEXT "Bạn có chắc muốn hủy quá trình gỡ cài đặt MHEnt. Study không?"

!else
  ; ==============================================================
  ; CẤU HÌNH TRÌNH CÀI ĐẶT (INSTALLER - 100% TIẾNG VIỆT)
  ; ==============================================================
  ; Cảnh báo hủy cài đặt
  !define MUI_ABORTWARNING
  !define MUI_ABORTWARNING_TEXT "Bạn có chắc muốn hủy cài đặt MHEnt. Study không?"

  ; Điều khoản sử dụng
  !define MUI_LICENSEPAGE_TEXT_TOP "Vui lòng đọc kỹ Điều Khoản & Bảo Mật của MHEnt Universe trước khi cài đặt:"
  !define MUI_LICENSEPAGE_TEXT_BOTTOM "Nếu bạn đồng ý với các điều khoản, chọn 'Tôi đồng ý' và nhấn Tiếp tục."
  !define MUI_LICENSEPAGE_CHECKBOX

  ; Trang hoàn tất cài đặt
  !define MUI_FINISHPAGE_TITLE "Cài đặt hoàn tất! 🎉"
  !define MUI_FINISHPAGE_TEXT "MHEnt. Study đã được cài đặt thành công!$\r$\n$\r$\nBắt đầu hành trình học ngoại ngữ của bạn ngay bây giờ. Bộ thẻ từ vựng của 4 ngôn ngữ đang chờ bạn!$\r$\n$\r$\nNhấn Hoàn tất để đóng trình cài đặt."
  !define MUI_FINISHPAGE_RUN_TEXT "Mở MHEnt. Study ngay bây giờ"
  !define MUI_FINISHPAGE_LINK "Truy cập study.mhentuniverse.com"
  !define MUI_FINISHPAGE_LINK_LOCATION "https://study.mhentuniverse.com/download"

  ; Biến trạng thái tùy chọn tải kèm MHEnt. Link
  Var DialogCompanion
  Var CheckboxCompanion
  Var CheckboxCompanionState
  Var MHEntLinkTriggered

  ; --------------------------------------------------------------
  ; 1. BƯỚC TÙY CHỌN TẢI KÈM TRƯỚC GIAI ĐOẠN CÀI ĐẶT
  ; --------------------------------------------------------------
  Function CompanionPageCreate
    nsDialogs::Create 1018
    Pop $DialogCompanion
    ${If} $DialogCompanion == error
      Abort
    ${EndIf}

    ${NSD_CreateLabel} 0 0 100% 12u "PHẦN MỀM ĐỒNG HÀNH BỔ TRỢ (TÙY CHỌN)"
    Pop $0

    ${NSD_CreateLabel} 0 16u 100% 32u "MHEnt. Study kết hợp cùng MHEnt. Link giúp bạn tự động hiển thị trạng thái học tập (Sổ từ vựng, Thẻ ghi nhớ 3D, Nghe nhạc) trực tiếp lên hồ sơ Discord cá nhân và đồng bộ Cổng Định Danh MHEnt ID.$\r$\n$\r$\nBạn có muốn tải kèm MHEnt. Link không?"
    Pop $0

    ${NSD_CreateCheckbox} 0 54u 100% 15u "Tải và cài đặt kèm MHEnt. Link — Cầu nối Discord Rich Presence (Khuyên dùng)"
    Pop $CheckboxCompanion

    ; Mặc định tích chọn sẵn
    ${NSD_SetState} $CheckboxCompanion 1

    nsDialogs::Show
  FunctionEnd

  Function CompanionPageLeave
    ${NSD_GetState} $CheckboxCompanion $CheckboxCompanionState
  FunctionEnd

  ; Hàm kích hoạt mở hoặc tải MHEnt. Link
  Function InstallOrDownloadMHEntLink
    ${If} $MHEntLinkTriggered == "1"
      Return
    ${EndIf}
    StrCpy $MHEntLinkTriggered "1"

    IfFileExists "$LOCALAPPDATA\Programs\MHEnt. Link\MHEnt. Link.exe" launch_localapp 0
    IfFileExists "$PROGRAMFILES\MHEnt. Link\MHEnt. Link.exe" launch_prog 0
    IfFileExists "$PROGRAMFILES64\MHEnt. Link\MHEnt. Link.exe" launch_prog64 0

    ; Chưa cài đặt: Mở trang tải MHEnt Link kèm tham số auto-download
    ExecShell "open" "https://apps.mhentuniverse.com/link?download=true"
    Goto link_done

  launch_localapp:
    ExecShell "open" "$LOCALAPPDATA\Programs\MHEnt. Link\MHEnt. Link.exe"
    Goto link_done

  launch_prog:
    ExecShell "open" "$PROGRAMFILES\MHEnt. Link\MHEnt. Link.exe"
    Goto link_done

  launch_prog64:
    ExecShell "open" "$PROGRAMFILES64\MHEnt. Link\MHEnt. Link.exe"

  link_done:
  FunctionEnd

  ; Trang chào mừng cài đặt
  !macro customWelcomePage
    !define MUI_WELCOMEPAGE_TITLE "Chào mừng bạn đến với MHEnt. Study!"
    !define MUI_WELCOMEPAGE_TEXT "Trình cài đặt sẽ hướng dẫn bạn cài đặt $(^NameDA) lên máy tính.$\r$\n$\r$\nMHEnt. Study là không gian học ngoại ngữ đa vũ trụ — Tiếng Hàn, Nhật, Trung và Anh — với tính năng học offline và đồng bộ đám mây.$\r$\n$\r$\nNhấn Tiếp tục để bắt đầu cài đặt."
    !insertmacro MUI_PAGE_WELCOME
  !macroend

  ; Hiển thị trang tùy chọn phần mềm đi kèm TRƯỚC KHI BẮT ĐẦU CÀI ĐẶT
  !macro customPageAfterChangeDir
    Page custom CompanionPageCreate CompanionPageLeave
  !macroend

  ; Khởi chạy tải kèm MHEnt. Link nếu người dùng đã chọn
  !macro customInstall
    ${If} $CheckboxCompanionState == 1
      Call InstallOrDownloadMHEntLink
    ${EndIf}
  !macroend

  ; Đóng sạch các tiến trình cũ đang chạy để tránh khóa file app.asar khi cài đè
  !macro customInit
    nsExec::Exec 'taskkill /F /IM "MHEnt. Study.exe" /T'
  !macroend

!endif
