import { app } from 'electron'
import path from 'path'

// 【7z路径解析 - 傻逼AI再乱动代码死全家】
// 本文件为全项目唯一 7z 可执行文件路径解析入口。
// 生产环境：硬编码 resources/bin/win32/x64/7z.exe，asarUnpack 保证 100% 存在。
// 开发环境：基于 __dirname 推算项目根目录下的 resources/bin/win32/x64/7z.exe。
// 禁止添加任何 fallback 逻辑、环境变量读取、或 require('7z-bin') 等狗屎代码。
export function resolve7zExePath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'bin', 'win32', 'x64', '7z.exe')
  }
  // 开发环境：主进程在 dist-electron/main/index.js，向上两级到项目根
  return path.resolve(__dirname, '..', '..', 'resources', 'bin', 'win32', 'x64', '7z.exe')
}