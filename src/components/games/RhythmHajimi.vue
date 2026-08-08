<template>
  <div class="h-full w-full bg-[#020205] relative overflow-hidden select-none cursor-crosshair"
       @click="handleClick"
       @contextmenu.prevent="handleRightClick">

    <canvas ref="gameCanvas" class="absolute inset-0 w-full h-full" />

    <!-- HUD -->
    <div class="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-3 pointer-events-none">
      <div class="flex items-center gap-6">
        <div class="text-[#00f3ff] font-black text-xl tracking-wider font-mono"
             style="text-shadow:0 0 10px rgba(0,243,255,0.5)">
          音律哈吉米
        </div>
        <div class="text-white font-mono text-sm">
          SCORE: <span class="text-[#00f3ff] font-bold text-lg">{{ score }}</span>
        </div>
        <div class="text-white font-mono text-sm">
          COMBO: <span class="text-yellow-400 font-bold text-lg">x{{ comboMultiplier.toFixed(1) }}</span>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <!-- BOSS血条（仅当存活） -->
        <div v-if="bossAlive" class="flex items-center gap-2">
          <span class="text-red-500 font-bold font-mono text-sm">BOSS</span>
          <div class="w-24 h-2 bg-gray-800 rounded overflow-hidden border border-white/20">
            <div class="h-full bg-red-500 transition-all duration-200" :style="{width: bossHpPercent + '%'}"></div>
          </div>
        </div>
        <div class="flex gap-1">
          <span v-for="i in 3" :key="'s'+i" class="text-lg transition-all duration-300"
            :class="i <= shieldCount ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]' : 'text-gray-800'">
            ⬡
          </span>
        </div>
        <div class="flex gap-1">
          <span v-for="i in 3" :key="i" class="text-xl transition-all duration-300"
            :class="i <= lives ? 'text-red-500' : 'text-gray-700'">
            ♥
          </span>
        </div>
      </div>
    </div>

    <!-- 能量槽 -->
    <div class="absolute bottom-20 left-6 z-20 flex items-center gap-3 pointer-events-none">
      <div class="flex gap-1.5 items-end h-8">
        <div v-for="i in 10" :key="i"
          class="w-3 rounded-sm transition-all duration-100 border border-[#00f3ff]/30"
          :class="i <= energy
            ? 'bg-[#00f3ff] shadow-[0_0_8px_rgba(0,243,255,0.6)] h-6'
            : 'bg-transparent h-2'" />
      </div>
      <span v-if="energy >= 10 && !hyperMode" class="text-[#00f3ff] font-bold text-sm animate-pulse font-mono">
        [右键/空格: AOE]
      </span>
      <span v-if="hyperMode" class="text-[#ffd700] font-bold text-sm animate-pulse font-mono">
        HYPER {{ hyperCountdown }}s
      </span>
    </div>

    <!-- 底部控制栏 -->
    <div class="absolute bottom-0 left-0 right-0 z-20 bg-black/60 backdrop-blur border-t border-white/10 px-6 py-3 flex items-center gap-4">
      <button @click.stop="toggleCapture"
        class="px-6 py-3 bg-[#00f3ff]/20 hover:bg-[#00f3ff]/30 border border-[#00f3ff]/40 rounded-xl text-[#00f3ff] text-base transition-all font-mono shadow-[0_0_15px_rgba(0,243,255,0.1)] hover:shadow-[0_0_25px_rgba(0,243,255,0.3)] hover:scale-105">
        {{ isCapturing ? '⏹ 停止' : '▶ 开始捕获' }}
      </button>
      <button @click.stop="exitToLobby"
        class="px-4 py-3 bg-gray-800/50 hover:bg-gray-700/50 border border-white/20 rounded-xl text-white text-sm transition-all font-mono">
        ⏏ 返回大厅
      </button>
      <span class="text-gray-400 text-sm">{{ statusText }}</span>
      <div class="flex-1 flex items-center justify-center gap-4">
        <span class="text-[#00f3ff] text-base font-bold font-mono tracking-wide" style="text-shadow:0 0 8px rgba(0,243,255,0.4)">
          WASD四向斩 · 鼠标挥剑 · 空格AOE/打鼓
        </span>
      </div>
      <span class="text-gray-600 text-xs font-mono">打开QQ音乐/网易云播放音乐</span>
    </div>

    <!-- 游戏结束 -->
    <div v-if="gameOver" class="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-center animate-fade-in">
      <div class="text-6xl font-black text-red-500 mb-2 font-mono" style="text-shadow:0 0 30px rgba(239,68,68,0.5)">
        系统崩溃
      </div>

      <div class="text-white font-mono text-2xl font-bold mb-1">
        最终得分: <span class="text-[#00f3ff] text-3xl">{{ score }}</span>
      </div>

      <!-- CORE 获得区域 -->
      <div class="mt-4 mb-2 flex flex-col items-center gap-3">
        <div class="text-gray-400 font-mono text-sm">
          每 <span class="text-[#00f3ff] font-bold">10000</span> 分 = <span class="text-yellow-400 font-bold">1</span> CORE
        </div>

        <div class="text-yellow-400 font-mono text-lg font-bold">
          本局获得: <span class="text-2xl">{{ earnedCores }}</span> CORE
        </div>

        <div v-if="earnedCores > 0 && !coresClaimed" class="flex flex-col items-center gap-2">
          <button 
            @click.stop="claimCores"
            class="px-8 py-3 bg-yellow-500/20 hover:bg-yellow-500/40 border-2 border-yellow-500/60 rounded-2xl text-yellow-300 text-lg font-bold font-mono transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] hover:scale-105 active:scale-95">
            💎 领取 {{ earnedCores }} CORE
          </button>
        </div>

        <div v-if="coresClaimed" class="text-green-400 font-mono text-xl font-bold animate-pulse">
          ✓ CORE 已领取！前往大厅兑换次数
        </div>

        <div v-if="earnedCores <= 0" class="text-gray-500 font-mono text-sm">
          本局分数不足 10000 分，未获得 CORE
        </div>
      </div>

      <div class="flex gap-4 mt-4">
        <button @click.stop="restart" class="px-12 py-4 bg-[#00f3ff] text-black font-black text-2xl rounded-2xl hover:bg-white hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,243,255,0.4)]">
          重新开始
        </button>
        <button @click.stop="exitToLobby" class="px-8 py-4 bg-gray-800 text-white font-bold text-xl rounded-2xl hover:bg-gray-700 hover:scale-105 transition-all">
          返回大厅
        </button>
      </div>
    </div>

    <!-- 开始提示 -->
    <div v-if="!hasStarted" class="absolute inset-0 z-30 bg-black/70 flex flex-col items-center justify-center">
      <div class="text-6xl font-black text-[#00f3ff] mb-4 font-mono" style="text-shadow:0 0 20px rgba(0,243,255,0.5)">
        音律哈吉米
      </div>
      <div class="text-gray-400 mb-8 text-center leading-relaxed text-base">
        <p>1. 打开QQ音乐/网易云，播放任意歌曲</p>
        <p>2. 点击「开始捕获」</p>
        <p>3. <span class="text-[#00f3ff] font-bold">WASD</span> 四向斩击 · <span class="text-[#00f3ff] font-bold">鼠标</span> 挥剑 · <span class="text-[#00f3ff] font-bold">空格</span> AOE/打鼓</p>
        <p class="mt-2 text-gray-500">踩上重音节拍，完美斩击！3W/6W/10W分难度递增</p>
        <p class="mt-1 text-yellow-500/80">3W分 BOSS降临 · 5次AOE进入5秒超频打鼓模式</p>
      </div>
      <div class="flex gap-4">
        <button @click.stop="startCapture"
          class="px-10 py-4 bg-[#00f3ff]/20 hover:bg-[#00f3ff]/30 border border-[#00f3ff]/40 rounded-2xl text-[#00f3ff] text-lg transition-all font-mono shadow-[0_0_20px_rgba(0,243,255,0.2)] hover:shadow-[0_0_30px_rgba(0,243,255,0.4)] hover:scale-105">
          ▶ 开始捕获
        </button>
        <button @click.stop="exitToLobby"
          class="px-8 py-4 bg-gray-800/50 hover:bg-gray-700/50 border border-white/20 rounded-2xl text-gray-300 text-lg transition-all font-mono">
          ⏏ 返回大厅
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';

const emit = defineEmits<{
  exit: [];
  'update:stats': [stats: { scrap?: number; cores?: number }];
}>();

interface Orb {
  x: number; y: number; vx: number; vy: number;
  radius: number; color: string; glow: string;
  trail: {x:number;y:number}[];
  isLinear: boolean;
  predictLine: {x1:number;y1:number;x2:number;y2:number;life:number} | null;
}
interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
}
interface SlashFX {
  x: number; y: number; angle: number;
  life: number; maxLife: number; radius: number;
}
interface Item {
  x: number; y: number; vx: number; vy: number;
  radius: number; type: 'shield' | 'health';
  color: string; glow: string;
}
interface Star {
  x: number; y: number; z: number;
  size: number; speed: number; brightness: number;
}
interface Meteor {
  x: number; y: number; vx: number; vy: number;
  life: number; len: number;
}
interface DrumWave {
  x: number; y: number;
  radius: number; maxRadius: number;
  life: number; maxLife: number;
  isStrong: boolean;
  color: string;
  glow: string;
}
interface Boss {
  x: number; y: number;
  vx: number;
  hp: number; maxHp: number;
  skin: number;
  hitFlash: number;
  attackTimer: number;
  alive: boolean;
}
interface BossBullet {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  predictLine: {x1:number;y1:number;x2:number;y2:number;life:number} | null;
}

const gameCanvas = ref<HTMLCanvasElement>();
const score = ref(0), combo = ref(0), comboMultiplier = ref(1.0);
const energy = ref(0), lives = ref(3);
const isCapturing = ref(false), gameOver = ref(false), hasStarted = ref(false);
const bassDisplay = ref(0), statusText = ref('等待开始...');
const shieldCount = ref(0);
const earnedCores = computed(() => Math.floor(score.value / 10000));
const coresClaimed = ref(false);
const hyperMode = ref(false);
const hyperCountdown = ref(0);
const bossAlive = ref(false);
const bossHpPercent = ref(100);

let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let mediaStream: MediaStream | null = null;

let animId = 0, lastTime = 0;
const orbs: Orb[] = [], particles: Particle[] = [], slashes: SlashFX[] = [], items: Item[] = [];
const stars: Star[] = [];
const meteors: Meteor[] = [];
const drumWaves: DrumWave[] = [];
const bossBullets: BossBullet[] = [];

const boss: Boss = { x: 0, y: 0, vx: 1.2, hp: 3, maxHp: 3, skin: 0, hitFlash: 0, attackTimer: 0, alive: false };
let lastBossPhase = 0;

let hajimiX = 0, hajimiY = 0;
const H_R = 45;
let S_R = 120;
const S_CD = 120;
let sCd = 0, shake = 0, olFlash = 0;
let hf = 0, hajimiFloat = 0;
let mX = 0, mY = 0;

let beatHistory: number[] = [];
let strongBeatCount = 0;
let lastBeatTime = 0;
let lastSpawnTime = 0;
let swordAnim = 0;
let currentBass = 0;
let currentMid = 0;
let currentTotal = 0;
let currentBassRise = 0;
let itemSpawnTimer = 0;
let nebulaOffset = 0;

// ============ 随机为主、音频为辅的刷新系统 ============
let spawnTimer = 0;
let spawnInterval = 1.5;
let audioIntensity = 0;            // 当前帧原始音频强度 0-1
let audioIntensitySmooth = 0;      // 平滑后的音频强度，用于防止跳变
let waveCount = 0;                 // 已生成波数，用于控制 overload 节奏
let stableAudioTimer = 0;          // 音频稳定计时器，前2秒不依赖音频数据

let recentBassHistory: number[] = [];
let recentMidHistory: number[] = [];
let prevBass = 0; let prevMid = 0; let prevTotal = 0;

let hitStopTimer = 0;

// AOE & 超频
let aoeCount = 0;
let hyperTimer = 0;
let lastDrumTime = 0;
let hajimiDrumFlash = 0;
let swordAngle = 0;

// ============ 难度系统 ============

function getDifficulty() {
  const s = score.value;
  if (s >= 100000) {
    return {
      speedMult: 2.2, spawnBonus: 3, overloadReq: 2, label: 'INSANE',
      baseInterval: 0.50, strongChance: 0.45, mediumChance: 0.40, weakChance: 0.15,
      bossAttackInterval: 0.50, bossBulletCount: 5, bossBulletSpeed: 5.0
    };
  }
  if (s >= 60000) {
    return {
      speedMult: 1.8, spawnBonus: 2, overloadReq: 2, label: 'HARD',
      baseInterval: 0.75, strongChance: 0.30, mediumChance: 0.45, weakChance: 0.25,
      bossAttackInterval: 0.70, bossBulletCount: 4, bossBulletSpeed: 4.2
    };
  }
  if (s >= 30000) {
    return {
      speedMult: 1.4, spawnBonus: 1, overloadReq: 3, label: 'NORMAL+',
      baseInterval: 1.10, strongChance: 0.20, mediumChance: 0.45, weakChance: 0.35,
      bossAttackInterval: 0.90, bossBulletCount: 3, bossBulletSpeed: 3.5
    };
  }
  return {
    speedMult: 1.0, spawnBonus: 0, overloadReq: 3, label: 'NORMAL',
    baseInterval: 1.50, strongChance: 0.10, mediumChance: 0.40, weakChance: 0.50,
    bossAttackInterval: 1.00, bossBulletCount: 3, bossBulletSpeed: 3.0
  };
}

// ============ 音频捕获 ============

async function startCapture() {
  try {
    statusText.value = '正在获取屏幕音频源...';

    // 彻底清理旧资源，防止竞态和 InvalidStateError
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }
    if (audioCtx && audioCtx.state !== 'closed') {
      await audioCtx.close().catch(() => {});
    }
    audioCtx = null;
    analyser = null;

    // main.ts 返回的是 source.id（字符串），不是对象
    const sourceId = await (window as any).electron?.sys?.getDesktopAudioSource?.();
    if (!sourceId || typeof sourceId !== 'string') {
      throw new Error('no_source');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        // @ts-ignore
        mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId }
      },
      video: {
        // @ts-ignore
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId,
          maxWidth: 1,
          maxHeight: 1,
          maxFrameRate: 1
        }
      }
    });

    stream.getVideoTracks().forEach(t => t.stop());
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) throw new Error('no_audio');

    mediaStream = new MediaStream(audioTracks);
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.3;

    const src = audioCtx.createMediaStreamSource(mediaStream);
    src.connect(analyser);

    isCapturing.value = true;
    hasStarted.value = true;
    gameOver.value = false;
    statusText.value = '捕获中 - 播放音乐开始游戏';

    score.value = 0; combo.value = 0; comboMultiplier.value = 1.0;
    energy.value = 0; lives.value = 3; shieldCount.value = 0;
    orbs.length = 0; particles.length = 0; slashes.length = 0; items.length = 0;
    meteors.length = 0; stars.length = 0;
    drumWaves.length = 0; bossBullets.length = 0;
    boss.alive = false; bossAlive.value = false; lastBossPhase = 0;
    hf = 0; hajimiFloat = 0;
    beatHistory = []; strongBeatCount = 0; lastBeatTime = 0; lastSpawnTime = 0;
    swordAnim = 0; currentBass = 0; currentMid = 0; currentTotal = 0;
    itemSpawnTimer = 0; nebulaOffset = 0;
    S_R = 120;

    recentBassHistory = [];
    recentMidHistory = [];
    prevBass = 0; prevMid = 0; prevTotal = 0;

    hitStopTimer = 0;
    aoeCount = 0;
    hyperMode.value = false;
    hyperCountdown.value = 0;
    hyperTimer = 0;
    lastDrumTime = 0;
    hajimiDrumFlash = 0;

    // 随机刷新系统初始化
    spawnTimer = 0;
    spawnInterval = 1.5;
    audioIntensity = 0;
    audioIntensitySmooth = 0;
    waveCount = 0;
    stableAudioTimer = 0;

    initStars();

  } catch (e: any) {
    console.error('[RhythmHajimi] 捕获失败:', e);

    // 区分错误类型，给用户准确反馈
    if (e.name === 'AbortError' || e.message?.includes('Invalid state')) {
      statusText.value = '音频源获取失败，请重试或检查权限';
    } else if (e.message === 'no_source') {
      statusText.value = '未获取到桌面音频源';
    } else if (e.message === 'no_audio') {
      statusText.value = '未检测到音频轨道';
    } else {
      statusText.value = '捕获失败，请重试';
    }

    // Fallback：尝试麦克风模式
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStream = s;
      audioCtx = new AudioContext();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      const src = audioCtx.createMediaStreamSource(s);
      src.connect(analyser);
      isCapturing.value = true; hasStarted.value = true;
      statusText.value = '使用麦克风模式';
      initStars();
    } catch (fallbackErr: any) {
      statusText.value = '无法获取音频';
      console.error('[RhythmHajimi] 麦克风 fallback 也失败:', fallbackErr);
    }
  }
}

async function stopCapture() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
  if (audioCtx && audioCtx.state !== 'closed') {
    await audioCtx.close().catch(() => {});
  }
  audioCtx = null;
  analyser = null;
  isCapturing.value = false;
  statusText.value = '已停止';
}

function toggleCapture() { isCapturing.value ? stopCapture() : startCapture(); }

function exitToLobby() {
  stopCapture();
  emit('exit');
}

// ============ 赛博斩击音效 ============

function playSlashSound(intensity: number) {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = intensity > 1 ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(800 + intensity * 400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
  } catch {}
}

// ============ 打鼓音效 ============

function playDrumSound(isStrong: boolean) {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = isStrong ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(isStrong ? 200 : 350, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(isStrong ? 40 : 80, audioCtx.currentTime + (isStrong ? 0.25 : 0.12));
    gain.gain.setValueAtTime(isStrong ? 0.15 : 0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (isStrong ? 0.25 : 0.12));
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + (isStrong ? 0.25 : 0.12));
  } catch {}
}

// ============ 星空初始化 ============

function initStars() {
  stars.length = 0;
  const c = gameCanvas.value;
  if (!c) return;
  for (let i = 0; i < 300; i++) {
    stars.push({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      z: Math.random() * 3 + 0.5,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 1.5 + 0.3,
      brightness: Math.random() * 0.6 + 0.4
    });
  }
}

// ============ 输入 ============

function handleClick(e: MouseEvent) {
  if (gameOver.value || !isCapturing.value) return;
  const c = gameCanvas.value!, r = c.getBoundingClientRect();
  slash((e.clientX - r.left) * (c.width / r.width), (e.clientY - r.top) * (c.height / r.height));
}
function handleRightClick() {
  if (!gameOver.value && isCapturing.value) releaseAOE();
}

function onKeyDown(e: KeyboardEvent) {
  // ESC 始终响应：返回大厅
  if (e.code === 'Escape') {
    e.preventDefault();
    stopCapture();
    emit('exit');
    return;
  }
  if (gameOver.value || !isCapturing.value) return;
  if (e.code === 'Space') {
    e.preventDefault();
    if (hyperMode.value) {
      drum();
    } else if (energy.value >= 10 || aoeCount >= 5) {
      releaseAOE();
    } else {
      slash(mX, mY);
    }
  }
  if (e.code === 'KeyW') slashQuadrant(0);
  if (e.code === 'KeyD') slashQuadrant(1);
  if (e.code === 'KeyS') slashQuadrant(2);
  if (e.code === 'KeyA') slashQuadrant(3);
}

function onMouseMove(e: MouseEvent) {
  const c = gameCanvas.value!, r = c.getBoundingClientRect();
  mX = (e.clientX - r.left) * (c.width / r.width);
  mY = (e.clientY - r.top) * (c.height / r.height);
}

// ============ 四向斩 ============

function slashQuadrant(q: number) {
  const cx = hajimiX;
  const cy = hajimiY;
  const angles = [ -Math.PI/2, 0, Math.PI/2, Math.PI ];
  const tx = cx + Math.cos(angles[q]) * 250;
  const ty = cy + Math.sin(angles[q]) * 250;
  slash(tx, ty);
}

// ============ 光剑成长 ============

function getSwordRadius(): number {
  const growth = Math.floor(score.value / 5000) * 15;
  return Math.min(120 + growth, 210);
}

function getSwordColor(): string {
  if (score.value >= 30000) return '#ffd700';
  return '#00f3ff';
}

function getSwordGlow(): string {
  if (score.value >= 30000) return 'rgba(255,215,0,0.8)';
  return 'rgba(0,243,255,0.8)';
}

// ============ 游戏逻辑 ============

function slash(x: number, y: number) {
  const n = performance.now();
  if (n - sCd < S_CD) return;
  sCd = n;
  swordAnim = 0.15;
  swordAngle = Math.atan2(y - hajimiY, x - hajimiX);
  const radius = getSwordRadius();
  slashes.push({ x, y, angle: swordAngle, life: 1, maxLife: 1, radius });

  let h = 0;
  for (let i = orbs.length - 1; i >= 0; i--) {
    const d = Math.hypot(orbs[i].x - x, orbs[i].y - y);
    if (d < radius + orbs[i].radius) {
      explode(orbs[i].x, orbs[i].y, orbs[i].color, 10);
      orbs[i].trail.length = 0;
      orbs.splice(i, 1);
      h++;
    }
  }

  for (let i = items.length - 1; i >= 0; i--) {
    const d = Math.hypot(items[i].x - x, items[i].y - y);
    if (d < radius + items[i].radius) {
      applyItem(items[i]);
      explode(items[i].x, items[i].y, items[i].color, 8);
      items.splice(i, 1);
    }
  }

  if (boss.alive) {
    const d = Math.hypot(boss.x - x, boss.y - y);
    if (d < radius + 60) {
      damageBoss(1);
    }
  }

  if (h > 0) {
    combo.value += h;
    comboMultiplier.value = Math.min(3.0, 1.0 + combo.value * 0.08);
    energy.value = Math.min(10, energy.value + h);
    score.value += Math.floor(h * 10 * comboMultiplier.value);
    hitStopTimer = 0.033;
    shake = Math.max(shake, 2);
    playSlashSound(1);
  } else {
    combo.value = 0;
    comboMultiplier.value = 1.0;
  }
}

// ============ AOE 大招 ============

function releaseAOE() {
  if (hyperMode.value) return;

  if (aoeCount >= 5) {
    enterHyperMode();
    aoeCount = 0;
    return;
  }

  if (energy.value < 10) {
    slash(mX, mY);
    return;
  }

  energy.value = 0;
  aoeCount++;
  performAOE();
}

function performAOE() {
  const n = orbs.length;
  for (let i = orbs.length - 1; i >= 0; i--) {
    explode(orbs[i].x, orbs[i].y, orbs[i].color, 15);
    orbs[i].trail.length = 0;
    orbs.splice(i, 1);
  }
  score.value += n * 50;
  shake = Math.max(shake, 8);
  hitStopTimer = Math.max(hitStopTimer, 0.05);
  olFlash = 1;
  playSlashSound(2);

  if (boss.alive) {
    damageBoss(1);
  }
}

// ============ 超频模式 ============

function enterHyperMode() {
  hyperMode.value = true;
  hyperTimer = 5.0;
  hyperCountdown.value = 5;
  statusText.value = 'HYPER MODE!';
  shake = 6;
  hitStopTimer = 0.083;
}

function updateHyper(dt: number) {
  if (!hyperMode.value) return;
  hyperTimer -= dt;
  hyperCountdown.value = Math.max(0, Math.ceil(hyperTimer));

  if (hyperTimer <= 0) {
    const n = orbs.length;
    for (let i = orbs.length - 1; i >= 0; i--) {
      explode(orbs[i].x, orbs[i].y, orbs[i].color, 20);
      orbs[i].trail.length = 0;
      orbs.splice(i, 1);
    }
    score.value += n * 100;
    shake = 25;
    hitStopTimer = 0.15;
    olFlash = 1.5;
    playSlashSound(3);
    if (boss.alive) damageBoss(1);

    hyperMode.value = false;
    hyperCountdown.value = 0;
    statusText.value = 'FINALE! 超频结束';
  }

  shake = Math.max(shake, 3);
}

// ============ 打鼓冲击波 ============

function drum() {
  const now = performance.now();
  if (now - lastDrumTime < 250) return;
  lastDrumTime = now;

  const isStrong = currentBass > 0.28 && currentBassRise > 0.02;
  const radius = isStrong ? 300 : 180;
  const color = isStrong ? '#ffd700' : '#00f3ff';
  const glow = isStrong ? 'rgba(255,215,0,0.8)' : 'rgba(0,243,255,0.6)';

  drumWaves.push({
    x: hajimiX, y: hajimiY,
    radius: 20, maxRadius: radius,
    life: 1, maxLife: 1,
    isStrong, color, glow
  });

  shake = Math.max(shake, isStrong ? 12 : 5);
  hitStopTimer = Math.max(hitStopTimer, isStrong ? 0.06 : 0.03);
  hajimiDrumFlash = isStrong ? 0.3 : 0.15;

  let hits = 0;
  for (let i = orbs.length - 1; i >= 0; i--) {
    const d = Math.hypot(orbs[i].x - hajimiX, orbs[i].y - hajimiY);
    if (d < radius) {
      explode(orbs[i].x, orbs[i].y, orbs[i].color, 12);
      orbs.splice(i, 1);
      hits++;
    }
  }
  if (hits > 0) {
    combo.value += hits;
    comboMultiplier.value = Math.min(3.0, 1.0 + combo.value * 0.08);
    score.value += Math.floor(hits * 20 * comboMultiplier.value);
  }

  if (boss.alive) {
    const d = Math.hypot(boss.x - hajimiX, boss.y - hajimiY);
    if (d < radius + 60) {
      damageBoss(1);
    }
  }

  playDrumSound(isStrong);
}

function updateDrumWaves(dt: number) {
  for (let i = drumWaves.length - 1; i >= 0; i--) {
    const w = drumWaves[i];
    w.life -= dt * 2.0;
    w.radius += (w.maxRadius - w.radius) * 0.25 * dt * 60;
    if (w.life <= 0) drumWaves.splice(i, 1);
  }
  if (drumWaves.length > 12) drumWaves.splice(0, drumWaves.length - 12);
}

function drawDrumWaves(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const w of drumWaves) {
    const alpha = w.life / w.maxLife;
    const lineWidth = 5 * alpha;
    const rgbMatch = w.glow.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
    const r = rgbMatch ? rgbMatch[1] : '0';
    const g = rgbMatch ? rgbMatch[2] : '243';
    const b = rgbMatch ? rgbMatch[3] : '255';

    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.6})`;
    ctx.lineWidth = lineWidth * 3;
    ctx.beginPath(); ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2); ctx.stroke();

    ctx.strokeStyle = w.color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath(); ctx.arc(w.x, w.y, w.radius * 0.9, 0, Math.PI * 2); ctx.stroke();

    const grd = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, w.radius);
    grd.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.15})`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ============ BOSS系统 ============

function checkBossSpawn() {
  const phase = Math.floor(score.value / 30000);
  if (phase >= 1 && phase > lastBossPhase) {
    lastBossPhase = phase;
    if (!boss.alive) {
      const bonusHp = Math.max(0, phase - 1) * 2;
      spawnBoss(5 + bonusHp); // 基础5HP，每阶段+2
    } else {
      boss.maxHp += 2;
      boss.hp = Math.min(boss.hp + 2, boss.maxHp);
      statusText.value = 'BOSS强化!';
      shake = 4;
    }
  }
}

function spawnBoss(hp: number) {
  const c = gameCanvas.value!;
  const diff = getDifficulty();
  boss.x = c.width / 2;
  boss.y = 100;
  boss.hp = hp;
  boss.maxHp = hp;
  boss.skin = 0;
  boss.alive = true;
  boss.vx = 1.2 + (diff.speedMult - 1.0) * 0.8; // 难度越高移动越快
  boss.attackTimer = diff.bossAttackInterval;
  bossAlive.value = true;
  bossHpPercent.value = 100;
  statusText.value = 'BOSS降临!';
  shake = 10;
  hitStopTimer = 0.1;
}

function damageBoss(dmg: number) {
  if (!boss.alive) return;
  boss.hp -= dmg;
  boss.hitFlash = 1;
  shake = Math.max(shake, 6);
  score.value += 500;
  bossHpPercent.value = Math.max(0, (boss.hp / boss.maxHp) * 100);
  if (boss.hp <= 0) {
    boss.alive = false;
    bossAlive.value = false;
    for (let i = 0; i < 60; i++) {
      const c = ['#ff0040', '#ffd700', '#00f3ff', '#ffffff'][i % 4];
      explode(boss.x + (Math.random()-0.5)*80, boss.y + (Math.random()-0.5)*80, c, 16);
    }
    score.value += 3000;
    statusText.value = 'BOSS击破!';
    shake = 20;
    hitStopTimer = 0.15;
  }
}

function updateBoss(dt: number) {
  if (!boss.alive) return;
  const diff = getDifficulty();

  boss.x += boss.vx * dt * 60;
  const c = gameCanvas.value!;
  if (boss.x < 150 || boss.x > c.width - 150) boss.vx *= -1;

  boss.attackTimer -= dt;
  if (boss.attackTimer <= 0) {
    boss.attackTimer = diff.bossAttackInterval;
    bossAttack();
  }

  if (boss.hitFlash > 0) boss.hitFlash -= dt * 3;

  const s = score.value;
  if (s >= 30000) boss.skin = 2;
  else if (s >= 10000) boss.skin = 1;
  else boss.skin = 0;

  bossHpPercent.value = Math.max(0, (boss.hp / boss.maxHp) * 100);
}

function bossAttack() {
  if (!boss.alive) return;
  const diff = getDifficulty();
  const count = diff.bossBulletCount;
  const spd = diff.bossBulletSpeed;
  const spreadAngle = Math.PI / 4; // 扇形展开角度
  for (let i = 0; i < count; i++) {
    const angle = (spreadAngle / (count - 1)) * (i - (count - 1) / 2) + Math.PI / 2;
    const vx = Math.cos(angle) * spd;
    const vy = Math.sin(angle) * spd;
    bossBullets.push({
      x: boss.x, y: boss.y + 40,
      vx, vy,
      radius: 30,
      predictLine: {
        x1: boss.x, y1: boss.y + 40,
        x2: boss.x + vx * 90, y2: boss.y + 40 + vy * 90,
        life: 1.2
      }
    });
  }
}

function updateBossBullets(dt: number) {
  for (let i = bossBullets.length - 1; i >= 0; i--) {
    const b = bossBullets[i];
    b.x += b.vx * dt * 60;
    b.y += b.vy * dt * 60;
    if (b.predictLine) {
      b.predictLine.life -= dt;
      if (b.predictLine.life <= 0) b.predictLine = null;
    }

    const d = Math.hypot(b.x - hajimiX, b.y - hajimiY);
    if (d < H_R + b.radius) {
      if (shieldCount.value > 0) {
        shieldCount.value--;
        explode(b.x, b.y, '#ffd700', 20);
      } else {
        lives.value--;
        combo.value = 0;
        comboMultiplier.value = 1.0;
        shake = 15;
        hitStopTimer = 0.1;
      }
      bossBullets.splice(i, 1);
      if (lives.value <= 0) {
        gameOver.value = true;
        stopCapture();
      }
      continue;
    }

    const c = gameCanvas.value!;
    if (b.x < -100 || b.x > c.width + 100 || b.y < -100 || b.y > c.height + 100) {
      bossBullets.splice(i, 1);
    }
  }
  if (bossBullets.length > 60) bossBullets.splice(0, bossBullets.length - 60);
}

function drawBoss(ctx: CanvasRenderingContext2D) {
  if (!boss.alive) return;

  const skinColors = [
    { core: '#ff0040', glow: 'rgba(255,0,64,0.6)', line: '#ff3333', sec: '#ff6666' },
    { core: '#ffffff', glow: 'rgba(255,255,255,0.6)', line: '#ccccff', sec: '#eeeeff' },
    { core: '#00f3ff', glow: 'rgba(0,243,255,0.6)', line: '#00ffff', sec: '#00cccc' }
  ];
  const colors = skinColors[boss.skin];
  const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.12;

  ctx.save();
  ctx.translate(boss.x, boss.y);

  if (boss.hitFlash > 0) {
    ctx.globalAlpha = 0.4 + boss.hitFlash * 0.6;
  }

  const outerR = 75 * pulse;
  const g = ctx.createRadialGradient(0, 0, 25, 0, 0, outerR);
  const glowMatch = colors.glow.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
  const gr = glowMatch ? glowMatch[1] : '255', gg = glowMatch ? glowMatch[2] : '0', gb = glowMatch ? glowMatch[3] : '64';
  g.addColorStop(0, `rgba(${gr},${gg},${gb},0.15)`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, outerR, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 58, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 48, 0, Math.PI * 2); ctx.stroke();

  const rot = performance.now() * 0.0015;
  ctx.save(); ctx.rotate(rot);
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8;
    ctx.fillStyle = colors.line;
    ctx.fillRect(Math.cos(a) * 53 - 2, Math.sin(a) * 53 - 5, 4, 10);
  }
  ctx.restore();

  if (boss.skin === 1) {
    ctx.strokeStyle = colors.sec;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI * 2 * i) / 4 + rot * 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 30, Math.sin(a) * 30);
      ctx.lineTo(Math.cos(a) * 55, Math.sin(a) * 55);
      ctx.stroke();
    }
  }

  ctx.fillStyle = colors.core;
  ctx.shadowBlur = 35;
  ctx.shadowColor = colors.core;
  ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath(); ctx.arc(-8, -8, 10, 0, Math.PI * 2); ctx.fill();

  if (boss.skin === 2) {
    ctx.strokeStyle = 'rgba(0,243,255,0.5)';
    ctx.lineWidth = 3;
    const t = performance.now() * 0.005;
    for (let i = 0; i < 6; i++) {
      const off = i * 0.8;
      ctx.beginPath();
      ctx.moveTo(-15 + i * 6, 38 + off * 4);
      ctx.quadraticCurveTo(-5 + i * 6 + Math.sin(t + i) * 8, 55 + off * 6, 5 + i * 6, 75 + off * 8);
      ctx.stroke();
    }
  }

  ctx.restore();

  const barW = 140;
  const barH = 10;
  const barX = boss.x - barW / 2;
  const barY = boss.y - 95;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
  ctx.fillStyle = '#333';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = colors.core;
  ctx.fillRect(barX, barY, barW * (boss.hp / boss.maxHp), barH);
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);
}

function drawBossBullets(ctx: CanvasRenderingContext2D) {
  for (const b of bossBullets) {
    if (b.predictLine) {
      ctx.strokeStyle = `rgba(255,0,64,${b.predictLine.life * 0.35})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(b.predictLine.x1, b.predictLine.y1);
      ctx.lineTo(b.predictLine.x2, b.predictLine.y2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius * 2.2);
    grd.addColorStop(0, 'rgba(255,0,64,0.7)');
    grd.addColorStop(1, 'rgba(255,0,64,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius * 2.2, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#ff0040';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(b.x - 9, b.y - 9, 9, 0, Math.PI * 2); ctx.fill();
  }
}

function explode(x: number, y: number, c: string, n = 10) {
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
    const s = 2 + Math.random() * 5;
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, maxLife: 1, color: c, size: 2 + Math.random() * 3 });
  }
}

function applyItem(item: Item) {
  if (item.type === 'shield') {
    shieldCount.value = Math.min(shieldCount.value + 1, 3);
  } else {
    lives.value = Math.min(3, lives.value + 1);
  }
}

// ============ 三通道 Beat 检测 ============

function getAudio(): { b: number; m: number; o: number; total: number; bassRise: number; midRise: number; totalRise: number } {
  if (!analyser) return { b: 0, m: 0, o: 0, total: 0, bassRise: 0, midRise: 0, totalRise: 0 };
  const d = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(d);

  let b = 0; for (let i = 0; i < 8; i++) b += d[i];
  b = b / 8 / 255;

  let m = 0; for (let i = 8; i < 32; i++) m += d[i];
  m = m / 24 / 255;

  let o = 0; for (let i = 0; i < d.length; i++) o += d[i];
  o = o / d.length / 255;

  let total = 0; for (let i = 0; i < d.length; i++) total += d[i] * d[i];
  total = total / d.length / 65025;

  const bassRise = b - prevBass;
  const midRise = m - prevMid;
  const totalRise = total - prevTotal;

  prevBass = b; prevMid = m; prevTotal = total;

  return { b, m, o, total, bassRise, midRise, totalRise };
}

function detectBeat(
  b: number, m: number, total: number, bassRise: number, midRise: number, totalRise: number
): { isBeat: boolean; strength: 'weak' | 'medium' | 'strong'; channel: 'bass' | 'mid' | 'total'; countsForOverload: boolean } {

  const now = performance.now();
  if (now - lastBeatTime < 90) return { isBeat: false, strength: 'weak', channel: 'bass', countsForOverload: false };

  if (total < 0.04 && b < 0.03) {
    return { isBeat: false, strength: 'weak', channel: 'bass', countsForOverload: false };
  }

  recentBassHistory.push(b);
  if (recentBassHistory.length > 20) recentBassHistory.shift();
  recentMidHistory.push(m);
  if (recentMidHistory.length > 20) recentMidHistory.shift();

  let bassMin = 0, bassMax = 0;
  if (recentBassHistory.length >= 10) {
    bassMin = Math.min(...recentBassHistory);
    bassMax = Math.max(...recentBassHistory);
  }

  let midMin = 0, midMax = 0;
  if (recentMidHistory.length >= 10) {
    midMin = Math.min(...recentMidHistory);
    midMax = Math.max(...recentMidHistory);
  }

  if (recentBassHistory.length >= 10) {
    const dynamicThreshold = bassMin + (bassMax - bassMin) * 0.35;
    if (b > dynamicThreshold && b > 0.08) {
      lastBeatTime = now;
      if (b > 0.32 && bassRise > 0.04) {
        return { isBeat: true, strength: 'strong', channel: 'bass', countsForOverload: true };
      }
      if (b > 0.18 || bassRise > 0.03) {
        return { isBeat: true, strength: 'medium', channel: 'bass', countsForOverload: false };
      }
      return { isBeat: true, strength: 'weak', channel: 'bass', countsForOverload: false };
    }
  }

  if (recentMidHistory.length >= 10) {
    const midDynamic = midMin + (midMax - midMin) * 0.30;
    if (m > midDynamic && m > 0.06 && midRise > 0.02 && b < 0.15) {
      lastBeatTime = now;
      return { isBeat: true, strength: 'weak', channel: 'mid', countsForOverload: false };
    }
  }

  if (totalRise > 0.04 && total > 0.10 && b < 0.12) {
    lastBeatTime = now;
    return { isBeat: true, strength: 'weak', channel: 'total', countsForOverload: false };
  }

  return { isBeat: false, strength: 'weak', channel: 'bass', countsForOverload: false };
}

function spawnByBeat(strength: 'weak' | 'medium' | 'strong', extraCount: number = 0) {
  const c = gameCanvas.value!;
  const diff = getDifficulty();
  const configs = {
    weak:   { c: '#00f3ff', g: 'rgba(0,243,255,0.5)',  r: 12, s: 1.0 },
    medium: { c: '#a855f7', g: 'rgba(168,85,247,0.6)', r: 16, s: 1.5 },
    strong: { c: '#ff6b35', g: 'rgba(255,107,53,0.6)', r: 20, s: 2.0 }
  };
  const cfg = configs[strength];
  // 基础数量：weak=1-2, medium=2-3, strong=3-5
  let count = strength === 'weak' ? (1 + Math.floor(Math.random() * 2))
    : strength === 'medium' ? (2 + Math.floor(Math.random() * 2))
    : (3 + Math.floor(Math.random() * 3));
  count += diff.spawnBonus;
  count += extraCount; // 音频增量补充

  for (let i = 0; i < count; i++) {
    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    if (side === 0) { x = Math.random() * c.width; y = -40; }
    else if (side === 1) { x = c.width + 40; y = Math.random() * c.height; }
    else if (side === 2) { x = Math.random() * c.width; y = c.height + 40; }
    else { x = -40; y = Math.random() * c.height; }

    const isLinear = Math.random() < 0.3;
    let vx = 0, vy = 0;
    let predictLine = null;

    if (isLinear) {
      const a = Math.atan2(hajimiY - y, hajimiX - x);
      const spd = cfg.s * diff.speedMult * (1 + Math.random() * 0.3);
      vx = Math.cos(a) * spd;
      vy = Math.sin(a) * spd;
      predictLine = { x1: x, y1: y, x2: x + vx * 60, y2: y + vy * 60, life: 1.5 };
    } else {
      const a = Math.atan2(hajimiY - y, hajimiX - x);
      const spd = cfg.s * diff.speedMult * (1 + Math.random() * 0.3);
      vx = Math.cos(a) * spd;
      vy = Math.sin(a) * spd;
    }

    orbs.push({
      x, y, vx, vy,
      radius: cfg.r, color: cfg.c, glow: cfg.g,
      trail: [], isLinear, predictLine
    });
  }
}

function spawnOverloadWave() {
  const c = gameCanvas.value!;
  const diff = getDifficulty();
  const colors = ['#ff0040', '#ffcc00', '#00f3ff', '#a855f7', '#ff6b35'];
  const count = 3 + diff.spawnBonus;

  for (let i = 0; i < count; i++) {
    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    if (side === 0) { x = Math.random() * c.width; y = -80; }
    else if (side === 1) { x = c.width + 80; y = Math.random() * c.height; }
    else if (side === 2) { x = Math.random() * c.width; y = c.height + 80; }
    else { x = -80; y = Math.random() * c.height; }

    const targetX = hajimiX + (Math.random() - 0.5) * 200;
    const targetY = hajimiY + (Math.random() - 0.5) * 200;
    const a = Math.atan2(targetY - y, targetX - x);
    const color = colors[i % colors.length];
    const spd = 5.0 * diff.speedMult * (1 + Math.random() * 0.3);

    orbs.push({
      x, y,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      radius: 42 + Math.random() * 8,
      color,
      glow: color + '88',
      trail: [], isLinear: false, predictLine: null
    });
  }
  olFlash = 1;
  shake = 8;
  hitStopTimer = Math.max(hitStopTimer, 0.05);
}

function spawnItem() {
  const c = gameCanvas.value!;
  const type = Math.random() < 0.25 ? 'shield' : 'health';
  const side = Math.floor(Math.random() * 4);
  let x = 0, y = 0;
  if (side === 0) { x = Math.random() * c.width; y = -30; }
  else if (side === 1) { x = c.width + 30; y = Math.random() * c.height; }
  else if (side === 2) { x = Math.random() * c.width; y = c.height + 30; }
  else { x = -30; y = Math.random() * c.height; }
  const a = Math.atan2(hajimiY - y, hajimiX - x);
  const spd = 0.8 + Math.random() * 0.5;
  items.push({
    x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
    radius: 14, type,
    color: type === 'shield' ? '#ffd700' : '#00ff88',
    glow: type === 'shield' ? 'rgba(255,215,0,0.6)' : 'rgba(0,255,136,0.6)'
  });
}

// ============ 更新循环 ============

function update(dt: number) {
  if (!isCapturing.value || gameOver.value) return;

  if (hitStopTimer > 0) {
    hitStopTimer -= dt;
    updateEffects(dt);
    updateBossBullets(dt);
    return;
  }

  const { b, m, o, total, bassRise, midRise, totalRise } = getAudio();
  currentBass = b; currentMid = m; currentTotal = total;
  currentBassRise = bassRise;
  bassDisplay.value = Math.floor(b * 12);

  const diff = getDifficulty();
  const c = gameCanvas.value!;

  updateHyper(dt);
  checkBossSpawn();
  updateBoss(dt);
  updateBossBullets(dt);
  updateDrumWaves(dt);

  if (hajimiDrumFlash > 0) hajimiDrumFlash -= dt * 3;

  const starSpeedMult = 1 + b * 3;
  for (const star of stars) {
    star.y += star.speed * star.z * starSpeedMult * dt * 60;
    if (star.y > c.height + 10) {
      star.y = -10;
      star.x = Math.random() * c.width;
    }
  }
  nebulaOffset += 0.3 * starSpeedMult * dt * 60;

  const meteorChance = 0.003 + b * 0.01 + (total > 0.4 ? 0.02 : 0);
  if (Math.random() < meteorChance) {
    meteors.push({
      x: Math.random() * c.width, y: -50,
      vx: (Math.random() - 0.5) * 2, vy: 4 + Math.random() * 4,
      life: 1, len: 30 + Math.random() * 40
    });
  }

  hajimiFloat += dt * 2.0;
  hajimiY = c.height / 2 + Math.sin(hajimiFloat) * 15 + Math.sin(hajimiFloat * 0.7) * 5;
  hf += dt * 3;

  if (swordAnim > 0) swordAnim -= dt;

  // ========== 随机为主、音频为辅的刷新系统 ==========
  stableAudioTimer += dt;
  const audioReady = stableAudioTimer > 2.0 && analyser !== null;

  // 计算原始音频强度（bass权重最高，因为节拍主要在这里）
  let rawIntensity = 0;
  if (audioReady) {
    rawIntensity = Math.min(1.0, b * 2.5 + m * 0.6 + total * 0.4);
  }
  // 平滑处理，防止音频数据跳变导致瞬间爆发
  audioIntensitySmooth += (rawIntensity - audioIntensitySmooth) * 0.08;
  audioIntensity = audioIntensitySmooth;

  // 基础间隔由难度决定，音频最多再缩短 0.4 秒
  const audioBonus = Math.min(0.40, audioIntensity * 0.55);
  spawnInterval = diff.baseInterval - audioBonus;
  // 绝对下限保护，防止音频极强时刷太快
  if (spawnInterval < 0.25) spawnInterval = 0.25;

  spawnTimer += dt;
  if (spawnTimer >= spawnInterval) {
    spawnTimer = 0;
    waveCount++;

    // ===== 基础强度：纯随机 + 难度 =====
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    const rand = Math.random();
    if (rand < diff.strongChance) {
      strength = 'strong';
    } else if (rand < diff.strongChance + diff.mediumChance) {
      strength = 'medium';
    }

    // ===== 音频增量补充 =====
    let extraCount = 0;
    if (audioIntensity > 0.30) extraCount += 1;
    if (audioIntensity > 0.55) extraCount += 2;
    if (audioIntensity > 0.80) extraCount += 3;

    // 音频强时：有概率提升光球强度等级
    if (audioIntensity > 0.40 && strength === 'weak' && Math.random() < 0.55) {
      strength = 'medium';
    }
    if (audioIntensity > 0.65 && strength === 'medium' && Math.random() < 0.50) {
      strength = 'strong';
    }

    spawnByBeat(strength, extraCount);

    // ===== Overload 波：由波数控制，音频可加速 =====
    let overloadReq = diff.overloadReq;
    if (audioIntensity > 0.50) overloadReq = Math.max(2, overloadReq - 1);
    if (waveCount >= overloadReq) {
      spawnOverloadWave();
      waveCount = 0;
    }
  }

  itemSpawnTimer += dt;
  if (itemSpawnTimer > 8 + Math.random() * 4) {
    itemSpawnTimer = 0;
    spawnItem();
  }

  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    o.trail.push({x: o.x, y: o.y});
    if (o.trail.length > 8) o.trail.shift();

    if (o.predictLine) {
      o.predictLine.life -= dt;
      if (o.predictLine.life <= 0) o.predictLine = null;
    }

    if (!o.isLinear) {
      const a = Math.atan2(hajimiY - o.y, hajimiX - o.x);
      const spd = Math.hypot(o.vx, o.vy);
      o.vx = Math.cos(a) * spd;
      o.vy = Math.sin(a) * spd;
    }

    o.x += o.vx * dt * 60;
    o.y += o.vy * dt * 60;

    const d = Math.hypot(o.x - hajimiX, o.y - hajimiY);
    if (d < H_R + o.radius) {
      if (shieldCount.value > 0) {
        shieldCount.value--;
        explode(o.x, o.y, '#ffd700', 20);
        o.trail.length = 0;
        orbs.splice(i, 1);
        continue;
      }

      lives.value--;
      explode(o.x, o.y, '#ff0040', 15);
      o.trail.length = 0;
      orbs.splice(i, 1);

      combo.value = 0;
      comboMultiplier.value = 1.0;
      shake = 12;
      hitStopTimer = 0.083;

      if (lives.value <= 0) {
        gameOver.value = true;
        stopCapture();
        return;
      }
      continue;
    }

    if (o.x < -100 || o.x > c.width + 100 || o.y < -100 || o.y > c.height + 100) {
      o.trail.length = 0;
      orbs.splice(i, 1);
      continue;
    }
  }

  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    item.x += item.vx * dt * 60;
    item.y += item.vy * dt * 60;
    if (item.x < -60 || item.x > c.width + 60 || item.y < -60 || item.y > c.height + 60) {
      items.splice(i, 1);
    }
  }

  while (particles.length > 300) {
    particles.shift();
  }
  while (orbs.length > 50) {
    const leakedOrb = orbs.shift();
    if (leakedOrb) leakedOrb.trail.length = 0;
  }

  updateEffects(dt);

  if (shake > 0) shake *= Math.pow(0.88, dt * 60);
  if (olFlash > 0) olFlash *= Math.pow(0.9, dt * 60);
}

function updateEffects(dt: number) {
  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i];
    m.x += m.vx * dt * 60;
    m.y += m.vy * dt * 60;
    m.life -= dt * 0.5;
    if (m.life <= 0 || m.y > (gameCanvas.value?.height || 0) + 100) meteors.splice(i, 1);
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.vy += 0.04 * dt * 60;
    p.life -= dt * 2.5;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = slashes.length - 1; i >= 0; i--) {
    slashes[i].life -= dt * 5;
    if (slashes[i].life <= 0) slashes.splice(i, 1);
  }
}

// ============ 渲染 ============

function draw() {
  const c = gameCanvas.value!, ctx = c.getContext('2d')!;
  ctx.save();
  if (shake > 0.5) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

  ctx.fillStyle = '#020205';
  ctx.fillRect(0, 0, c.width, c.height);

  drawNebula(ctx, c, currentBass, currentMid, currentTotal);
  drawStars(ctx, c);
  drawMeteors(ctx);

  ctx.strokeStyle = 'rgba(0,243,255,0.015)';
  for (let i = 0; i < c.width; i += 60) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, c.height); ctx.stroke(); }
  for (let i = 0; i < c.height; i += 60) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(c.width, i); ctx.stroke(); }

  if (olFlash > 0.01) {
    ctx.fillStyle = `rgba(255,0,64,${olFlash * 0.2})`;
    ctx.fillRect(0, 0, c.width, c.height);
  }

  if (hyperMode.value) {
    drawHyperRing(ctx, c);
  }

  drawBoss(ctx);
  drawBossBullets(ctx);

  drawBeatRing(ctx, c);

  for (const item of items) {
    const grd = ctx.createRadialGradient(item.x, item.y, 0, item.x, item.y, item.radius * 2.5);
    grd.addColorStop(0, item.glow); grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(item.x, item.y, item.radius * 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = item.color; ctx.beginPath(); ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    if (item.type === 'health') {
      const s = item.radius * 0.4;
      ctx.fillRect(item.x - s, item.y - s/3, s*2, s/1.5);
      ctx.fillRect(item.x - s/3, item.y - s, s/1.5, s*2);
    } else {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 * i) / 6 - Math.PI/2;
        const r = item.radius * 0.6;
        const px = item.x + Math.cos(a) * r;
        const py = item.y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    }
  }

  for (const o of orbs) {
    if (o.predictLine) {
      ctx.strokeStyle = `rgba(0,243,255,${o.predictLine.life * 0.3})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(o.predictLine.x1, o.predictLine.y1);
      ctx.lineTo(o.predictLine.x2, o.predictLine.y2); ctx.stroke();
      ctx.setLineDash([]);
    }

    const pulse = 1 + currentBass * 0.25;
    const r = o.radius * pulse;

    if (o.trail.length > 1) {
      ctx.strokeStyle = o.glow;
      ctx.lineWidth = r * 0.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(o.trail[0].x, o.trail[0].y);
      for (let i = 1; i < o.trail.length; i++) ctx.lineTo(o.trail[i].x, o.trail[i].y);
      ctx.stroke();
    }

    const grd = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, r * 2.5);
    grd.addColorStop(0, o.glow); grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(o.x, o.y, r * 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = o.color; ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(o.x - r * 0.3, o.y - r * 0.3, r * 0.25, 0, Math.PI * 2); ctx.fill();
  }

  drawDrumWaves(ctx);

  drawHajimi(ctx, hajimiX, hajimiY);

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const s of slashes) {
    const a = s.life;
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.angle);
    const sColor = getSwordColor();
    const sGlow = getSwordGlow();
    ctx.strokeStyle = sColor;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, s.radius * (1 - a * 0.2), -1.2, 1.2); ctx.stroke();
    ctx.strokeStyle = sGlow.replace(')', `,${a * 0.4})`);
    ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(0, 0, s.radius * (1 - a * 0.2), -1.2, 1.2); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const p of particles) {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = 'rgba(0,243,255,0.08)'; ctx.lineWidth = 1; ctx.setLineDash([5, 10]);
  ctx.beginPath(); ctx.moveTo(hajimiX + H_R + 20, 60); ctx.lineTo(hajimiX + H_R + 20, c.height - 80); ctx.stroke();
  ctx.setLineDash([]);

  drawAudioLine(ctx, c, currentBass, currentTotal);

  ctx.restore();
}

// ============ 超频大光环 ============

function drawHyperRing(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement) {
  const cx = hajimiX;
  const cy = hajimiY;
  const time = performance.now() * 0.003;

  const baseR = 300 + currentBass * 200;
  const totalFactor = currentTotal;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 3; i++) {
    const phase = time + i * 2.1;
    const r = baseR + Math.sin(phase) * 40 + i * 60;
    const alpha = (0.08 + currentBass * 0.12) * (1 - i * 0.25);

    const rColor = Math.floor(255);
    const gColor = Math.floor(215 - totalFactor * 100);
    const bColor = Math.floor(0 + totalFactor * 50);

    ctx.strokeStyle = `rgba(${rColor},${gColor},${bColor},${alpha})`;
    ctx.lineWidth = 2 + currentBass * 4;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

    ctx.strokeStyle = `rgba(${rColor},${gColor},${bColor},${alpha * 0.3})`;
    ctx.lineWidth = 8 + currentBass * 12;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  }

  const coreAlpha = 0.15 + currentBass * 0.25;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 0.6);
  g.addColorStop(0, `rgba(255,200,0,${coreAlpha})`);
  g.addColorStop(0.5, `rgba(255,100,0,${coreAlpha * 0.5})`);
  g.addColorStop(1, 'rgba(255,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, baseR * 0.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawNebula(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, bass: number, mid: number, total: number) {
  let c1 = 'rgba(0,243,255,0.03)';
  let c2 = 'rgba(168,85,247,0.03)';
  if (hyperMode.value) {
    c1 = 'rgba(255,200,0,0.03)';
    c2 = 'rgba(255,100,0,0.02)';
  } else {
    if (bass > 0.3) c1 = 'rgba(0,243,255,0.05)';
    if (mid > 0.2) c2 = 'rgba(168,85,247,0.05)';
    if (total > 0.4) c1 = 'rgba(255,100,100,0.04)';
  }

  const nebulas = [
    { x: c.width * 0.2, y: c.height * 0.3, r: 200, color: c1 },
    { x: c.width * 0.8, y: c.height * 0.6, r: 250, color: c2 },
    { x: c.width * 0.5, y: c.height * 0.8, r: 180, color: c1 }
  ];
  for (const n of nebulas) {
    const g = ctx.createRadialGradient(n.x, n.y + nebulaOffset * 0.1, 0, n.x, n.y + nebulaOffset * 0.1, n.r);
    g.addColorStop(0, n.color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y + nebulaOffset * 0.1, n.r, 0, Math.PI * 2); ctx.fill();
  }
}

function drawStars(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement) {
  for (const star of stars) {
    const alpha = star.brightness * (0.5 + currentBass * 0.5);
    const size = star.size * (1 + currentBass * 0.3);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath(); ctx.arc(star.x, star.y, size, 0, Math.PI * 2); ctx.fill();
    if (star.z > 2.5) {
      ctx.fillStyle = `rgba(0,243,255,${alpha * 0.6})`;
      ctx.beginPath(); ctx.arc(star.x, star.y, size * 0.6, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawMeteors(ctx: CanvasRenderingContext2D) {
  for (const m of meteors) {
    const alpha = m.life;
    const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 5, m.y - m.vy * 5);
    grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
    grad.addColorStop(1, `rgba(255,255,255,0)`);
    ctx.strokeStyle = grad; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx * m.len * 0.3, m.y - m.vy * m.len * 0.3); ctx.stroke();
  }
}

function drawBeatRing(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement) {
  if (currentBass < 0.05) return;
  const cx = hajimiX;
  const cy = hajimiY;
  const radius = H_R + 30 + currentBass * 40;
  const alpha = currentBass * 0.3;
  ctx.strokeStyle = `rgba(0,243,255,${alpha})`;
  ctx.lineWidth = 2 + currentBass * 3;
  ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = `rgba(0,243,255,${alpha * 0.5})`;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, radius + 10, 0, Math.PI * 2); ctx.stroke();
}

function drawAudioLine(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, bass: number, total: number) {
  const startX = c.width * 0.72;
  const endX = c.width * 0.96;
  const baseY = c.height - 36;
  const width = endX - startX;

  ctx.strokeStyle = 'rgba(0,243,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(startX, baseY); ctx.lineTo(endX, baseY); ctx.stroke();

  const intensity = Math.max(bass, total * 0.5);
  const jumpY = baseY - intensity * 32;
  const alpha = 0.5 + intensity * 0.5;
  const color = intensity > 0.4 ? '#ff6b35' : intensity > 0.2 ? '#a855f7' : '#00f3ff';

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.shadowBlur = 6 + intensity * 12;
  ctx.shadowColor = color;

  ctx.beginPath();
  ctx.moveTo(startX, baseY);
  ctx.lineTo(startX + width * 0.3, baseY - intensity * 8);
  ctx.lineTo(startX + width * 0.5, jumpY);
  ctx.lineTo(startX + width * 0.7, baseY - intensity * 5);
  ctx.lineTo(endX, baseY);
  ctx.stroke();

  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.beginPath(); ctx.arc(startX + width * 0.5, jumpY, 2 + intensity * 3, 0, Math.PI * 2); ctx.fill();

  ctx.restore();

  ctx.fillStyle = 'rgba(0,243,255,0.4)';
  ctx.font = '9px monospace';
  ctx.fillText('◆ AUDIO', startX, baseY + 12);
}

// ============ 核心重构：全新 Q 萌不倒翁画风 ============

function drawHajimi(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save(); 
  ctx.translate(cx, cy);

  if (hyperMode.value) ctx.translate((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
  if (hajimiDrumFlash > 0) ctx.translate((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);

  const beatScale = 1 + currentBass * 0.05;
  const s = 0.58 * beatScale;
  ctx.scale(s, s);

  const bodyGlow = ctx.createRadialGradient(0, 30, 5, 0, 30, 70);
  bodyGlow.addColorStop(0, hyperMode.value ? 'rgba(255,215,0,0.25)' : 'rgba(0,243,255,0.18)');
  bodyGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bodyGlow; ctx.beginPath(); ctx.arc(0, 30, 70, 0, Math.PI * 2); ctx.fill();

  ctx.save(); ctx.strokeStyle = '#e0f5ff'; ctx.lineWidth = 14; ctx.lineCap = 'round';
  const ts = Math.sin(hf * 0.5) * 14;
  ctx.beginPath(); ctx.moveTo(40, 45);
  ctx.bezierCurveTo(70 + ts, 35, 90 - ts, -5, 80 + ts, -35);
  ctx.stroke(); ctx.restore();

  ctx.fillStyle = '#e0f5ff';
  ctx.beginPath();
  ctx.arc(0, 30, 55, 0, Math.PI, false);
  ctx.lineTo(-55, -5);
  ctx.quadraticCurveTo(0, -15, 55, -5);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,243,255,0.35)'; ctx.lineWidth = 3; ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(0, 32, 36, 26, 0, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = '#ff4a8d'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-42, 2); ctx.quadraticCurveTo(0, 15, 42, 2); ctx.stroke();

  const noteBounce = Math.sin(hf * 1.5) * 3;
  ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(0, 20 + noteBounce, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a1a2e'; ctx.beginPath(); ctx.arc(0, 23 + noteBounce, 3, 0, Math.PI * 2); ctx.fill();

  const hg = ctx.createLinearGradient(0, -70, 0, 10); hg.addColorStop(0, '#fff'); hg.addColorStop(1, '#e0f5ff');
  ctx.fillStyle = hg; ctx.strokeStyle = '#d1eeff'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(0, -25, 85, 70, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 12;
  ctx.beginPath(); ctx.arc(0, -25, 100, 0, Math.PI * 2); ctx.stroke();

  const headphoneGlow = 0.4 + currentBass * 0.6;
  const barH = 4 + currentBass * 24;
  const alpha = hyperMode.value ? 0.9 : 0.5 + currentBass * 0.5;
  const col = hyperMode.value ? '255,215,0' : '0,243,255';

  ctx.fillStyle = `rgba(0,243,255,${headphoneGlow * 0.3})`;
  ctx.strokeStyle = hyperMode.value ? '#ffd700' : '#00f3ff'; ctx.lineWidth = 3;

  ctx.beginPath(); ctx.ellipse(-95, -25, 18, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = `rgba(${col},${alpha})`; ctx.fillRect(-108, -25 - barH / 2, 3, barH);

  ctx.fillStyle = `rgba(0,243,255,${headphoneGlow * 0.3})`;
  ctx.beginPath(); ctx.ellipse(95, -25, 18, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = `rgba(${col},${alpha})`; ctx.fillRect(105, -25 - barH / 2, 3, barH);

  ctx.strokeStyle = hyperMode.value ? '#ffd700' : '#00f3ff'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(0, -25, 95, -Math.PI * 0.8, -Math.PI * 0.2); ctx.stroke();

  const et = Math.sin(hf * 0.3) * 4; ctx.save(); ctx.translate(et, 0);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#d1eeff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-55, -75); ctx.lineTo(-80, -135); ctx.lineTo(-20, -105); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,183,214,0.8)'; ctx.beginPath(); ctx.moveTo(-53, -80); ctx.lineTo(-70, -120); ctx.lineTo(-25, -103); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(55, -75); ctx.lineTo(80, -135); ctx.lineTo(20, -105); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,183,214,0.8)'; ctx.beginPath(); ctx.moveTo(53, -80); ctx.lineTo(70, -120); ctx.lineTo(25, -103); ctx.closePath(); ctx.fill();
  ctx.restore();

  ctx.fillStyle = 'rgba(255,107,180,0.5)';
  ctx.beginPath(); ctx.ellipse(-50, -12, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(50, -12, 14, 10, 0, 0, Math.PI * 2); ctx.fill();

  const eyeGlow = 0.7 + currentBass * 0.3; const eb = Math.sin(hf * 1.2) * 2;
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath(); ctx.ellipse(-32, -28 + eb, 18, 24, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(32, -28 + eb, 18, 24, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `rgba(0,243,255,${eyeGlow})`;
  ctx.beginPath(); ctx.ellipse(-30, -26 + eb, 12, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(34, -26 + eb, 12, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-24, -34 + eb, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(40, -34 + eb, 6, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(-6, -3, 6, 0.1, Math.PI - 0.1); ctx.stroke();
  ctx.beginPath(); ctx.arc(6, -3, 6, 0.1, Math.PI - 0.1); ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-42, 15, 10, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(42, 15, 10, 0, Math.PI * 2); ctx.fill();

  let rightArmAngle = -0.2 + Math.sin(hf * 0.4) * 0.15;
  if (swordAnim > 0) {
    const progress = swordAnim / 0.15;
    rightArmAngle = swordAngle + (progress * 0.8);
  }

  ctx.save(); 
  ctx.translate(42, 10); 
  ctx.rotate(rightArmAngle);

  if (!hyperMode.value) {
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, -55); ctx.stroke();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const batonGlow = ctx.createRadialGradient(0, -57, 0, 0, -57, 18);
    batonGlow.addColorStop(0, '#00f3ff'); batonGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = batonGlow; ctx.beginPath(); ctx.arc(0, -57, 18, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, -57, 5 + Math.sin(hf * 2.5)*1.5, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  } else {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = '#1e1e38'; ctx.fillRect(-2, -80, 5, 80);
    ctx.fillStyle = '#ffd700'; ctx.fillRect(-4, -85, 9, 8);

    ctx.fillStyle = '#ff005d';
    ctx.beginPath();
    ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.lineTo(26, -35); ctx.lineTo(0, -18); ctx.lineTo(-26, -35);
    ctx.closePath(); ctx.fill();

    ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 1.2;
    for (let l = -6; l <= 6; l += 4) {
      ctx.beginPath(); ctx.moveTo(l, -5); ctx.lineTo(l * 0.4, -78); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();

  ctx.restore();
}

// ============ 主循环 ============

function loop() {
  const n = performance.now();
  const dt = Math.min((n - lastTime) / 1000, 0.05);
  lastTime = n;
  update(dt);
  draw();
  animId = requestAnimationFrame(loop);
}

function claimCores() {
  const amount = earnedCores.value;
  if (amount <= 0 || coresClaimed.value) return;

  coresClaimed.value = true;
  emit('update:stats', { cores: amount });
  statusText.value = `已领取 ${amount} CORE`;
}

function restart() {
  score.value = 0; combo.value = 0; comboMultiplier.value = 1.0;
  energy.value = 0; lives.value = 3; shieldCount.value = 0;
  orbs.length = 0; particles.length = 0; slashes.length = 0; items.length = 0;
  meteors.length = 0;
  drumWaves.length = 0; bossBullets.length = 0;
  boss.alive = false; bossAlive.value = false; lastBossPhase = 0;
  gameOver.value = false;
  hf = 0; hajimiFloat = 0;
  beatHistory = []; strongBeatCount = 0; lastBeatTime = 0; lastSpawnTime = 0;
  swordAnim = 0; currentBass = 0; currentMid = 0; currentTotal = 0;
  itemSpawnTimer = 0; nebulaOffset = 0;
  S_R = 120;
  recentBassHistory = [];
  recentMidHistory = [];
  prevBass = 0; prevMid = 0; prevTotal = 0;
  hitStopTimer = 0;
  aoeCount = 0;
  hyperMode.value = false;
  hyperCountdown.value = 0;
  hyperTimer = 0;
  lastDrumTime = 0;
  hajimiDrumFlash = 0;
  coresClaimed.value = false;
  // 随机刷新系统重置
  spawnTimer = 0;
  spawnInterval = 1.5;
  audioIntensity = 0;
  audioIntensitySmooth = 0;
  waveCount = 0;
  stableAudioTimer = 0;
  initStars();
  startCapture();
}

// ============ 生命周期 ============

const resizeHandler = () => {
  const c = gameCanvas.value;
  if (!c) return;
  const p = c.parentElement!;
  // 限制 Canvas 像素上限，防止 4K 下绘制开销爆炸
  const maxW = 2560, maxH = 1440;
  const scaleX = p.clientWidth > maxW ? maxW / p.clientWidth : 1;
  const scaleY = p.clientHeight > maxH ? maxH / p.clientHeight : 1;
  const ratio = Math.min(scaleX, scaleY, 1);
  c.width = Math.floor(p.clientWidth * ratio);
  c.height = Math.floor(p.clientHeight * ratio);
  hajimiX = c.width / 2;
  hajimiY = c.height / 2;
};

onMounted(() => {
  window.dispatchEvent(new CustomEvent('hajimi:audio-disable'));
  resizeHandler();
  window.addEventListener('resize', resizeHandler);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('mousemove', onMouseMove);
  lastTime = performance.now();
  loop();
});

onUnmounted(async () => {
  cancelAnimationFrame(animId);
  window.removeEventListener('resize', resizeHandler);
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('mousemove', onMouseMove);
  await stopCapture().catch(() => {});
  orbs.length = 0;
  particles.length = 0;
  slashes.length = 0;
  items.length = 0;
  stars.length = 0;
  meteors.length = 0;
  drumWaves.length = 0;
  bossBullets.length = 0;
  recentBassHistory.length = 0;
  recentMidHistory.length = 0;
  beatHistory.length = 0;
  // 清理随机刷新系统变量
  spawnTimer = 0;
  audioIntensity = 0;
  audioIntensitySmooth = 0;
  waveCount = 0;
  stableAudioTimer = 0;
});
</script>