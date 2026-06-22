/**
 * CloudBase JS SDK 初始化 — Web 管理端使用匿名登录
 *
 * 安全模型（三层）：
 * ① 应用层：Login.vue 用户名密码 → 云函数 adminLogin 验证 → 本地 token → 路由守卫
 * ② 数据读取：Web 端匿名登录 → 集合设「所有用户可读」
 * ③ 数据写入：通过云函数代理（云函数天然管理员权限，不依赖匿名用户身份）
 *
 * 只要集合权限配好，匿名用户无法写入，安全性足够。
 */
import cloudbase from '@cloudbase/js-sdk'

const ENV_ID = 'cloud1-d3gyqt3k21c692b8e'

let app = cloudbase.init({ env: ENV_ID })
let db = app.database()
let auth = app.auth()

let loginPromise = null
let loginSuccess = false

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
  console.log(`[CloudBase] 区域 ${region || 'default'} 验证通过, count:`, testRes.total)

  return { app: instance, db: d, auth: a }
}

export async function initCloudBase() {
  if (loginPromise) return loginPromise

  loginPromise = (async () => {
    for (const region of REGIONS) {
      try {
        const result = await tryLogin(region)
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
      'CloudBase 连接失败。请在控制台确认：\n' +
      '  1. 匿名登录已开启\n' +
      '  2. 安全域名包含 localhost:5173\n' +
      '  3. 环境 ID: ' + ENV_ID
    )
  })()

  return loginPromise
}

export function isCloudBaseReady() {
  return loginSuccess
}

export { app, db, auth, ENV_ID }
