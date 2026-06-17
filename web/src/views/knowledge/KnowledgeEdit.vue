<template>
  <div class="page-container">
    <div class="page-header">
      <h2>
        <el-icon><EditPen /></el-icon>
        {{ isEdit ? '编辑知识' : '新增知识' }}
      </h2>
      <p>
        <el-button text size="small" @click="$router.back()">
          <el-icon><ArrowLeft /></el-icon>
          返回列表
        </el-button>
      </p>
    </div>

    <div class="card-box" v-loading="loading">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <!-- 基本信息 -->
        <div class="form-section">
          <div class="form-section-title">
            <el-icon><InfoFilled /></el-icon>
            基本信息
          </div>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="景点名称" prop="name">
                <el-input v-model="form.name" placeholder="如：灵山大佛" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="所属集合" prop="collection">
                <el-radio-group v-model="form.collection" :disabled="isEdit">
                  <el-radio value="knowledge">knowledge</el-radio>
                  <el-radio value="knowledge_full">knowledge_full</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="标题" prop="title">
                <el-input v-model="form.title" placeholder="简短标题" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="位置信息" prop="location">
            <el-input v-model="form.location" placeholder="景点在景区中的位置描述" />
          </el-form-item>
        </div>

        <!-- 详细内容 -->
        <div class="form-section">
          <div class="form-section-title">
            <el-icon><Document /></el-icon>
            详细内容
          </div>
          <el-form-item label="详细介绍" prop="detail">
            <el-input v-model="form.detail" type="textarea" :rows="3" placeholder="景点的详细介绍" />
          </el-form-item>

          <el-form-item label="正文内容" prop="content">
            <el-input v-model="form.content" type="textarea" :rows="5" placeholder="用于向量检索的完整知识内容" />
          </el-form-item>
        </div>

        <!-- 附加信息 -->
        <div class="form-section">
          <div class="form-section-title">
            <el-icon><More /></el-icon>
            附加信息
          </div>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="规格参数" prop="params">
                <el-input v-model="form.params" placeholder="高度、宽度、面积等数据" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="功能用途" prop="function">
                <el-input v-model="form.function" placeholder="景点的功能作用" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="文化内涵" prop="culture">
                <el-input v-model="form.culture" type="textarea" :rows="2" placeholder="文化背景、典故、寓意" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="亮点特色" prop="highlight">
                <el-input v-model="form.highlight" type="textarea" :rows="2" placeholder="打卡点、拍照机位、特色体验" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="开放信息" prop="openInfo">
                <el-input v-model="form.openInfo" placeholder="开放时间、演出场次等" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="备注提示" prop="remark">
                <el-input v-model="form.remark" placeholder="参观注意事项、小贴士" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 操作按钮 -->
        <div class="form-actions">
          <el-button type="primary" :loading="saving" @click="handleSave">
            <el-icon><Check /></el-icon>
            保存
          </el-button>
          <el-button @click="$router.back()">取消</el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import knowledgeAPI from '../../api/knowledge'
import { EditPen, ArrowLeft, InfoFilled, Document, More, Check } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const formRef = ref(null)
const loading = ref(false)
const saving = ref(false)

const isEdit = ref(false)

const form = reactive({
  collection: 'knowledge',
  name: '',
  title: '',
  location: '',
  detail: '',
  content: '',
  params: '',
  function: '',
  culture: '',
  highlight: '',
  openInfo: '',
  remark: ''
})

const rules = {
  name: [{ required: true, message: '请输入景点名称', trigger: 'blur' }],
  content: [{ required: true, message: '请输入正文内容', trigger: 'blur' }]
}

onMounted(async () => {
  const id = route.params.id
  // 从 URL query 获取 collection（优先），默认为 knowledge
  const coll = route.query.collection || 'knowledge'
  form.collection = coll

  if (id) {
    isEdit.value = true
    loading.value = true
    try {
      const res = await knowledgeAPI.getDetail(coll, id)
      // 将数据库字段映射到表单（不覆盖 _id 和 collection）
      Object.assign(form, {
        name: res.name || '',
        title: res.title || '',
        location: res.location || '',
        detail: res.detail || '',
        content: res.content || '',
        params: res.params || '',
        function: res.function || '',
        culture: res.culture || '',
        highlight: res.highlight || '',
        openInfo: res.openInfo || '',
        remark: res.remark || ''
      })
    } catch (err) {
      ElMessage.error('加载知识详情失败: ' + (err.message || '未知错误'))
    } finally {
      loading.value = false
    }
  }
})

async function handleSave() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const payload = {
      collection: form.collection,
      name: form.name,
      title: form.title,
      location: form.location,
      detail: form.detail,
      content: form.content,
      params: form.params,
      function: form.function,
      culture: form.culture,
      highlight: form.highlight,
      openInfo: form.openInfo,
      remark: form.remark
    }

    if (isEdit.value) {
      payload.id = route.params.id
      await knowledgeAPI.update(payload)
      ElMessage.success('更新成功')
    } else {
      await knowledgeAPI.create(payload)
      ElMessage.success('创建成功')
    }
    router.push('/knowledge')
  } catch (err) {
    console.error('保存失败:', err)
    ElMessage.error('保存失败: ' + (err.message || '未知错误'))
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.card-box {
  overflow: hidden;
}

.form-section {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);
}

.form-actions {
  padding-top: 16px;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 10px;
}
</style>
