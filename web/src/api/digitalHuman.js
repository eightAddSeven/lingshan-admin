/**
 * 数字人配置 API
 *
 * 优先通过云函数（quickstartFunctions）读写 settings 集合，
 * 云函数享有管理员权限，不受匿名用户安全规则限制。
 * 云函数不可用时降级为直接数据库操作（需要 settings 集合权限正确配置）。
 *
 * 诊断：每次保存后自动回读验证，Console 输出完整诊断链路。
 */
import { app, db, isCloudBaseReady } from './cloudbase'
import { wrapError } from './utils'

const DEFAULT_CONFIG = {
  name: '小雅',
  intro: '有问题随时问我，7×24小时在线',
  welcomeMessage: '您好！我是灵山胜境AI导游小雅，有什么可以帮您的？',
  isOnline: true,
  avatarType: 'emoji',
  avatarEmoji: '🧑‍🎤',
  avatarImageUrl: '',
  replyStyle: '亲切',
  replyMaxTokens: 400,
  showSources: true
}

// ==================== 诊断工具 ====================

function log(...args) {
  console.log('[DigitalHuman]', ...args)
}

/**
 * 从数据库直接读取原始配置（不合并默认值），用于诊断验证
 */
async function readRawFromDB() {
  try {
    const { data } = await db.collection('settings')
      .where({ type: 'digitalHuman' })
      .limit(100)
      .get()
    if (data && data.length > 0) {
      // 代码排序取最新（避免依赖数据库索引）
      data.sort((a, b) => {
        const ta = a.updateTime ? new Date(a.updateTime).getTime() : 0
        const tb = b.updateTime ? new Date(b.updateTime).getTime() : 0
        return tb - ta
      })
      return { found: true, doc: data[0], total: data.length }
    }
    return { found: false, doc: null, total: 0 }
  } catch (err) {
    return { found: false, doc: null, error: err?.message || String(err) }
  }
}

// ==================== 云函数路径 ====================

async function getConfigViaCloudFunction() {
  const res = await app.callFunction({
    name: 'quickstartFunctions',
    data: { type: 'getDigitalHumanConfig' }
  })
  const result = res.result || {}
  if (result.code === 200 && result.data) {
    return { ...DEFAULT_CONFIG, ...result.data }
  }
  throw new Error(result.msg || '云函数返回异常')
}

async function updateConfigViaCloudFunction(config) {
  // 剥离 _id，避免污染文档
  const { _id, ...cleanConfig } = config
  log('☁️ 云函数保存，数据:', JSON.stringify(cleanConfig))

  const res = await app.callFunction({
    name: 'quickstartFunctions',
    data: { type: 'saveDigitalHumanConfig', config: cleanConfig }
  })
  const result = res.result || {}

  if (result.code !== 200) {
    const errMsg = result.msg || result.errMsg || '未知错误'
    if (errMsg.includes('未匹配到接口类型') || errMsg.includes('not match')) {
      throw new Error('云函数未更新：请先在微信开发者工具中右键 cloudfunctions/quickstartFunctions → 上传并部署')
    }
    throw new Error(errMsg)
  }

  log('✅ 云函数保存成功')
  return result
}

// ==================== 直接数据库路径（降级） ====================

async function getConfigViaDB() {
  const { data } = await db.collection('settings')
    .where({ type: 'digitalHuman' })
    .limit(100)
    .get()

  if (data && data.length > 0) {
    // 代码排序取最新
    data.sort((a, b) => {
      const ta = a.updateTime ? new Date(a.updateTime).getTime() : 0
      const tb = b.updateTime ? new Date(b.updateTime).getTime() : 0
      return tb - ta
    })
    return { ...DEFAULT_CONFIG, ...data[0], _id: data[0]._id }
  }
  log('数据库中无配置，使用默认值')
  return { ...DEFAULT_CONFIG }
}

async function updateConfigViaDB(config) {
  const { _id, ...fields } = config
  log('📝 直接DB保存，_id:', _id, 'fields:', JSON.stringify(fields))

  if (_id) {
    // 有 _id：直接更新指定文档
    try {
      await db.collection('settings').doc(_id).update({
        ...fields,
        updateTime: new Date()
      })
      log('✅ 直接DB更新成功 (_id:', _id, ')')
      return { success: true }
    } catch (err) {
      // 如果 _id 对应的文档不存在（可能被删除），回退到搜索模式
      log('⚠️ _id 更新失败，回退到搜索模式:', err?.message || err)
    }
  }

  // 无 _id 或 _id 更新失败：搜索已有文档（代码排序取最新，避免依赖数据库索引）
  const { data } = await db.collection('settings')
    .where({ type: 'digitalHuman' })
    .limit(100)
    .get()

  // 按 updateTime 降序排序
  if (data && data.length > 1) {
    data.sort((a, b) => {
      const ta = a.updateTime ? new Date(a.updateTime).getTime() : 0
      const tb = b.updateTime ? new Date(b.updateTime).getTime() : 0
      return tb - ta
    })
  }

  if (data && data.length > 0) {
    // 更新最新一条
    await db.collection('settings').doc(data[0]._id).update({
      ...fields,
      updateTime: new Date()
    })
    log('✅ 直接DB更新成功 (查找到的_id:', data[0]._id, ')')

    // 清理历史重复文档
    if (data.length > 1) {
      for (let i = 1; i < data.length; i++) {
        try {
          await db.collection('settings').doc(data[i]._id).remove()
          log('🧹 清理重复文档 _id:', data[i]._id)
        } catch (e) {
          log('⚠️ 清理失败 _id:', data[i]._id, e?.message || e)
        }
      }
    }
  } else {
    // 真的没有文档，新增
    const addRes = await db.collection('settings').add({
      type: 'digitalHuman',
      ...fields,
      createTime: new Date(),
      updateTime: new Date()
    })
    log('✅ 直接DB新增成功 (_id:', addRes.id, ')')
  }
  return { success: true }
}

// ==================== 公开 API ====================

/**
 * 获取数字人配置
 * 优先云函数，失败则降级直接数据库
 */
export async function getConfig() {
  log('🔍 获取配置 | CloudBase就绪:', isCloudBaseReady())

  if (isCloudBaseReady()) {
    try {
      log('  尝试云函数...')
      const cfg = await getConfigViaCloudFunction()
      log('✅ 云函数获取成功:', cfg.name)
      return cfg
    } catch (err) {
      log('❌ 云函数获取失败，降级到直接数据库:', err?.message || err)
    }
  }

  try {
    const cfg = await getConfigViaDB()
    log('✅ 直接DB获取成功:', cfg.name)
    return cfg
  } catch (err) {
    log('❌ 数据库访问失败，使用内置默认配置:', err?.message || err?.error || err)
    return { ...DEFAULT_CONFIG }
  }
}

/**
 * 更新数字人配置（如不存在则创建）
 * 优先云函数，失败则降级直接数据库
 * 保存后自动回读验证，确保数据真正写入
 */
export async function updateConfig(config) {
  log('💾 保存配置 | CloudBase就绪:', isCloudBaseReady())
  log('  传入数据:', JSON.stringify(config))

  let savedOk = false

  // ── 路径 1：云函数 ──
  if (isCloudBaseReady()) {
    try {
      const res = await updateConfigViaCloudFunction(config)
      savedOk = true
      log('  云函数返回值:', JSON.stringify(res))
    } catch (err) {
      log('❌ 云函数保存失败，降级到直接数据库:', err?.message || err)
    }
  } else {
    log('⚠️ CloudBase 未就绪，跳过云函数，直接走 DB')
  }

  // ── 路径 2：直接数据库（降级 / CloudBase 未就绪时的唯一路径）───
  if (!savedOk) {
    try {
      await updateConfigViaDB(config)
      savedOk = true
    } catch (err) {
      const rawMsg = err?.message || err?.error || String(err)
      if (rawMsg.includes('Permission denied') || rawMsg.includes('admin only')) {
        throw new Error(
          '数据库权限不足。请二选一：\n' +
          '①（推荐）部署云函数：微信开发者工具 → cloudfunctions/quickstartFunctions → 右键 → 上传并部署\n' +
          '② 修改集合权限：CloudBase 控制台 → 数据库 → settings → 权限 → 设为"所有用户可读写"'
        )
      }
      throw wrapError(err, '保存数字人配置失败')
    }
  }

  // ── 保存后回读验证 ──
  log('🔎 保存后验证：回读数据库...')
  const verify = await readRawFromDB()
  if (verify.found) {
    log('  数据库当前值:', JSON.stringify(verify.doc))
    log('  期望 name:', config.name, '→ 实际 name:', verify.doc.name)
    if (verify.doc.name === config.name) {
      log('✅ 验证通过：数据库已更新为最新值')
    } else {
      log('❌ 验证失败：数据库中的 name 与期望不一致！')
    }
  } else {
    log('❌ 验证失败：数据库中未找到 digitalHuman 文档！', verify.error || '')
  }

  return { success: true }
}

const digitalHumanAPI = { getConfig, updateConfig }
export default digitalHumanAPI
