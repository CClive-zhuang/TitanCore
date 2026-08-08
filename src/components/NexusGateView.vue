// 文件名: src/components/NexusGateView.vue
<template>
  <div class="h-full flex flex-col bg-bg-main relative animate-fade-in overflow-hidden">

    <Transition name="warp-overlay">
      <div 
        v-if="searchStore.isWarping" 
        class="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-[#020204]/80 backdrop-blur-md"
      >
        <div class="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,243,255,0.15)_50%,transparent_100%)] animate-scan-beam"></div>
        <div class="relative flex flex-col items-center gap-4 animate-pulse">
          <div class="w-16 h-16 border-2 border-[#00f3ff] rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,243,255,0.6)]">
             <div class="w-8 h-8 bg-[#00f3ff] rounded-full animate-ping opacity-75"></div>
          </div>
          <div class="font-code text-xs tracking-[0.4em] text-[#00f3ff] uppercase font-bold">
            UPLINKING MATRIX...
          </div>
        </div>
      </div>
    </Transition>

    <div v-if="!searchStore.hasSearched" class="h-full flex flex-col relative overflow-hidden">
        <div class="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,_rgba(0,243,255,0.08)_0%,_transparent_60%)] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
        <div class="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[radial-gradient(circle_at_center,_rgba(234,179,8,0.05)_0%,_transparent_60%)] rounded-full pointer-events-none translate-x-1/2 translate-y-1/2"></div>

        <div class="relative z-10 flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in-up">
            <div class="mb-12 transition-all duration-500">
                 <h1 class="text-6xl font-black tracking-tighter mb-4 uppercase transition-all duration-500" 
                     :class="searchMode === 'LOCAL' ? 'text-transparent [-webkit-text-stroke:1px_#00f3ff] opacity-60' : 'text-[#00f3ff]'"
                     style="text-shadow: 0 0 30px rgba(0,243,255,0.4);">
                     {{ searchMode === 'LOCAL' ? t('nexus.localVaultTitle') : t('nexus.globalSearchTitle') }}
                 </h1>
                 <p class="text-white/40 font-code tracking-[0.5em] text-sm">
                     {{ searchMode === 'LOCAL' ? t('nexus.localSubtitle') : t('nexus.globalSubtitle') }}
                 </p>
            </div>

            <div class="w-full max-w-3xl relative group">
                <div class="relative flex items-center bg-black/80 border border-white/20 rounded-full p-2 shadow-[0_0_30px_rgba(0,243,255,0.1)] group-hover:shadow-[0_0_50px_rgba(0,243,255,0.3)] transition-shadow duration-500">
                    <input 
                        id="global-search-input"
                        ref="searchInputRef"
                        v-model="searchQuery" 
                        @keyup.enter.prevent="handleSearchAction"
                        type="text" 
                        :placeholder="searchMode === 'LOCAL' 
                            ? t('nexus.localPlaceholder') 
                            : t('nexus.globalPlaceholder')" 
                        class="flex-1 bg-transparent border-none text-xl font-bold text-white px-8 py-4 focus:outline-none placeholder:text-white/20 font-code transition-all" 
                    />
                    <button 
                        type="button"
                        @click.prevent="handleSearchAction" 
                        @contextmenu.prevent="toggleSearchMode"
                        :class="searchMode === 'LOCAL' 
                            ? 'bg-[#00f3ff]/10 border-2 border-[#00f3ff] text-[#00f3ff] shadow-[0_0_20px_rgba(0,243,255,0.2)]' 
                            : 'bg-[#00f3ff] border-2 border-[#00f3ff] text-black shadow-[0_0_15px_rgba(0,243,255,0.4)]'"
                        class="px-10 py-4 font-black rounded-full hover:scale-105 transition-all duration-300 text-lg tracking-widest relative overflow-hidden"
                    >
                        <span :key="searchMode" :class="{'animate-pulse': searchMode === 'LOCAL'}" class="block">
                            {{ searchMode === 'LOCAL' ? t('nexus.localBtn') : t('nexus.searchBtn') }}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div v-else class="h-full w-full absolute inset-0 z-20 bg-bg-main animate-fade-in flex flex-col">
        <SearchResult />
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useSearchStore } from '../stores/searchStore';
import { t } from '../i18n';
import SearchResult from './SearchResult.vue'; 

const searchQuery = ref('');
const searchMode = ref<'GLOBAL' | 'LOCAL'>('GLOBAL');
const searchInputRef = ref<HTMLInputElement | null>(null);
const searchStore = useSearchStore();

const toggleSearchMode = () => (searchMode.value = searchMode.value === 'GLOBAL' ? 'LOCAL' : 'GLOBAL');

const focusInput = () => {
  setTimeout(() => {
    searchInputRef.value?.focus()
  }, 50)
};

const handleSearchAction = () => {
    const kw = searchQuery.value.trim();
    if (kw) {
        searchStore.doSearch(kw);
    }
};

onMounted(() => {
    window.addEventListener('titan-navigate-search', focusInput);
});

onUnmounted(() => {
    window.removeEventListener('titan-navigate-search', focusInput);
    searchStore.clearSearch();
});
</script>

<style scoped>
.warp-overlay-enter-active,
.warp-overlay-leave-active {
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.warp-overlay-enter-from,
.warp-overlay-leave-to {
  opacity: 0;
}

@keyframes scan-beam {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}

.animate-scan-beam {
  animation: scan-beam 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>