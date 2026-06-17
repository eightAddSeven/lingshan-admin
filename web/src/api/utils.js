/**
 * API 工具函数
 */

/**
 * 从 CloudBase 错误对象中提取可读的错误消息
 * CloudBase JS SDK 的错误格式可能是：
 *   - { message: "..." }
 *   - { errorMessage: "...", error: "...", errorCode: number }
 *   - { detail: "..." }
 *   - 直接字符串
 *
 * @param {*} err - 捕获到的错误对象
 * @returns {string}
 */
export function extractErrorMessage(err) {
  if (!err) return '未知错误'
  if (typeof err === 'string') return err
  return err?.errorMessage
    || err?.error
    || err?.message
    || err?.detail
    || err?.errMsg
    || '未知错误'
}

/**
 * 包装 CloudBase 异常为标准 Error
 * @param {*} err
 * @param {string} [prefix] - 错误前缀
 * @returns {Error}
 */
export function wrapError(err, prefix = '') {
  const msg = extractErrorMessage(err)
  const fullMsg = prefix ? `${prefix}: ${msg}` : msg
  console.error('[API Error]', fullMsg, err)
  return new Error(fullMsg)
}
