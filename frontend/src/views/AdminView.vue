<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { del, get, post, put } from '@/api/api'
import AdminTable from '@/components/admin/AdminTable.vue'
import type {
  AdminTableColumn,
  AdminTableRow,
} from '@/components/admin/AdminTable.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotifyStore } from '@/stores/notify'
import { useUserStore } from '@/stores/user'

interface Subject {
  request_uuid: string
  subject: number
  profession_id: string
  profession_name: string
}

interface AdminUser {
  uuid: string
  nick: string
  name: string | null
  id_number?: string | null
  school: string | null
  profession: string | null
  permission: number
  reg_date: string
  last_login: string
}

interface CrawlJob {
  id: string
  status: 'queued' | 'running' | 'success' | 'failed'
  course: number
  subject: number
  times: number
  created_at: string
  started_at?: string
  finished_at?: string
  result?: { elapsed_time?: number; is_parse_success?: boolean }
  error?: string
}

const authStore = useAuthStore()
const userStore = useUserStore()
const notifyStore = useNotifyStore()
const route = useRoute()
const tokenConfig = () => ({
  headers: { Authorization: `Bearer ${authStore.readToken()}` },
})

const subjects = ref<Subject[]>([])
const users = ref<AdminUser[]>([])
const jobs = ref<CrawlJob[]>([])
const registrationEnabled = ref(true)
const subjectModalOpen = ref(false)
const userModalOpen = ref(false)
const crawlModalOpen = ref(false)
const selectedUser = ref<AdminUser | null>(null)
const userIdentityLoading = ref(false)
const userIdentityFailed = ref(false)
const subjectForm = ref({
  request_uuid: '',
  subject: 0,
  profession_id: '',
  profession_name: '',
  id_number: '',
})
const userForm = ref({ nick: '', password: '', permission: 0 })
const crawlForm = ref({ course: 1, subject: 1, times: 1 })
let pollTimer: number | undefined

const isAdmin = computed(
  () => userStore.login.isLogged && userStore.profile.permission >= 10,
)
const subjectItems = computed(() =>
  subjects.value.map((item) => ({
    label: `${item.subject} · ${item.profession_name}`,
    value: item.subject,
  })),
)
const section = computed(() => route.path.split('/').at(-1) || 'subjects')
const subjectColumns: AdminTableColumn[] = [
  { key: 'subject', label: '编号' },
  { key: 'profession_name', label: '专业课' },
  { key: 'profession_id', label: '英文 ID' },
]
const userColumns: AdminTableColumn[] = [
  { key: 'name', label: '姓名', maxLength: 12 },
  { key: 'nick', label: '昵称', maxLength: 12 },
  { key: 'school', label: '学校' },
  { key: 'profession', label: '专业' },
  { key: 'permission', label: '权限' },
]
const jobColumns: AdminTableColumn[] = [
  { key: 'status', label: '状态' },
  { key: 'course', label: '课程' },
  { key: 'subject', label: '科目' },
  { key: 'times', label: '轮数' },
  { key: 'created_at', label: '创建时间' },
  { key: 'result', label: '结果' },
]
const subjectRows = computed<AdminTableRow[]>(() =>
  subjects.value.map((subject) => ({ ...subject })),
)
const userRows = computed<AdminTableRow[]>(() =>
  users.value.map((user) => ({
    uuid: user.uuid,
    name: userDisplayName(user),
    nick: user.nick || '—',
    school: user.school || '—',
    profession: user.profession || '—',
    permission: user.permission,
  })),
)
const jobRows = computed<AdminTableRow[]>(() =>
  jobs.value.map((job) => ({
    id: job.id,
    status: job.status,
    course: job.course === 2 ? '专业课' : '文化课',
    subject: job.subject,
    times: job.times,
    created_at: job.created_at,
    result:
      job.error ||
      (job.result
        ? `耗时 ${((job.result.elapsed_time || 0) / 1000).toFixed(2)} 秒`
        : '处理中'),
  })),
)

const responseData = (response: any) => response.data?.data
const showError = (message: string) => notifyStore.addMessage('failed', message)
const userDisplayName = (user: AdminUser) =>
  user.name || user.nick || '未设置昵称'
const findSubject = (row: AdminTableRow) =>
  subjects.value.find((subject) => subject.request_uuid === row.request_uuid)
const findUser = (row: AdminTableRow) =>
  users.value.find((user) => user.uuid === row.uuid)

const loadData = async () => {
  if (!isAdmin.value) return
  try {
    const [subjectResponse, userResponse, registrationResponse, jobResponse] =
      await Promise.all([
        get('/admin/subjects', undefined, tokenConfig()),
        get('/admin/users', undefined, tokenConfig()),
        get('/admin/registration', undefined, tokenConfig()),
        get('/admin/crawl/jobs', undefined, tokenConfig()),
      ])
    subjects.value = responseData(subjectResponse) || []
    users.value = responseData(userResponse) || []
    registrationEnabled.value = Boolean(
      responseData(registrationResponse)?.enabled,
    )
    jobs.value = responseData(jobResponse) || []
  } catch {
    showError('获取管理员数据失败')
  }
}

const saveRegistration = async (enabled: boolean) => {
  try {
    const response = await put(
      '/admin/registration',
      { enabled },
      tokenConfig(),
    )
    registrationEnabled.value = Boolean(responseData(response)?.enabled)
    notifyStore.addMessage(
      'success',
      registrationEnabled.value ? '已开放注册' : '已关闭注册',
    )
  } catch {
    showError('注册开关保存失败')
  }
}

const openSubject = (subject?: Subject) => {
  subjectForm.value = subject
    ? { ...subject, id_number: '' }
    : {
        request_uuid: '',
        subject: 0,
        profession_id: '',
        profession_name: '',
        id_number: '',
      }
  subjectModalOpen.value = true
}

const saveSubject = async () => {
  try {
    const payload = {
      subject: subjectForm.value.subject,
      profession_id: subjectForm.value.profession_id,
      profession_name: subjectForm.value.profession_name,
      ...(subjectForm.value.id_number
        ? { id_number: subjectForm.value.id_number }
        : {}),
    }
    if (subjectForm.value.request_uuid)
      await put(
        `/admin/subjects/${subjectForm.value.request_uuid}`,
        payload,
        tokenConfig(),
      )
    else await post('/admin/subjects', payload, tokenConfig())
    subjectModalOpen.value = false
    await loadData()
    notifyStore.addMessage('success', '专业课保存成功')
  } catch {
    showError('专业课保存失败')
  }
}

const removeSubject = async (subject: Subject) => {
  if (!window.confirm(`确认删除「${subject.profession_name}」？`)) return
  try {
    await del(
      `/admin/subjects/${subject.request_uuid}`,
      undefined,
      tokenConfig(),
    )
    await loadData()
  } catch {
    showError('专业课删除失败')
  }
}

const removeSubjectRow = (row: AdminTableRow) => {
  const subject = findSubject(row)
  if (subject) void removeSubject(subject)
}

const editSubjectRow = (row: AdminTableRow) => {
  const subject = findSubject(row)
  if (subject) openSubject(subject)
}

const openUser = async (user?: AdminUser) => {
  selectedUser.value = user || null
  userIdentityLoading.value = Boolean(user)
  userIdentityFailed.value = false
  userForm.value = {
    nick: user?.nick || '',
    password: '',
    permission: user?.permission || 0,
  }
  userModalOpen.value = true

  if (!user) return

  try {
    const response = await get(
      `/admin/users/${user.uuid}`,
      undefined,
      tokenConfig(),
    )
    selectedUser.value = { ...user, ...responseData(response) }
  } catch {
    userIdentityFailed.value = true
    showError('获取用户身份信息失败')
  } finally {
    userIdentityLoading.value = false
  }
}

const saveUser = async () => {
  try {
    const payload = {
      nick: userForm.value.nick,
      permission: userForm.value.permission,
      ...(userForm.value.password ? { password: userForm.value.password } : {}),
    }
    if (selectedUser.value)
      await put(
        `/admin/users/${selectedUser.value.uuid}`,
        payload,
        tokenConfig(),
      )
    else await post('/admin/users', payload, tokenConfig())
    userModalOpen.value = false
    await loadData()
    notifyStore.addMessage('success', '用户保存成功')
  } catch {
    showError('用户保存失败')
  }
}

const removeUser = async (user: AdminUser) => {
  if (!window.confirm(`确认删除用户「${user.nick}」？`)) return
  try {
    await del(`/admin/users/${user.uuid}`, undefined, tokenConfig())
    await loadData()
  } catch {
    showError('用户删除失败')
  }
}

const editUserRow = (row: AdminTableRow) => {
  const user = findUser(row)
  if (user) openUser(user)
}

const removeUserRow = (row: AdminTableRow) => {
  const user = findUser(row)
  if (user) void removeUser(user)
}

const createCrawlJob = async () => {
  try {
    await post('/admin/crawl/jobs', crawlForm.value, tokenConfig())
    crawlModalOpen.value = false
    await loadData()
    notifyStore.addMessage('success', '爬取任务已加入队列')
  } catch {
    showError('创建爬取任务失败')
  }
}

onMounted(() => {
  if (!isAdmin.value) return
  void loadData()
  pollTimer = window.setInterval(() => void loadData(), 5000)
})

onUnmounted(() => {
  if (pollTimer) window.clearInterval(pollTimer)
})
</script>

<template>
  <div class="page-container-slide page-admin">
    <div class="admin-titlebar">
      <div class="page-container-title">管理</div>
      <div v-if="isAdmin" class="admin-title-actions">
        <UButton
          icon="i-lucide-refresh-cw"
          variant="ghost"
          aria-label="刷新"
          title="刷新"
          @click="loadData"
        />
        <template v-if="section === 'subjects'">
          <UButton icon="i-lucide-plus" @click="openSubject()">
            新增专业课
          </UButton>
        </template>
        <template v-else-if="section === 'users'">
          <USwitch
            v-model="registrationEnabled"
            label="开放注册"
            @update:model-value="saveRegistration"
          />
          <UButton icon="i-lucide-user-plus" @click="openUser()">
            新增用户
          </UButton>
        </template>
        <UButton v-else icon="i-lucide-play" @click="crawlModalOpen = true">
          开始爬取
        </UButton>
      </div>
    </div>
    <UAlert
      v-if="!isAdmin"
      color="warning"
      title="仅管理员可访问"
      description="当前账号没有管理员权限。"
    />
    <template v-else>
      <nav class="admin-tabs" aria-label="管理板块">
        <RouterLink
          v-for="tab in [
            { label: '专业课', value: 'subjects' },
            { label: '用户', value: 'users' },
            { label: '爬题', value: 'crawl' },
          ]"
          :key="tab.value"
          :to="`/admin/${tab.value}`"
          class="admin-tab"
          :class="{ active: section === tab.value }"
          :aria-current="section === tab.value ? 'page' : undefined"
        >
          {{ tab.label }}
        </RouterLink>
      </nav>

      <section v-if="section === 'subjects'" class="admin-panel">
        <AdminTable
          :columns="subjectColumns"
          :rows="subjectRows"
          :actions="true"
          empty="暂无专业课"
        >
          <template #actions="{ row }">
            <div class="admin-row-actions">
              <UButton
                size="xs"
                variant="ghost"
                icon="i-lucide-pencil"
                aria-label="编辑专业课"
                @click="editSubjectRow(row)"
              />
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                aria-label="删除专业课"
                @click="removeSubjectRow(row)"
              />
            </div>
          </template>
        </AdminTable>
      </section>

      <section v-else-if="section === 'users'" class="admin-panel">
        <AdminTable
          :columns="userColumns"
          :rows="userRows"
          :actions="true"
          empty="暂无用户"
        >
          <template #actions="{ row }">
            <div class="admin-row-actions">
              <UButton
                size="xs"
                variant="ghost"
                icon="i-lucide-pencil"
                aria-label="编辑用户"
                @click="editUserRow(row)"
              />
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                aria-label="删除用户"
                @click="removeUserRow(row)"
              />
            </div>
          </template>
        </AdminTable>
      </section>

      <section v-else class="admin-panel">
        <AdminTable
          :columns="jobColumns"
          :rows="jobRows"
          empty="暂无爬取任务"
        />
      </section>
    </template>

    <UModal v-model:open="subjectModalOpen" title="专业课设置">
      <template #body>
        <div class="modal-form">
          <UFormField label="课程编号" class="w-full">
            <UInput
              v-model="subjectForm.subject"
              type="number"
              class="w-full"
            />
          </UFormField>
          <UFormField label="英文 ID" class="w-full">
            <UInput v-model="subjectForm.profession_id" class="w-full" />
          </UFormField>
          <UFormField label="中文名称" class="w-full">
            <UInput v-model="subjectForm.profession_name" class="w-full" />
          </UFormField>
          <UFormField label="获取题目的身份证" class="w-full">
            <UInput v-model="subjectForm.id_number" class="w-full" />
          </UFormField>
          <UButton block @click="saveSubject">保存</UButton>
        </div>
      </template>
    </UModal>
    <UModal
      v-model:open="userModalOpen"
      :title="selectedUser ? '编辑用户' : '新增用户'"
    >
      <template #body>
        <div class="modal-form">
          <UFormField label="昵称" class="w-full">
            <UInput v-model="userForm.nick" class="w-full" />
          </UFormField>
          <UFormField v-if="selectedUser" label="UUID" class="w-full">
            <UInput :model-value="selectedUser.uuid" readonly class="w-full" />
          </UFormField>
          <UFormField v-if="selectedUser" label="身份证" class="w-full">
            <UInput
              :model-value="
                userIdentityLoading
                  ? '加载中…'
                  : userIdentityFailed
                    ? '加载失败'
                    : selectedUser.id_number || '未绑定'
              "
              readonly
              class="w-full"
            />
          </UFormField>
          <UFormField label="密码" class="w-full">
            <UInput
              v-model="userForm.password"
              placeholder="留空表示不修改"
              type="password"
              class="w-full"
            />
          </UFormField>
          <UFormField label="权限等级" class="w-full">
            <UInput
              v-model="userForm.permission"
              type="number"
              class="w-full"
            />
          </UFormField>
          <UButton block @click="saveUser">保存</UButton>
        </div>
      </template>
    </UModal>
    <UModal v-model:open="crawlModalOpen" title="爬取题目">
      <template #body>
        <div class="modal-form">
          <UFormField label="课程类型" class="w-full">
            <USelect
              v-model="crawlForm.course"
              :items="[
                { label: '文化课', value: 1 },
                { label: '专业课', value: 2 },
              ]"
              class="w-full"
            />
          </UFormField>
          <UFormField label="科目" class="w-full">
            <USelect
              v-model="crawlForm.subject"
              :items="subjectItems"
              class="w-full"
            />
          </UFormField>
          <UFormField label="爬取轮数" class="w-full">
            <UInput
              v-model="crawlForm.times"
              type="number"
              :min="1"
              class="w-full"
            />
          </UFormField>
          <UButton block icon="i-lucide-play" @click="createCrawlJob">
            开始爬取
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style lang="scss" scoped>
.page-admin {
  overflow-y: auto;
}
.admin-tabs {
  display: flex;
  gap: 0.5rem;
  margin: 0 0 1rem;
  border-bottom: 1px solid var(--border-color-base--darker);
}
.admin-tab {
  padding: 0.65rem 1rem;
  color: var(--color-base--subtle);
  text-decoration: none;
  border-bottom: 2px solid transparent;
}
.admin-tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}
.admin-titlebar,
.admin-title-actions {
  display: flex;
  align-items: center;
}
.admin-titlebar {
  justify-content: space-between;
  margin-bottom: 1rem;
}
.admin-title-actions {
  gap: 0.75rem;
}
.admin-panel {
  min-width: 0;
}
.admin-row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.25rem;
}
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}
</style>
