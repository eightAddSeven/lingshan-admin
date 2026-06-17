import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as doLogin } from '../api/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref('')
  const username = ref('')

  const isLoggedIn = computed(() => !!token.value)

  /**
   * 登录
   * @param {string} user - 管理员用户名
   * @param {string} pass - 管理员密码
   */
  async function login(user, pass) {
    const data = await doLogin(user, pass)
    token.value = data.token
    username.value = data.username || user
    // 同步存入 localStorage，供 cloudbase.js 和路由守卫读取
    localStorage.setItem('lingshan-admin-token', data.token)
    localStorage.setItem('lingshan-admin-username', data.username || user)
  }

  function logout() {
    token.value = ''
    username.value = ''
    localStorage.removeItem('lingshan-admin-token')
    localStorage.removeItem('lingshan-admin-username')
  }

  return { token, username, isLoggedIn, login, logout }
}, {
  persist: {
    key: 'lingshan-admin-auth',
    storage: localStorage
  }
})
