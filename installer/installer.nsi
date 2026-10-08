; ================================================================
; MHEnt Study — Custom NSIS Installer Script
; Miyazaki Haruto Entertainment Co., Ltd.
; ================================================================

; ---- Branding ----
!ifndef PRODUCT_NAME
  !define PRODUCT_NAME "MHEnt Study"
!endif
!ifndef PRODUCT_VERSION
  !define PRODUCT_VERSION "1.0.0"
!endif
!define PRODUCT_PUBLISHER "Miyazaki Haruto Entertainment Co., Ltd."
!define PRODUCT_WEB_SITE "https://study.mhentuniverse.com"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"
!define INSTALL_DIR "$PROGRAMFILES64\MHEnt\Study"
!define PRODUCT_BUILD_DIR "${PROJECT_DIR}\dist\win-unpacked"

; ---- MUI2 Modern UI Settings ----
!include "MUI2.nsh"
!include "FileFunc.nsh"

; Window appearance
!define MUI_BGCOLOR "0D0D1A"
!define MUI_TEXTCOLOR "E2E8F0"

; Sidebar & Header images
!ifndef MUI_WELCOMEFINISHPAGE_BITMAP
  !define MUI_WELCOMEFINISHPAGE_BITMAP "${BUILD_RESOURCES_DIR}\installer-sidebar.jpg"
!endif
!ifndef MUI_UNWELCOMEFINISHPAGE_BITMAP
  !define MUI_UNWELCOMEFINISHPAGE_BITMAP "${BUILD_RESOURCES_DIR}\installer-sidebar.jpg"
!endif
!ifndef MUI_HEADERIMAGE
  !define MUI_HEADERIMAGE
!endif
!ifndef MUI_HEADERIMAGE_BITMAP
  !define MUI_HEADERIMAGE_BITMAP "${BUILD_RESOURCES_DIR}\installer-header.jpg"
!endif
!ifndef MUI_HEADERIMAGE_UNBITMAP
  !define MUI_HEADERIMAGE_UNBITMAP "${BUILD_RESOURCES_DIR}\installer-header.jpg"
!endif
!ifndef MUI_HEADERIMAGE_RIGHT
  !define MUI_HEADERIMAGE_RIGHT
!endif

; Abort confirm
!define MUI_ABORTWARNING
!define MUI_ABORTWARNING_TEXT "Bạn có chắc muốn hủy cài đặt MHEnt Study không?"

; ---- Welcome Page ----
!define MUI_WELCOMEPAGE_TITLE "Chào mừng bạn đến với MHEnt Study!"
!define MUI_WELCOMEPAGE_TEXT "Trình cài đặt sẽ hướng dẫn bạn cài đặt $(^NameDA) phiên bản ${PRODUCT_VERSION} lên máy tính.$\r$\n$\r$\nMHEnt Study là không gian học ngoại ngữ đa vũ trụ — Tiếng Hàn, Nhật, Trung và Anh — với tính năng học offline và đồng bộ đám mây.$\r$\n$\r$\nNhấn Tiếp theo để bắt đầu cài đặt."
!insertmacro MUI_PAGE_WELCOME

; ---- License Page ----
!define MUI_LICENSEPAGE_TEXT_TOP "Vui lòng đọc kỹ Điều Khoản Sử Dụng của MHEnt Study trước khi cài đặt."
!define MUI_LICENSEPAGE_TEXT_BOTTOM "Nếu bạn đồng ý với các điều khoản, chọn 'Tôi đồng ý' và nhấn Tiếp theo."
!define MUI_LICENSEPAGE_CHECKBOX
!insertmacro MUI_PAGE_LICENSE "${BUILD_RESOURCES_DIR}\license.txt"

; ---- Install Dir Page ----
!define MUI_DIRECTORYPAGE_TEXT_TOP "Chọn thư mục cài đặt MHEnt Study. Nhấn Duyệt để chọn thư mục khác."
!define MUI_DIRECTORYPAGE_TEXT_DESTINATION "Thư mục cài đặt:"
!insertmacro MUI_PAGE_DIRECTORY

; ---- Install Progress ----
!define MUI_INSTFILESPAGE_PROGRESSBAR "colored"
!insertmacro MUI_PAGE_INSTFILES

; ---- Finish Page ----
!define MUI_FINISHPAGE_TITLE "Cài đặt hoàn tất! 🎉"
!define MUI_FINISHPAGE_TEXT "MHEnt Study ${PRODUCT_VERSION} đã được cài đặt thành công!$\r$\n$\r$\nBắt đầu hành trình học ngoại ngữ của bạn ngay bây giờ. Bộ thẻ từ vựng của 4 ngôn ngữ đang chờ bạn!$\r$\n$\r$\nNhấn Hoàn tất để đóng trình cài đặt."
!define MUI_FINISHPAGE_RUN "$INSTDIR\MHEnt Study.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Mở MHEnt Study ngay bây giờ"
!define MUI_FINISHPAGE_LINK "Truy cập study.mhentuniverse.com"
!define MUI_FINISHPAGE_LINK_LOCATION "https://study.mhentuniverse.com/download"
!insertmacro MUI_PAGE_FINISH

; ---- Uninstall Pages ----
!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; ================================================================
; General Settings
; ================================================================
Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
BrandingText "© 2025 Miyazaki Haruto Entertainment Co., Ltd."
InstallDir "${INSTALL_DIR}"
InstallDirRegKey HKLM "${PRODUCT_UNINST_KEY}" "InstallLocation"
ShowInstDetails show
ShowUnInstDetails show
RequestExecutionLevel admin

; ================================================================
; Installer Sections
; ================================================================
Section "MHEnt Study (bắt buộc)" SEC01
  SectionIn RO
  SetOutPath "$INSTDIR"
  SetOverwrite on
  File /r "${PRODUCT_BUILD_DIR}\*.*"

  ; Write registry uninstall info
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayName" "${PRODUCT_NAME}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegDWORD HKLM "${PRODUCT_UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKLM "${PRODUCT_UNINST_KEY}" "NoRepair" 1

  ; Shortcuts
  CreateDirectory "$SMPROGRAMS\MHEnt"
  CreateShortCut "$SMPROGRAMS\MHEnt\MHEnt Study.lnk" "$INSTDIR\MHEnt Study.exe"
  CreateShortCut "$DESKTOP\MHEnt Study.lnk" "$INSTDIR\MHEnt Study.exe"

  WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

; ================================================================
; Uninstaller
; ================================================================
Section "Uninstall"
  Delete "$DESKTOP\MHEnt Study.lnk"
  Delete "$SMPROGRAMS\MHEnt\MHEnt Study.lnk"
  RMDir "$SMPROGRAMS\MHEnt"

  RMDir /r "$INSTDIR"

  DeleteRegKey HKLM "${PRODUCT_UNINST_KEY}"

  SetAutoClose true
SectionEnd
