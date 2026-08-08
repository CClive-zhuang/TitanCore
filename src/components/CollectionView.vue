<template>
  <div class="h-screen w-full flex flex-col bg-[#020204] text-white overflow-hidden font-sans relative">

    <header class="flex-shrink-0 h-16 px-6 lg:px-10 flex items-center justify-between border-b border-white/[0.05] bg-[#020204]/90 backdrop-blur-xl z-50">
      <div class="flex items-center gap-6">
        <button @click="goBack" class="w-8 h-8 rounded bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-[#00f3ff] hover:bg-[#00f3ff]/10 hover:border-[#00f3ff]/30 transition-all duration-200 group">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" class="group-hover:-translate-x-0.5 transition-transform"><path d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div class="flex items-center gap-4">
          <div class="flex flex-col">
            <h1 class="text-base font-black tracking-widest text-white uppercase leading-tight">{{ collectionTitle }}</h1>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-500 font-mono uppercase tracking-widest">{{ t('collection.quotaLabel') }}</span>
        <div class="flex items-baseline gap-1">
          <span class="text-xl font-black text-[#00f3ff]">{{ dailyQuota.remaining }}</span>
          <span class="text-xs text-gray-600 font-mono">/ {{ dailyQuota.limit }}</span>
        </div>
      </div>
    </header>

    <section class="relative shrink-0 h-[38vh] min-h-[340px] max-h-[480px] w-full border-b border-white/[0.05] overflow-hidden bg-black z-40">
      <Transition name="hero-fade" mode="out-in" :duration="performanceMode ? 0 : 600">
        <div :key="activeItem?.id || 'empty'" class="absolute inset-0">
          <TitanImage :id="activeItem?.id || ''" :src="activeItem?.cover || ''" alt="cover_bg" class="w-full h-full object-cover opacity-50 scale-105" />
          <div class="absolute inset-0 bg-gradient-to-r from-[#020204] via-[#020204]/90 to-transparent"></div>
          <div class="absolute inset-0 bg-gradient-to-t from-[#020204] via-transparent to-transparent"></div>
          <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSJ0cmFuc3BhcmVudCIvPgo8cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSI0IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDIpIi8+Cjwvc3ZnPg==')] opacity-50"></div>
        </div>
      </Transition>

      <div class="relative h-full w-full max-w-[1920px] mx-auto px-8 lg:px-16 flex items-center justify-between gap-12">
        <div class="flex-1 max-w-3xl flex flex-col justify-center space-y-5">
          <div class="flex items-center gap-3">
            <span class="px-2 py-0.5 text-[10px] font-black tracking-widest bg-purple-600 text-white rounded-sm shadow-md uppercase">
              {{ activeItem?.typeLabel || t('collection.resourceType') }}
            </span>
          </div>

          <div class="space-y-1">
            <h2 class="text-5xl lg:text-6xl font-black tracking-tight text-white uppercase drop-shadow-xl line-clamp-2 leading-tight">{{ activeItem?.title || t('collection.noSelect') }}</h2>
          </div>

          <p class="text-sm lg:text-base text-gray-300 leading-relaxed line-clamp-2 max-w-2xl font-medium">{{ activeItem?.desc || '' }}</p>

          <div class="pt-4 flex items-center gap-4">
            <button 
              @click="activeItem && deploySingle(activeItem)"
              :disabled="!activeItem || activeItem.status === 'deploying' || activeItem.status === 'completed'"
              class="relative px-10 py-3.5 bg-white/5 border rounded-md transition-all duration-300 font-black tracking-widest text-sm overflow-hidden group"
              :class="[
                !activeItem ? 'opacity-30 cursor-not-allowed' :
                activeItem.status === 'completed' ? 'border-green-500/30 text-green-400 cursor-not-allowed bg-green-500/10' : 
                activeItem.status === 'failed' ? 'border-red-500/50 text-red-400 hover:bg-red-500/20 hover:border-red-400' : 
                'border-[#00f3ff]/40 text-[#00f3ff] hover:bg-[#00f3ff]/10 hover:shadow-[0_0_20px_rgba(0,243,255,0.2)] hover:border-[#00f3ff]'
              ]"
            >
              <div class="relative z-10 flex items-center gap-3">
                <span v-if="activeItem?.status === 'deploying'" class="w-3 h-3 rounded-sm bg-[#00f3ff]" :class="!performanceMode && 'animate-ping'"></span>
                <span>{{ activeItem ? actionText(activeItem.status) : t('collection.noData') }}</span>
              </div>
              <div v-if="activeItem && (activeItem.status === 'idle' || activeItem.status === 'failed') && !performanceMode" class="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            </button>

            <button
              @click="openDeployAllConfirm"
              :disabled="isDeployingAll || allCompleted || collectionItems.length === 0"
              class="relative px-10 py-3.5 bg-white/5 border rounded-md transition-all duration-300 font-black tracking-widest text-sm overflow-hidden group"
              :class="allCompleted ? 'border-green-500/30 text-green-400 cursor-not-allowed bg-green-500/10' : 'border-white/10 text-white hover:bg-white/10 hover:border-white/30'"
            >
              <div class="relative z-10">{{ allCompleted ? t('collection.allSynced') : (isDeployingAll ? t('collection.deployingAll') : t('collection.deployAll')) }}</div>
            </button>

            <div v-if="activeItem?.status === 'deploying'" class="flex-1 max-w-xs h-1.5 bg-gray-900 rounded-full overflow-hidden border border-white/5 relative">
              <div class="absolute inset-0 h-full w-full">
                <div class="h-full w-1/3 bg-gradient-to-r from-transparent via-[#00f3ff] to-transparent animate-[flow-light_1.2s_linear_infinite]"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="shrink-0 relative hidden md:block">
          <div class="absolute -inset-2 border border-white/10 rounded-lg pointer-events-none z-0">
            <div class="absolute top-0 left-0 w-2 h-2 border-t border-l border-white"></div>
            <div class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white"></div>
          </div>
          <div class="w-48 lg:w-56 aspect-[2/3] rounded-md overflow-hidden border border-white/20 shadow-2xl z-10 relative bg-black transition-transform duration-500">
            <TitanImage :id="activeItem?.id || ''" :src="activeItem?.cover || ''" :alt="activeItem?.title || ''" class="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </section>

    <section class="flex-1 flex flex-col min-h-0 bg-[#020204]">
      <div class="shrink-0 px-6 lg:px-10 py-4 border-b border-white/[0.05] flex items-center justify-between bg-[#050508]/50">
        <div class="flex items-center gap-6">
          <h3 class="text-xs font-black text-white/50 tracking-widest uppercase flex items-center gap-2">
            <span class="w-1 h-3 bg-[#00f3ff]"></span> {{ t('collection.resourceMatrix') }}
          </h3>
          <div class="hidden sm:flex gap-4 text-xs font-mono font-bold text-gray-500">
            <span>{{ t('collection.totalLabel') }} <span class="text-white">{{ collectionItems.length }}</span></span>
            <span>{{ t('collection.readyLabel') }} <span class="text-green-400">{{ completedCount }}</span></span>
            <span>{{ t('collection.waitingLabel') }} <span class="text-gray-500">{{ waitingCount }}</span></span>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <span v-if="quotaTip" class="text-xs font-mono text-red-400 tracking-wider animate-pulse">{{ quotaTip }}</span>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
        <div v-if="collectionItems.length === 0" class="h-full flex items-center justify-center text-gray-500 font-mono text-sm">
          <div class="text-center">
            <p class="mb-2">{{ t('collection.noSignal') }}</p>
            <p class="text-xs text-gray-600">{{ t('collection.checkMeta') }}</p>
          </div>
        </div>

        <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 lg:gap-6 max-w-[2000px] mx-auto pb-12">
          <div 
            v-for="(item, index) in collectionItems" :key="item.id"
            @click="selectIndex(index)"
            class="group flex flex-col gap-2 relative transition-all duration-300"
            :class="index === activeIndex ? 'scale-[1.02]' : 'hover:scale-[1.01] opacity-70 hover:opacity-100'"
            role="button"
            tabindex="0"
          >
            <div class="relative aspect-[2/3] rounded-md overflow-hidden border transition-colors duration-300 bg-gray-900"
                 :class="[
                   index === activeIndex ? 'border-[#00f3ff] shadow-[0_0_15px_rgba(0,243,255,0.2)]' : 'border-white/10 group-hover:border-white/30',
                   item.status === 'failed' ? 'border-red-900/60 grayscale' : ''
                 ]">
              <TitanImage :id="item.id" :src="item.cover" :alt="item.title" class="w-full h-full object-cover" />
              <div class="absolute top-2 left-2 px-1.5 py-0.5 text-[8px] font-black tracking-wider bg-[#5046e5] text-white rounded-[2px] shadow uppercase">{{ item.typeLabel }}</div>
              <div v-if="item.status === 'deploying'" class="absolute inset-0 z-10 overflow-hidden pointer-events-none border border-[#00f3ff]/30 rounded-md">
                <div class="absolute inset-0 h-full w-full">
                  <div class="h-full w-1/4 bg-gradient-to-r from-transparent via-[#00f3ff]/30 to-transparent" :class="!performanceMode && 'animate-[flow-light_1.5s_linear_infinite]'"></div>
                </div>
              </div>
              <div v-if="item.status === 'completed'" class="absolute bottom-0 left-0 right-0 h-1 bg-green-500 z-10 shadow-[0_0_10px_#00ff00]"></div>
              <div v-if="item.status === 'failed'" class="absolute inset-0 bg-red-900/40 z-10 flex items-center justify-center">
                <svg width="24" height="24" fill="none" stroke="#ff4444" stroke-width="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </div>
              <div class="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none"></div>
            </div>
            <div class="flex items-start justify-between px-0.5">
              <div class="min-w-0 pr-2">
                <h4 class="text-xs font-bold text-white truncate transition-colors duration-200" :class="index === activeIndex ? 'text-[#00f3ff]' : ''">{{ item.title }}</h4>
              </div>
              <div class="shrink-0 mt-0.5">
                <span v-if="item.status === 'completed'" class="block w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_#00ff00]"></span>
                <span v-else-if="item.status === 'deploying'" class="block w-2 h-2 bg-[#00f3ff]" :class="!performanceMode && 'animate-ping'"></span>
                <span v-else-if="item.status === 'failed'" class="block w-2 h-2 rounded-full bg-red-500"></span>
                <span v-else-if="item.status === 'waiting'" class="block w-2 h-2 bg-gray-600 rotate-45"></span>
                <span v-else class="block w-1.5 h-1.5 rounded-full bg-gray-600"></span>
              </div>
            </div>
            <div v-if="index === activeIndex" class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1/3 h-0.5 bg-[#00f3ff] shadow-[0_0_8px_#00f3ff] rounded-full"></div>
          </div>
        </div>
      </div>
    </section>

    <div v-if="isDeployingAll" class="absolute bottom-0 left-0 right-0 h-1 z-50 bg-black overflow-hidden">
      <div class="h-full w-1/3 bg-gradient-to-r from-transparent via-[#00f3ff] to-transparent" :class="!performanceMode && 'animate-[global-loading_1.5s_linear_infinite]'"></div>
    </div>

    <div v-if="showSummary" class="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fade-in" @click.self="showSummary = false">
      <div class="border border-white/10 bg-[#0a0a0f] p-8 max-w-md w-full mx-4 shadow-[0_0_40px_rgba(0,243,255,0.08)] relative">
        <div class="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#00f3ff]/50 to-transparent"></div>
        <h3 class="text-lg font-black tracking-widest text-white mb-1 uppercase">{{ t('collection.summaryTitle') }}</h3>
        <p class="text-xs font-mono text-gray-500 tracking-wider mb-6">{{ t('collection.summarySub') }}</p>
        <p v-if="summaryStats.interruptReason" class="text-xs font-mono text-red-400 tracking-wider mb-4 text-center uppercase border border-red-500/20 bg-red-500/10 py-1.5 rounded-sm">
          {{ t('collection.interruptedWarning') }} {{ summaryStats.interruptReason }}
        </p>
        <div class="space-y-3 font-mono text-sm">
          <div class="flex justify-between items-center border-b border-white/5 pb-2">
            <span class="text-gray-400 text-xs tracking-wider">{{ t('collection.successLabel') }}</span>
            <span class="text-green-400 font-bold text-base">{{ summaryStats.success }}</span>
          </div>
          <div class="flex justify-between items-center border-b border-white/5 pb-2">
            <span class="text-gray-400 text-xs tracking-wider">{{ t('collection.failedLabel') }}</span>
            <span class="text-red-400 font-bold text-base">{{ summaryStats.failed }}</span>
          </div>
          <div class="flex justify-between items-center border-b border-white/5 pb-2">
            <span class="text-gray-400 text-xs tracking-wider">{{ t('collection.consumedLabel') }}</span>
            <span class="text-[#00f3ff] font-bold text-base">{{ summaryStats.consumed }}</span>
          </div>
          <div class="flex justify-between items-center pt-1">
            <span class="text-gray-500 text-xs tracking-wider">{{ t('collection.remainingLabel') }}</span>
            <span class="text-white font-bold text-base">{{ dailyQuota.remaining }}</span>
          </div>
        </div>
        <button @click="showSummary = false" class="mt-8 w-full py-3 bg-white/5 border border-white/10 hover:bg-[#00f3ff]/10 hover:border-[#00f3ff]/30 hover:text-[#00f3ff] text-white font-black tracking-widest text-xs transition-all duration-200 rounded-sm">
          {{ t('collection.closeSummaryLabel') }}
        </button>
      </div>
    </div>

    <BaseModal :visible="showConfirm" @close="showConfirm = false" showClose container-class="bg-[#0a0a0f] border border-white/10 max-w-md w-full mx-4">
      <div class="p-8">
        <h3 class="text-base font-black tracking-widest text-white mb-2 uppercase">{{ t('collection.deployAllTitle') }}</h3>
        <p class="text-sm text-gray-400 mb-6 leading-relaxed">
          {{ t('collection.deployAllDesc', { count: collectionItems.length }) }}
        </p>
        <div class="flex gap-4">
          <button @click="showConfirm = false" class="flex-1 py-3 bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 font-black tracking-widest text-xs transition-all rounded-sm">
            {{ t('common.cancel') }}
          </button>
          <button @click="confirmDeployAll" class="flex-1 py-3 bg-[#00f3ff]/10 border border-[#00f3ff]/40 text-[#00f3ff] hover:bg-[#00f3ff]/20 font-black tracking-widest text-xs transition-all rounded-sm">
            {{ t('common.confirm') }}
          </button>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { t } from '../i18n';
import { useAuthStore } from '../stores/authStore';
import { useLibraryStore } from '../stores/libraryStore';
import BaseModal from '../components/common/BaseModal.vue';
import TitanImage from './TitanImage.vue';

interface CollectionItem { id: string; title: string; type: string; typeLabel: string; desc: string; cover: string; status: 'idle' | 'waiting' | 'deploying' | 'completed' | 'failed'; }

const authStore = useAuthStore();
const libraryStore = useLibraryStore();
const performanceMode = ref(false);
const updatePerformanceMode = () => performanceMode.value = document.documentElement.classList.contains('performance-mode');

const collectionTitle = ref(t('collection.defaultTitle'));
const dailyQuota = computed(() => authStore.dailyQuota);
const activeIndex = ref(0);
let deployAllController: AbortController | null = null;

const showSummary = ref(false);
const summaryStats = ref({ success: 0, failed: 0, consumed: 0, interrupted: false, interruptReason: '' });
const isDeployingAll = ref(false);
const showConfirm = ref(false);
const quotaTip = ref('');
let quotaTipTimer: ReturnType<typeof setTimeout> | null = null;

const typeLabelMap: Record<string, string> = { titan_protocol: 'STEAM', game: 'GAME', tool: 'TOOL', patch: 'PATCH', wallpaper: 'WALLPAPER', titan_module: 'TITAN', collection: 'COLLECTION', unknown: 'RESOURCE' };
const collectionItems = ref<CollectionItem[]>([]);

const activeItem = computed(() => collectionItems.value[activeIndex.value] || null);
const allCompleted = computed(() => collectionItems.value.length > 0 && collectionItems.value.every(i => i.status === 'completed'));
const completedCount = computed(() => collectionItems.value.filter(i => i.status === 'completed').length);
const waitingCount = computed(() => collectionItems.value.filter(i => i.status === 'waiting').length);

const STATUS_COLORS: Record<string, string> = { completed: 'text-green-400', failed: 'text-red-400', deploying: 'text-[#00f3ff]', waiting: 'text-gray-500', idle: 'text-gray-500' }

const actionText = (s: string) => {
  const map: Record<string, string> = {
    completed: 'READY',
    failed: t('collection.retry'),
    deploying: 'RUNNING',
    waiting: t('collection.queued'),
    idle: t('collection.actionIdle')
  }
  return map[s] || t('collection.actionIdle')
}

const statusColor = (s: string) => STATUS_COLORS[s] || 'text-gray-500'
const selectIndex = (index: number) => { if (index >= 0 && index < collectionItems.value.length) activeIndex.value = index; }
const goBack = () => window.dispatchEvent(new CustomEvent('titan-navigate', { detail: 'discovery' }));

const deploySingleNode = async (item: CollectionItem): Promise<{success: boolean, msg?: string}> => {
    try {
        return await window.electron.invoke('titan:deploy-game', item.id);
    } catch (e: any) { 
        return { success: false, msg: e.message }; 
    }
}

const deploySingle = async (item: CollectionItem) => {
    if (item.status === 'deploying' || item.status === 'completed') return;
    item.status = 'deploying';

    const res = await deploySingleNode(item);

    if (res.success) {
        item.status = 'completed';
        await libraryStore.toggleItem(item.id, { title: item.title, type: item.type, cover: item.cover });
    } else {
        item.status = 'failed';
        if (res.msg?.includes('429') || res.msg?.includes('QUOTA')) {
            summaryStats.value.interrupted = true;
            summaryStats.value.interruptReason = t('collection.quotaExhausted');
            quotaTip.value = t('collection.quotaTip');
            if (quotaTipTimer) clearTimeout(quotaTipTimer);
            quotaTipTimer = setTimeout(() => quotaTip.value = '', 4000);
        }
    }
}

const openDeployAllConfirm = () => {
  if (isDeployingAll.value || allCompleted.value || collectionItems.value.length === 0) return;
  showConfirm.value = true;
};

const confirmDeployAll = () => {
  showConfirm.value = false;
  doDeployAll();
};

const doDeployAll = async () => {
  if (isDeployingAll.value || allCompleted.value || collectionItems.value.length === 0) return;
  isDeployingAll.value = true;
  deployAllController = new AbortController();
  summaryStats.value = { success: 0, failed: 0, consumed: 0, interrupted: false, interruptReason: '' };
  quotaTip.value = '';

  collectionItems.value.forEach(item => { if(item.status !== 'completed') item.status = 'waiting' });

  for (let i = 0; i < collectionItems.value.length; i++) {
    if (deployAllController.signal.aborted) break;

    const item = collectionItems.value[i];
    if (item.status === 'completed') continue;

    activeIndex.value = i;
    item.status = 'deploying';

    const res = await deploySingleNode(item);

    if (res.success) {
        item.status = 'completed';
        summaryStats.value.success++;
        summaryStats.value.consumed++;
        await libraryStore.toggleItem(item.id, { title: item.title, type: item.type, cover: item.cover });
    } else {
        item.status = 'failed';
        summaryStats.value.failed++;
        if (res.msg && (res.msg.includes('429') || res.msg.includes('QUOTA'))) {
            summaryStats.value.interrupted = true;
            summaryStats.value.interruptReason = t('collection.quotaExhausted');
            quotaTip.value = t('collection.quotaTip');
            if (quotaTipTimer) clearTimeout(quotaTipTimer);
            quotaTipTimer = setTimeout(() => quotaTip.value = '', 4000);
            break;
        }
    }

    await new Promise(r => setTimeout(r, 800));
  }

  isDeployingAll.value = false;
  showSummary.value = true;
};

const handleTitanNavigate = (e: any) => {
  const detail = e.detail;
  if (typeof detail === 'object' && detail.view === 'collection' && detail.payload) {
    collectionTitle.value = detail.payload.title || t('collection.defaultTitle');
    const rawData = detail.payload.data || [];
    collectionItems.value = rawData.map((item: any) => ({
      id: item.id || '',
      title: item.title || t('collection.unknownTitle'),
      type: item.type || 'unknown',
      typeLabel: typeLabelMap[item.type] || typeLabelMap['unknown'],
      desc: item.desc || (item.meta_json ? (() => { try { return JSON.parse(item.meta_json).desc || '' } catch { return '' } })() : '') || '',
      cover: item.cover || '',
      status: 'idle' as CollectionItem['status']
    }));
    activeIndex.value = 0;
  }
};

let escHandler: ((e: KeyboardEvent) => void) | null = null;

onMounted(() => {
  updatePerformanceMode();

  const cached = (window as any).__titanCollectionPayload;
  if (cached && cached.data) {
    collectionTitle.value = cached.title || t('collection.defaultTitle');
    const rawData = cached.data || [];
    collectionItems.value = rawData.map((item: any) => ({
      id: item.id || '',
      title: item.title || t('collection.unknownTitle'),
      type: item.type || 'unknown',
      typeLabel: typeLabelMap[item.type] || typeLabelMap['unknown'],
      desc: item.desc || (item.meta_json ? (() => { try { return JSON.parse(item.meta_json).desc || '' } catch { return '' } })() : '') || '',
      cover: item.cover || '',
      status: 'idle' as CollectionItem['status']
    }));
    activeIndex.value = 0;
    (window as any).__titanCollectionPayload = null;
  }

  window.addEventListener('titan-navigate', handleTitanNavigate);

  escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showConfirm.value) { showConfirm.value = false; return; }
      if (showSummary.value) { showSummary.value = false; return; }
      goBack();
    }
  };
  window.addEventListener('keydown', escHandler);
});

onUnmounted(() => { 
  deployAllController?.abort(); 
  if (quotaTipTimer) clearTimeout(quotaTipTimer);
  window.removeEventListener('titan-navigate', handleTitanNavigate);
  if (escHandler) window.removeEventListener('keydown', escHandler);
});
</script>

<style scoped>
@keyframes flow-light {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}

/* 修复：补充 hero-fade 过渡类，使 Vue <Transition> 动画时间控制生效 */
.hero-fade-enter-active,
.hero-fade-leave-active {
  transition: opacity 600ms ease;
}

.hero-fade-enter-from,
.hero-fade-leave-to {
  opacity: 0;
}
</style>