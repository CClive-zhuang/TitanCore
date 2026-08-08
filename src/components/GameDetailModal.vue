// 文件名: src/components/GameDetailModal.vue
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen && resource" class="fixed inset-0 z-[999] flex items-center justify-center p-4 backdrop-blur-sm bg-black/60" @click.self="close">
        
        <div class="bg-[#0a0a0a] w-full max-w-4xl h-[85vh] rounded-xl border border-white/10 shadow-2xl flex flex-col overflow-hidden relative animate-scale-in">
            
            <button @click="close" class="absolute top-4 right-4 z-50 p-2 text-white/50 hover:text-white bg-black/50 hover:bg-red-500/20 rounded-full transition-all">
                <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            <div class="relative h-64 shrink-0 overflow-hidden group bg-black">
                <TitanImage 
                    :id="gameId" 
                    :src="coverUrl" 
                    class="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    alt="cover"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent"></div>
                
                <div class="absolute bottom-6 left-8 right-8 flex items-end justify-between">
                    <div>
                        <div class="flex items-center gap-3 mb-2">
                            <span v-if="vipBadge" :class="`text-[10px] font-black px-2 py-0.5 rounded border ${vipBadge.color}`">
                                {{ vipBadge.label }}
                            </span>
                            <span v-if="resource.time_action !== 'none'" class="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                {{ t('detail.timeAction') }}
                            </span>
                            <span class="text-xs font-mono text-gray-400 bg-black/50 px-2 py-0.5 rounded border border-white/10">
                                {{ resource.type?.toUpperCase() || t('detail.unknownType') }}
                            </span>
                        </div>
                        <h1 class="text-3xl font-black text-white drop-shadow-lg tracking-tight">{{ resource.basic?.title || t('detail.unnamed') }}</h1>
                    </div>
                    
                    <div class="text-right">
                         <div v-if="resource.policy_price > 0" class="text-2xl font-black text-[#00f3ff] drop-shadow-glow">
                             {{ resource.policy_price }} <span class="text-sm text-gray-400">{{ t('detail.currency') }}</span>
                         </div>
                         <div v-else class="text-2xl font-black text-green-400">
                             {{ t('detail.free') }}
                         </div>
                    </div>
                </div>
            </div>

            <div class="flex flex-1 overflow-hidden relative">
                <div v-if="showLocalProtocolConsole" class="absolute inset-0 z-20 bg-[#0a0a0a] flex flex-col animate-fade-in">
                    <div class="bg-green-900/20 p-3 px-4 border-b border-green-500/30 flex justify-between items-center">
                        <span class="text-sm font-mono text-green-400 flex items-center gap-2">
                            <span class="animate-spin">◉</span> 
                            {{ t('detail.terminalTitle') }}
                        </span>
                        <span class="text-sm font-mono text-green-600">{{ localProgressPercent }}%</span>
                    </div>
                    <div class="relative h-1.5 bg-gray-900">
                        <div class="absolute h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-300 shadow-[0_0_10px_rgba(0,255,0,0.5)]" :style="`width: ${localProgressPercent}%`"></div>
                    </div>
                    <div ref="logContainerRef" class="flex-1 p-6 font-mono text-xs overflow-y-auto space-y-2 bg-black/50">
                        <div v-for="(log, i) in localConsoleLogs" :key="i" class="flex gap-3 animate-fade-in">
                            <span class="text-gray-600 select-none shrink-0">[{{ log.ts }}]</span>
                            <span :class="{
                                'text-green-400 font-bold': log.type === 'success', 
                                'text-red-400 font-bold': log.type === 'error', 
                                'text-gray-300': log.type === 'info',
                                'text-yellow-400': log.type === 'warning'
                            }">{{ log.msg }}</span>
                        </div>
                        <div v-if="!isProtocolComplete" class="flex gap-3">
                            <span class="text-gray-600 select-none">[{{ currentTime }}]</span>
                            <span class="text-green-500 animate-pulse">_</span>
                        </div>
                    </div>
                    <div class="p-4 border-t border-white/5 bg-white/5 flex justify-between items-center">
                        <div class="text-xs text-gray-500 font-mono">
                            <span v-if="localTaskSuccess" class="text-green-400">{{ t('detail.terminalDone') }}</span>
                            <span v-else-if="localTaskFailed" class="text-red-400">{{ t('detail.terminalFailed') }}</span>
                            <span v-else class="text-yellow-400">{{ t('detail.processing') }}</span>
                        </div>
                        <button v-if="localTaskSuccess || localTaskFailed" 
                                @click="resetLocalDeployment" 
                                class="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded transition-colors">
                            {{ localTaskSuccess ? t('detail.finishClose') : t('detail.btnClose') }}
                        </button>
                    </div>
                </div>

                <div class="w-2/3 p-8 overflow-y-auto custom-scrollbar border-r border-white/5 relative z-10">
                    
                    <div class="prose prose-invert max-w-none">
                        <h3 class="text-[#00f3ff] font-bold mb-4 flex items-center gap-2 text-lg">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM176,88a48,48,0,0,1-96,0,8,8,0,0,1,16,0,32,32,0,0,0,64,0,8,8,0,0,1,16,0Z"></path></svg>
                            {{ t('detail.resourceInfo') }}
                        </h3>

                        <div v-if="radarStatus === 'red'" class="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                            <div class="text-red-400 text-base font-black tracking-wider flex items-center gap-2 mb-1">
                                <span class="relative flex h-3 w-3"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>
                                {{ t('detail.radarDenuvoTitle') }}
                            </div>
                            <div class="text-sm text-red-400/80 leading-relaxed font-sans">
                                {{ t('detail.radarDenuvoDesc') }}
                            </div>
                        </div>

                        <div v-else-if="radarStatus === 'yellow'" class="mb-5 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg shadow-[0_0_15px_rgba(234,179,8,0.05)]">
                            <div class="text-yellow-400 text-base font-black tracking-wider flex items-center gap-2 mb-1">
                                <span class="w-3 h-3 rounded bg-yellow-500 border border-black shadow-[0_0_5px_#eab308]"></span>
                                {{ t('detail.radarDependencyTitle') }}
                            </div>
                            <div class="text-sm text-yellow-400/80 leading-relaxed font-sans">
                                {{ t('detail.radarDependencyDesc') }}
                            </div>
                        </div>

                        <p class="text-gray-300 leading-[1.8] whitespace-pre-wrap font-sans text-sm md:text-base">{{ resource.basic?.desc || resource.meta?.description || t('detail.unknown') }}</p>
                    </div>

                    <div class="mt-8 flex flex-wrap gap-2">
                        <span v-for="tag in (resource.basic?.tags || [])" :key="tag" class="px-3 py-1 bg-white/5 rounded-full text-xs text-gray-400 border border-white/5 hover:border-white/20 transition-colors cursor-default">
                            #{{ tag }}
                        </span>
                    </div>
                </div>

                <div class="w-1/3 bg-[#0f0f0f] flex flex-col relative z-10">
                    
                    <div class="p-6 border-b border-white/5 space-y-4">
                        <div v-if="authStore.isLoggedIn" 
                             class="flex items-center justify-between p-3 rounded bg-black/40 border border-white/10"
                             :class="{ 'border-red-500/30 bg-red-500/5': safeRemaining <= 0 && safeExtraRemaining <= 0 }">
                            <div class="flex items-center gap-2">
                                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" :class="quotaColorClass">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                </svg>
                                <span class="text-xs text-gray-400">{{ t('detail.dailyQuota') }}</span>
                            </div>
                            <div class="text-sm font-mono font-bold" :class="quotaColorClass">
                                <template v-if="quotaLoaded">
                                    {{ safeRemaining }}/{{ safeLimit }}
                                    <span v-if="safeExtraRemaining > 0" class="text-yellow-400">+{{ safeExtraRemaining }}</span>
                                </template>
                                <template v-else>--/--</template>
                            </div>
                        </div>
                        
                        <div v-else class="flex items-center justify-between p-3 rounded bg-blue-500/5 border border-blue-500/20">
                            <span class="text-xs text-blue-400">{{ t('detail.loginToDownload') }}</span>
                            <button @click="showLoginToast" class="text-xs text-blue-400 hover:text-blue-300 underline">{{ t('detail.goLogin') }}</button>
                        </div>

                        <div class="space-y-4">
                            <!-- 状态1：未获取链接 -->
                            <div v-if="displayMirrors.length === 0 && !isFetching" class="text-center">
                                <div class="text-green-500 text-sm font-bold mb-4 flex items-center justify-center gap-2">
                                    <span class="w-2 h-2 bg-green-500 rounded-full"></span> 
                                    准备就绪
                                </div>
                                <button 
                                    @click="isProtocol ? handleDeploy() : fetchLinks()" 
                                    :disabled="!authStore.isLoggedIn || isDeploying || (isFetching && !isProtocol)"
                                    class="w-full py-3 bg-[#00f3ff] hover:bg-[#00d0dd] disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-black font-black rounded shadow-[0_0_20px_rgba(0,243,255,0.3)] transition-all hover:scale-[1.02] active:scale-95">
                                    {{ isProtocol ? t('detail.btnDeploy') : t('detail.btnSecureLink') }}
                                </button>
                                <p v-if="!authStore.isLoggedIn" class="text-[10px] text-center text-gray-600 mt-2">需要登录</p>
                            </div>

                            <!-- 状态2：获取中 -->
                            <div v-else-if="isFetching" class="py-8 flex flex-col items-center justify-center text-gray-500">
                                <div class="w-8 h-8 border-2 border-gray-600 border-t-[#00f3ff] rounded-full animate-spin mb-3"></div>
                                <span class="text-xs font-mono">{{ t('detail.fetchingLinks') }}</span>
                            </div>

                            <!-- 状态3：镜像列表 -->
                            <div v-else class="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                <div class="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider pl-1">{{ t('detail.availableNodes') }}</div>
                                
                                <button v-for="m in displayMirrors" :key="m.id || m.url" @click="triggerDownload(m)"
                                    :disabled="isProcessingMirror(m.id || m.url)" 
                                    :class="[
                                        isProcessingMirror(m.id || m.url)
                                            ? 'opacity-50 cursor-not-allowed' 
                                            : 'hover:bg-white/10 hover:border-[#00f3ff]/50'
                                    ]"
                                    class="w-full text-left p-3 rounded bg-white/5 border border-white/5 group transition-all relative overflow-hidden">
                                    
                                    <div class="absolute inset-0 bg-gradient-to-r from-[#00f3ff]/0 via-[#00f3ff]/0 to-[#00f3ff]/5 translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                                    
                                    <div class="relative flex items-center justify-between">
                                        <div class="flex items-center gap-3">
                                            <div class="w-8 h-8 rounded bg-black/50 flex items-center justify-center text-gray-400 group-hover:text-[#00f3ff]">
                                                <span v-if="isProcessingMirror(m.id || m.url)" class="animate-spin text-[#00f3ff]">⟳</span>
                                                <template v-else>
                                                    <span v-if="m.type === 'titan_protocol'">🎮</span>
                                                    <span v-else-if="m.type === 'cloud_drive'">☁️</span>
                                                    <span v-else>⬇️</span>
                                                </template>
                                            </div>
                                            <div>
                                                <div class="text-sm font-bold text-gray-200 group-hover:text-white">{{ m.name || t('detail.mirrorDefaultName') }}</div>
                                                <div class="text-[10px] text-gray-500 font-mono">{{ m.type?.toUpperCase() || t('detail.mirrorDirect') }}</div>
                                            </div>
                                        </div>
                                        <svg v-if="!isProcessingMirror(m.id || m.url)" class="w-4 h-4 text-gray-600 group-hover:text-[#00f3ff] -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="mt-auto p-6 bg-black/20 text-xs text-gray-500 font-mono space-y-1">
                        <div class="flex justify-between">
                            <span class="text-gray-600">{{ t('detail.resourceId') }}</span>
                            <span>{{ resource.id }}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600">{{ t('detail.appId') }}</span>
                            <span>{{ effectiveAppId }}</span>
                        </div>
                    </div>

                </div>
            </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import Swal from 'sweetalert2'
import { useAuthStore } from '../stores/authStore'
import { useSearchStore } from '../stores/searchStore'
import { useLibraryStore } from '../stores/libraryStore'
import { useTransmissionStore } from '../stores/transmissionStore'
import { t } from '../i18n'
import TitanImage from './TitanImage.vue'

const props = defineProps<{
  visible: boolean; gameId: string; appId?: string; cover: string; title: string; tags: string[]; rating: number; 
  description: string; isInstalled: boolean; isInLibrary: boolean; isDownloading: boolean; 
  isInstalling: boolean; progress: number; statusText: string; downloadText: string; 
  installPath?: string; idShort?: string; type?: string; 
}>()

const emit = defineEmits(['close'])

let unsubProtocolLog: (() => void) | null = null

const authStore = useAuthStore()
const searchStore = useSearchStore()
const libraryStore = useLibraryStore()
const transmissionStore = useTransmissionStore()

const effectiveAppId = computed(() => props.appId || props.gameId.replace(/^steam_gate_/, ''))
const isProtocol = computed(() => props.type === 'titan_protocol')
const radarStatus = computed(() => searchStore.checkRadarStatus(effectiveAppId.value))

const isOpen = computed(() => props.visible)
const resource = computed(() => {
    let desc = props.description
    if (props.gameId.startsWith('steam_gate_') && !desc) {
        desc = t('detail.steamProtocolDesc', { appId: effectiveAppId.value })
    }
    return {
        id: props.gameId,
        type: props.type || 'unknown',
        time_action: 'none',
        policy_price: 0,
        policy_vip: 0,
        basic: { title: props.title, desc: desc, tags: props.tags },
        meta: { description: desc, target_id: effectiveAppId.value }
    }
})

const coverUrl = computed(() => props.cover)
const onCoverError = () => {}
const vipBadge = computed(() => null)

const localMirrors = ref<any[]>([])
const isFetching = ref(false)
const isDeploying = ref(false)
const processingMirrors = ref<Set<string>>(new Set())

const showLocalProtocolConsole = ref(false)
const localProgressPercent = ref(0)
const localConsoleLogs = ref<Array<{msg: string, ts: string, type: 'info'|'error'|'success'|'warning'}>>([])
const isProtocolComplete = ref(false)
const localTaskSuccess = ref(false)
const localTaskFailed = ref(false)
const logContainerRef = ref<HTMLElement | null>(null)
const currentTime = computed(() => new Date().toLocaleTimeString())

const safeRemaining = computed(() => Math.max(0, authStore.dailyQuota?.remaining ?? 0))
const safeLimit = computed(() => authStore.dailyQuota?.limit ?? 0)
const safeExtraRemaining = computed(() => Math.max(0, authStore.dailyQuota?.extraRemaining ?? 0))
const quotaLoaded = computed(() => !!authStore.dailyQuota?.limit)
const quotaColorClass = computed(() => safeRemaining.value <= 0 ? 'text-red-500' : 'text-green-400')

const displayMirrors = computed(() => {
    if (!resource.value) return []
    if (localMirrors.value.length > 0) return localMirrors.value
    return resource.value.meta?.download_mirrors || []
})

const close = () => {
    emit('close')
    if (searchStore.searchResults.length === 1) {
        window.dispatchEvent(new CustomEvent('titan-navigate', { detail: 'nexus_gate' }))
    }
}

const resetLocalDeployment = () => {
    showLocalProtocolConsole.value = false
    localConsoleLogs.value = []
    isProtocolComplete.value = false
    localTaskSuccess.value = false
    localTaskFailed.value = false
    localProgressPercent.value = 0
    localMirrors.value = []
    processingMirrors.value.clear()
    close()
}

const addLocalLog = (msg: string, type: 'info'|'error'|'success'|'warning' = 'info') => {
    localConsoleLogs.value.push({ msg, ts: new Date().toLocaleTimeString(), type })
    if (localConsoleLogs.value.length > 200) {
        localConsoleLogs.value = localConsoleLogs.value.slice(-200)
    }
    nextTick(() => {
        if (logContainerRef.value) {
            logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight
        }
    })
}

function showToast(title: string, icon: 'success' | 'error' | 'warning' | 'info' = 'success') {
    Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
        title,
        icon,
        background: '#0a0f16',
        color: '#00f3ff',
        customClass: {
            popup: 'border border-[#00f3ff]/30 shadow-[0_0_20px_rgba(0,243,255,0.2)] rounded-lg'
        }
    })
}

function showLoginToast() {
    showToast(t('detail.toastLoginRequired'), 'warning')
}

function emitRequireLogin() {
    showLocalProtocolConsole.value = true
    isProtocolComplete.value = true
    localTaskFailed.value = true
    addLocalLog(t('detail.terminalAuthRequired'), 'error')
}

const isProcessingMirror = (mirrorId: string | undefined): boolean => {
    const id = mirrorId || ''
    if (processingMirrors.value.has(id)) return true
    if (showLocalProtocolConsole.value && !isProtocolComplete.value) return true
    return false
}

async function handleDeploy() {
    if (!resource.value) return
    if (!authStore.isLoggedIn) return emitRequireLogin()
    if (isDeploying.value) return

    const appId = effectiveAppId.value
    if (!appId) {
        showLocalProtocolConsole.value = true
        isProtocolComplete.value = true
        localTaskFailed.value = true
        addLocalLog(t('detail.terminalDeployFail', { msg: 'ERR_INVALID_APPID' }), 'error')
        return
    }

    isDeploying.value = true
    showLocalProtocolConsole.value = true
    isProtocolComplete.value = false
    localConsoleLogs.value = []
    localProgressPercent.value = 0
    localTaskSuccess.value = false
    localTaskFailed.value = false
    
    addLocalLog(t('detail.terminalDeploying'), 'warning')
    localProgressPercent.value = 15

    let rollbackNeeded = false
    if (!props.isInLibrary) {
        try {
            await libraryStore.toggleItem(props.gameId, {
                title: props.title,
                type: 'titan_protocol',
                cover: props.cover
            })
            rollbackNeeded = true
        } catch (e) {
            console.warn('[GameDetailModal] 预入库失败:', e)
        }
    }

    try {
        const res = await window.electron.invoke('titan:deploy-game', appId)
        
        if (res?.success) {
            libraryStore.updateItem(props.gameId, { installed: true, isDownloading: false })
            localProgressPercent.value = 100
            addLocalLog(t('detail.terminalDeploySuccess'), 'success')
            addLocalLog(t('detail.terminalVacSafe'), 'success')
            addLocalLog(t('detail.terminalAccountSafe'), 'success')
            addLocalLog(t('detail.terminalRestartSteam'), 'success')
            localTaskSuccess.value = true
        } else {
            const err = res?.msg || 'ERR_DEPLOY_UNKNOWN'
            if (err.includes('QUOTA') || err === 'QUOTA_EXHAUSTED') {
                addLocalLog(t('detail.terminalQuotaExhausted'), 'error')
            } else if (err.includes('401') || err.includes('403') || err === 'UNAUTHORIZED') {
                addLocalLog(t('detail.terminalSessionExpired'), 'error')
            } else {
                addLocalLog(t('detail.terminalDeployFail', { msg: err }), 'error')
            }
            localTaskFailed.value = true
            if (rollbackNeeded) {
                try { await libraryStore.removeItem(props.gameId) } catch {}
            }
        }
    } catch (e: any) {
        addLocalLog(t('detail.terminalSystemError', { msg: e.message }), 'error')
        localTaskFailed.value = true
        if (rollbackNeeded) {
            try { await libraryStore.removeItem(props.gameId) } catch {}
        }
    } finally {
        isProtocolComplete.value = true
        isDeploying.value = false
    }
}

async function fetchLinks() {
    if (!resource.value) return

    if (!authStore.isLoggedIn) {
        if (isProtocol.value) return emitRequireLogin()
        return showLoginToast()
    }

    if (isFetching.value) return

    const cached = transmissionStore.getLinkCache(resource.value.id)
    if (cached) {
        localMirrors.value = cached
        autoTriggerIfProtocol()
        return
    }

    isFetching.value = true
    try {
        const result = await window.electron.invoke('sys:fetch-secure-link', resource.value.id)
        if (result && result.success) {
            if (result.mirrors && result.mirrors.length > 0) {
                localMirrors.value = result.mirrors
                transmissionStore.setLinkCache(resource.value.id, result.mirrors)
            } else {
                localMirrors.value = []
            }
            const rawQuota = (result.quota || {}) as any
            if (authStore.updateDailyQuota) {
                authStore.updateDailyQuota({
                    remaining: rawQuota.remaining ?? rawQuota.quota_remaining,
                    limit: rawQuota.limit ?? rawQuota.quota_limit,
                    used: Math.max(0, (rawQuota.limit ?? rawQuota.quota_limit) - (rawQuota.remaining ?? rawQuota.quota_remaining))
                })
            }
            autoTriggerIfProtocol()
        } else {
            const err = result?.msg || t('detail.fetchFailed')
            addLocalLog(t('detail.terminalGatewayError', { msg: err }), 'error')
            localTaskFailed.value = true
            isProtocolComplete.value = true
        }
    } catch (error: any) {
        addLocalLog(t('detail.terminalNetworkError', { msg: error.message || '未知错误' }), 'error')
        localTaskFailed.value = true
        isProtocolComplete.value = true
    } finally {
        isFetching.value = false
    }
}

function autoTriggerIfProtocol() {
    if (!resource.value) return
    if (isProtocol.value && localMirrors.value.length > 0) {
        nextTick(() => triggerDownload(localMirrors.value[0]))
    }
}

let mirrorTimers: ReturnType<typeof setTimeout>[] = []

async function triggerDownload(mirror: any) {
    if (!resource.value) return

    if (!authStore.isLoggedIn) {
        if (isProtocol.value) return emitRequireLogin()
        return showLoginToast()
    }
    
    const mirrorId = mirror.id || mirror.url || ''
    if (processingMirrors.value.has(mirrorId)) return
    
    if (isProtocol.value) {
        processingMirrors.value.add(mirrorId)
        
        const immediateItem = {
            id: resource.value.id,
            title: resource.value.basic?.title || '未知资源',
            cover: props.cover || '',
            type: 'titan_protocol' as const,
            addTime: Date.now(),
            installed: false,
            isDownloading: true,
            path: '',
            steamId: resource.value.meta?.target_id || ''
        }
        libraryStore.addItem(immediateItem)
        
        showLocalProtocolConsole.value = true
        isProtocolComplete.value = false
        localConsoleLogs.value = []
        localProgressPercent.value = 0
        localTaskSuccess.value = false
        localTaskFailed.value = false
        
        addLocalLog(t('detail.terminalDeploying'), 'warning')
        localProgressPercent.value = 15
        
        try {
            const res = await window.electron.invoke('titan:deploy-game', effectiveAppId.value)
            
            if (res?.success) {
                libraryStore.updateItem(resource.value.id, { 
                    installed: true, 
                    isDownloading: false,
                    path: res.data?.path || ''
                })
                
                localProgressPercent.value = 100
                addLocalLog(t('detail.terminalDeploySuccess'), 'success')
                addLocalLog(t('detail.terminalVacSafe'), 'success')
                addLocalLog(t('detail.terminalAccountSafe'), 'success')
                addLocalLog(t('detail.terminalRestartSteam'), 'success')
                localTaskSuccess.value = true
                
                if (!props.isInLibrary) {
                    await libraryStore.toggleItem(props.gameId, {
                        title: props.title,
                        type: 'titan_protocol',
                        cover: props.cover
                    })
                }
            } else {
                const rollbackIdx = libraryStore.items.findIndex(i => i.id === immediateItem.id)
                if (rollbackIdx >= 0) libraryStore.items.splice(rollbackIdx, 1)

                const err = res?.msg || 'ERR_DEPLOY_UNKNOWN'
                if (err.includes('QUOTA') || err === 'QUOTA_EXHAUSTED') {
                    addLocalLog(t('detail.terminalQuotaExhausted'), 'error')
                } else if (err.includes('401') || err.includes('403') || err === 'UNAUTHORIZED') {
                    addLocalLog(t('detail.terminalSessionExpired'), 'error')
                } else {
                    addLocalLog(t('detail.terminalDeployFail', { msg: err }), 'error')
                }
                localTaskFailed.value = true
            }
        } catch (e: any) {
            const rollbackIdx = libraryStore.items.findIndex(i => i.id === immediateItem.id)
            if (rollbackIdx >= 0) libraryStore.items.splice(rollbackIdx, 1)

            addLocalLog(t('detail.terminalSystemError', { msg: e.message }), 'error')
            localTaskFailed.value = true
        } finally {
            isProtocolComplete.value = true
            processingMirrors.value.delete(mirrorId)
        }
        
    } else {
        processingMirrors.value.add(mirrorId)
        try {
            const url = mirror.url || mirror
            
            let downloadDir = ''
            try {
                const savedPath = await window.electron.invoke('sys:get-config', 'download_path')
                if (savedPath) downloadDir = savedPath
            } catch (e) {}
            if (!downloadDir) {
                try {
                    downloadDir = await window.electron.invoke('download:get-default-dir')
                } catch (e) {}
            }
            
            await libraryStore.toggleItem(resource.value.id, {
                title: props.title,
                type: props.type || 'game',
                cover: props.cover,
                desc: resource.value.basic?.desc || ''
            })

            await transmissionStore.addTask(url, downloadDir, resource.value.id, props.title)
            
            showToast(t('detail.toastDownloadStarted', { title: props.title }))
            close()
        } catch (e: any) {
            if (e.message?.includes('DIR_NOT_FOUND')) {
                showToast(t('detail.toastPathInvalid'), 'error')
            } else if (e.message?.includes('Engine not ready')) {
                showToast(t('detail.toastEngineNotReady'), 'error')
            } else {
                showToast(t('detail.toastDownloadFailed', { msg: e.message || '推送任务失败' }), 'error')
            }
        } finally {
            const timerId = setTimeout(() => processingMirrors.value.delete(mirrorId), 1000)
            mirrorTimers.push(timerId)
        }
    }
}

onMounted(() => {
    if (window.electron?.on) {
        unsubProtocolLog = window.electron.on('titan:protocol-log', (data: any) => {
            if (showLocalProtocolConsole.value && !isProtocolComplete.value) {
                if (data.progress >= 0) {
                    localProgressPercent.value = data.progress
                }
                const logType = data.step === 'error' ? 'error' : (data.step === 'done' ? 'success' : 'info')
                addLocalLog(data.msg, logType)
            }
        })
    }
})

watch(isOpen, (val) => {
    if (!val) {
        mirrorTimers.forEach(clearTimeout)
        mirrorTimers = []
        showLocalProtocolConsole.value = false
        localConsoleLogs.value = []
        isProtocolComplete.value = false
        localTaskSuccess.value = false
        localTaskFailed.value = false
        localProgressPercent.value = 0
        localMirrors.value = []
        processingMirrors.value.clear()
        isDeploying.value = false
    }
})

onUnmounted(() => {
    mirrorTimers.forEach(clearTimeout)
    mirrorTimers = []
    if (typeof unsubProtocolLog === 'function') {
        try {
            unsubProtocolLog()
        } catch (e) {
            console.warn('[GameDetailModal] Failed to execute unsubscribe function:', e)
        }
    }
})
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.animate-fade-in { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
</style>