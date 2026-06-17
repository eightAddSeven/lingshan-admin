/**
 * 管理员认证 — 基于 CloudBase 数据库的账号校验
 *
 * 认证策略（按优先级）：
 * 1. 从 settings 集合读取管理员配置（type: 'admin'）
 * 2. 数据库不可用时，fallback 到内置默认账号（离线兜底）
 * 3. 无论哪种方式，用户名密码校验通过即签发本地 token
 */
import { db } from './cloudbase'

// 内置默认管理员账号（数据库不可用或首次部署时的兜底）
const DEFAULT_ADMIN = {
  username: 'linghsn',
  password: 'linghsn6688'
}

/**
 * 管理员登录
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{token: string, username: string}>}
 */
export async function login(username, password) {
  let adminConfig = null

  // ===== 步骤 1：尝试从数据库读取管理员配置 =====
  try {
    const { data } = await db.collection('settings')
      .where({ type: 'admin' })
      .limit(1)
      .get()

    if (data && data.length > 0) {
      adminConfig = data[0]
      console.log('[Auth] 已从数据库加载管理员配置')
    }
  } catch (dbErr) {
    // 数据库访问失败的可能原因：
    // - CloudBase 匿名登录未开启
    // - localhost 未加入安全域名白名单
    // - settings 集合不存在或权限不足
    console.warn('[Auth] 数据库访问失败，将使用内置默认账号:', dbErr.message)
  }

  // ===== 步骤 2：数据库无配置时 fallback 到内置默认值 =====
  if (!adminConfig) {
    console.log('[Auth] 使用内置默认管理员账号')
    adminConfig = {
      username: DEFAULT_ADMIN.username,
      password: DEFAULT_ADMIN.password
    }
  }

  // ===== 步骤 3：校验用户名密码 =====
  if (username !== adminConfig.username || password !== adminConfig.password) {
    throw new Error('用户名或密码错误')
  }

  // ===== 步骤 4：签发本地 token =====
  const token = btoa(`${username}:${Date.now()}:lingshan-admin`)

  console.log('[Auth] 管理员登录成功:', username)
  return { token, username }
}

/**
 * 修改管理员密码（仅在数据库可用时生效）
 * @param {string} username
 * @param {string} oldPassword
 * @param {string} newPassword
 */
export async function changePassword(username, oldPassword, newPassword) {
  // 先查数据库中的配置
  const { data } = await db.collection('settings')
    .where({ type: 'admin' })
    .limit(1)
    .get()

  // 数据库中有配置 → 更新数据库
  if (data && data.length > 0) {
    const config = data[0]
    if (config.password !== oldPassword) {
      throw new Error('原密码错误')
    }
    await db.collection('settings').doc(config._id).update({
      password: newPassword,
      updateTime: new Date()
    })
    console.log('[Auth] 数据库密码已更新')
    return { success: true }
  }

  // 数据库中没有配置 → 首次创建
  if (oldPassword !== DEFAULT_ADMIN.password) {
    throw new Error('原密码错误')
  }
  await db.collection('settings').add({
    type: 'admin',
    username: username,
    password: newPassword,
    createTime: new Date(),
    updateTime: new Date()
  })
  console.log('[Auth] 管理员配置已创建并更新密码')
  return { success: true }
}

const authAPI = { login, changePassword }
export default authAPI
