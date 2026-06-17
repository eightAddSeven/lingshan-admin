/**
 * API 入口 — 统一导出所有 API 模块
 * 基于 CloudBase JS SDK 直接操作云数据库
 */
export { initCloudBase, app, db, auth, ENV_ID } from './cloudbase'
export { login, changePassword } from './auth'
import knowledgeAPI from './knowledge'
import dashboardAPI from './dashboard'
import reportsAPI from './reports'
import digitalHumanAPI from './digitalHuman'
import faqAPI from './faq'

export { knowledgeAPI, dashboardAPI, reportsAPI, digitalHumanAPI, faqAPI }
