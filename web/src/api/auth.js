/**
 * 管理员认证
 *
 * 认证流程：
 * 1. 调用云函数 adminLogin 验证凭据（云函数有管理员权限，可读 settings 集合）
 * 2. 云函数不可用时，回退到本地内置账号验证（兜底）
 * 3. 签发本地 token 用于路由守卫
 *
 * 安全模型：
 * - 登录验证：云函数（管理员权限），settings 集合无需对匿名用户开放
 * - 数据读取：Web 端匿名登录 → 集合需设「所有用户可读」
 * - 数据写入：通过云函数代理（天然管理员权限）
 */
import cloudbase from '@cloudbase/js-sdk'

const ENV_ID = 'cloud1-d3gyqt3k21c692b8e'

// 内置默认管理员账号（首次部署 / 云函数不可用时的兜底）
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
  // ===== 步骤 1：通过云函数验证凭据 =====
  try {
    const app = cloudbase.init({ env: ENV_ID })
    const res = await app.callFunction({
      name: 'quickstartFunctions',
      data: { type: 'adminLogin', username, password }
    })

    if (res.result && res.result.code === 200) {
      console.log('[Auth] 云函数验证通过:', username)
    } else {
      const msg = (res.result && res.result.msg) || '未知错误'
      throw new Error(msg)
    }
  } catch (cfErr) {
    // 云函数不可用时回退到内置账号验证
    console.warn('[Auth] 云函数不可用，使用内置账号验证:', cfErr.message)
    if (username !== DEFAULT_ADMIN.username || password !== DEFAULT_ADMIN.password) {
      throw new Error('用户名或密码错误')
    }
    console.log('[Auth] 内置账号验证通过（兜底模式）')
  }

  // ===== 步骤 2：签发本地 token（路由守卫用） =====
  const token = btoa(`${username}:${Date.now()}:lingshan-admin`)
  console.log('[Auth] 登录完成:', username)
  return { token, username }
}

/**
 * 修改管理员密码
 */
export async function changePassword(username, oldPassword, newPassword) {
  try {
    const app = cloudbase.init({ env: ENV_ID })
    const res = await app.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'changeAdminPassword',
        username,
        oldPassword,
        newPassword
      }
    })
    if (res.result && res.result.code === 200) {
      return { success: true }
    }
    throw new Error((res.result && res.result.msg) || '修改失败')
  } catch (err) {
    console.error('[Auth] 修改密码失败:', err.message)
    throw err
  }
}

const authAPI = { login, changePassword }
export default authAPI
