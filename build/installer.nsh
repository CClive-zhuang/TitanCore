; build/installer.nsh
; V15 赛博主题 - 注册表驱动路径版

!include MUI2.nsh

; 【修复】DPI 感知，防止 UAC 盾牌图标在高 DPI 下位置偏移
ManifestDPIAware true

; ==========================================
; 【核心修复】preInit 在安装程序最早期执行
; ==========================================
!macro preInit
    SetRegView 64
    WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" "InstallLocation" "D:\TitanCore"
    WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" "InstallLocation" "D:\TitanCore"
    SetRegView 32
    WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" "InstallLocation" "D:\TitanCore"
    WriteRegExpandStr HKCU "${INSTALL_REGISTRY_KEY}" "InstallLocation" "D:\TitanCore"
!macroend

; ==========================================
; 【核心修复】卸载时清理注册表残留
; ==========================================
!macro customUnInstall
    SetRegView 64
    DeleteRegValue HKLM "${INSTALL_REGISTRY_KEY}" "InstallLocation"
    DeleteRegValue HKCU "${INSTALL_REGISTRY_KEY}" "InstallLocation"
    SetRegView 32
    DeleteRegValue HKLM "${INSTALL_REGISTRY_KEY}" "InstallLocation"
    DeleteRegValue HKCU "${INSTALL_REGISTRY_KEY}" "InstallLocation"
!macroend

; ==========================================
; 【核心修复】安装成功后自动启动并关闭安装窗口
; .onInstSuccess 是安装专用回调，不污染卸载流程
; ==========================================
Function .onInstSuccess
    ExecShell "" "$INSTDIR\TitanCore.exe"
    Quit
FunctionEnd

; ==========================================
; 显示详情日志
; ==========================================
ShowInstDetails show
ShowUninstDetails show

; ==========================================
; 防止重复启动提示
; ==========================================
!define MUI_ABORTWARNING "Titan Core 安装程序正在运行中，请勿重复启动。"
!define MUI_UNABORTWARNING "Titan Core 卸载程序正在运行中，请勿重复启动。"

; ==========================================
; 全局颜色系统
; ==========================================
!define MUI_TEXTCOLOR "00f0ff"
!define MUI_BGCOLOR "0a0e17"

; 欢迎页
!define MUI_WELCOMEPAGE_BGCOLOR "0a0e17"
!define MUI_WELCOMEPAGE_TITLE_COLOR "00aaff"
!define MUI_WELCOMEPAGE_TEXT_COLOR "c0c0c0"
!define MUI_WELCOMEPAGE_BITMAP_BGCOLOR "050505"
!define MUI_WELCOMEPAGE_TITLE "欢迎进入赛博核心"
!define MUI_WELCOMEPAGE_TEXT "Titan Core - 下一代专业桌面环境 (专业版)$\r$\n$\r$\n系统已就绪。点击 [下一步] 开始神经链接。$\r$\n$\r$\n版本：v${VERSION}"

; 目录选择页
!define MUI_DIRECTORYPAGE_TEXT_COLOR "000000"
!define MUI_DIRECTORYPAGE_SPACECOLOR "00aaff"

; 安装进度页
!define MUI_INSTFILESPAGE_BGCOLOR "0a0e17"
!define MUI_INSTFILESPAGE_COLORS "00f0ff 0a0e17"
!define MUI_INSTFILESPAGE_TEXT_COLOR "00f0ff"
!define MUI_PROGRESSBAR_COLOR "00f0ff"
!define MUI_PROGRESSBAR_BGCOLOR "1a1f2e"

; 卸载进度页
!define MUI_UNINSTFILESPAGE_BGCOLOR "0a0e17"
!define MUI_UNINSTFILESPAGE_COLORS "00f0ff 0a0e17"
!define MUI_UNINSTFILESPAGE_TEXT_COLOR "00f0ff"
!define MUI_UNINSTFILESPAGE_PROGRESSBAR_COLOR "00f0ff"
!define MUI_UNINSTFILESPAGE_PROGRESSBAR_BGCOLOR "1a1f2e"

; 完成页（定义保留，但实际不会显示）
!define MUI_FINISHPAGE_BGCOLOR "0a0e17"
!define MUI_FINISHPAGE_TITLE_COLOR "00aaff"
!define MUI_FINISHPAGE_TEXT_COLOR "00f0ff"
!define MUI_FINISHPAGE_BITMAP_BGCOLOR "050505"
!define MUI_FINISHPAGE_CHECKBOX_COLOR "00f0ff"
!define MUI_FINISHPAGE_TITLE "安装完成 - Neon Ready"
!define MUI_FINISHPAGE_TEXT "Titan Core 已部署至系统。$\r$\n神经链接已建立，点击 [完成] 启动协议。"
!define MUI_FINISHPAGE_BUTTON_STYLE "/DISABLEVISUALSTYLES"

; 卸载完成页
!define MUI_UNFINISHPAGE_BGCOLOR "0a0e17"
!define MUI_UNFINISHPAGE_TITLE_COLOR "00aaff"
!define MUI_UNFINISHPAGE_TEXT_COLOR "00f0ff"
!define MUI_UNFINISHPAGE_BITMAP_BGCOLOR "050505"
!define MUI_UNFINISHPAGE_CHECKBOX_COLOR "00f0ff"

; 头部标题栏
!define MUI_HEADER_TEXT_COLOR "00f0ff"
!define MUI_HEADER_SUBTEXT_COLOR "a0a8b8"
!define MUI_HEADER_BGCOLOR "0f1419"

; 侧边栏背景
!define MUI_SIDEBAR_BGCOLOR "050505"

; 按钮颜色
!define MUI_BUTTON_TEXT_COLOR "00f0ff"
!define MUI_BUTTON_BGCOLOR "1a1f2e"
!define MUI_BUTTON_TEXT_COLOR_DISABLED "4a5568"