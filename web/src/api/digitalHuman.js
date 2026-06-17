/**
 * 数字人配置 API
 *
 * 优先通过云函数（quickstartFunctions）读写 settings 集合，
 * 云函数享有管理员权限，不受匿名用户安全规则限制。
 * 云函数不可用时降级为直接数据库操作（需要 settings 集合权限正确配置）。
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

/**
 * 通过云函数获取数字人配置
 */
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

/**
 * 通过云函数保存数字人配置
 */
async function updateConfigViaCloudFunction(config) {
  const res = await app.callFunction({
    name: 'quickstartFunctions',
    data: { type: 'saveDigitalHumanConfig', config }
  })
  const result = res.result || {}
  if (result.code !== 200) {
    // 云函数返回了错误 — 需要区分"未部署新代码"和真正的保存失败
    const errMsg = result.msg || result.errMsg || '未知错误'
    if (errMsg.includes('未匹配到接口类型') || errMsg.includes('not match')) {
      throw new Error('云函数未更新：请先在微信开发者工具中右键 cloudfunctions/quickstartFunctions → 上传并部署')
    }
    throw new Error(errMsg)
  }
  return result
}

/**
 * 直接数据库读取（降级方案）
 */
async function getConfigViaDB() {
  const { data } = await db.collection('settings')
    .where({ type: 'digitalHuman' })
    .limit(1)
    .get()

  if (data && data.length > 0) {
    return { ...DEFAULT_CONFIG, ...data[0], _id: data[0]._id }
  }
  console.log('[DigitalHuman] 数据库中无配置，使用默认值')
  return { ...DEFAULT_CONFIG }
}

/**
 * 直接数据库写入（降级方案）
 */
async function updateConfigViaDB(config) {
  const { _id, ...fields } = config

  if (_id) {
    await db.collection('settings').doc(_id).update({
      ...fields,
      updateTime: new Date()
    })
  } else {
    const { data } = await db.collection('settings')
      .where({ type: 'digitalHuman' })
      .limit(1)
      .get()

    if (data && data.length > 0) {
      await db.collection('settings').doc(data[0]._id).update({
        ...fields,
        updateTime: new Date()
      })
    } else {
      await db.collection('settings').add({
        type: 'digitalHuman',
        ...fields,
        createTime: new Date(),
        updateTime: new Date()
      })
    }
  }
  return { success: true }
}

/**
 * 获取数字人配置
 * 优先云函数，失败则降级直接数据库
 */
export async function getConfig() {
  // 尝试云函数
  if (isCloudBaseReady()) {
    try {
      console.log('[DigitalHuman] 通过云函数获取配置...')
      return await getConfigViaCloudFunction()
    } catch (err) {
      console.warn('[DigitalHuman] 云函数获取失败，降级到直接数据库:', err?.message || err)
    }
  }

  // 降级：直接数据库
  try {
    return await getConfigViaDB()
  } catch (err) {
    console.warn('[DigitalHuman] 数据库访问失败，使用内置默认配置:', err?.message || err?.error || err)
    return { ...DEFAULT_CONFIG }
  }
}

/**
 * 更新数字人配置（如不存在则创建）
 * 优先云函数，失败则降级直接数据库
 */
export async function updateConfig(config) {
  // 尝试云函数
  if (isCloudBaseReady()) {
    try {
      console.log('[DigitalHuman] 通过云函数保存配置...')
      return await updateConfigViaCloudFunction(config)
    } catch (err) {
      console.warn('[DigitalHuman] 云函数保存失败，降级到直接数据库:', err?.message || err)
    }
  }

  // 降级：直接数据库
  try {
    return await updateConfigViaDB(config)
  } catch (err) {
    const rawMsg = err?.message || err?.error || String(err)
    // 检测权限错误，给出具体指引
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

const digitalHumanAPI = { getConfig, updateConfig }
export default digitalHumanAPI
