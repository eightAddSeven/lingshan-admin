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
            <el-col :span="6">
              <el-form-item label="所属景区" prop="areaId">
                <el-select v-model="form.areaId" placeholder="选择景区" style="width:100%">
                  <el-option value="lingshan" label="灵山胜境" />
                  <el-option value="nianhuawan" label="拈花湾禅意小镇" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="景点名称" prop="name">
                <el-input v-model="form.name" placeholder="如：灵山大佛" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="所属集合" prop="collection">
                <el-radio-group v-model="form.collection" :disabled="isEdit">
                  <el-radio value="knowledge">knowledge</el-radio>
                  <el-radio value="knowledge_full">knowledge_full</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="标题" prop="title">
                <el-input v-model="form.title" placeholder="简短标题" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="6">
              <el-form-item label="编号" prop="docId">
                <el-input v-model="form.docId" placeholder="如：LS-001" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="图标Emoji" prop="icon">
                <el-input v-model="form.icon" placeholder="如：🛕" maxlength="4" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="标签" prop="tag">
                <el-input v-model="form.tag" placeholder="如：必打卡" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="标签颜色" prop="tagColor">
                <el-color-picker v-model="form.tagColor" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="6">
              <el-form-item label="游览时长" prop="time">
                <el-input v-model="form.time" placeholder="如：约1.5小时" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="热度值" prop="heat">
                <el-input v-model="form.heat" placeholder="如：1.8w" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="排序序号" prop="sortOrder">
                <el-input-number v-model="form.sortOrder" :min="1" :max="999" controls-position="right" style="width:100%" />
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="开放时间" prop="openInfo">
                <el-input v-model="form.openInfo" placeholder="如：07:00-17:30" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="图片路径" prop="image">
                <el-input v-model="form.image" placeholder="如：/images/灵山大佛.jpg">
                  <template #prepend>/images/</template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="简短描述" prop="desc">
                <el-input v-model="form.desc" placeholder="景点卡片上的简短描述" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="GPS纬度" prop="latitude">
                <el-input-number v-model="form.latitude" :precision="6" :step="0.001" controls-position="right" style="width:100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="GPS经度" prop="longitude">
                <el-input-number v-model="form.longitude" :precision="6" :step="0.001" controls-position="right" style="width:100%" />
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
              <el-form-item label="游览提示" prop="tips">
                <el-input v-model="form.tips" type="textarea" :rows="3" placeholder="参观注意事项、游览建议、小贴士" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="备注" prop="remark">
                <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="其他备注信息" />
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
  // 景区归属
  areaId: 'lingshan',
  areaName: '',
  // 基本信息
  name: '',
  docId: '',
  title: '',
  icon: '',
  image: '',
  desc: '',
  tag: '',
  tagColor: '#2E8B57',
  time: '',
  heat: '',
  sortOrder: 1,
  latitude: null,
  longitude: null,
  // 详细内容
  location: '',
  detail: '',
  content: '',
  // 附加信息
  params: '',
  function: '',
  culture: '',
  highlight: '',
  openInfo: '',
  tips: '',
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
        areaId: res.areaId || 'lingshan',
        areaName: res.areaName || '',
        name: res.name || '',
        docId: res.docId || '',
        title: res.title || '',
        icon: res.icon || '',
        image: res.image || '',
        desc: res.desc || '',
        tag: res.tag || '',
        tagColor: res.tagColor || '#2E8B57',
        time: res.time || '',
        heat: res.heat || '',
        sortOrder: res.sortOrder || 1,
        latitude: res.latitude || null,
        longitude: res.longitude || null,
        location: res.location || '',
        detail: res.detail || '',
        content: res.content || '',
        params: res.params || '',
        function: res.function || '',
        culture: res.culture || '',
        highlight: res.highlight || '',
        openInfo: res.openInfo || '',
        tips: res.tips || '',
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
      type: 'spot',
      areaId: form.areaId,
      areaName: form.areaId === 'lingshan' ? '灵山胜境' : '拈花湾禅意小镇',
      name: form.name,
      docId: form.docId,
      title: form.title,
      icon: form.icon,
      image: form.image,
      desc: form.desc,
      tag: form.tag,
      tagColor: form.tagColor,
      time: form.time,
      heat: form.heat,
      sortOrder: form.sortOrder,
      latitude: form.latitude,
      longitude: form.longitude,
      location: form.location,
      detail: form.detail,
      content: form.content,
      params: form.params,
      function: form.function,
      culture: form.culture,
      highlight: form.highlight,
      openInfo: form.openInfo,
      tips: form.tips,
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
