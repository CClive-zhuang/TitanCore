// 文件名: src/components/DiscoveryView.vue
<template>
  <div class="h-full flex flex-col relative bg-transparent overflow-hidden animate-fade-in">
    <div class="p-8 pb-0 flex-shrink-0">
        <div class="w-full mb-6 overflow-x-auto scrollbar-hide">
            <div class="flex items-center gap-4 min-w-max">
                <button 
                    v-for="tab in staticTabs" :key="tab.id"
                    @click="discoveryStore.setTab(tab.id)"
                    :disabled="discoveryStore.isFetching"
                    class="px-6 py-2 rounded-full text-xs font-black tracking-widest transition-all hover:bg-white hover:text-black disabled:opacity-50"
                    :class="discoveryStore.activeTab === tab.id ? 'bg-white text-black' : 'bg-white/5 text-text-muted'"
                >
                    {{ tab.label }}
                </button>

                <button 
                    @click="goNexusGate"
                    :disabled="discoveryStore.isFetching"
                    class="px-6 py-2 rounded-full text-xs font-black tracking-widest transition-all bg-white/5 text-accent/80 hover:text-accent disabled:opacity-50"
                >
                    {{ t('discovery.tabSearch') }}
                </button>
            </div>
        </div>
    </div>

    <div class="flex-1 relative overflow-hidden px-8 pb-20">
        <div v-if="discoveryStore.isFetching" class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
            <div class="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
            <span class="text-primary font-code text-xs tracking-widest uppercase animate-pulse">READING MATRIX...</span>
        </div>

        <VirtualList 
            v-if="filteredDisplayList.length > 0"
            :items="filteredDisplayList"
            :columns="currentColumns"
            :aspectRatio="0.75" 
        >
            <template #default="{ items }">
                 <GameCard 
                    v-for="item in items" 
                    :key="item.id"
                    :id="item.id" 
                    :title="item.basic.title" 
                    :tags="item.basic.tags || []" 
                    :image="item.basic.cover" 
                    :type="item.type"
                    :isInLibrary="userLibrarySet.has(resolveContractKey(item))"
                    :isInstalled="false"
                    :isInstalling="false" 
                    :hideControls="false"
                    @action="onCardAction(item)"
                    @collect="onCollect(item)"
                    @cancel="() => {}"
                  />
            </template>
        </VirtualList>
        <div v-else-if="!discoveryStore.isFetching" class="h-full flex items-center justify-center text-text-muted font-code flex-col gap-4">
            <!-- 修复：将 SVG path 中缩略粘连的 arc 标记 00/01 严格展开为标准空格 0 0 / 0 1，彻底适配严格解析器 -->
            <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" class="opacity-20"><path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7m16 0v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5m16 0h-2.586a1 1 0 0 0-.707.293l-2.414 2.414a1 1 0 0 1-.707.293h-3.172a1 1 0 0 1-.707-.293l-2.414-2.414A1 1 0 0 0 6.586 13H4"/></svg>
            <span class="tracking-widest">{{ t('discovery.empty') }}</span>
        </div>
    </div>

    <GameDetailModal 
      v-if="isDetailVisible"
      :visible="isDetailVisible"
      :gameId="selectedItem?.id || ''"
      :cover="selectedItem?.basic?.cover || ''"
      :title="selectedItem?.basic?.title || ''"
      :tags="selectedItem?.basic?.tags || []"
      :rating="selectedItem?.basic?.rating || 9.9"
      :description="selectedItem?.desc || selectedItem?.meta_json?.desc || '该资产暂无详细描述信息。'"
      :isInstalled="false"
      :isInLibrary="userLibrarySet.has(resolveContractKey(selectedItem))"
      :isDownloading="false"
      :isInstalling="false"
      :progress="0"
      statusText="READY"
      downloadText=""
      :type="selectedItem?.type || ''"
      @close="isDetailVisible = false"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { t } from '../i18n'
import GameCard from './GameCard.vue'
import VirtualList from './VirtualList.vue'
import GameDetailModal from './GameDetailModal.vue'
import { useDiscoveryStore } from '../stores/discoveryStore'
import { useLibraryStore } from '../stores/libraryStore'

const props = defineProps<{ searchQuery?: string }>()

const discoveryStore = useDiscoveryStore()
const libraryStore = useLibraryStore()
const currentColumns = ref(4)

const userLibrarySet = ref<Set<string>>(new Set())

/**
 * 数据契约清洗网关 (Contract Normalizer)
 * 遵照 libraryStore.ts 中 appIdOf 的原生架构准绳，统一提取资产的核心业务指纹 (真实 AppID / 核心数字标尺)
 * 彻底消解展示层行号 (titan_protocol_836) 与底层闸门 (steam_gate_823580) 的契约断层，实现 UI 层零感知对齐。
 */
const resolveContractKey = (item: any): string => {
  if (!item) return ''
  // 协议资源：提取真实 AppID（与 LibraryService 归一化逻辑严格对齐）
  if (item.type === 'titan_protocol' || item.resource_id?.startsWith('steam_gate_')) {
    // LibraryService.normalizeProtocolResource 优先读取 meta.target_id / steam_appid
    const coreId = item.meta?.target_id || item.meta?.steam_appid ||
                   item.basic?.app_id || item.basic?.appId ||
                   item.meta?.app_id || item.meta?.appId ||
                   item.meta?.steam_id || item.basic?.steam_id ||
                   item.id || item.resource_id
    const m = String(coreId).match(/(\d+)$/)
    return m ? m[1] : String(coreId)
  }
  // 非协议资源：保留原始 id，避免 game_30 / tool_30 冲突
  return item.resource_id || item.id
}

const staticTabs = computed(() => [
  { id: 'titan_protocol', label: t('discovery.tabSteam') },
  { id: 'collection', label: t('discovery.tabCollection') },
  { id: 'game', label: t('discovery.tabGame') },
  { id: 'tool', label: t('discovery.tabTool') },
  { id: 'patch', label: t('discovery.tabPatch') }
])

const goNexusGate = () => {
  window.dispatchEvent(new CustomEvent('titan-navigate', { detail: 'nexus_gate' }))
}

const isDetailVisible = ref(false)
const selectedItem = ref<any>(null)

// 契约统一：私有库数据加载时，通过清洗网关推入统一指纹
const syncUserLibraryState = async () => {
  try {
    const lib = await window.electron.sys.getUserLibrary()
    if (Array.isArray(lib)) {
      userLibrarySet.value = new Set(lib.map(item => resolveContractKey(item)))
    }
  } catch (e) {
    console.warn('[DiscoveryView] 获取用户地下私有库异常:', e)
  }
}

// 契约统一：业务列表过滤时，直接基于统一指纹 O(1) 极速匹配
const filteredDisplayList = computed(() => {
  return discoveryStore.displayList.filter(item => !userLibrarySet.value.has(resolveContractKey(item)))
})

const onCardAction = async (item: any) => {
  const rawItem = discoveryStore.rawList.find(r => r.id === item.id) || item

  if (rawItem.type === 'collection') {
    try {
      const childrenRes = await window.electron.invoke('sys:get-collection-children', rawItem.id)
      if (childrenRes && childrenRes.length > 0) {
        window.dispatchEvent(new CustomEvent('titan-navigate', { 
          detail: { view: 'collection', payload: { title: rawItem.title || item.basic?.title, cover: rawItem.cover || item.basic?.cover, data: childrenRes } } 
        }))
      }
    } catch(e) { console.error('合集加载失败', e) }
  } else {
    selectedItem.value = { ...rawItem, basic: item.basic }
    isDetailVisible.value = true
  }
}

// 契约统一：乐观 UI 状态变更与异常回滚，全程基于清洗后的契约指纹操作
const onCollect = async (item: any) => {
  const contractKey = resolveContractKey(item)
  const next = new Set(userLibrarySet.value)
  next.add(contractKey)
  userLibrarySet.value = next

  try {
    await libraryStore.toggleItem(item.id, {
      title: item.basic?.title || '',
      type: item.type || '',
      cover: item.basic?.cover || '',
      desc: item.basic?.desc || item.meta?.desc || ''
    })
  } catch (e) {
    const rollback = new Set(userLibrarySet.value)
    rollback.delete(contractKey)
    userLibrarySet.value = rollback
    console.error('[Discovery] Collect error:', e)
  }
}

const updateColumns = () => {
  const w = window.innerWidth
  if (w < 768) currentColumns.value = 2
  else if (w < 1024) currentColumns.value = 3
  else if (w < 1280) currentColumns.value = 4
  else if (w < 1536) currentColumns.value = 5
  else currentColumns.value = 6
}

let unsubLibUpdate: (() => void) | null = null

onMounted(async () => {
  updateColumns()
  window.addEventListener('resize', updateColumns)
  await syncUserLibraryState()

  unsubLibUpdate = window.electron.on('titan:library-updated', () => {
    syncUserLibraryState()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', updateColumns)
  unsubLibUpdate?.()
})
</script>