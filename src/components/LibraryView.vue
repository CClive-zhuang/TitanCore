// 文件名: src/components/LibraryView.vue
<template>
  <div class="h-full flex flex-col bg-bg-main relative overflow-hidden select-none animate-fade-in pt-8 px-10">
    <!-- 顶部工具行（两态：常态 tab 段控件 + 动作 + 搜索入口；检索模式整行 morph） -->
    <div v-if="!searchMode" class="flex items-center gap-3 mb-8 z-20 shrink-0 h-9">
      
        <button 
          v-for="tab in TABS"
          :key="tab"
          @click="activeFilter = tab"
          class="h-9 px-5 rounded-full text-[13px] font-bold tracking-wide flex items-center border border-transparent transition-all duration-200"
          :class="activeFilter === tab 
            ? 'bg-primary text-black border-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]' 
            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white hover:border-white/10'"
        >
          {{ getTabLabel(tab) }}
        </button>
      <div class="flex-1"></div>
      <div class="flex items-center gap-2">
        <button 
          @click="showBatchDeployModal"
          class="h-9 px-5 rounded-full text-[13px] font-bold tracking-wide flex items-center border border-primary/40 text-gray-400 transition-all duration-200 hover:bg-white/10 hover:text-white hover:border-white/10"
        >
          {{ t('library.batchDeploy') }}
        </button>
        <button 
          @click="handleRedeployAll"
          class="h-9 px-5 rounded-full text-[13px] font-bold tracking-wide flex items-center border border-primary/40 text-gray-400 transition-all duration-200 hover:bg-white/10 hover:text-white hover:border-white/10"
        >
          {{ t('library.redeployAll') }}
        </button>
        <button 
          @click="enterSearchMode"
        class="h-8 w-8 rounded-full border border-white/10 text-gray-400 hover:text-primary hover:border-primary/50 flex items-center justify-center transition-all duration-200"
        :title="t('library.searchMode.entry')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      </button>
      </div>
    </div>
    <div v-else class="flex items-center gap-3 mb-8 z-20 shrink-0 h-9 animate-fade-in">
      <div class="flex-1 h-full flex items-center gap-3 bg-[#0a0a0a] px-4 rounded-xl border border-primary/40 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]">
        <svg class="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        <input 
          ref="searchInputRef"
          v-model="searchQuery" 
          type="text" 
          :placeholder="t('library.searchMode.placeholder', { count: libraryStore.items.length })"
          class="flex-1 h-full bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none font-code"
          @keyup.esc="exitSearchMode"
        />
        <span class="text-xs font-code text-gray-500 whitespace-nowrap shrink-0">
          {{ t('library.searchMode.results', { count: filteredList.length }) }}
        </span>
        <button @click="exitSearchMode" class="text-gray-500 hover:text-white transition-colors shrink-0 flex items-center">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto scrollbar-hide relative z-10 pb-32">
      <div v-if="filteredList.length > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
        <GameCard 
          v-for="item in filteredList" 
          :key="item.id" 
          :id="item.id"
          :title="item.title"
          :tags="[item.type.toUpperCase()]"
          :image="item.cover"
          :type="item.type"
          :isInLibrary="true"
          :isInstalled="true"
          :hideControls="true"
          :showTopRightBadge="true"
          @contextmenu="handleCardContextMenu"
        />
      </div>
      
      <div v-else class="h-32 flex flex-col items-center justify-center opacity-40">
          <svg class="w-12 h-12 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
          </svg>
          <p class="text-sm font-bold text-gray-400 uppercase tracking-widest">{{ t('library.noAssets') }}</p>
      </div>
    </div>
    
    <ContextMenu 
      :visible="menu.show" 
      :x="menu.x" 
      :y="menu.y" 
      :title="menu.item?.type === 'titan_protocol' ? 'MANAGER' : t('library.contextMenu.title')" 
      variant="library"
      @close="closeMenu"
    >
      <!-- 联机启动：仅协议类型可见（一次性传参的特殊业务入口） -->
      <template v-if="menu.item?.type === 'titan_protocol'">
        <button 
          @click="handleAction('onlineLaunch')" 
          class="w-full text-left px-4 py-3 text-sm font-bold text-[#00f3ff] hover:bg-[#00f3ff] hover:text-black rounded-md flex items-center gap-3 transition-colors"
        >
          <span class="w-5 text-center text-base">🎮</span> {{ t('library.contextMenu.onlineLaunch') }}
        </button>
        <div class="h-px bg-white/5 my-1"></div>
      </template>

      <button @click="handleAction('redownload')" class="w-full text-left px-4 py-3 text-sm font-bold text-[#00f3ff] hover:bg-[#00f3ff] hover:text-black rounded-md flex items-center gap-3 transition-colors">
        <span class="w-5 text-center">⬇️</span> {{ t('library.contextMenu.redownload') }}
      </button>
      <div class="h-px bg-white/5 my-1"></div>
      
      <template v-if="menu.item?.type === 'titan_protocol'">
        <button @click="handleAction('uninstall')" class="w-full text-left px-4 py-3 text-sm font-bold text-gray-400 hover:bg-white/10 hover:text-white rounded-md flex items-center gap-3 transition-colors">
          <span class="w-5 text-center">🔧</span> {{ t('library.contextMenu.uninstall') }}
        </button>
        <div class="h-px bg-white/5 my-1"></div>
      </template>
      
      <button @click="handleAction('deleteRecord')" class="w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-900/50 hover:text-white rounded-md flex items-center gap-3 transition-colors">
        <span class="w-5 text-center">➖</span> {{ t('library.contextMenu.deleteRecord') }}
      </button>

      <!-- 自动更新开关：仅协议类型可见，放在最底部 -->
      <template v-if="menu.item?.type === 'titan_protocol'">
        <div class="h-px bg-white/5 my-1"></div>
                <button 
          @click="handleAction('toggleAutoUpdate')" 
          class="w-full text-left px-4 py-3 text-sm font-bold text-gray-400 hover:bg-white/10 hover:text-white rounded-md flex items-center gap-3 transition-colors"
        >
          <span class="w-5 text-center">{{ menu.item?.meta?.autoUpdate === false ? '▶️' : '⏸️' }}</span> 
          {{ menu.item?.meta?.autoUpdate === false ? t('library.contextMenu.enableUpdate') : t('library.contextMenu.disableUpdate') }}
        </button>
      </template>
    </ContextMenu>

    <GameDetailModal 
      v-if="isDetailVisible"
      :visible="isDetailVisible"
      :gameId="selectedItem?.id || ''"
      :cover="selectedItem?.cover || ''"
      :title="selectedItem?.title || ''"
      :tags="[selectedItem?.type || 'GAME']"
      :rating="9.9"
      :description="selectedItem?.desc || (t('library.defaultDesc'))"
      :isInstalled="true"
      :isInLibrary="true"
      :isDownloading="false"
      :isInstalling="false"
      :progress="0"
      statusText="READY"
      downloadText=""
      :type="selectedItem?.type || ''"
      @close="isDetailVisible = false"
    />

    <div v-if="batchProgress.visible" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in">
      <div class="bg-[#121212] border border-white/10 p-6 rounded-lg w-[420px] shadow-[0_0_30px_rgba(0,243,255,0.15)]">
        <div class="flex items-center gap-3 mb-5">
          <div class="w-4 h-4 border-2 border-[#00f3ff] border-t-transparent rounded-full animate-spin"></div>
          <h3 class="text-sm font-bold text-white uppercase tracking-wider">{{ batchProgress.title }}</h3>
        </div>
        
        <div class="relative w-full h-1 bg-white/10 rounded-full overflow-hidden mb-3">
          <div 
            class="h-full bg-gradient-to-r from-[#00f3ff] to-[#0088ff] transition-all duration-300" 
            :style="{ width: batchProgress.percent + '%' }"
          ></div>
        </div>
        
        <div class="flex justify-between items-center font-code text-sm text-gray-500 mb-4">
          <span>{{ batchProgress.percent }}%</span>
          <span>[{{ batchProgress.current }}/{{ batchProgress.total }}]</span>
        </div>

        <div class="max-h-40 overflow-y-auto border-t border-white/5 pt-2 font-code text-sm space-y-1 scrollbar-hide">
          <div v-for="(log, i) in batchProgress.logs" :key="i" class="flex justify-between items-start py-0.5 border-b border-white/[0.02]">
            <span class="text-gray-400 truncate max-w-[260px]">{{ log.displayName }}</span>
            <span :class="log.success ? 'text-[#00f3ff]' : 'text-red-500'" class="font-bold shrink-0">
              {{ log.success ? '✓ ' + (t('library.batch.successCount')) : `✕ ${log.reason || (t('library.batch.failCount'))}` }}
            </span>
          </div>
        </div>

        <div class="mt-5 flex justify-end">
          <button 
            @click="cancelCurrentDeploy" 
            class="px-4 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-400 rounded text-sm font-bold transition-colors"
          >
            {{ t('library.batch.cancel') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { t } from '../i18n'
import { useLibraryStore, appIdOf, type LibraryItem } from '../stores/libraryStore'
import { useAuthStore } from '../stores/authStore'
import ContextMenu from "./common/ContextMenu.vue"
import GameCard from './GameCard.vue'
import GameDetailModal from './GameDetailModal.vue'
import Swal from 'sweetalert2'

function titanAlert(title: string, text: string, icon: 'success' | 'error' | 'warning' | 'info' = 'success') {
  Swal.fire({ title, text, icon, background: '#121212', color: '#fff', confirmButtonColor: icon === 'error' ? '#ef4444' : '#00f3ff' })
}

type LibraryType = 'titan_protocol' | 'game' | 'tool' | 'patch'

const TABS = ['titan_protocol', 'game', 'tool', 'patch'] as const

const libraryStore = useLibraryStore()
const authStore = useAuthStore()

const activeFilter = ref<LibraryType>('titan_protocol')
const searchQuery = ref('')

// 检索模式（整行 morph）：Ctrl+F / 搜索图标进入，Esc / 清空退出
const searchMode = ref(false)
const searchInputRef = ref<HTMLInputElement | null>(null)

const enterSearchMode = async () => {
  searchMode.value = true
  await nextTick()
  searchInputRef.value?.focus()
}
const exitSearchMode = () => {
  searchQuery.value = ''
  searchMode.value = false
}
const handleGlobalKeydown = (e: KeyboardEvent) => {
  // 如果弹窗打开或在输入框输入，不拦截
  if (Swal.isVisible()) return
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
    e.preventDefault()
    enterSearchMode()
  }
}
const menu = ref<{ show: boolean; x: number; y: number; item: LibraryItem | null }>({ show: false, x: 0, y: 0, item: null })
const isDetailVisible = ref(false)
const selectedItem = ref<LibraryItem | null>(null)

const batchProgress = ref({
  visible: false,
  title: '',
  percent: 0,
  current: 0,
  total: 0,
  logs: [] as Array<{appId: string; displayName: string; success: boolean; reason?: string}>
})

let isCancelled = false

const filteredList = computed(() => {
  const q = searchQuery.value.toLowerCase()
  return libraryStore.items
    .filter(i => (!activeFilter.value || i.type === activeFilter.value) && (!q || i.title.toLowerCase().includes(q)))
    .sort((a, b) => b.addTime - a.addTime)
})

const tabKeys: Record<string, string> = { titan_protocol: 'library.tabSteamLib', game: 'library.tabGame', tool: 'library.tabTool', patch: 'library.tabPatch' }
const getTabLabel = (tab: LibraryType) => tabKeys[tab] ? t(tabKeys[tab]) : tab

// 右键即开：不 await 任何 IPC，菜单零延迟弹出
const handleCardContextMenu = (data: { id: string; x: number; y: number; title: string; type: string; installed: boolean }) => {
  const foundItem = libraryStore.items.find(i => i.id === data.id)
  if (foundItem) {
    menu.value = { 
      show: true, 
      x: Math.max(10, Math.min(data.x, window.innerWidth - 266)), 
      y: Math.max(10, Math.min(data.y, window.innerHeight - 300)), 
      item: foundItem 
    }
  }
}

const openGameDetail = (item: LibraryItem) => {
  selectedItem.value = item
  isDetailVisible.value = true
}

const closeMenu = () => {
  menu.value.show = false
}

const cancelCurrentDeploy = () => {
  isCancelled = true
}

// 联机启动：确认弹窗内点击"启动游戏"即一次性传参，无任何持久化
const handleOnlineLaunch = async (item: LibraryItem) => {
  const appId = appIdOf(item)
  if (!appId) {
    titanAlert(t('library.launch.failTitle'), t('library.launch.noAppId'), 'error')
    return
  }

  const result = await Swal.fire({
    title: t('library.launch.title'),
    html: `
      <div style="text-align:left; color:#aaa; font-size:14px; line-height:1.8;">
        <p style="margin-bottom:12px;">${t('library.launch.rule1')}</p>
        <p style="margin-bottom:12px;">${t('library.launch.rule2')}</p>
        <p>${t('library.launch.rule3')}</p>
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: t('library.launch.btn'),
    cancelButtonText: t('common.cancel'),
    background: '#121212',
    color: '#fff',
    confirmButtonColor: '#00f3ff',
    cancelButtonColor: '#333',
    reverseButtons: true,
    allowOutsideClick: false
  })

  if (!result.isConfirmed) return

  try {
    const res = await window.electron.invoke('titan:launch-game', appId)
    if (!res.success) {
      Swal.fire({ 
        title: t('library.launch.failTitle'), 
        text: res.msg || (t('library.launch.unknownError')), 
        icon: 'error', 
        background: '#121212', 
        color: '#fff',
        confirmButtonColor: '#ef4444'
      })
    }
  } catch (e: any) {
    Swal.fire({ 
      title: t('library.launch.failTitle'), 
      text: e.message || (t('library.launch.errorDefault')), 
      icon: 'error', 
      background: '#121212', 
      color: '#fff',
      confirmButtonColor: '#ef4444'
    })
  }
}

const handleAction = async (action: string) => {
  const target = menu.value.item
  if (!target) return

  menu.value.show = false

  if (action === 'onlineLaunch') {
    await handleOnlineLaunch(target)
  } else if (action === 'redownload') {
    openGameDetail(target)
  } else if (action === 'deleteRecord') {
    const confirm = await Swal.fire({
      title: t('library.deleteConfirm.title'),
      text: t('library.deleteConfirm.desc'),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: t('library.deleteConfirm.btn'),
      background: '#121212',
      color: '#fff'
    })
    if (confirm.isConfirmed) {
      try {
        await libraryStore.removeItem(target.id)
      } catch (e) {
        console.error('[LibraryView] 移除痕迹异常:', e)
      }
    }
  } else if (action === 'uninstall') {
    const confirm = await Swal.fire({
      title: t('library.uninstall.title'),
      text: t('library.uninstall.desc', { title: target.title }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('library.uninstall.btn'),
      cancelButtonText: t('common.cancel'),
      background: '#121212',
      color: '#fff',
      confirmButtonColor: '#ef4444'
    })
    if (confirm.isConfirmed) {
      try {
        const detectRes = await window.electron.invoke('steam:detect')
        if (!detectRes?.path) {
           throw new Error(t('library.steamNotFound'))
        }
        
        const currentEngine = await window.electron.invoke('sys:get-config', 'unlock_engine') || 'ost'
        const res = await window.electron.invoke('titan:uninstall-game', detectRes.path, appIdOf(target), currentEngine)
        
        if (res?.success) {
          await libraryStore.removeItem(target.id)
          titanAlert(t('library.uninstall.successTitle'), t('library.uninstall.successDesc'), 'success')
        } else {
          titanAlert(t('library.uninstall.failTitle'), res?.msg || (t('library.uninstall.failDefault')), 'error')
        }
      } catch(e: any) {
        titanAlert(t('library.uninstall.errorTitle'), e.message, 'error')
      }
    }
  } else if (action === 'toggleAutoUpdate') {
    const newState = target.meta?.autoUpdate !== false ? false : true
    try {
      await libraryStore.toggleAutoUpdate(target.id, newState)
      titanAlert(
        newState ? t('library.autoUpdate.enabledTitle') : t('library.autoUpdate.disabledTitle'),
        newState ? t('library.autoUpdate.enabledDesc') : t('library.autoUpdate.disabledDesc'),
        'success'
      )
    } catch (e: any) {
      titanAlert(t('library.autoUpdate.errorTitle'), e.message, 'error')
    }
  }
}

const getQuotaLeft = () => Math.max(0, (authStore.dailyQuota?.remaining ?? 0) + (authStore.dailyQuota?.extraRemaining ?? 0))

async function showBatchDeployModal() {
  const { value: text } = await Swal.fire({
    title: `<span style="font-size:18px; font-weight:800; color:#fff; letter-spacing:0.05em;">${t('library.batch.modalTitle')}</span>`,
    html: `
      <div style="text-align:left; margin-bottom:16px;">
        <div style="color:#888; font-size:14px; line-height:1.6;">
          ${t('library.batch.modalDesc')}<br>
          <span style="color:#00f3ff;">${t('library.batch.modalLimit')}</span>
        </div>
      </div>
    `,
    input: 'textarea',
    inputPlaceholder: t('library.batch.inputPlaceholder'),
    inputAttributes: {
      style: 'background:#0a0a0a; color:#00f3ff; border:1px solid #333; border-radius:6px; padding:12px; font-family:monospace; font-size:13px; width:calc(100% - 24px); box-sizing:border-box; margin:0 auto; display:block; min-height:160px; resize:vertical; outline:none;'
    },
    showCancelButton: true,
    confirmButtonText: t('library.batch.next'),
    cancelButtonText: t('common.cancel'),
    confirmButtonColor: '#00f3ff',
    cancelButtonColor: '#333',
    background: '#121212',
    color: '#fff',
    reverseButtons: true,
    allowOutsideClick: false
  })

  if (!text) return

  const appIds = text
    .split('\n')
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0 && /^\d+$/.test(s))

  if (appIds.length === 0) {
    Swal.fire({
      title: `<span style="color:#fff; font-size:16px;">${t('library.batch.emptyTitle')}</span>`,
      html: `<span style="color:#888; font-size:13px;">${t('library.batch.emptyDesc')}</span>`,
      icon: 'warning',
      background: '#121212',
      color: '#fff',
      confirmButtonColor: '#00f3ff'
    })
    return
  }

  if (appIds.length > 50) {
    Swal.fire({
      title: `<span style="color:#fff; font-size:16px;">${t('library.batch.tooManyTitle')}</span>`,
      html: `<span style="color:#888; font-size:13px;">${t('library.batch.tooManyDesc')}</span>`,
      icon: 'warning',
      background: '#121212',
      color: '#fff',
      confirmButtonColor: '#00f3ff'
    })
    return
  }

  const totalNeed = appIds.length
  const totalLeft = getQuotaLeft()

  const confirm = await Swal.fire({
    title: `<span style="font-size:18px; font-weight:800; color:#fff; letter-spacing:0.05em;">${t('library.batch.confirmTitle')}</span>`,
    html: `
      <div style="text-align:left; color:#888; font-size:14px; line-height:1.6; margin-bottom:16px;">
        ${t('library.batch.confirmDescPrefix')} <span style="color:#00f3ff;">${totalNeed}</span> ${t('library.batch.confirmDescSuffix')}
      </div>
      <div style="background:#0a0a0a; border:1px solid #333; border-radius:8px; padding:16px; text-align:left;">
        <div style="color:#aaa; font-size:13px; margin-bottom:4px;">${t('library.batch.quotaLabel')}</div>
        <div style="color:#fff; font-size:18px; font-weight:800;">
          ${t('library.batch.quotaDeduct')} <span style="color:#00f3ff;">${totalNeed}</span> ${t('library.batch.quotaPoint')}
          <span style="color:#666; font-size:13px; font-weight:400;"> ${t('library.batch.quotaLeft')} <span style="color:${totalLeft >= totalNeed ? '#00f3ff' : '#ff4444'};">${totalLeft}</span> ${t('library.batch.quotaPoint')}</span>
        </div>
        <div style="color:#666; font-size:12px; margin-top:8px;">${t('library.batch.quotaHint')}</div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: t('library.batch.startBtn'),
    cancelButtonText: t('common.cancel'),
    confirmButtonColor: '#00f3ff',
    cancelButtonColor: '#333',
    background: '#121212',
    color: '#fff',
    reverseButtons: true,
    allowOutsideClick: false
  })

  if (!confirm.isConfirmed) return

  await handleBatchDeploy(appIds)
}

async function handleBatchDeploy(appIds: string[]) {
  isCancelled = false
  batchProgress.value = {
    visible: true,
    title: t('library.batch.deploying'),
    percent: 0,
    current: 0,
    total: appIds.length,
    logs: []
  }

  const detectRes = await window.electron.invoke('steam:detect')
  if (!detectRes?.path) {
    batchProgress.value.visible = false
    titanAlert(t('library.batch.blockedTitle'), t('library.steamNotFound'), 'error')
    return
  }

  const results = await libraryStore.batchDeploy(appIds, {
    onProgress: (resList) => {
      batchProgress.value.current = resList.length
      batchProgress.value.percent = Math.round((resList.length / appIds.length) * 100)
      batchProgress.value.logs = resList
    },
    isCancelled: () => isCancelled
  })

  batchProgress.value.visible = false

  if (isCancelled) {
    isCancelled = false
    return
  }

  const successCount = results.filter(r => r.success).length
  await Swal.fire({
    title: `<span style="font-size:18px; font-weight:800; color:#fff;">${t('library.batch.doneTitle')}</span>`,
    html: `<div style="color:#888; font-size:14px;">${t('library.batch.successCount')} ${successCount} / ${t('library.batch.failCount')} ${results.length - successCount}</div>`,
    icon: successCount === results.length ? 'success' : (successCount > 0 ? 'warning' : 'info'),
    confirmButtonText: t('common.confirm'),
    confirmButtonColor: '#00f3ff',
    background: '#121212',
    color: '#fff'
  })
}

const handleRedeployAll = async () => {
  const protocols = libraryStore.items.filter(i => i.type === 'titan_protocol')
  if (protocols.length === 0) {
    titanAlert(t('library.redeploy.noProtocolTitle'), t('library.redeploy.noProtocolDesc'), 'info')
    return
  }

  const detectRes = await window.electron.invoke('steam:detect')
  if (!detectRes?.path) {
    titanAlert(t('library.batch.blockedTitle'), t('library.steamNotFound'), 'error')
    return
  }

  const totalNeed = protocols.length
  const totalLeft = getQuotaLeft()

  const confirm = await Swal.fire({
    title: t('library.redeploy.confirmTitle'),
    html: `
      <div style="color:#888; font-size:14px; line-height:1.6; margin-bottom:12px;">
        ${t('library.redeploy.confirmDescPrefix')} <span style="color:#fff; font-weight:700;">${protocols.length}</span> ${t('library.redeploy.confirmDescSuffix')}
      </div>
      <div style="background:#0a0a0a; border:1px solid #333; border-radius:8px; padding:12px; text-align:left;">
        <div style="color:#fff; font-size:14px; font-weight:700;">
          ${t('library.batch.quotaDeduct')} <span style="color:#00f3ff;">${totalNeed}</span> ${t('library.redeploy.quotaUnit')}
          <span style="color:#666; font-size:12px; font-weight:400;"> ${t('library.batch.quotaLeft')} <span style="color:${totalLeft >= totalNeed ? '#00f3ff' : '#ff4444'};">${totalLeft}</span> ${t('library.batch.quotaPoint')}</span>
        </div>
        <div style="color:#666; font-size:12px; margin-top:6px;">${t('library.redeploy.quotaHint')}</div>
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: t('library.redeploy.confirmBtn'),
    cancelButtonText: t('common.cancel'),
    background: '#121212',
    color: '#fff',
    confirmButtonColor: '#ef4444'
  })
  if (!confirm.isConfirmed) return

  isCancelled = false
  batchProgress.value = {
    visible: true,
    title: t('library.redeploy.deploying'),
    percent: 0,
    current: 0,
    total: protocols.length,
    logs: []
  }

  const results = await libraryStore.redeployAll(protocols, {
    onProgress: (resList) => {
      batchProgress.value.current = resList.length
      batchProgress.value.percent = Math.round((resList.length / protocols.length) * 100)
      batchProgress.value.logs = resList
    },
    isCancelled: () => isCancelled
  })

  batchProgress.value.visible = false

  if (isCancelled) {
    isCancelled = false
    return
  }

  const successCount = results.filter(r => r.success).length
  await Swal.fire({
    title: `<span style="font-size:18px; font-weight:800; color:#fff;">${t('library.redeploy.doneTitle')}</span>`,
    html: `<div style="color:#888; font-size:14px;">${t('library.batch.successCount')} ${successCount} / ${t('library.batch.failCount')} ${results.length - successCount}</div>`,
    icon: successCount === results.length ? 'success' : (successCount > 0 ? 'warning' : 'info'),
    confirmButtonText: t('common.confirm'),
    confirmButtonColor: '#00f3ff',
    background: '#121212',
    color: '#fff'
  })
}

let unsubLibUpdate: (() => void) | null = null

onMounted(() => {
  libraryStore.load()
  window.addEventListener('click', closeMenu)
  window.addEventListener('keydown', handleGlobalKeydown)
  unsubLibUpdate = window.electron.on('titan:library-updated', () => {
    libraryStore.load()
  })
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu)
  window.removeEventListener('keydown', handleGlobalKeydown)
  unsubLibUpdate?.()
  isCancelled = true
})
</script>