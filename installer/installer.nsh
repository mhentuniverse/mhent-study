; ================================================================
; MHEnt. Study — Custom NSIS Include Script (.nsh)
; Miyazaki Haruto Entertainment Co., Ltd.
; ================================================================

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
  !define MUI_LICENSEPAGE_TEXT_TOP "Vui lòng đọc kỹ Điều Khoản Sử Dụng của MHEnt. Study trước khi cài đặt."
  !define MUI_LICENSEPAGE_TEXT_BOTTOM "Nếu bạn đồng ý với các điều khoản, chọn 'Tôi đồng ý' và nhấn Tiếp tục."
  !define MUI_LICENSEPAGE_CHECKBOX

  ; Tùy chọn cài đặt kèm MHEnt. Link trên Trang Hoàn Tất
  !define MUI_FINISHPAGE_SHOWREADME ""
  !define MUI_FINISHPAGE_SHOWREADME_TEXT "Tải kèm MHEnt. Link (Cầu nối Discord & Hệ sinh thái MHEnt)"
  !define MUI_FINISHPAGE_SHOWREADME_FUNCTION "InstallOrDownloadMHEntLink"

  ; Trang hoàn tất cài đặt
  !define MUI_FINISHPAGE_TITLE "Cài đặt hoàn tất! 🎉"
  !define MUI_FINISHPAGE_TEXT "MHEnt. Study đã được cài đặt thành công!$\r$\n$\r$\nBắt đầu hành trình học ngoại ngữ của bạn ngay bây giờ. Bộ thẻ từ vựng của 4 ngôn ngữ đang chờ bạn!$\r$\n$\r$\nNhấn Hoàn tất để đóng trình cài đặt."
  !define MUI_FINISHPAGE_RUN_TEXT "Mở MHEnt. Study ngay bây giờ"
  !define MUI_FINISHPAGE_LINK "Truy cập study.mhentuniverse.com"
  !define MUI_FINISHPAGE_LINK_LOCATION "https://study.mhentuniverse.com/download"

  ; Biến trạng thái kiểm tra
  Var DialogCompanion
  Var CheckboxCompanion
  Var CheckboxCompanionState
  Var MHEntLinkTriggered

  Function CompanionPageCreate
    !insertmacro MUI_HEADER_TEXT "Phần mềm bổ trợ" "Tùy chọn tải kèm MHEnt. Link phục vụ đồng bộ Discord Rich Presence"
    nsDialogs::Create 1018
    Pop $DialogCompanion
    ${If} $DialogCompanion == error
      Abort
    ${EndIf}

    ${NSD_CreateLabel} 0 0 100% 32u "MHEnt. Study kết hợp cùng MHEnt. Link giúp bạn tự động hiển thị trạng thái học ngoại ngữ (Sổ từ vựng, Thẻ 3D, Nghe nhạc) trực tiếp lên hồ sơ Discord cá nhân và đồng bộ Cổng Định Danh MHEnt ID.$\r$\n$\r$\nBạn có muốn tải kèm MHEnt. Link không?"
    Pop $0

    ${NSD_CreateCheckbox} 0 45u 100% 15u "Tải và cài đặt kèm MHEnt. Link (Khuyên dùng)"
    Pop $CheckboxCompanion

    ; Mặc định chọn sẵn
    ${NSD_SetState} $CheckboxCompanion ${BST_CHECKED}

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

    ${if} ${FileExists} "$LOCALAPPDATA\Programs\MHEnt. Link\MHEnt. Link.exe"
      ExecShell "open" "$LOCALAPPDATA\Programs\MHEnt. Link\MHEnt. Link.exe"
    ${elseif} ${FileExists} "$PROGRAMFILES\MHEnt. Link\MHEnt. Link.exe"
      ExecShell "open" "$PROGRAMFILES\MHEnt. Link\MHEnt. Link.exe"
    ${elseif} ${FileExists} "$PROGRAMFILES64\MHEnt. Link\MHEnt. Link.exe"
      ExecShell "open" "$PROGRAMFILES64\MHEnt. Link\MHEnt. Link.exe"
    ${else}
      ExecShell "open" "https://apps.mhentuniverse.com/link?download=true"
    ${endif}
  FunctionEnd

  ; Trang chào mừng cài đặt
  !macro customWelcomePage
    !define MUI_WELCOMEPAGE_TITLE "Chào mừng bạn đến với MHEnt. Study!"
    !define MUI_WELCOMEPAGE_TEXT "Trình cài đặt sẽ hướng dẫn bạn cài đặt $(^NameDA) lên máy tính.$\r$\n$\r$\nMHEnt. Study là không gian học ngoại ngữ đa vũ trụ — Tiếng Hàn, Nhật, Trung và Anh — với tính năng học offline và đồng bộ đám mây.$\r$\n$\r$\nNhấn Tiếp tục để bắt đầu cài đặt."
    !insertmacro MUI_PAGE_WELCOME
  !macroend

  ; Trang tùy chọn phần mềm đi kèm xuất hiện trước khi giải nén file
  !macro customPageAfterChangeDir
    Page custom CompanionPageCreate CompanionPageLeave
  !macroend

  !macro customInstall
    ${If} $CheckboxCompanionState == 1
      Call InstallOrDownloadMHEntLink
    ${EndIf}
  !macroend

!endif
