// 文件名: src/App.vue
<template>
  <Transition name="splash-fade">
    <div v-if="showBootSplash" class="fixed inset-0 z-[9999] bg-black flex items-center justify-center boot-splash">
      <div class="absolute inset-0 pointer-events-none scanlines"></div>

      <div class="relative flex flex-col items-center gap-8 z-10 splash-content">
        <div class="relative w-32 h-32 core-reactor">
          <div class="absolute inset-0 rounded-full conic-ring"></div>
          <div class="absolute inset-2 rounded-full bg-black"></div>
          <div class="absolute inset-0 rounded-full glow-ring"></div>
          <div class="absolute inset-0 flex items-center justify-center text-primary text-4xl font-black z-10">T</div>
        </div>

        <div class="relative init-text">
          <h1 class="text-4xl font-black tracking-[0.3em] text-white glitch-text" data-text="TITAN CORE">TITAN CORE</h1>
          <div class="absolute -bottom-6 left-0 w-full text-center text-[10px] text-primary/70 font-code tracking-widest opacity-80 uppercase">
            SYS_POST // CHECKING SECTORS...
          </div>
        </div>

        <div class="w-64 h-1 bg-white/10 overflow-hidden init-bar">
          <div class="h-full bg-primary charge-bar"></div>
        </div>
      </div>
    </div>
  </Transition>

  <div v-if="showInitError" class="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center">
    <div class="text-center max-w-lg p-10 border border-red-500/30 rounded-theme bg-bg-panel">
      <h2 class="text-2xl font-bold text-red-500 mb-4 tracking-wider">{{ t('app.initFail') }}</h2>
      <p class="text-gray-400 mb-6 font-code text-sm">{{ initErrorMsg }}</p>
      <button class="px-6 py-2 bg-primary text-black font-bold rounded hover:scale-105 transition-all">{{ t('app.retry') }}</button>
    </div>
  </div>

  <div class="flex h-screen w-screen bg-black text-white font-sans selection:bg-primary selection:text-black overflow-hidden border border-white/5 relative">

    <Sidebar @change-view="(id) => currentView = id" :system-status="systemStatus" :active-view="currentView" />

    <div v-show="audioSyncLevel === 1 && !performanceMode" 
         class="absolute inset-0 pointer-events-none z-[40] will-change-opacity transform-gpu"
         style="opacity: var(--halo-opacity, 0); background: radial-gradient(circle at center, transparent 40%, hsla(var(--mid-hue, 180), 100%, 50%, 0.15) 100%)">
    </div>

    <main ref="mainContainer" class="flex-1 flex flex-col min-w-0 relative">
      <div class="absolute left-[-30px] top-0 bottom-0 w-[60px] z-50 pointer-events-none">
          <div v-show="audioSyncLevel === 1 && !performanceMode" 
               class="quantum-pillar will-change-transform transform-gpu"
               :style="{ transform: `translateY(-50%) scaleY(var(--bass-scale, 0))` }">
          </div>
      </div>

      <header class="h-20 w-full flex items-center px-8 border-b border-white/5 z-20 bg-black/50 backdrop-blur-sm sticky top-0 select-none" style="-webkit-app-region: drag;">
        <div class="flex-1">
          <h2 class="font-code text-xs text-primary tracking-[0.2em] font-bold opacity-80 uppercase flex items-center gap-2">
            {{ currentBreadcrumb }}
          </h2>
        </div>

        <div class="flex-1 flex justify-end gap-6 items-center h-full">
          <div class="flex items-center gap-4" style="-webkit-app-region: no-drag;">

            <div class="steam-restart-container relative group">
              <div class="flowing-light-ring" :class="{ 'stop-animation': performanceMode, 'active': feedbackStore.hasUnread }" style="background: conic-gradient(from 180deg, #ff00aa 0%, transparent 60%);"></div>
              <button @click="goToFeedback" class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 relative z-10" :class="feedbackStore.hasUnread ? 'bg-[#ff00aa]/20 text-[#ff00aa] shadow-[0_0_15px_rgba(255,0,170,0.5)]' : 'text-text-muted hover:bg-white/10 hover:text-[#ff00aa]'" :title="t('nav.uplink')">
                <div v-if="feedbackStore.hasUnread" class="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ff00aa] animate-ping"></div>
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              </button>
            </div>

            <div class="steam-restart-container relative group">
              <div class="flowing-light-ring" :class="{ 'stop-animation': performanceMode, 'active': isRestartingSteam }"></div>
              <button 
                  @click="handleRestartSteam" 
                  :disabled="isRestartingSteam"
                  class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 relative z-10"
                  :class="isRestartingSteam ? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]' : 'text-text-muted hover:bg-white/10 hover:text-primary'"
                  :title="t('app.steamRestart')"
              >
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 256 256" :class="isRestartingSteam ? 'animate-spin' : ''">
                  <path d="M224,128a96,96,0,1,1-96-96,8,8,0,0,1,0,16,80,80,0,1,0,80,80,8,8,0,0,1,16,0Zm-40-64H136a8,8,0,0,0,0,16h24.69L115,125.66a8,8,0,0,0,11.32,11.32L172,91.31V116a8,8,0,0,0,16,0V68A8,8,0,0,0,184,60Z"></path>
                </svg>
              </button>
            </div>

            <button @click="toggleAudioSync" class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 relative group" :class="audioSyncLevel === 0 ? 'text-text-muted hover:bg-white/10 hover:text-[#00f3ff]' : 'bg-[#00f3ff]/20 text-[#00f3ff] shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]'" :title="audioSyncLevel === 0 ? t('app.audioSyncOff') : t('app.audioSyncOn')">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{ 'animate-pulse': audioSyncLevel === 1 && !performanceMode }"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            </button>

            <button @click="togglePerformanceMode" class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300" :class="performanceMode ? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]' : 'text-text-muted hover:bg-white/10 hover:text-primary'" :title="t('app.perfMode')">
              <svg width="22" height="22" fill="currentColor" viewBox="0 0 256 256" class="transition-transform duration-500" :class="performanceMode ? 'rotate-180' : ''"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Z"></path></svg>
            </button>

            <div class="w-[1px] h-8 bg-white/10"></div>

            <div class="flex items-center gap-3">
              <button @click="winControl.min()" class="w-4 h-4 rounded-full bg-green-500/80 hover:bg-green-400 transition-all hover:scale-110 shadow-lg shadow-green-500/20"></button>
              <button @click="winControl.max()" class="w-4 h-4 rounded-full bg-yellow-500/80 hover:bg-yellow-400 transition-all hover:scale-110 shadow-lg shadow-yellow-500/20"></button>
              <button @click="winControl.close()" class="w-4 h-4 rounded-full bg-red-500/80 hover:bg-red-400 transition-all hover:scale-110 shadow-lg shadow-red-500/20"></button>
            </div>
          </div>
        </div>
      </header>

      <div v-if="globalBusy" class="absolute top-[79px] left-0 w-full h-1 z-50 overflow-hidden bg-black/50 pointer-events-none">
        <div class="h-full transition-colors duration-300 ease-out" :class="[topBarColorClass, performanceMode ? 'w-full' : 'w-1/2 animate-progress-gpu']"></div>
      </div>

      <div class="flex-1 overflow-y-auto scrollbar-hide relative view-container">
        <LibraryView v-show="currentView === 'library'" class="h-full" />
        <TransmissionsView v-show="currentView === 'transmissions'" class="h-full" />
        <DiscoveryView v-if="currentView === 'discovery'" class="h-full" />
        <CollectionView v-if="currentView === 'collection'" class="h-full" />
        <SettingsView v-if="currentView === 'settings'" class="h-full" />
        <NexusGateView v-if="currentView === 'nexus_gate'" class="h-full" />
        <FeedbackView v-if="currentView === 'uplink'" class="h-full" />
        <HajimiBeat v-if="currentView === 'hajimi_beat'" class="h-full" />
      </div>
    </main>
  </div>

  <BaseModal :visible="showWelcomeModal" @close="showWelcomeModal = false">
    <div class="welcome-modal-content relative bg-black/95 w-full max-w-2xl rounded-2xl border border-primary/20 overflow-hidden flex flex-col">
      <div class="absolute inset-0 bg-[linear-gradient(rgba(0,243,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.025)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div class="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-60"></div>

      <div class="relative p-10 flex flex-col items-center text-center gap-8">
        <div class="relative w-24 h-24 flex items-center justify-center">
          <div class="absolute inset-0 rounded-full border-2 border-primary/40 animate-spin-slow"></div>
          <div class="absolute inset-3 rounded-full border border-primary/20 animate-spin-reverse"></div>
          <div class="text-5xl font-black text-primary" style="text-shadow: 0 0 25px rgba(var(--primary-rgb),0.6);">T</div>
        </div>

        <div class="space-y-2">
          <h2 class="text-4xl font-black tracking-[0.25em] text-white">TITAN CORE</h2>
          <p class="text-primary/60 font-code text-xs tracking-[0.35em]">Titan Core System // NEURAL LINK ESTABLISHED</p>
        </div>

        <div class="w-48 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>

        <div class="w-full rounded-xl bg-white/[0.03] border border-white/10 p-5 text-left space-y-3">
          <p class="text-sm text-gray-400 flex items-center gap-3">
            <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
            {{ t('welcome.firstLogin') }}
          </p>
          <p class="text-sm text-gray-400 flex items-center gap-3">
            <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
            {{ t('welcome.switchSettings') }}
          </p>
          <p class="text-sm text-gray-400 flex items-center gap-3">
            <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
            {{ t('welcome.browseDiscovery') }}
          </p>
        </div>

        <button @click="showWelcomeModal = false" 
                class="w-full py-4 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/40 font-bold tracking-[0.3em] uppercase transition-all duration-300 hover:shadow-[0_0_40px_rgba(var(--primary-rgb),0.25)] rounded-xl relative overflow-hidden group">
          <span class="relative z-10">{{ t('welcome.initNeuralLink') }}</span>
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
        </button>
      </div>
    </div>
  </BaseModal>

  <BaseModal :visible="showEngineUpdateModal" @close="showEngineUpdateModal = false">
    <div class="relative bg-black/95 w-full max-w-lg rounded-xl border border-[#00f3ff]/30 overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,243,255,0.15)]">
      <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00f3ff] to-transparent"></div>

      <div class="p-8 flex flex-col gap-6">
        <h2 class="text-2xl font-black text-white tracking-widest flex items-center gap-3">
          <svg class="w-8 h-8 text-[#00f3ff] animate-pulse" fill="currentColor" viewBox="0 0 256 256"><path d="M240,128a112,112,0,1,1-112-112A112.12,112.12,0,0,1,240,128Zm-112-96a96,96,0,1,0,96,96A96.11,96.11,0,0,0,128,32Z"></path></svg>
          {{ t('settings.engine.updateTitle') }}
        </h2>

        <div class="bg-black/50 border border-white/10 p-5 rounded-lg space-y-3">
          <p class="text-sm text-gray-300 font-code leading-relaxed" v-html="t('settings.engine.updateDesc', { engine: engineUpdateInfo.engine.toUpperCase(), version: engineUpdateInfo.version })">
          </p>
          <p class="text-xs text-gray-400 font-code">
            {{ t('settings.engine.updateDetail') }}
          </p>
          <div class="w-full h-px bg-white/10 my-2"></div>
          <p class="text-xs font-bold text-red-500 tracking-wider">
            {{ t('settings.engine.updateWarning') }}
          </p>
        </div>

        <div class="flex gap-4 mt-2">
          <button @click="showEngineUpdateModal = false" :disabled="isUpdatingEngine" class="flex-1 py-3 border border-white/20 text-gray-400 hover:text-white hover:border-white rounded font-bold font-code tracking-widest transition-all disabled:opacity-50">
            {{ t('settings.engine.updateBtnCancel') }}
          </button>
          <button @click="executeEngineUpdate" :disabled="isUpdatingEngine" class="flex-[2] py-3 bg-[#00f3ff] text-black hover:bg-white rounded font-black font-code tracking-widest transition-all flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(0,243,255,0.3)] disabled:opacity-50">
            <span v-if="isUpdatingEngine" class="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
            {{ isUpdatingEngine ? t('settings.engine.updatingText') : t('settings.engine.updateBtnConfirm') }}
          </button>
        </div>
      </div>
    </div>
  </BaseModal>

  <!-- 综合更新弹窗（主程序 + 引擎） -->
  <BaseModal
    :visible="showCombinedUpdateModal"
    @close="showCombinedUpdateModal = false"
    :show-close="true"
    container-class="max-w-md w-full bg-[#0e0e14] border border-[#00f3ff]/30 shadow-[0_0_50px_rgba(0,243,255,0.15)] p-8"
  >
    <div class="flex flex-col items-center text-center">
      <div class="w-14 h-14 rounded-full bg-[#00f3ff]/10 border border-[#00f3ff]/40 flex items-center justify-center text-[#00f3ff] mb-6 shadow-[0_0_20px_rgba(0,243,255,0.2)]">
        <svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </div>
      <h3 class="text-xl font-black text-white tracking-widest uppercase mb-2">{{ t('settings.update.combinedTitle') }}</h3>
      <p class="text-sm text-gray-400 font-code mb-6">{{ t('settings.update.combinedDesc') }}</p>

      <div class="w-full space-y-3 mb-6 text-left">
        <div v-if="combinedUpdateInfo.app.hasUpdate" class="bg-black/40 border border-white/10 rounded-lg p-4">
          <div class="text-xs text-gray-500 font-code tracking-widest mb-1">{{ t('settings.update.appLabel') }}</div>
          <div class="text-sm font-bold text-white">v{{ combinedUpdateInfo.app.currentVersion }} → v{{ combinedUpdateInfo.app.latestVersion }}</div>
        </div>
        <div v-if="combinedUpdateInfo.engine.hasUpdate" class="bg-black/40 border border-white/10 rounded-lg p-4">
          <div class="text-xs text-gray-500 font-code tracking-widest mb-1">{{ t('settings.update.engineLabel') }}</div>
          <div class="text-sm font-bold text-white">{{ combinedUpdateInfo.engine.engine.toUpperCase() }} v{{ combinedUpdateInfo.engine.version }}</div>
        </div>
      </div>

      <div class="w-full bg-black/40 border border-white/10 rounded-lg p-4 mb-6">
        <p class="text-sm font-bold font-code tracking-wider text-[#00f3ff]">{{ t('settings.update.queueDesc') }}</p>
      </div>

      <div class="flex items-center gap-4 w-full">
        <button type="button" @click="showCombinedUpdateModal = false" class="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-bold font-code tracking-wider text-sm rounded-lg transition-all">
          {{ t('settings.update.later') }}
        </button>
        <button type="button" @click="startCombinedUpdate" :disabled="isUpdatingCombined" class="flex-1 py-3 bg-[#00f3ff] text-black font-black font-code tracking-widest rounded hover:bg-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
          <span v-if="isUpdatingCombined" class="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
          <span>{{ t('settings.update.updateAll') }}</span>
        </button>
      </div>
    </div>
  </BaseModal>

  <!-- 单独主程序更新弹窗 -->
  <BaseModal
    :visible="showAppUpdateModal"
    @close="showAppUpdateModal = false"
    :show-close="true"
    container-class="max-w-md w-full bg-[#0e0e14] border border-[#00f3ff]/30 shadow-[0_0_50px_rgba(0,243,255,0.15)] p-8"
  >
    <div class="flex flex-col items-center text-center">
      <div class="w-16 h-16 rounded-full bg-[#00f3ff]/10 border border-[#00f3ff]/40 flex items-center justify-center text-[#00f3ff] mb-6 shadow-[0_0_20px_rgba(0,243,255,0.2)]">
        <svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </div>
      <h3 class="text-xl font-black text-white tracking-widest uppercase mb-2">{{ t('settings.update.appOnlyTitle') }}</h3>
      <p class="text-sm text-gray-400 font-code mb-6">
        v{{ appUpdateInfo.currentVersion }} → v{{ appUpdateInfo.latestVersion }}
      </p>
      <div class="w-full bg-black/40 border border-white/10 rounded-lg p-4 mb-6">
        <p class="text-sm font-bold font-code tracking-wider text-[#00f3ff]">{{ t('settings.update.queueDesc') }}</p>
      </div>
      <div class="flex items-center gap-4 w-full">
        <button type="button" @click="showAppUpdateModal = false" class="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-bold font-code tracking-wider text-sm rounded-lg transition-all">
          {{ t('settings.update.later') }}
        </button>
        <button type="button" @click="startAppUpdate" class="flex-1 py-3 bg-[#00f3ff] text-black font-black font-code tracking-widest rounded hover:bg-white transition-colors">
          {{ t('settings.update.confirmUpdate') }}
        </button>
      </div>
    </div>
  </BaseModal>

  <!-- 全局更新就绪倒计时弹窗，与页面生命周期解耦 -->
  <BaseModal
    :visible="showUpdateCountdown"
    :show-close="false"
    container-class="max-w-sm w-full bg-[#0e0e14] border border-[#00f3ff]/30 shadow-[0_0_50px_rgba(0,243,255,0.15)] p-8 text-center"
  >
    <div class="flex flex-col items-center text-center">
      <div class="w-16 h-16 rounded-full border-4 border-[#00f3ff] flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(0,243,255,0.5)]">
        <span class="text-3xl font-black text-[#00f3ff] font-code">{{ updateCountdown }}</span>
      </div>
      <h3 class="text-xl font-black text-white tracking-widest mb-2">{{ t('settings.update.countdownTitle') }}</h3>
      <p class="text-sm text-gray-400 font-code leading-relaxed whitespace-pre-line">
        {{ t('settings.update.countdownDesc') }}
      </p>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from './stores/authStore'
import { useDiscoveryStore } from './stores/discoveryStore'
import { useSearchStore } from './stores/searchStore'
import { useLibraryStore } from './stores/libraryStore'
import { useTransmissionStore } from './stores/transmissionStore'
import { useFeedbackStore } from './stores/feedbackStore'
import { useTelemetryStore } from './stores/telemetryStore'
import Sidebar from './components/Sidebar.vue'
import DiscoveryView from './components/DiscoveryView.vue'
import TransmissionsView from './components/TransmissionsView.vue'
import SettingsView from './components/SettingsView.vue'
import LibraryView from './components/LibraryView.vue'
import NexusGateView from './components/NexusGateView.vue'
import FeedbackView from './components/FeedbackView.vue'
import CollectionView from './components/CollectionView.vue'
import HajimiBeat from './components/HajimiBeat.vue'
import BaseModal from "./components/common/BaseModal.vue";
import Swal from 'sweetalert2'
import { t, initLang } from './i18n'

const authStore = useAuthStore()
const discoveryStore = useDiscoveryStore()
const searchStore = useSearchStore()
const libraryStore = useLibraryStore()
const transmissionStore = useTransmissionStore()
const feedbackStore = useFeedbackStore()
const mainContainer = ref<HTMLElement | null>(null)

const currentView = ref('discovery')

const telemetryStore = useTelemetryStore()

// 页面切换埋点
let pageEnterTime = 0
let currentPageId = ''
watch(currentView, (newView, oldView) => {
  if (oldView && currentPageId) {
    telemetryStore.exitPage(currentPageId, Date.now() - pageEnterTime)
  }
  currentPageId = newView
  pageEnterTime = Date.now()
  telemetryStore.enterPage(newView)
}, { immediate: true })

const isRestartingSteam = ref(false)
const performanceMode = ref(false)
const showWelcomeModal = ref(false)
const showInitError = ref(false)
const initErrorMsg = ref('')

// 全局更新倒计时状态
const showUpdateCountdown = ref(false)
const updateCountdown = ref(5)
let updateCountdownTimer: ReturnType<typeof setInterval> | null = null

// 综合更新弹窗状态
const showCombinedUpdateModal = ref(false)
const isUpdatingCombined = ref(false)
const combinedUpdateInfo = ref({
  app: { hasUpdate: false, currentVersion: '', latestVersion: '' },
  engine: { hasUpdate: false, version: 0, engine: '' }
})

// 单独主程序更新弹窗状态
const showAppUpdateModal = ref(false)
const appUpdateInfo = ref({ latestVersion: '', currentVersion: '' })

// 更新检测控制
const hasCheckedUpdate = ref(false)
const isFirstLaunchFlag = ref(false)

const globalBusy = computed(() => {
  const list = transmissionStore.tasks
  for (let i = list.length - 1; i >= 0; i--) {
    const t = list[i]
    if (['active', 'error', 'paused', 'waiting'].includes(t.status)) {
      return true
    }
  }
  return false
})

const topBarColorClass = computed(() => {
  const list = transmissionStore.tasks
  for (let i = list.length - 1; i >= 0; i--) {
    const t = list[i]
    if (t.status === 'error') return 'bg-red-500 shadow-[0_0_15px_red]'
    if (t.status === 'paused') return 'bg-yellow-500/50'
    if (t.status === 'active' || t.status === 'waiting') {
      return 'bg-[#00f3ff] shadow-[0_0_20px_rgba(0,243,255,0.8)]'
    }
  }
  return 'bg-primary'
})

const showBootSplash = ref(true)

const showEngineUpdateModal = ref(false)
const isUpdatingEngine = ref(false)
const engineUpdateInfo = ref({ version: 0, engine: '' })

let _perfModeShadow = false
let _audioSyncShadow = 0

let unsubLoginSuccess: (() => void) | null = null
let unsubTriggerUpdate: (() => void) | null = null
let unsubLibUpdated: (() => void) | null = null
let unsubUpdateReady: (() => void) | null = null
let unsubUpdateError: (() => void) | null = null
let bootSplashTimer: ReturnType<typeof setTimeout> | null = null
let welcomeModalTimer: ReturnType<typeof setTimeout> | null = null

const systemStatus = computed(() => {
  if (authStore.connectionError) return 'offline'
  if (authStore.isConnected && discoveryStore.syncPhase === 'ready') return 'ready'
  return 'syncing'
})

const winControl = {
  min: () => window.electron?.window?.min?.(),
  max: () => window.electron?.window?.max?.(),
  close: () => window.electron?.window?.close?.()
}

const currentBreadcrumb = computed(() => {
  const map: Record<string, string> = {
    nexus_gate: 'NEXUS GATE',
    library: 'LIBRARY',
    transmissions: 'TRANSMISSIONS',
    settings: 'SETTINGS',
    discovery: 'DISCOVERY',
    uplink: 'UPLINK',
    hajimi_beat: 'HAJIMI BEAT',
    collection: 'COLLECTION'
  }
  return map[currentView.value] || currentView.value.toUpperCase()
})

const handleRestartSteam = async () => {
  if (isRestartingSteam.value) return
  isRestartingSteam.value = true
  try {
    await window.electron.invoke('sys:restart-steam')
  } catch (err) {
    console.error('[TitanCore] Steam Restart Failed:', err)
  } finally {
    isRestartingSteam.value = false
  }
}

const togglePerformanceMode = async () => {
  performanceMode.value = !performanceMode.value
  _perfModeShadow = performanceMode.value
  document.documentElement.classList.toggle('performance-mode', performanceMode.value)
  if (performanceMode.value) forceGarbageCollection()
}

const audioSyncLevel = ref(0)
let audioCtx: AudioContext | null = null
let analyser: AnalyserNode | null = null
let audioStream: MediaStream | null = null
let audioSource: MediaStreamAudioSourceNode | null = null
let audioAnimFrame = 0
let isAudioInitializing = false
let isRendering = false 
let syncTimeout: ReturnType<typeof setTimeout> | null = null
let currentScale = 0
let currentOpacity = 0

const forceGarbageCollection = async () => {
  isRendering = false
  if (syncTimeout) clearTimeout(syncTimeout)
  if (audioAnimFrame) cancelAnimationFrame(audioAnimFrame)

  const detachedCtx = audioCtx
  const detachedSource = audioSource
  const detachedStream = audioStream

  audioCtx = null
  analyser = null
  audioSource = null
  audioStream = null
  isAudioInitializing = false

  if (mainContainer.value) {
    mainContainer.value.style.setProperty('--halo-opacity', '0')
    mainContainer.value.style.setProperty('--bass-scale', '0')
    mainContainer.value.style.setProperty('--high-glow', '0')
  }

  if (detachedSource) detachedSource.disconnect()
  if (detachedStream) detachedStream.getTracks().forEach(t => t.stop())

  if (detachedCtx && detachedCtx.state !== 'closed') {
    try { await detachedCtx.close() } catch (e) {}
  }
}

const handleHajimiAudioDisable = () => {
  if (audioSyncLevel.value === 1) {
    forceGarbageCollection()
    audioSyncLevel.value = 0
  }
}

const handleVisibilityChange = () => {
  if (document.hidden) {
    if (audioSyncLevel.value === 1 && !performanceMode.value) {
      forceGarbageCollection()
    }
  } else {
    if (audioSyncLevel.value === 1 && !performanceMode.value) {
      if (syncTimeout) clearTimeout(syncTimeout)
      syncTimeout = setTimeout(startAudioSync, 300)
    }
  }
}

const toggleAudioSync = async () => {
  audioSyncLevel.value = (audioSyncLevel.value + 1) % 2
  _audioSyncShadow = audioSyncLevel.value
  await forceGarbageCollection()
  if (audioSyncLevel.value === 1 && !performanceMode.value) {
    syncTimeout = setTimeout(startAudioSync, 300)
  }
}

const startAudioSync = async () => {
  if (audioStream || isAudioInitializing) return
  isAudioInitializing = true
  try {
    let sourceId = ''
    if (window.electron?.sys?.getDesktopAudioSource) {
      sourceId = await Promise.race([
        window.electron.sys.getDesktopAudioSource(),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Audio source timeout')), 5000))
      ])
    }

    const constraints: any = sourceId ? {
      audio: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId } },
      video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId, maxWidth: 64, maxHeight: 64 } }
    } : { audio: true, video: false }

    const rawStream = await navigator.mediaDevices.getUserMedia(constraints)

    if (!isAudioInitializing || _audioSyncShadow !== 1) {
      rawStream.getTracks().forEach(t => t.stop())
      return
    }

    if (sourceId) {
      rawStream.getVideoTracks().forEach(track => {
        track.stop()
        rawStream.removeTrack(track)
      })
    }

    audioStream = rawStream
    audioCtx = new window.AudioContext()
    analyser = audioCtx.createAnalyser()
    analyser.fftSize = 64
    audioSource = audioCtx.createMediaStreamSource(audioStream)
    audioSource.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    isRendering = true 

    const renderLoop = () => {
      if (!isRendering || _perfModeShadow || _audioSyncShadow !== 1 || !analyser || !mainContainer.value) return

      analyser.getByteFrequencyData(dataArray)

      let bassSum = 0, midSum = 0, highSum = 0
      for (let i = 0; i < 4; i++) bassSum += dataArray[i]
      for (let i = 4; i < 12; i++) midSum += dataArray[i]
      for (let i = 12; i < 24; i++) highSum += dataArray[i]

      const rBass = Math.max(0, (bassSum / 4 - 30) / 225)
      const rMid = Math.max(0, (midSum / 8 - 20) / 235)
      const rHigh = Math.max(0, (highSum / 12 - 10) / 245)

      const tScale = 0.01 + Math.pow(rBass, 2) * 0.8 + rMid * 0.2
      const tOpacity = rBass * 0.2

      if (Math.abs(tScale - currentScale) > 0.005) {
        currentScale += (tScale > currentScale ? tScale - currentScale : (tScale - currentScale) * 0.15)
        mainContainer.value.style.setProperty('--bass-scale', currentScale.toFixed(3))
      }

      if (Math.abs(tOpacity - currentOpacity) > 0.005) {
        currentOpacity += (tOpacity > currentOpacity ? tOpacity - currentOpacity : (tOpacity - currentOpacity) * 0.1)
        mainContainer.value.style.setProperty('--halo-opacity', currentOpacity.toFixed(3))
      }

      mainContainer.value.style.setProperty('--mid-hue', (170 + rMid * 40).toFixed(0))
      mainContainer.value.style.setProperty('--high-glow', (0.5 + rHigh * 0.8).toFixed(3))

      if (isRendering) audioAnimFrame = requestAnimationFrame(renderLoop)
    }
    renderLoop()
  } catch (e) {
    console.warn('[TitanCore] 音频矩阵同步未就绪 (系统声卡无响应或无权限):', e)
    audioSyncLevel.value = 0
    _audioSyncShadow = 0
    await forceGarbageCollection()
  } finally {
    isAudioInitializing = false
  }
}

const executeEngineUpdate = async () => {
  isUpdatingEngine.value = true
  try {
    const res = await window.electron.invoke('engine:switch', engineUpdateInfo.value.engine)
    if (res?.success) {
      showEngineUpdateModal.value = false
      Swal.fire({ title: '引擎接驳成功', text: res.msg, icon: 'success', background: '#121212', color: '#00f3ff', timer: 3000, showConfirmButton: false })
    } else {
      Swal.fire({ title: '覆写失败', text: res?.msg || '未知阻断', icon: 'error', background: '#121212', color: '#fff' })
    }
  } catch (e: any) {
    Swal.fire({ title: '系统异常', text: e.message, icon: 'error', background: '#121212', color: '#fff' })
  } finally {
    isUpdatingEngine.value = false
  }
}

// 主程序更新检查
const checkAppUpdate = async () => {
  try {
    const res = await window.electron.sys.checkUpdate()
    if (res.hasUpdate) {
      appUpdateInfo.value = {
        latestVersion: res.latestVersion,
        currentVersion: res.currentVersion
      }
      combinedUpdateInfo.value.app = {
        hasUpdate: true,
        currentVersion: res.currentVersion,
        latestVersion: res.latestVersion
      }
      return true
    }
  } catch (e) {
    console.warn('[App] 主程序更新检查失败:', e)
  }
  combinedUpdateInfo.value.app.hasUpdate = false
  return false
}

// 启动主程序后台下载
const startAppUpdate = async () => {
  try {
    const res = await window.electron.sys.startUpdate()
    if (res.success) {
      showAppUpdateModal.value = false
      Swal.fire({ title: '更新已启动', text: '下载完成后将自动安装', icon: 'success', background: '#121212', color: '#00f3ff', timer: 3000, showConfirmButton: false })
    } else {
      Swal.fire({ title: '更新启动失败', text: res.msg, icon: 'error', background: '#121212', color: '#fff' })
      showAppUpdateModal.value = false
    }
  } catch (e: any) {
    Swal.fire({ title: '系统异常', text: e.message, icon: 'error', background: '#121212', color: '#fff' })
  }
}

// 综合更新一键执行
const startCombinedUpdate = async () => {
  isUpdatingCombined.value = true
  try {
    if (combinedUpdateInfo.value.app.hasUpdate) {
      const res = await window.electron.sys.startUpdate()
      if (!res.success) {
        Swal.fire({ title: '更新启动失败', text: res.msg, icon: 'error', background: '#121212', color: '#fff' })
        return
      }
    }
    if (combinedUpdateInfo.value.engine.hasUpdate) {
      const res = await window.electron.invoke('engine:switch', combinedUpdateInfo.value.engine.engine)
      if (!res?.success) {
        Swal.fire({ title: '引擎更新失败', text: res?.msg || '未知阻断', icon: 'error', background: '#121212', color: '#fff' })
        return
      }
    }
    showCombinedUpdateModal.value = false
    Swal.fire({ title: '更新已启动', text: '主程序与引擎更新已加入队列，下载完成后将自动安装', icon: 'success', background: '#121212', color: '#00f3ff', timer: 3000, showConfirmButton: false })
  } catch (e: any) {
    Swal.fire({ title: '系统异常', text: e.message, icon: 'error', background: '#121212', color: '#fff' })
  } finally {
    isUpdatingCombined.value = false
  }
}

// 更新检测核心逻辑
const runUpdateCheck = async () => {
  if (hasCheckedUpdate.value) return
  hasCheckedUpdate.value = true

  try {
    const currentEngine = await window.electron.invoke('sys:get-config', 'unlock_engine') || 'ost'
    
    const [appHasUpdate, engineUpdateCheck] = await Promise.all([
      checkAppUpdate(),
      window.electron.invoke('engine:silent-check', currentEngine).catch(() => ({ hasUpdate: false }))
    ])

    const engineHasUpdate = engineUpdateCheck?.hasUpdate || false

    if (appHasUpdate && engineHasUpdate) {
      combinedUpdateInfo.value.engine = {
        hasUpdate: true,
        version: engineUpdateCheck.version,
        engine: currentEngine
      }
      showCombinedUpdateModal.value = true
    } else if (appHasUpdate) {
      showAppUpdateModal.value = true
    } else if (engineHasUpdate) {
      engineUpdateInfo.value = { version: engineUpdateCheck.version, engine: currentEngine }
      showEngineUpdateModal.value = true
    }
  } catch (e) {
    console.warn('[App] 更新检测失败:', e)
  }
}

const handleNavigationBroadcast = (e: any) => {
  const detail = e.detail
  if (!detail) return
  if (typeof detail === 'string') {
    currentView.value = detail
  } else if (typeof detail === 'object' && detail.view) {
    currentView.value = detail.view
    if (detail.payload) {
      (window as any).__titanCollectionPayload = detail.payload
    }
  }
}

const handleFeedbackReply = () => {
  if (currentView.value !== 'uplink') {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'info',
      title: '收到来自 Hajimi 的新回复',
      background: '#0a0a15',
      color: '#00f3ff',
      timer: 4000,
      showConfirmButton: false
    })
  }
}

function goToFeedback() {
    feedbackStore.markRead()
    currentView.value = 'uplink'
}

// 启动全局更新倒计时
const startUpdateCountdown = () => {
  if (updateCountdownTimer) clearInterval(updateCountdownTimer)
  showUpdateCountdown.value = true
  updateCountdown.value = 5
  updateCountdownTimer = setInterval(() => {
    updateCountdown.value--
    if (updateCountdown.value <= 0) {
      if (updateCountdownTimer) clearInterval(updateCountdownTimer)
      updateCountdownTimer = null
      window.electron.invoke('app:execute-update')
    }
  }, 1000)
}

onMounted(async () => {
  await initLang()

  window.addEventListener('titan-navigate', handleNavigationBroadcast)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  const res = await window.electron.invoke('sys:client-ready')
  const isFirstLaunch = res?.isFirstLaunch ?? false
  isFirstLaunchFlag.value = isFirstLaunch

  if (isFirstLaunch) {
    currentView.value = 'settings'
    bootSplashTimer = setTimeout(() => {
      showBootSplash.value = false
      welcomeModalTimer = setTimeout(() => { 
        showWelcomeModal.value = true 
        discoveryStore.fetchResources(false)
      }, 400)
    }, 2000)
  } else {
    showBootSplash.value = false
    discoveryStore.init()
    discoveryStore.setSyncPhase('ready')
  }

  // auth:login-success 只负责同步数据
  unsubLoginSuccess = window.electron.on('auth:login-success', async () => {
    window.electron.invoke('sys:sync-start', { force: true }).catch(() => {})
    libraryStore.pullCloud().catch(() => {})
  })

  // 由主进程底座在登录成功后 4 秒推送，彻底解耦时序
  unsubTriggerUpdate = window.electron.on('app:trigger-update-check', () => {
    if (isFirstLaunchFlag.value) return
    runUpdateCheck()
  })

  unsubLibUpdated = window.electron.on('titan:library-updated', () => {
    discoveryStore.setSyncPhase('ready')
    discoveryStore.fetchResources(false)
  })

  // 全局更新监听，与页面生命周期解耦
  unsubUpdateReady = window.electron.on('app:update-ready', () => {
    startUpdateCountdown()
  })

  unsubUpdateError = window.electron.on('app:update-error', (errMsg: string) => {
    Swal.fire({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 5000,
      title: '更新系统发生异常',
      text: errMsg,
      icon: 'error',
      background: '#0a0f16',
      color: '#ff4444'
    })
  })

  try {
    const savedPerfMode = await window.electron.invoke('sys:get-config', 'performanceMode')
    performanceMode.value = !!savedPerfMode
  } catch (err) {
    performanceMode.value = false
  }

  _perfModeShadow = performanceMode.value
  _audioSyncShadow = audioSyncLevel.value
  if (performanceMode.value) {
    document.documentElement.classList.add('performance-mode')
  }

  await feedbackStore.loadLocal()
  feedbackStore.startPolling()

  window.addEventListener('feedback:new-reply', handleFeedbackReply)
  window.addEventListener('hajimi:audio-disable', handleHajimiAudioDisable)
})

onUnmounted(() => {
  window.removeEventListener('titan-navigate', handleNavigationBroadcast)
  window.removeEventListener('feedback:new-reply', handleFeedbackReply)
  window.removeEventListener('hajimi:audio-disable', handleHajimiAudioDisable)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  unsubLoginSuccess?.()
  unsubTriggerUpdate?.()
  unsubLibUpdated?.()
  unsubUpdateReady?.()
  unsubUpdateError?.()
  if (bootSplashTimer) clearTimeout(bootSplashTimer)
  if (welcomeModalTimer) clearTimeout(welcomeModalTimer)
  if (updateCountdownTimer) clearInterval(updateCountdownTimer)
  forceGarbageCollection()
  feedbackStore.stopPolling()
})
</script>

<style scoped>
.steam-restart-container { display: flex; align-items: center; justify-content: center; }

.flowing-light-ring {
  position: absolute; inset: -2px; border-radius: 50%;
  background: conic-gradient(from 180deg, var(--primary) 0%, transparent 60%);
  mask-image: radial-gradient(transparent 60%, black 61%); -webkit-mask-image: radial-gradient(transparent 60%, black 61%);
  opacity: 0; transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1); pointer-events: none; z-index: 5;
}
.flowing-light-ring.active { opacity: 1; animation: flow-spin 2s linear infinite; }
@keyframes flow-spin { to { transform: rotate(360deg); } }
.steam-restart-container:hover .flowing-light-ring:not(.active) { opacity: 0.5; }
.flowing-light-ring.stop-animation { animation: none !important; }

.quantum-pillar {
  position: absolute; left: 50%; top: 50%; width: 2px; height: 100vh; margin-left: -1px;
  background: linear-gradient(to bottom, transparent, hsl(var(--mid-hue, 180), 100%, 50%), transparent);
  opacity: var(--high-glow, 0.5); filter: drop-shadow(0 0 12px hsl(var(--mid-hue, 180), 100%, 60%));
  transform-origin: center; pointer-events: none;
}

.welcome-modal-content {
  animation: modal-fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}
@keyframes modal-fade-up {
  0% { transform: translateY(20px) scale(0.98); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
</style>

<style>
.boot-splash { contain: layout style paint; }
.conic-ring {
  background: conic-gradient(from 0deg, transparent, var(--primary), transparent);
  animation: spin 1s linear infinite;
}
.glow-ring {
  box-shadow: 0 0 40px rgba(var(--primary-rgb), 0.4), 0 0 80px rgba(var(--primary-rgb), 0.2);
  animation: pulse-glow 1.5s ease-in-out infinite;
}
.glitch-text { position: relative; }
.glitch-text::before,
.glitch-text::after {
  content: attr(data-text); position: absolute; left: 0; top: 0; width: 100%; height: 100%; opacity: 0.8;
}
.glitch-text::before {
  animation: glitch-1 0.25s infinite linear alternate-reverse; color: #ff00aa; clip-path: polygon(0 0, 100% 0, 100% 40%, 0 40%);
}
.glitch-text::after {
  animation: glitch-2 0.25s infinite linear alternate-reverse; color: #00f3ff; clip-path: polygon(0 60%, 100% 60%, 100% 100%, 0 100%);
}
.charge-bar {
  animation: charge-stutter 2.5s ease-out forwards; width: 0%;
}
.scanlines {
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.12) 2px, rgba(0, 0, 0, 0.12) 4px);
}

.splash-fade-leave-active {
  transition: opacity 0.4s ease-out;
}
.splash-fade-enter-active {
  transition: background-color 0.6s ease;
}
.splash-fade-leave-to { opacity: 0; }
.splash-fade-enter-from { opacity: 0; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse-glow {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}
@keyframes charge-stutter {
  0% { width: 0%; }
  30% { width: 42%; }
  35% { width: 42%; } 
  70% { width: 89%; }
  85% { width: 89%; } 
  100% { width: 100%; }
}
@keyframes glitch-1 {
  0% { transform: translate(0); }
  20% { transform: translate(-2px, 1px); }
  40% { transform: translate(2px, -1px); }
  60% { transform: translate(-1px, 2px); }
  80% { transform: translate(1px, -2px); }
  100% { transform: translate(0); }
}
@keyframes glitch-2 {
  0% { transform: translate(0); }
  20% { transform: translate(2px, -1px); }
  40% { transform: translate(-2px, 1px); }
  60% { transform: translate(1px, -2px); }
  80% { transform: translate(-1px, 2px); }
  100% { transform: translate(0); }
}
@keyframes spin-slow { to { transform: rotate(360deg); } }
@keyframes spin-reverse { to { transform: rotate(-360deg); } }
.animate-spin-slow { animation: spin-slow 10s linear infinite; }
.animate-spin-reverse { animation: spin-reverse 7s linear infinite; }

.performance-mode .animate-pulse, .performance-mode .animate-spin, .performance-mode .animate-bounce,
.performance-mode .animate-progress-gpu, .performance-mode .animate-flow, .performance-mode .cyber-breathe,
.performance-mode .rgb-glow, .performance-mode .slider-thumb-cyber::-webkit-slider-thumb, 
.performance-mode .vip-avatar-frame, .performance-mode .vip-flow-line, .performance-mode .vip-flow-line::before { animation-play-state: paused !important; }

.performance-mode .animate-fade-in, .performance-mode .animate-fade-in-up { animation: none !important; opacity: 1 !important; transform: none !important; }
.performance-mode .rgb-glow { opacity: 0.6 !important; box-shadow: 0 0 20px rgba(var(--primary-rgb), 0.3) !important; }
.performance-mode .slider-thumb-cyber::-webkit-slider-thumb { box-shadow: 0 0 10px rgba(var(--primary-rgb), 0.5) !important; }
</style>