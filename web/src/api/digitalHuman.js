/**
 * 数字人配置 API — 从 settings 集合读写
 * 数据库不可用时降级到内置默认配置
 */
import { db } from './cloudbase'
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
 * 获取数字人配置
 * 优先从数据库读取，失败时返回内置默认配置
 */
export async function getConfig() {
  try {
    const { data } = await db.collection('settings')
      .where({ type: 'digitalHuman' })
      .limit(1)
      .get()

    if (data && data.length > 0) {
      return { ...DEFAULT_CONFIG, ...data[0], _id: data[0]._id }
    }
    console.log('[DigitalHuman] 数据库中无配置，使用默认值')
    return { ...DEFAULT_CONFIG }
  } catch (err) {
    console.warn('[DigitalHuman] 数据库访问失败，使用内置默认配置:', err?.message || err?.error || err)
    return { ...DEFAULT_CONFIG }
  }
}

/**
 * 更新数字人配置（如不存在则创建）
 */
export async function updateConfig(config) {
  try {
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
  } catch (err) {
    throw wrapError(err, '保存数字人配置失败')
  }
}

const digitalHumanAPI = { getConfig, updateConfig }
export default digitalHumanAPI
