// 文件名: src/components/Sidebar.vue
<template>
  <aside class="w-80 h-full bg-black/80 backdrop-blur-md border-r border-white/5 flex flex-col px-6 py-8 z-50 transition-all duration-300 select-none contain-layout">

    <div class="mb-12 px-2 flex items-center gap-4 group flex-shrink-0 cursor-default relative z-10">
      <div class="relative">
        <div class="absolute -inset-4 bg-[radial-gradient(circle_at_center,_rgba(var(--primary-rgb),0.5)_0%,_transparent_65%)] opacity-40 group-hover:opacity-80 transition-opacity duration-500 will-change-opacity transform-gpu pointer-events-none"></div>
        <div class="relative w-14 h-14 bg-primary text-bg-main rounded-theme flex items-center justify-center text-3xl font-black z-10">T</div>
      </div>
      <div class="flex flex-col relative z-10">
        <h1 class="text-4xl theme-header text-primary tracking-widest leading-none" style="text-shadow: 0 0 10px rgba(var(--primary-rgb), 0.5);">Titan</h1>
        <span class="text-xs font-code text-text-muted tracking-[0.3em] opacity-80 mt-1">CORE SYSTEM</span>
      </div>
    </div>

    <nav class="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto scrollbar-hide py-2 relative z-10 contain-layout">

      <div 
        v-for="item in navItems" 
        :key="item.id"
        @click="goTo(item.id)"
        class="relative group flex-shrink-0"
      >
        <div v-if="activeId === item.id" class="absolute -inset-1 rounded-theme rgb-glow opacity-60 transition-opacity duration-500 will-change-opacity transform-gpu"></div>

        <button 
          type="button"
          class="relative w-full flex items-center gap-5 px-6 py-5 rounded-theme transition-all duration-300 border border-transparent overflow-hidden text-left"
          :class="getButtonClass(item.id)"
        >
          <svg width="28" height="28" fill="currentColor" viewBox="0 0 256 256" class="z-10 flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
            <path :d="item.icon"></path>
          </svg>

          <div class="flex flex-col z-10">
            <span class="font-bold text-xl leading-tight tracking-wide">{{ item.label }}</span>
            <span class="text-[9px] font-code opacity-50 tracking-[0.15em] uppercase mt-0.5">{{ item.subLabel }}</span>
          </div>

          <div v-if="activeId === item.id" class="absolute right-0 top-0 bottom-0 w-1.5 bg-primary shadow-[0_0_10px_var(--primary)]"></div>

        </button>
      </div>

    </nav>

    <div class="mt-auto px-2 pb-2 flex flex-col gap-4 relative z-10">
       <div class="relative rounded-theme bg-black/60 border border-white/5 p-4 overflow-hidden group contain-layout">

            <div class="absolute -right-8 -bottom-8 w-32 h-32 bg-[radial-gradient(circle_at_center,_rgba(var(--primary-rgb),0.15)_0%,_transparent_70%)] group-hover:bg-[radial-gradient(circle_at_center,_rgba(var(--primary-rgb),0.25)_0%,_transparent_70%)] transition-colors will-change-[background-color] transform-gpu pointer-events-none"></div>

            <div class="flex justify-between items-end mb-2 relative z-10">
                <span class="text-[12px] font-code text-text-muted tracking-widest">{{ t('app.networkStatus') }}</span>
                <span class="font-code font-bold text-sm leading-none uppercase tracking-wider" :class="statusTextClass" style="text-shadow: 0 0 10px currentColor;">{{ statusText }}</span>
            </div>

            <div class="h-1 w-full bg-white/10 rounded-full overflow-hidden relative z-10">
                <div class="h-full transition-all duration-500 ease-out" :class="statusBarClass" style="box-shadow: 0 0 8px currentColor;"></div>
            </div>

            <div class="mt-2 flex justify-between items-center relative z-10">
                <span></span>
                <div class="w-1.5 h-1.5 rounded-full animate-breathe" :class="statusDotClass"></div>
            </div>
       </div>
    </div>

  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { t } from '../i18n'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()

const props = defineProps<{
  systemStatus?: 'ready' | 'syncing' | 'offline'
  activeView?: string
}>()

const emit = defineEmits(['change-view'])

const activeId = ref('discovery')

watch(() => props.activeView, (newId) => {
  if (newId && newId !== activeId.value) {
    activeId.value = newId
  }
}, { immediate: true })

const goTo = (id: string) => {
  activeId.value = id
  emit('change-view', id)
}

const status = computed(() => props.systemStatus || 'syncing')
const statusText = computed(() => ({ ready: t('app.statusReady'), syncing: t('app.statusSyncing'), offline: t('app.statusOffline') }[status.value]))
const statusTextClass = computed(() => ({ ready: 'text-primary', syncing: 'text-yellow-400', offline: 'text-red-400' }[status.value]))
const statusBarClass = computed(() => ({ ready: 'bg-primary w-full', syncing: 'bg-yellow-500 w-1/2 animate-pulse', offline: 'bg-red-500 w-0' }[status.value]))
const statusDotClass = computed(() => ({ 
  ready: 'bg-green-500 shadow-[0_0_5px_#22c55e]', 
  syncing: 'bg-yellow-500 shadow-[0_0_5px_#eab308] animate-pulse', 
  offline: 'bg-red-500 shadow-[0_0_5px_#ef4444]' 
}[status.value]))

const getButtonClass = (id: string) => {
  // 全网搜与其他按钮同款，仅文字保留 accent 金（商业强调色）
  const isNexus = id === 'nexus_gate'
  if (activeId.value === id) {
    return `bg-bg-panel border-white/10 translate-x-2 ${isNexus ? 'text-accent' : 'text-primary'}`
  }
  return isNexus
    ? 'hover:bg-white/5 text-accent/80 hover:text-accent hover:translate-x-1'
    : 'hover:bg-white/5 text-text-muted hover:text-text-main hover:translate-x-1'
}

const CORE_MENU = computed(() => [
  { id: 'discovery', label: t('nav.discovery'), subLabel: 'DISCOVERY', icon: 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm88-88a88,88,0,0,1-16.7,52.3L135.5,100.2a8,8,0,0,0-7.7-7.7L54.3,23.3A88,88,0,0,1,216,128Z' },
  { id: 'library', label: t('nav.library'), subLabel: 'LIBRARY', icon: 'M208,24H48A16,16,0,0,0,32,40V216a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V40A16,16,0,0,0,208,24Zm0,192H48V40H208V216ZM80,72H176V88H80Zm0,48H176v16H80Zm0,48H152v16H80Z' },
  { id: 'transmissions', label: t('nav.transmissions'), subLabel: 'TRANSMISSIONS', icon: 'M222.14,105.86l-88-88a8,8,0,0,0-11.32,0l-88,88A8,8,0,0,0,40.49,119.5L88,71.94V184a8,8,0,0,0,16,0V71.94l47.51,47.52a8,8,0,0,0,11.32-11.32ZM216,208H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z' },
  { id: 'hajimi_beat', label: t('nav.hajimi_beat'), subLabel: 'HAJIMI BEAT', icon: 'M140,32V16a8,8,0,0,0-16,0V32A56.06,56.06,0,0,0,68,88v10.66A40.12,40.12,0,0,0,32,138.66V216a16,16,0,0,0,16,16H88a16,16,0,0,0,16-16V138.66A40.12,40.12,0,0,0,68,98.66V88a40,40,0,0,1,80,0v10.66A40.12,40.12,0,0,0,128,138.66V216a16,16,0,0,0,16,16h40a16,16,0,0,0,16-16V138.66a40.12,40.12,0,0,0-36-40V88A56.06,56.06,0,0,0,140,32ZM80,216H48V138.66a24,24,0,0,1,32,0Zm80,0V138.66a24,24,0,0,1,32,0V216Z' },
  { id: 'nexus_gate', label: t('nav.nexus_gate'), subLabel: 'NEXUS GATE', icon: 'M240,112H216.59A88.13,88.13,0,0,0,144,39.41V16a8,8,0,0,0-16,0V39.41A88.13,88.13,0,0,0,55.41,112H32a8,8,0,0,0,0,16H55.41A88.13,88.13,0,0,0,128,200.59V224a8,8,0,0,0,16,0V200.59A88.13,88.13,0,0,0,216.59,128H240a8,8,0,0,0,0-16ZM128,184A72,72,0,1,1,200,112,72.08,72.08,0,0,1,128,184Z' },
  { id: 'uplink', label: t('nav.uplink'), subLabel: 'UPLINK', icon: 'M232,128a104,104,0,0,1-208,0c0-41,23.81-76.41,58.55-92.93a8,8,0,0,1,6.9,14.48C62.09,63.14,44,89.5,44,128a88,88,0,0,0,168,0c0-38.5-18.09-64.86-45.45-78.45a8,8,0,1,1,6.9-14.48C208.19,51.59,232,87,232,128ZM128,64a8,8,0,0,0-8,8v96a8,8,0,0,0,16,0V72A8,8,0,0,0,128,64Z' },
  { id: 'settings', label: t('nav.settings'), subLabel: 'SETTINGS', icon: 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm0-144a56,56,0,1,0,56,56A56.06,56.06,0,0,0,128,72Zm0,96a40,40,0,1,1,40-40A40,40,0,0,1,128,168Z' }
])

const LOGIN_REQUIRED = new Set(['uplink', 'hajimi_beat', 'nexus_gate'])

const navItems = computed(() => {
  return CORE_MENU.value.filter(item => !LOGIN_REQUIRED.has(item.id) || authStore.isLoggedIn)
})
</script>

<style scoped>
.contain-layout { contain: layout style paint; }
</style>