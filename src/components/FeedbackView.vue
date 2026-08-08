// 文件名: src/components/FeedbackView.vue
<template>
  <div class="w-full h-full bg-[#050505] relative overflow-hidden flex flex-col items-center justify-center select-none perspective-container font-sans text-slate-200"
       @mousemove="handleMouseMove">

    <div class="absolute inset-0 pointer-events-none z-0">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,#121225_0%,#000000_100%)]"></div>
        <div v-for="star in stars" :key="star.id" class="absolute rounded-full animate-twinkle"
             :style="{ top: star.top + '%', left: star.left + '%', width: star.size + 'px', height: star.size + 'px', backgroundColor: star.color, animationDelay: star.delay + 's' }">
        </div>
        <div class="absolute top-[-10%] left-[-10%] w-[1000px] h-[1000px] bg-[#00f3ff]/5 blur-[80px] animate-pulse-slow"></div>
        <div class="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-[#ff00aa]/5 blur-[80px] animate-pulse-slow delay-1000"></div>
        <div class="grid-bg absolute inset-0 opacity-10"></div>
    </div>

    <div class="relative z-10 w-full max-w-[1600px] h-full max-h-[900px] grid grid-cols-12 gap-6 p-8 items-center">

        <div class="col-span-5 flex flex-col justify-center animate-slide-in-left h-full">
            <div class="mb-6 flex-shrink-0">
                <h2 class="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-white/30 tracking-tighter drop-shadow-md">
                    星际链路
                </h2>
                <div class="flex items-center gap-4 mt-4">
                    <div class="h-[3px] w-16 bg-primary shadow-[0_0_10px_#00f3ff]"></div>
                    <span class="font-code text-primary tracking-[0.5em] text-xs font-bold uppercase opacity-80">TITANCORE // SOUL_ETERNAL</span>
                </div>
            </div>

            <div class="bg-[#0a0a10]/80 border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl relative group overflow-hidden flex flex-col border-t-white/20">
                <div class="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent animate-scan"></div>

                <div class="flex gap-4 mb-6 flex-shrink-0">
                    <button @click="feedbackType = 'bug'" 
                        class="flex-1 py-4 border border-white/10 rounded-xl transition-all font-bold text-base tracking-widest hover:bg-white/5 relative overflow-hidden"
                        :class="feedbackType === 'bug' ? 'text-red-400 border-red-500/50 bg-red-500/10 shadow-[0_0_15px_rgba(220,38,38,0.15)]' : 'text-gray-500'">
                        <span class="relative z-10 flex items-center justify-center gap-2">⚠ BUG提交</span>
                    </button>
                    <button @click="feedbackType = 'suggest'" 
                        class="flex-1 py-4 border border-white/10 rounded-xl transition-all font-bold text-base tracking-widest hover:bg-white/5 relative overflow-hidden"
                        :class="feedbackType === 'suggest' ? 'text-primary border-primary/50 bg-primary/10 shadow-[0_0_15px_rgba(0,243,255,0.15)]' : 'text-gray-500'">
                        <span class="relative z-10 flex items-center justify-center gap-2">💡 反馈建议</span>
                    </button>
                </div>

                <div class="space-y-5 flex-1 flex flex-col">
                    <div class="relative flex-shrink-0">
                        <label class="block text-gray-500 text-[10px] font-bold mb-2 tracking-[0.2em] ml-1 font-code uppercase">Identity // 发射源标识</label>
                        <input v-model="contact" type="text" maxlength="50" placeholder="请输入您的联系方式 (QQ / Email)" 
                            class="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white font-sans text-base focus:outline-none focus:border-primary/50 focus:bg-primary/5 transition-all shadow-inner" />
                    </div>

                    <div class="relative flex-col flex">
                         <label class="block text-gray-500 text-[10px] font-bold mb-2 tracking-[0.2em] ml-1 font-code uppercase">Payload // 传输载荷数据包</label>
                        <textarea v-model="content" maxlength="2000" placeholder="请详细描述传输内容...人类请务必描述清晰" 
                            class="w-full h-[180px] bg-white/5 border border-white/10 p-4 rounded-xl text-white font-sans text-base focus:outline-none focus:border-primary/50 focus:bg-primary/5 resize-none leading-relaxed custom-scrollbar shadow-inner whitespace-pre-wrap"></textarea>
                        <div class="text-right text-[10px] text-gray-600 font-code mt-1">{{ content.length }}/2000</div>
                    </div>
                </div>

                <div class="mt-8 relative flex-shrink-0">
                    <button @click="initiateLaunch" :disabled="gateState !== 'idle' || cooldown > 0" 
                        class="w-full h-[70px] relative overflow-hidden rounded-xl bg-white/5 border border-white/10 hover:border-primary hover:bg-primary/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:bg-white/5">
                        <div v-if="gateState === 'idle' && cooldown === 0" class="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent translate-x-[-100%] group-hover:animate-scan"></div>
                        <div class="relative z-10 flex items-center justify-center gap-4 h-full">
                            <span class="text-primary font-black font-code tracking-[0.4em] text-lg transition-transform" :class="{'group-hover:scale-105': gateState === 'idle' && cooldown === 0}">
                                {{ gateState === 'idle' ? (cooldown > 0 ? `链路冷却中 [${cooldown}s]` : '启动传输序列') : '数据封包传输中...' }}
                            </span>
                        </div>
                    </button>
                </div>
            </div>
        </div>

        <div class="col-span-7 relative flex flex-col items-center justify-center h-full">
            <div class="absolute inset-0 z-20 pointer-events-none overflow-visible">
                <div v-if="particleActive" class="absolute w-8 h-8 rounded-full bg-white shadow-[0_0_30px_white] z-50 transition-all duration-[1500ms] ease-in-out" :class="particleClass"></div>
            </div>

            <div class="relative w-[600px] h-[600px] flex items-center justify-center transition-all duration-1000 mb-10" :class="gateState === 'transmitting' ? 'brightness-125 scale-105' : 'brightness-100 scale-100'">
                <div class="absolute inset-[40px] rounded-full bg-gradient-to-tr from-[#0a0a15]/80 via-[#15152a]/50 to-[#0a0a15]/80 backdrop-blur-md shadow-[0_0_100px_rgba(0,243,255,0.05)] border border-white/5"></div>
                <div class="absolute inset-0 z-10 pointer-events-none">
                    <svg class="w-full h-full" viewBox="0 0 400 400">
                        <defs><linearGradient id="haloGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00f3ff" stop-opacity="0" /><stop offset="50%" stop-color="#00f3ff" stop-opacity="0.8"/><stop offset="100%" stop-color="#ffffff" stop-opacity="1"/></linearGradient></defs>
                        <g class="animate-spin-slow origin-center opacity-30"><circle cx="200" cy="200" r="190" fill="none" stroke="#fff" stroke-width="0.5" stroke-dasharray="1 10"/><path d="M 200 10 L 200 30 M 200 370 L 200 390 M 10 200 L 30 200 M 370 200 L 390 200" stroke="#00f3ff" stroke-width="2"/></g>
                        <g class="animate-spin-reverse-medium origin-center"><circle cx="200" cy="200" r="160" fill="none" stroke="url(#haloGradient)" stroke-width="2" stroke-dasharray="80 200" stroke-linecap="round" /></g>
                        <g class="animate-orbit origin-center"><circle cx="200" cy="40" r="4" fill="#fff" /><circle cx="200" cy="360" r="3" fill="#00f3ff" opacity="0.8"/></g>
                    </svg>
                </div>

                <div class="absolute inset-[130px] rounded-full flex items-center justify-center z-20">
                     <div class="absolute inset-[-10px] bg-primary/20 rounded-full blur-xl z-0 pointer-events-none"></div>
                     <div class="absolute inset-0 bg-[#000000]/60 rounded-full blur-xl z-10"></div>
                     <div class="absolute bottom-[40px] w-[120px] h-[20px] bg-primary/20 blur-lg rounded-[100%] animate-pulse z-10"></div>

                    <div class="relative w-[320px] h-[320px] cursor-pointer group z-30" @click="triggerCatAction">
                        <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-full blur-2xl z-20 pointer-events-none"></div>
                        <svg viewBox="0 0 300 300" class="w-full h-full transition-transform duration-500 z-30 relative" :class="[gateState === 'transmitting' ? 'scale-110 animate-shake' : 'scale-100', catActionState === 'jump' ? 'animate-bounce-happy' : 'animate-float-gentle']">
                            <defs><linearGradient id="catFace" x1="50%" y1="0%" x2="50%" y2="100%"><stop offset="0%" stop-color="#ffffff" /><stop offset="100%" stop-color="#e0f5ff" /></linearGradient></defs>
                            <path d="M 210 220 Q 250 200 240 140" fill="none" stroke="#e0f5ff" stroke-width="18" stroke-linecap="round" class="animate-tail-sway origin-bottom-left" />
                            <path d="M 100 220 C 90 260, 210 260, 200 220 L 190 180 L 110 180 Z" fill="#e0f5ff" />
                            <path d="M 110 220 Q 150 235 190 220" fill="none" stroke="#1a1a2e" stroke-width="8" stroke-linecap="round"/>
                            <circle cx="150" cy="228" r="8" fill="#1a1a2e" stroke="#00f3ff" stroke-width="2"/><circle cx="150" cy="228" r="4" fill="#00f3ff" class="animate-bell-glow"/>
                            <ellipse cx="150" cy="150" rx="90" ry="75" fill="url(#catFace)" stroke="#d1eeff" stroke-width="3" />
                            <g class="animate-ear-twitch">
                                <path d="M 90 100 L 60 40 L 130 80 Z" fill="#ffffff" stroke="#d1eeff" stroke-width="3" stroke-linejoin="round"/><path d="M 88 90 L 70 55 L 115 80 Z" fill="#ffb7d6" opacity="0.8"/>
                                <path d="M 210 100 L 240 40 L 170 80 Z" fill="#ffffff" stroke="#d1eeff" stroke-width="3" stroke-linejoin="round"/><path d="M 212 90 L 230 55 L 185 80 Z" fill="#ffb7d6" opacity="0.8"/>
                            </g>
                            <g transform="translate(150, 150)">
                                <ellipse cx="-55" cy="15" rx="14" ry="10" fill="#ff9ec6" opacity="0.4" /><ellipse cx="55" cy="15" rx="14" ry="10" fill="#ff9ec6" opacity="0.4" />
                                <g id="eyes">
                                    <template v-if="currentExpression === 'happy' || catActionState === 'jump'"><path d="M -50 -5 Q -35 -20 -20 -5" fill="none" stroke="#1a1a2e" stroke-width="6" stroke-linecap="round"/><path d="M 20 -5 Q 35 -20 50 -5" fill="none" stroke="#1a1a2e" stroke-width="6" stroke-linecap="round"/></template>
                                    <template v-else-if="currentExpression === 'wink'"><path d="M -50 -5 L -35 5 L -20 -5" fill="none" stroke="#1a1a2e" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><g class="eye-right"><ellipse cx="35" cy="0" rx="18" ry="22" fill="#1a1a2e" /><circle cx="42" cy="-6" r="6" fill="white" /></g></template>
                                    <template v-else><ellipse cx="-35" cy="0" rx="18" ry="24" fill="#1a1a2e" /><ellipse cx="35" cy="0" rx="18" ry="24" fill="#1a1a2e" /><g :style="{ transform: `translate(${eyeOffset.x}px, ${eyeOffset.y}px)` }" class="transition-transform duration-100 ease-out"><ellipse cx="-35" cy="0" rx="12" ry="16" fill="#00f3ff" opacity="0.9" /><ellipse cx="35" cy="0" rx="12" ry="16" fill="#00f3ff" opacity="0.9" /><circle cx="-28" cy="-8" r="6" fill="white" /><circle cx="42" cy="-8" r="6" fill="white" /></g></template>
                                </g>
                                <path d="M -12 25 Q -6 32 0 25 Q 6 32 12 25" fill="none" stroke="#1a1a2e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                            </g>
                            <g transform="translate(150, 30)" class="animate-float-gentle" style="animation-delay: -1.5s">
                                <circle cx="0" cy="0" r="2" fill="#00f3ff" class="animate-ping" />
                            </g>
                        </svg>
                    </div>
                </div>
            </div>

            <div class="absolute bottom-4 right-4 z-20">
                <button @click="showHistoryModal = true" class="group flex items-center gap-4 bg-[#0a0a10]/90 border border-white/10 px-6 py-3 rounded-full hover:border-primary/50 hover:bg-white/5 transition-all shadow-lg backdrop-blur-md">
                    <div class="flex flex-col items-end">
                        <span class="text-[10px] text-gray-500 font-code font-bold uppercase tracking-widest group-hover:text-primary transition-colors">TitanCore Uplink</span>
                        <span class="text-xs text-white font-bold tracking-wider">传输档案黑匣子 [{{ totalLogs }}/20]</span>
                    </div>
                    <div class="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:scale-110 transition-transform relative overflow-hidden">
                        <div class="absolute inset-0 bg-primary/20 animate-ping opacity-20"></div>
                        <svg class="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    </div>
                </button>
            </div>
        </div>
    </div>

    <div v-if="showHistoryModal || selectedLog" class="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center animate-fade-in p-8" @click="closeModal">
        <div class="w-full max-w-[1200px] h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)] flex overflow-hidden border-t-white/20 relative" @click.stop>

            <button @click="closeModal" class="absolute top-6 right-6 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all border border-white/5">✕</button>

            <div class="w-[350px] border-r border-white/10 flex flex-col bg-white/2 shrink-0">
                <div class="p-8 border-b border-white/10 bg-black/20">
                    <h3 class="text-primary font-code font-black tracking-widest text-lg">SIGNAL LOGS</h3>
                    <p class="text-xs text-gray-500 mt-1 uppercase font-bold">通讯节点记录 ({{ totalLogs }}/20)</p>
                </div>
                <div class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                    <div v-for="log in allLogs" :key="log.id" @click="openThread(log)" 
                         class="p-5 rounded-2xl cursor-pointer transition-all border border-transparent flex flex-col gap-2"
                         :class="selectedLog?.id === log.id ? 'bg-primary/10 border-primary/30 shadow-lg shadow-primary/5' : 'hover:bg-white/5'">
                         <div class="flex justify-between items-center">
                             <span class="text-xs font-black uppercase tracking-tighter" :class="log.type === 'bug' ? 'text-red-400' : 'text-primary'">{{ log.type }}</span>
                             <span class="text-[10px] text-gray-500 font-code font-bold">{{ formatTime(log.created_at) }}</span>
                         </div>
                         <div class="text-sm text-gray-300 truncate font-medium break-all flex justify-between items-center gap-2">
                            <span>{{ log.content }}</span>
                            <span v-if="log.awaiting_reply" class="text-[10px] text-yellow-500 animate-pulse border border-yellow-500/50 px-1 rounded-sm shrink-0">WAIT</span>
                         </div>
                    </div>
                     <div v-if="allLogs.length > 0" class="pt-4 mt-2 border-t border-white/5">
                        <button @click="clearHistory" class="w-full text-xs text-gray-600 hover:text-red-400 py-2 border border-dashed border-white/10 hover:border-red-400/30 rounded-lg transition-all">
                            [ 物理擦除所有数据 ]
                        </button>
                    </div>
                </div>
            </div>

            <div class="flex-1 flex flex-col bg-black/40 relative h-full overflow-hidden">
                <div class="absolute inset-0 grid-bg opacity-5 pointer-events-none"></div>

                <div class="px-10 py-6 border-b border-white/10 flex justify-between items-center bg-white/2 backdrop-blur-sm relative z-10 shrink-0">
                    <div class="flex items-center gap-3">
                        <span class="w-2.5 h-2.5 rounded-full bg-primary animate-ping"></span>
                        <span class="text-white font-code tracking-[0.2em] text-base font-bold uppercase">Uplink Channel // 实时通讯流</span>
                    </div>
                    <span v-if="selectedLog" class="font-code text-xs text-gray-500">Root ID: #{{ selectedLog.id }}</span>
                </div>

                <div class="flex-1 overflow-y-auto p-10 custom-scrollbar relative z-10 space-y-6">
                    <div v-if="selectedLog" class="max-w-4xl mx-auto space-y-6">
                        <div v-for="msg in conversationStream" :key="msg.id || msg.created_at" 
                             class="flex gap-4 items-start animate-slide-in-up"
                             :class="msg.sender_type === 'admin' ? 'flex-row-reverse' : ''">

                            <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-[10px] font-black shrink-0 border shadow-lg font-code"
                                 :class="msg.sender_type === 'admin' ? 'bg-primary/20 text-primary border-primary/50 shadow-[0_0_15px_rgba(0,243,255,0.2)]' : 'bg-white/10 text-white border-white/10'">
                                {{ msg.sender_type === 'admin' ? 'HAJIMI' : 'USER' }}
                            </div>

                            <div class="p-5 rounded-3xl text-sm leading-6 max-w-[75%] break-words whitespace-pre-wrap shadow-md transition-all"
                                 :class="msg.sender_type === 'admin' ? 'bg-primary/10 border border-primary/30 text-primary/95 text-right rounded-tr-none shadow-[0_5px_20px_rgba(0,243,255,0.05)]' : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-none'">
                                <div class="text-[11px] font-code mb-2 opacity-50 flex items-center gap-2"
                                     :class="msg.sender_type === 'admin' ? 'justify-end text-primary' : 'text-gray-400'">
                                    <span>{{ formatFullTime(msg.created_at) }}</span>
                                    <span v-if="msg.id === selectedLog.id" class="bg-white/10 px-1.5 py-0.2 rounded text-[9px]">ROOT</span>
                                </div>
                                {{ msg.content }}
                            </div>
                        </div>

                        <div v-if="conversationStream.length === 1 && !selectedLog.reply" class="flex justify-center pt-4">
                            <div class="px-6 py-2 rounded-full bg-white/5 border border-white/10 text-gray-500 text-xs font-code tracking-widest animate-pulse">
                                HAJIMI IS LISTENING ON THE CHANNEL...
                            </div>
                        </div>
                    </div>

                    <div v-else class="h-full flex flex-col items-center justify-center text-gray-600 gap-4 opacity-50">
                        <svg class="w-24 h-24 stroke-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        <span class="font-code text-xl tracking-[0.3em]">SELECT DATA PACK</span>
                    </div>
                </div>

                <div v-if="selectedLog" class="p-6 border-t border-white/10 bg-black/40 relative z-10 shrink-0">
                    <div class="max-w-4xl mx-auto flex gap-4 items-center">
                        <textarea v-model="appendContent" maxlength="2000" placeholder="以 USER 身份继续发送载荷至该会话流..." 
                            class="flex-1 h-14 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl text-white text-sm focus:outline-none focus:border-primary/50 focus:bg-primary/5 resize-none leading-relaxed custom-scrollbar shadow-inner"></textarea>
                        <button @click="submitAppendData(selectedLog.id)" :disabled="!appendContent.trim() || isAppending"
                            class="px-8 h-14 bg-primary/20 border border-primary/50 rounded-2xl text-primary font-code font-bold tracking-widest hover:bg-primary hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,243,255,0.1)]">
                            {{ isAppending ? 'SENDING...' : 'TRANSMIT' }}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/authStore';
import { useFeedbackStore } from '../stores/feedbackStore';
import Swal from 'sweetalert2';

const feedbackStore = useFeedbackStore();
const allLogs = computed(() => feedbackStore.logs);
const totalLogs = computed(() => allLogs.value.length);

type GateState = 'idle' | 'charging' | 'transmitting' | 'error';

const gateState = ref<GateState>('idle');
const feedbackType = ref<'bug' | 'suggest'> ('bug');
const contact = ref('');
const content = ref('');
const particleActive = ref(false);
const particleClass = ref('top-[50%] left-[5%] opacity-0');
const cooldown = ref(0);
const showHistoryModal = ref(false);
const selectedLog = ref<any>(null);
const appendContent = ref('');
const isAppending = ref(false);
const currentExpression = ref<'normal' | 'wink' | 'happy'> ('normal');
const catActionState = ref<'idle' | 'jump'> ('idle');
const eyeOffset = ref({ x: 0, y: 0 });
const stars = ref<Array<{id: number, top: number, left: number, size: number, color: string, delay: number}>>([]);

let cdIntervalTimer: number | null = null;
let isDestroyed = false;
let lastMouseTime = 0;
const THROTTLE_MS = 50;
let activeTimers: ReturnType<typeof setTimeout>[] = [];

function handleMouseMove(e: MouseEvent) {
    if (currentExpression.value !== 'normal') return;
    const now = Date.now();
    if (now - lastMouseTime < THROTTLE_MS) return;
    lastMouseTime = now;

    const limitX = 8; 
    const limitY = 6;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const x = (e.clientX / windowWidth) * 2 - 1;
    const y = (e.clientY / windowHeight) * 2 - 1;
    eyeOffset.value = { x: x * limitX, y: y * limitY };
}

let expressionTimer: number;

function startExpressionLoop() {
    expressionTimer = window.setInterval(() => {
        if (gateState.value === 'transmitting' || isDestroyed) return;
        const rand = Math.random();
        if (rand > 0.6) {
            const type = Math.random() > 0.5 ? 'wink' : 'happy';
            currentExpression.value = type;
            const t = setTimeout(() => {
                const idx = activeTimers.indexOf(t);
                if (idx > -1) activeTimers.splice(idx, 1);
                if (isDestroyed) return;
                if (catActionState.value === 'idle') currentExpression.value = 'normal';
            }, 1800);
            activeTimers.push(t);
        }
    }, 8000);
}

function triggerCatAction() {
    if (catActionState.value === 'jump') return;
    catActionState.value = 'jump';
    const prevExpr = currentExpression.value;
    currentExpression.value = 'happy';
    const t = setTimeout(() => {
        const idx = activeTimers.indexOf(t);
        if (idx > -1) activeTimers.splice(idx, 1);
        if (isDestroyed) return;
        catActionState.value = 'idle';
        currentExpression.value = prevExpr === 'happy' ? 'normal' : prevExpr;
    }, 800);
    activeTimers.push(t);
}

function generateStars() {
    const starCount = 12; 
    const colors = ['#ffffff', '#00f3ff', '#a78bfa', '#ffffff'];
    const newStars = [];
    for (let i = 0; i < starCount; i++) {
        newStars.push({
            id: i,
            top: Math.random() * 100,
            left: Math.random() * 100,
            size: Math.random() * 2 + 1,
            color: colors[Math.floor(Math.random() * colors.length)],
            delay: Math.random() * 5
        });
    }
    stars.value = newStars;
}

const conversationStream = computed(() => {
    if (!selectedLog.value) return [];
    const stream: any[] = [];
    
    stream.push({
        id: selectedLog.value.id,
        content: selectedLog.value.content,
        created_at: selectedLog.value.created_at,
        sender_type: 'user'
    });

    const threadMsgs = feedbackStore.threads[selectedLog.value.id] || [];

    if (selectedLog.value.reply && !threadMsgs.some((m: any) => m.sender_type === 'admin')) {
        stream.push({
            id: 'legacy_reply_' + selectedLog.value.id,
            content: selectedLog.value.reply,
            created_at: selectedLog.value.created_at + 1000,
            sender_type: 'admin'
        });
    }

    threadMsgs.forEach((m: any) => {
        stream.push(m);
    });

    return stream.sort((a, b) => a.created_at - b.created_at);
});

async function openThread(log: any) {
    selectedLog.value = log;
    await feedbackStore.fetchThread(log.id);
}

function clearHistory() {
    Swal.fire({
        title: '确认清空档案库?',
        text: '这将永久移除本地所有信号传输轨迹',
        icon: 'warning', showCancelButton: true, confirmButtonText: '执行擦除', cancelButtonText: '取消',
        background: '#0a0a0a', color: '#fff', confirmButtonColor: '#dc2626'
    }).then(async (res) => {
        if (res.isConfirmed) {
            await feedbackStore.clearAll();
            closeModal();
        }
    });
}

function startCooldown() {
    cooldown.value = 30;
    if (cdIntervalTimer) clearInterval(cdIntervalTimer);
    cdIntervalTimer = window.setInterval(() => {
        cooldown.value--;
        if (cooldown.value <= 0) {
            if (cdIntervalTimer) clearInterval(cdIntervalTimer);
            cdIntervalTimer = null;
        }
    }, 1000);
}

async function initiateLaunch() {
    if (totalLogs.value >= 20) {
        Swal.fire({ title: '本地链路已满', text: '档案黑匣子已达 20 条存储上限。请先进入黑匣子物理擦除旧档案，再发送新载荷。', icon: 'warning', background: '#0a0a15', color: '#ff4444', confirmButtonColor: '#dc2626' });
        return;
    }
    if (!content.value.trim()) {
        Swal.fire({ toast: true, position: 'top', title: '载荷数据不能为空', icon: 'warning', background: '#000', color: '#fff', timer: 1500, showConfirmButton: false });
        return;
    }

    const authStore = useAuthStore();
    gateState.value = 'transmitting';
    triggerCatAction(); 
    particleActive.value = true;
    particleClass.value = 'top-[50%] left-[5%] opacity-100 scale-100 bg-white'; 
    const t1 = setTimeout(() => {
        const idx = activeTimers.indexOf(t1);
        if (idx > -1) activeTimers.splice(idx, 1);
        if (!isDestroyed) particleClass.value = 'top-[50%] left-[75%] opacity-0 scale-50 bg-primary shadow-[0_0_80px_#00f3ff]';
    }, 50);
    activeTimers.push(t1);
    
    const t2 = setTimeout(async () => {
        const idx = activeTimers.indexOf(t2);
        if (idx > -1) activeTimers.splice(idx, 1);
        if (isDestroyed) return;
        try {
            const payload = { type: feedbackType.value, contact: contact.value, content: content.value.trim(), uid: authStore.user?.id || 0, parent_id: 0 };
            await feedbackStore.submitRoot(payload);

            Swal.fire({ title: 'Hajimi 接收成功', text: '感谢您的投喂，数据已存入核心', icon: 'success', toast: true, position: 'top-end', background: '#050505', color: '#00f3ff', showConfirmButton: false, timer: 3000 });
            content.value = ''; 
            startCooldown();
        } catch (e: any) {
            gateState.value = 'error';
            Swal.fire({ title: e.message && e.message.includes('频率') ? '触发频控防刷' : '传输链路崩溃', text: e.message || 'Hajimi 没能接住这个数据包...', icon: e.message && e.message.includes('频率') ? 'warning' : 'error', background: '#000', color: '#fff' });
        } finally {
            const t3 = setTimeout(() => {
                const idx2 = activeTimers.indexOf(t3);
                if (idx2 > -1) activeTimers.splice(idx2, 1);
                if (!isDestroyed) { gateState.value = 'idle'; particleActive.value = false; }
            }, 1000);
            activeTimers.push(t3);
        }
    }, 1500); 
    activeTimers.push(t2);
}

async function submitAppendData(rootId: number) {
    if (!appendContent.value.trim() || isAppending.value) return;
    isAppending.value = true;
    const authStore = useAuthStore();
    try {
        const payload = { type: selectedLog.value?.type || 'general', contact: selectedLog.value?.contact || contact.value || 'N/A', content: appendContent.value.trim(), uid: authStore.user?.id || 0, parent_id: rootId };
        await feedbackStore.submitAppend(rootId, payload);
        
        appendContent.value = '';
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: '载荷传输成功', background: '#050505', color: '#00f3ff', timer: 2000, showConfirmButton: false });
    } catch (e: any) {
        Swal.fire({ toast: true, position: 'top', icon: 'error', title: e.message && e.message.includes('频率') ? '触发频控防刷' : '追加失败', text: e.message || '网络通信或接口校验异常', background: '#000', color: '#ff4444', timer: 3000, showConfirmButton: false });
    } finally {
        isAppending.value = false;
    }
}

function closeModal() { showHistoryModal.value = false; selectedLog.value = null; }
function formatTime(ts: number) { const d = new Date(ts); return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`; }
function formatFullTime(ts: number) { const d = new Date(ts); return isNaN(d.getTime()) ? '最近发射' : d.toLocaleString(); }

onMounted(() => {
    generateStars();
    startExpressionLoop();
});

onUnmounted(() => {
    isDestroyed = true;
    clearInterval(expressionTimer);
    if (cdIntervalTimer) clearInterval(cdIntervalTimer);
    activeTimers.forEach(clearTimeout);
    activeTimers = [];
});
</script>

<style scoped>
.perspective-container { perspective: 1500px; }

.grid-bg {
    background-size: 50px 50px;
    background-image: linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
    mask-image: radial-gradient(circle at center, black 40%, transparent 80%);
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 243, 255, 0.3); border-radius: 10px; }

@keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes spin-reverse-medium { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
@keyframes scan { 0% { transform: translateX(-100%); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateX(100%); opacity: 0; } }
@keyframes orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes pulse { 0%, 100% { opacity: 0.8; } 50% { opacity: 0.4; } }
@keyframes twinkle { 0%, 100% { transform: scale(1); opacity: 0.3; } 50% { transform: scale(1.5); opacity: 1; } }
@keyframes floatGentle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes bounceHappy { 0%, 100% { transform: translateY(0) scale(1); } 30% { transform: translateY(-20px) scale(1.05); } 50% { transform: translateY(-15px) scale(1.05); } 80% { transform: translateY(0) scale(0.95); } }
@keyframes earTwitch { 0%, 90%, 100% { transform: rotate(0deg); } 92% { transform: rotate(-4deg); } 94% { transform: rotate(4deg); } 96% { transform: rotate(-4deg); } }
@keyframes bellGlow { 0%, 100% { opacity: 0.6; fill: #00f3ff; } 50% { opacity: 1; fill: #fff; } }
@keyframes tailSway { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(10deg); } }
@keyframes shake { 0%, 100% { transform: translate(0, 0) scale(1.1); } 25% { transform: translate(-2px, 2px) scale(1.1); } 75% { transform: translate(2px, -2px) scale(1.1); } }
@keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
@keyframes slideInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideInLeft { 0% { opacity: 0; transform: translateX(-80px); } 100% { opacity: 1; transform: translateX(0); } }

.animate-spin-slow { animation: spin-slow 120s linear infinite; }
.animate-spin-reverse-medium { animation: spin-reverse-medium 100s linear infinite; }
.animate-scan { animation: scan 8s linear infinite; }
.animate-orbit { animation: orbit 80s linear infinite; }
.animate-pulse-slow { animation: pulse 16s ease-in-out infinite; }
.animate-twinkle { animation: twinkle 10s ease-in-out infinite; }
.animate-float-gentle { animation: floatGentle 8s ease-in-out infinite; }
.animate-bounce-happy { animation: bounceHappy 1.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
.animate-ear-twitch { animation: earTwitch 10s infinite; transform-origin: center 100px; }
.animate-bell-glow { animation: bellGlow 4s infinite; }
.animate-tail-sway { animation: tailSway 6s ease-in-out infinite; transform-origin: 210px 220px; }
.animate-shake { animation: shake 0.8s linear infinite; }
.animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
.animate-slide-in-up { animation: slideInUp 1s ease-out forwards; }
.animate-slide-in-left { animation: slideInLeft 1.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
</style>