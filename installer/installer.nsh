; ================================================================
; MHEnt. Study — Custom NSIS Include Script (.nsh)
; Miyazaki Haruto Entertainment Co., Ltd.
; ================================================================

!include "nsDialogs.nsh"
!include "LogicLib.nsh"

!ifndef WM_SETTEXT
  !define WM_SETTEXT 0x000C
!endif

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

    ${NSD_CreateLabel} 0 16u 100% 32u "MHEnt. Study kết hợp cùng MHEnt. Link giúp bạn tự động hiển thị trạng thái học tập (Sổ từ vựng, Thẻ ghi nhớ 3D, Nghe nhạc) trực tiếp lên hồ sơ Discord cá nhân và đồng bộ Cổng Định Danh MHEnt ID.$\r$\n$\r$\nBạn có muốn cài đặt kèm MHEnt. Link không?"
    Pop $0

    ${NSD_CreateCheckbox} 0 54u 100% 15u "Tự động tải & cài đặt kèm MHEnt. Link — Cầu nối Discord (Khuyên dùng)"
    Pop $CheckboxCompanion

    ; Mặc định tích chọn sẵn
    ${NSD_SetState} $CheckboxCompanion 1

    nsDialogs::Show
  FunctionEnd

  Function CompanionPageLeave
    ${NSD_GetState} $CheckboxCompanion $CheckboxCompanionState
  FunctionEnd

  ; --------------------------------------------------------------
  ; 2. TIÊU ĐỀ TRONG GIAI ĐOẠN CÀI ĐẶT (1/2 HOẶC ĐỘC LẬP)
  ; --------------------------------------------------------------
  Function instFilesShow
    FindWindow $0 "#32770" "" $hwndparent
    ${If} $CheckboxCompanionState != 0
      ; Giai đoạn 1/2: Đang cài đặt MHEnt. Study -- 1/2
      GetDlgItem $1 $hwndparent 1037
      SendMessage $1 ${WM_SETTEXT} 0 "STR:Đang cài đặt MHEnt. Study -- 1/2"
      GetDlgItem $1 $hwndparent 1038
      SendMessage $1 ${WM_SETTEXT} 0 "STR:Vui lòng chờ trong khi MHEnt. Study đang được trích xuất và cài đặt..."
      GetDlgItem $1 $0 1006
      SendMessage $1 ${WM_SETTEXT} 0 "STR:Đang cài đặt MHEnt. Study -- 1/2"
    ${Else}
      ; Không tick chọn MHEnt Link: Chỉ cài đặt MHEnt. Study
      GetDlgItem $1 $hwndparent 1037
      SendMessage $1 ${WM_SETTEXT} 0 "STR:Đang cài đặt MHEnt. Study"
      GetDlgItem $1 $hwndparent 1038
      SendMessage $1 ${WM_SETTEXT} 0 "STR:Vui lòng chờ trong khi MHEnt. Study đang được trích xuất và cài đặt..."
      GetDlgItem $1 $0 1006
      SendMessage $1 ${WM_SETTEXT} 0 "STR:Đang cài đặt MHEnt. Study"
    ${EndIf}
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
    !define MUI_PAGE_CUSTOMFUNCTION_SHOW instFilesShow
  !macroend

  ; --------------------------------------------------------------
  ; 3. GIAI ĐOẠN 2/2: TỰ ĐỘNG TẢI & CÀI ĐẶT MHENT. LINK
  ; --------------------------------------------------------------
  !macro customInstall
    ${If} $CheckboxCompanionState != 0
      ; Đổi tiêu đề sang: Đang tải & cài đặt MHEnt. Link -- 2/2
      GetDlgItem $1 $hwndparent 1037
      SendMessage $1 ${WM_SETTEXT} 0 "STR:Đang tải & cài đặt MHEnt. Link -- 2/2"
      GetDlgItem $1 $hwndparent 1038
      SendMessage $1 ${WM_SETTEXT} 0 "STR:Đang tự động tải và thiết lập MHEnt. Link từ máy chủ..."
      FindWindow $0 "#32770" "" $hwndparent
      GetDlgItem $1 $0 1006
      SendMessage $1 ${WM_SETTEXT} 0 "STR:Đang tải & cài đặt MHEnt. Link -- 2/2"

      DetailPrint ""
      DetailPrint "========================================"
      DetailPrint "Đang tải và cài đặt MHEnt. Link -- 2/2"
      DetailPrint "========================================"
      DetailPrint "Đang kết nối máy chủ để tải MHEnt. Link..."

      ; Xóa file tạm cũ nếu có
      Delete "$TEMP\MHEnt.Link.Setup.exe"

      ; Tải qua curl.exe với cờ -f (fail on 404/error)
      ${If} ${FileExists} "$SYSDIR\curl.exe"
        nsExec::ExecToLog 'curl.exe -f -s -L --connect-timeout 20 --max-time 180 -o "$TEMP\MHEnt.Link.Setup.exe" "https://github.com/mhentuniverse/mhent-study/releases/latest/download/MHEnt.Link.Setup.exe"'
      ${Else}
        nsExec::ExecToLog 'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile(\"https://github.com/mhentuniverse/mhent-study/releases/latest/download/MHEnt.Link.Setup.exe\", \"$TEMP\MHEnt.Link.Setup.exe\")"'
      ${EndIf}

      ; Kiểm tra xem file đã được tải thành công và có kích thước hợp lệ không (>10MB)
      ${If} ${FileExists} "$TEMP\MHEnt.Link.Setup.exe"
        FileOpen $R0 "$TEMP\MHEnt.Link.Setup.exe" r
        FileSeek $R0 0 END $R1
        FileClose $R0

        ${If} $R1 > 10485760
          DetailPrint "Tải MHEnt. Link thành công ($R1 bytes)!"
          DetailPrint "Đang tự động cài đặt ngầm MHEnt. Link vào hệ thống..."
          ExecWait '"$TEMP\MHEnt.Link.Setup.exe" /S'
          DetailPrint "MHEnt. Link đã được cài đặt hoàn tất!"
        ${Else}
          DetailPrint "Không thể tải MHEnt. Link lúc này (máy chủ đang cập nhật)."
          DetailPrint "Bạn có thể tải sau tại apps.mhentuniverse.com/link"
        ${EndIf}
        Delete "$TEMP\MHEnt.Link.Setup.exe"
      ${Else}
        DetailPrint "Không có kết nối mạng hoặc lỗi tải MHEnt. Link."
        DetailPrint "Bạn có thể tải sau tại apps.mhentuniverse.com/link"
      ${EndIf}
    ${EndIf}
  !macroend

!endif
