/**
 * Preload 脚本：在隔离上下文中运行，不向页面暴露 Node API，降低安全风险。
 * 若后续需要「人脸核验 / 本机设备」等能力，可在此通过 contextBridge 暴露白名单 API。
 */
const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('oesDesktop', {
  /** 标识当前运行在 Electron 学生端壳内，前端可据此开启增强 UI（如全屏提示） */
  isStudentDesktop: true
})
