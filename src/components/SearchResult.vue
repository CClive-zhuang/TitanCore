// 文件名: src/components/SearchResult.vue
<template>
  <div 
    class="h-full flex flex-col relative bg-[#020204] overflow-hidden select-none font-sans tactical-viewport"
    :class="{ 'optical-zoom-out': isZoomingOut, 'optical-zoom-in': !isZoomingOut }"
  >
    <div class="fixed inset-0 pointer-events-none z-0">
      <div class="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[45vw] h-[45vw] bg-[radial-gradient(circle,rgba(0,243,255,0.05)_0%,transparent_60%)] rounded-full animate-breathe"></div>
      <div class="absolute inset-0 bg-gradient-to-t from-[#020204] via-transparent to-[#020204]/90 opacity-80"></div>
    </div>

    <div class="flex-1 overflow-y-auto custom-scrollbar relative z-10 scroll-smooth flex flex-col optical-content">

      <div v-if="searchStore.isSearching" class="p-8 pt-12 max-w-[1800px] mx-auto space-y-10 w-full flex-1">
         <div class="flex items-center gap-3 border-b border-white/10 pb-4">
           <div class="w-1.5 h-6 bg-[#00f3ff] animate-pulse"></div>
           <div class="w-36 h-6 bg-white/5 rounded animate-pulse"></div>
         </div>
         <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8">
            <div v-for="i in 6" :key="i" class="aspect-[2/3] bg-white/[0.02] rounded-xl relative overflow-hidden border border-white/[0.03]">
              <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
            </div>
         </div>
      </div>

      <div v-else class="flex-1 flex flex-col p-8 pt-10 max-w-[1800px] mx-auto w-full pb-24">

        <section v-if="matrixItems.length > 0" class="space-y-6">
          <div class="flex items-center justify-between border-b border-white/10 pb-4 mb-8">
             <div class="flex items-center gap-3">
               <div class="w-1.5 h-6 bg-[#00f3ff] shadow-[0_0_10px_rgba(0,243,255,0.6)]"></div>
               <h3 class="text-2xl font-black tracking-wide text-white">{{ t('search.cloudMatrix') }}</h3>
             </div>
             <button 
               @click="executeTacticalAbort"
               type="button"
               class="group flex items-center gap-2.5 px-4 py-2 rounded bg-[#0a0a0f] border border-white/10 hover:border-[#00f3ff]/60 transition-all duration-300 active:scale-95 shadow-md hover:shadow-[0_0_15px_rgba(0,243,255,0.15)]"
               title="物理键盘映射: [ ESC ]"
             >
               <span class="px-1.5 py-0.5 rounded bg-white/10 group-hover:bg-[#00f3ff] text-white group-hover:text-black font-black font-code text-xs transition-colors">ESC</span>
               <span class="text-xs text-gray-400 group-hover:text-white transition-colors font-bold tracking-wider">{{ t('search.returnNexus') }}</span>
             </button>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8">
            <div v-for="(item, index) in matrixItems" :key="item.id" 
                 class="relative group animate-fade-in-up transition-all duration-500 hover:-translate-y-1"
                 :style="{ animationDelay: `${index * 40}ms` }">
               <div class="absolute -inset-2 bg-[#00f3ff]/0 rounded-2xl blur-xl transition-all duration-500 group-hover:bg-[#00f3ff]/10"></div>
               <div class="relative z-10 bg-[#0a0a0f]/90 rounded-xl overflow-hidden backdrop-blur-sm border border-white/[0.04] group-hover:border-[#00f3ff]/40 transition-colors shadow-lg">
                 <GameCard 
                   :id="item.id" :title="item.title" :tags="(item.tags || '').split(',').filter((t: string) => t)" 
                   :rating="item.rating || 9.9" :image="item.cover" :type="item.type" :isInLibrary="false" :isInstalled="false"
                   @action="handleCardAction(item)" @collect="onCollect(item)"
                 />
               </div>
               <div v-if="searchStore.checkRadarStatus(item.id.replace(/^steam_gate_/, '')) === 'red'" class="absolute -top-2 -right-2 z-30 w-5 h-5 bg-red-500 rounded-full border-2 border-[#020204] shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse" :title="t('search.denuvoDesc')"></div>
               <div v-else-if="searchStore.checkRadarStatus(item.id.replace(/^steam_gate_/, '')) === 'yellow'" class="absolute -top-2 -right-2 z-30 w-5 h-5 bg-yellow-500 rounded-full border-2 border-[#020204] shadow-[0_0_15px_rgba(234,179,8,0.8)]" :title="t('search.dependencyDesc')"></div>
            </div>
          </div>
        </section>

        <section v-if="toolItems.length > 0" class="space-y-6 mt-16">
          <div class="flex items-center justify-between border-b border-white/10 pb-4 mb-8">
             <div class="flex items-center gap-3">
               <div class="w-1.5 h-6 bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.6)]"></div>
               <h3 class="text-2xl font-black tracking-wide text-gray-200">{{ t('search.localAssetsSub') }}</h3>
             </div>
             <button 
               v-if="matrixItems.length === 0"
               @click="executeTacticalAbort"
               type="button"
               class="group flex items-center gap-2.5 px-4 py-2 rounded bg-[#0a0a0f] border border-white/10 hover:border-yellow-500/60 transition-all duration-300 active:scale-95 shadow-md hover:shadow-[0_0_15px_rgba(234,179,8,0.15)]"
               title="物理键盘映射: [ ESC ]"
             >
               <span class="px-1.5 py-0.5 rounded bg-white/10 group-hover:bg-yellow-500 text-white group-hover:text-black font-black font-code text-xs transition-colors">ESC</span>
               <span class="text-xs text-gray-400 group-hover:text-white transition-colors font-bold tracking-wider">{{ t('search.returnNexus') }}</span>
             </button>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8 opacity-95">
             <div v-for="(item, index) in toolItems" :key="item.id" 
                  class="relative group animate-fade-in-up transition-all duration-500 hover:-translate-y-1"
                  :style="{ animationDelay: `${index * 40}ms` }">
                <div class="absolute -inset-2 bg-white/0 rounded-2xl blur-xl transition-all duration-500 group-hover:bg-white/5"></div>
                <div class="relative z-10 bg-[#0c0d12]/90 rounded-xl overflow-hidden backdrop-blur-sm border border-white/[0.04] group-hover:border-yellow-500/40 transition-colors shadow-lg">
                  <GameCard 
                    :id="item.id" :title="item.title" :tags="(item.tags || '').split(',').filter((t: string) => t)" 
                    :rating="item.rating || 5.0" :image="item.cover" :type="item.type" :isInLibrary="false" :isInstalled="false"
                    @action="handleCardAction(item)" @collect="onCollect(item)"
                  />
                </div>
             </div>
          </div>
        </section>

        <section v-if="matrixItems.length === 0 && toolItems.length === 0" class="flex-1 flex flex-col items-center justify-center text-center px-8 py-12 relative">

          <div class="relative mb-6 mt-6">
            <h1 class="text-6xl md:text-8xl font-black tracking-[0.2em] uppercase text-[#00f3ff] font-code" 
                style="text-shadow: 0 0 40px rgba(0,243,255,0.4), 0 0 80px rgba(0,243,255,0.1);">
              {{ errorState.code }}
            </h1>
          </div>

          <div class="w-80 border-b border-[#00f3ff]/20 mb-6"></div>

          <p class="text-base text-gray-300 font-medium tracking-wide mb-12 max-w-xl leading-relaxed">
            {{ errorState.message }}
          </p>

          <div class="w-full max-w-xl mb-16 relative group">
            <div class="relative flex items-center bg-black/90 border border-white/20 rounded-full p-1.5 shadow-[0_0_30px_rgba(0,243,255,0.08)] group-hover:border-[#00f3ff]/50 transition-all duration-300">
              <input 
                v-model="searchQuery" 
                @keyup.enter.prevent="handleSearchAction"
                type="text" 
                :placeholder="t('search.placeholder')" 
                class="flex-1 bg-transparent border-none text-base font-bold text-white px-6 py-3 focus:outline-none placeholder:text-white/20 font-code" 
              />
              <button 
                type="button"
                @click.prevent="handleSearchAction" 
                class="px-8 py-3 bg-[#00f3ff] hover:bg-white text-black font-black rounded-full transition-all duration-300 text-sm tracking-widest uppercase shadow-[0_0_15px_rgba(0,243,255,0.3)]"
              >
                {{ t('search.btnSearch') }}
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl text-left">
            <div class="p-6 rounded-xl bg-white/[0.015] border border-white/[0.05] hover:border-[#00f3ff]/30 transition-all group/card">
              <h4 class="text-white font-bold text-base mb-2">{{ t('search.tipSimplifyTitle') }}</h4>
              <p class="text-sm text-gray-500 leading-relaxed group-hover/card:text-gray-400 transition-colors">
                {{ t('search.tipSimplifyDesc') }}
              </p>
            </div>

            <div class="p-6 rounded-xl bg-white/[0.015] border border-white/[0.05] hover:border-[#00f3ff]/30 transition-all group/card">
              <h4 class="text-white font-bold text-base mb-2">{{ t('search.tipAppIdTitle') }}</h4>
              <p class="text-sm text-gray-500 leading-relaxed group-hover/card:text-gray-400 transition-colors" v-html="t('search.tipAppIdDesc', { appId: '<span class=\'text-[#00f3ff] font-code\'>2358720</span>' })">
              </p>
            </div>

            <div class="p-6 rounded-xl bg-white/[0.015] border border-white/[0.05] hover:border-[#00f3ff]/30 transition-all group/card">
              <h4 class="text-white font-bold text-base mb-2">{{ t('search.tipUplinkTitle') }}</h4>
              <p class="text-sm text-gray-500 leading-relaxed group-hover/card:text-gray-400 transition-colors">
                {{ t('search.tipUplinkDesc') }}
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>

    <GameDetailModal 
      v-if="isDetailVisible" 
      :visible="isDetailVisible" 
      :gameId="selectedItem?.id || ''"
      :appId="selectedItem?.app_id || ''"
      :cover="selectedItem?.cover || ''" 
      :title="selectedItem?.title || ''"
      :tags="(selectedItem?.tags || '').split(',').filter((t: string) => t)"
      :rating="selectedItem?.rating || 9.9" 
      :description="selectedItem?.desc || ''"
      :isInstalled="false" 
      :isInLibrary="false" 
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useSearchStore } from '../stores/searchStore'
import { t } from '../i18n'
import GameCard from './GameCard.vue'
import GameDetailModal from './GameDetailModal.vue'

const searchStore = useSearchStore()
const searchQuery = ref('')
const isZoomingOut = ref(false)
let zoomTimer: ReturnType<typeof setTimeout> | null = null

const executeTacticalAbort = () => {
  if (isZoomingOut.value) return
  isZoomingOut.value = true
  if (zoomTimer) clearTimeout(zoomTimer)
  zoomTimer = setTimeout(() => {
    zoomTimer = null
    searchStore.clearSearch()
    isZoomingOut.value = false
  }, 320)
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' || e.keyCode === 27) {
    if (isDetailVisible.value) {
      isDetailVisible.value = false
      return
    }
    executeTacticalAbort()
  }
}

const handleSearchAction = () => {
  const kw = searchQuery.value.trim()
  if (kw) {
    searchStore.doSearch(kw)
    searchQuery.value = ''
  }
}

onMounted(() => { 
  searchStore.initRadar() 
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  if (zoomTimer) clearTimeout(zoomTimer)
  isZoomingOut.value = false
  window.removeEventListener('keydown', handleKeyDown)
})

const matrixItems = computed(() => searchStore.searchResults.filter(i => ['titan_protocol', 'collection'].includes(i.type)))
const toolItems = computed(() => searchStore.searchResults.filter(i => ['game', 'patch', 'tool', 'wallpaper'].includes(i.type)))

const isDetailVisible = ref(false)
const selectedItem = ref<any>(null)

const errorState = computed(() => {
  const err = searchStore.currentError
  const kw = searchStore.lastKeyword

  switch (err) {
    case 'QUOTA_EXHAUSTED':
      return {
        code: 'QUOTA EXHAUSTED',
        subtitle: 'QUOTA_EXHAUSTED',
        message: t('errors.quotaExhausted') || '今日查询配额已耗尽，请明日再试或升级网络授权。'
      }
    case 'NETWORK_ERROR':
      return {
        code: 'CONNECTION LOST',
        subtitle: 'CONNECTION_LOST',
        message: t('errors.networkError') || '无法建立矩阵链接，请检查本地网络配置后重新发起上行。'
      }
    case 'KEYWORD_INVALID':
      return {
        code: 'INVALID QUERY',
        subtitle: 'INVALID_SYNTAX',
        message: t('errors.keywordInvalid') || '指令语法无效。请输入至少 2 个字符的名称，或纯数字 Steam AppID。'
      }
    case 'RESOURCE_NOT_FOUND':
    default:
      return {
        code: 'NO SIGNAL',
        subtitle: 'RESOURCE_NOT_FOUND',
        message: t('search.emptyDesc', { keyword: kw })
      }
  }
})

const handleCardAction = async (item: any) => {
  if (item.type === 'collection') {
    try {
      const childrenRes = await window.electron.invoke('sys:get-collection-children', item.id)
      if (childrenRes && childrenRes.length > 0) {
        window.dispatchEvent(new CustomEvent('titan-navigate', { 
          detail: { 
            view: 'collection', 
            payload: { title: item.title, cover: item.cover, data: childrenRes } 
          } 
        }))
      }
    } catch(e) { console.error('合集加载失败', e) }
  } else {
    selectedItem.value = item
    isDetailVisible.value = true
  }
}

watch(() => searchStore.autoOpenItem, (newItem) => {
  if (newItem) handleCardAction(newItem)
}, { immediate: true })

const onCollect = async (item: any) => {
  try { 
    await window.electron.invoke('sys:toggle-library', item.id, {
      title: item.title || '',
      type: item.type || '',
      cover: item.cover || ''
    }) 
  } 
  catch(e) { console.error('收藏写入失败:', e) }
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 5px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,243,255,0.3); }

.tactical-viewport {
  position: relative;
}

.optical-content {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
  will-change: transform, opacity;
}

@keyframes optical-zoom-in-effect {
  0% {
    opacity: 0;
    transform: scale(0.97);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.optical-zoom-in .optical-content {
  animation: optical-zoom-in-effect 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.optical-zoom-out .optical-content {
  opacity: 0 !important;
  transform: scale(0.96) !important;
  pointer-events: none;
}

@keyframes shimmer { 100% { transform: translateX(100%); } }

@keyframes fade-in-up {
  0% { opacity: 0; transform: translateY(16px); }
  100% { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up {
  animation: fade-in-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes breathe {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.08); }
}
.animate-breathe {
  animation: breathe 8s ease-in-out infinite;
}
</style>