<script setup lang="ts">
import { computed, h } from 'vue'
import type { TableColumn } from '@nuxt/ui'

export interface AdminTableRow extends Record<string, string | number> {}

export interface AdminTableColumn {
  key: string
  label: string
  maxLength?: number
}

const props = defineProps<{
  columns: AdminTableColumn[]
  rows: AdminTableRow[]
  empty?: string
  actions?: boolean
}>()

const tableColumns = computed<TableColumn<AdminTableRow>[]>(() => {
  const columns: TableColumn<AdminTableRow>[] = props.columns.map((column) => ({
    accessorKey: column.key,
    header: column.label,
    meta: { class: { th: 'whitespace-nowrap' } },
    ...(column.maxLength
      ? {
          cell: ({ getValue }) => {
            const fullValue = String(getValue() ?? '')
            const characters = Array.from(fullValue)
            const maxLength = column.maxLength ?? 0
            const displayValue =
              characters.length > maxLength
                ? `${characters.slice(0, maxLength).join('')}...`
                : fullValue

            return h(
              'span',
              { class: 'admin-table-truncate', title: fullValue },
              displayValue,
            )
          },
        }
      : {}),
  }))

  if (props.actions)
    columns.push({
      id: 'actions',
      header: '',
      meta: { class: { th: 'whitespace-nowrap' } },
    })
  return columns
})
</script>

<template>
  <UTable
    :data="rows"
    :columns="tableColumns"
    :empty="empty || '暂无数据'"
    class="admin-table"
  >
    <template v-if="actions" #actions-cell="{ row }">
      <slot name="actions" :row="row.original" />
    </template>
  </UTable>
</template>

<style lang="scss" scoped>
.admin-table {
  width: 100%;
  overflow-x: auto;
}

:deep(.admin-table-truncate) {
  display: block;
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
