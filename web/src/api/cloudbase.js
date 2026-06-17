/**
 * CloudBase JS SDK 初始化 — 直接操作云数据库
 *
 * 老版 cloud1- 格式环境可能在多个区域，自动探测正确区域后连接。
 */
import cloudbase from '@cloudbase/js-sdk'

const ENV_ID = 'cloud1-d3gyqt3k21c692b8e'

// 模块级引用，探测成功后更新
let app = cloudbase.init({ env: ENV_ID })
let db = app.database()
let auth = app.auth()

let loginPromise = null
let loginSuccess = false

// 候选区域列表
const REGIONS = [undefined, 'ap-guangzhou', 'ap-shanghai', 'ap-beijing', 'ap-chengdu']

async function tryLogin(region) {
  const instance = region
    ? cloudbase.init({ env: ENV_ID, region })
    : app

  const a = instance.auth()
  await a.anonymousAuthProvider().signIn()
  console.log(`[CloudBase] 区域 ${region || 'default'} 匿名登录成功`)

  const d = instance.database()
  const testRes = await d.collection('knowledge').limit(1).count()
  console.log(`[CloudBase] 区域 ${region || 'default'} 数据库验证通过, count:`, testRes.total)

  return { app: instance, db: d, auth: a }
}

export async function initCloudBase() {
  if (loginPromise) return loginPromise

  loginPromise = (async () => {
    for (const region of REGIONS) {
      try {
        const result = await tryLogin(region)
        // 更新模块级引用，让其他模块导入的 db 指向正确的实例
        app = result.app
        db = result.db
        auth = result.auth
        loginSuccess = true
        console.log('[CloudBase] ✅ 连接成功，区域:', region || 'default')
        return result
      } catch (err) {
        const msg = err?.message || err?.error || String(err)
        console.warn(`[CloudBase] 区域 ${region || 'default'} 失败:`, msg)
      }
    }

    loginSuccess = false
    throw new Error(
      'CloudBase 连接失败：已尝试所有区域均无法连接。\n' +
      '请在控制台确认：\n' +
      '  1. "登录授权" → 匿名登录 已开启\n' +
      '  2. "安全配置 → 安全域名" 包含 localhost:3000\n' +
      '  3. 环境 ID 正确: ' + ENV_ID
    )
  })()

  return loginPromise
}

export function isCloudBaseReady() {
  return loginSuccess
}

export { app, db, auth, ENV_ID }
