<template>
  <div class="page-container">
    <div class="page-header">
      <h2>
        <el-icon><UserFilled /></el-icon>
        数字人形象配置
      </h2>
      <p>配置 AI 导游在小程序中的展示形象和对话风格</p>
    </div>

    <div class="card-box" v-loading="loading">
      <el-form :model="form" label-width="120px" style="max-width: 680px">
        <!-- 基本设置 -->
        <div class="form-section">
          <div class="form-section-title">
            <el-icon><Setting /></el-icon>
            基本设置
          </div>
          <el-form-item label="数字人名称">
            <el-input v-model="form.name" placeholder="如：小雅" />
          </el-form-item>

          <el-form-item label="简介">
            <el-input v-model="form.intro" placeholder="如：有问题随时问我，7×24小时在线" />
          </el-form-item>

          <el-form-item label="欢迎语">
            <el-input v-model="form.welcomeMessage" type="textarea" :rows="3" placeholder="用户进入AI导游页面的第一句问候" />
          </el-form-item>

          <el-form-item label="在线状态">
            <el-switch v-model="form.isOnline" active-text="在线" inactive-text="离线" />
          </el-form-item>
        </div>

        <!-- 头像设置 -->
        <div class="form-section">
          <div class="form-section-title">
            <el-icon><PictureFilled /></el-icon>
            头像设置
          </div>
          <el-form-item label="头像类型">
            <el-radio-group v-model="form.avatarType">
              <el-radio value="emoji">Emoji 表情</el-radio>
              <el-radio value="image">自定义图片</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item v-if="form.avatarType === 'emoji'" label="Emoji">
            <el-input v-model="form.avatarEmoji" style="width: 140px" maxlength="4" />
            <span class="emoji-preview">{{ form.avatarEmoji }}</span>
          </el-form-item>

          <el-form-item v-if="form.avatarType === 'image'" label="图片 URL">
            <el-input v-model="form.avatarImageUrl" placeholder="cloud:// 或 https:// 开头的图片地址" />
          </el-form-item>
        </div>

        <!-- 对话设置 -->
        <div class="form-section">
          <div class="form-section-title">
            <el-icon><ChatDotSquare /></el-icon>
            对话设置
          </div>
          <el-form-item label="回复风格">
            <el-select v-model="form.replyStyle" style="width: 200px">
              <el-option label="亲切" value="亲切" />
              <el-option label="专业" value="专业" />
              <el-option label="简洁" value="简洁" />
              <el-option label="幽默" value="幽默" />
            </el-select>
          </el-form-item>

          <el-form-item label="最大回复字数">
            <el-input-number v-model="form.replyMaxTokens" :min="100" :max="800" :step="50" />
          </el-form-item>

          <el-form-item label="显示参考来源">
            <el-switch v-model="form.showSources" />
            <span class="switch-hint">开启后将在回答末尾显示知识来源</span>
          </el-form-item>
        </div>

        <div class="form-actions">
          <el-button type="primary" :loading="saving" @click="handleSave">
            <el-icon><Check /></el-icon>
            保存配置
          </el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import digitalHumanAPI from '../../api/digitalHuman'
import { UserFilled, Setting, PictureFilled, ChatDotSquare, Check } from '@element-plus/icons-vue'

const loading = ref(false)
const saving = ref(false)

const form = reactive({
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
})

onMounted(async () => {
  loading.value = true
  try {
    const res = await digitalHumanAPI.getConfig()
    if (res) Object.assign(form, res)
  } catch (e) {
    console.error('加载数字人配置失败', e)
  } finally {
    loading.value = false
  }
})

async function handleSave() {
  saving.value = true
  try {
    const res = await digitalHumanAPI.updateConfig({ ...form })
    console.log('[HumanConfig] 保存成功:', res)
    // 如果云函数返回了 _id，同步更新 form
    if (res && res.data && res.data._id) {
      form._id = res.data._id
    }
    ElMessage.success('配置已保存，小程序端重启后即可看到更新')
  } catch (e) {
    const msg = e?.message || e?.errorMessage || e?.error || '保存失败'
    console.error('[HumanConfig] 保存失败:', msg, e)
    ElMessage.error('保存失败: ' + msg)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.emoji-preview {
  font-size: 36px;
  margin-left: 14px;
  vertical-align: middle;
}

.switch-hint {
  margin-left: 10px;
  font-size: 12px;
  color: var(--text-secondary);
}

.form-actions {
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
}
</style>
