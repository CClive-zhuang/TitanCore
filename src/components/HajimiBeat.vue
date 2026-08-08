// 文件名: src/components/HajimiBeat.vue
<template>
  <div class="h-full w-full bg-[#020205] relative overflow-hidden select-none font-mono">
    <!-- 动态背景：星空粒子 -->
    <canvas ref="bgCanvas" class="absolute inset-0 w-full h-full pointer-events-none" />

    <!-- 顶部栏 -->
    <div class="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-4 pointer-events-none">
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#00f3ff] to-[#a855f7] flex items-center justify-center shadow-[0_0_15px_rgba(0,243,255,0.4)]">
          <span class="text-white text-lg font-black">H</span>
        </div>
        <div>
          <div class="text-[#00f3ff] font-black text-xl tracking-wider" style="text-shadow:0 0 10px rgba(0,243,255,0.5)">
            HAJIMI ARCADE
          </div>
          <div class="text-gray-500 text-sm">内置游戏中心</div>
        </div>
      </div>
      <div class="flex items-center gap-6 pointer-events-auto">
        <div class="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-4 py-2">
          <span class="text-yellow-400 text-base">✦</span>
          <span class="text-white text-base font-bold">{{ player.scrap }}</span>
          <span class="text-gray-500 text-sm">星尘</span>
        </div>
        <div class="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-4 py-2">
          <span class="text-purple-400 text-base">◆</span>
          <span class="text-white text-base font-bold">{{ player.cores }}</span>
          <span class="text-gray-500 text-sm">核心</span>
        </div>
        <div class="text-gray-500 text-sm">
          总时长 {{ Math.floor(player.totalPlayTime / 60) }}h {{ player.totalPlayTime % 60 }}m
        </div>
        <button 
          @click="showRedeemModal = true"
          class="flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-lg px-4 py-2 transition-all hover:scale-105"
        >
          <span class="text-yellow-400 text-base">💎</span>
          <span class="text-yellow-300 text-base font-bold">兑换次数</span>
        </button>
      </div>
    </div>

    <!-- 游戏网格 -->
    <div class="absolute inset-0 flex items-start justify-center z-10 overflow-y-auto pt-24 pb-20">
      <div class="grid grid-cols-2 gap-6 max-w-4xl w-full px-8">
        <div
          v-for="game in games"
          :key="game.id"
          :class="games.length % 2 === 1 && game.id === games[games.length - 1].id ? 'col-span-2 max-w-md mx-auto w-full' : ''"
          class="group relative bg-[#0a0a12]/80 border border-white/10 rounded-2xl p-6 hover:border-[#00f3ff]/50 hover:bg-[#00f3ff]/5 transition-all duration-300 hover:scale-[1.02] overflow-hidden"
        >
          <!-- 动态几何封面 -->
          <div class="relative w-full h-40 mb-4 rounded-xl overflow-hidden bg-black/40">
            <canvas
              :ref="el => { if (el) gameCanvases[game.id] = el }"
              class="absolute inset-0 w-full h-full"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-[#00f3ff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <!-- 游戏信息 -->
          <div class="flex items-start justify-between mb-3">
            <div>
              <h3 class="text-white font-black text-xl mb-1 group-hover:text-[#00f3ff] transition-colors">
                {{ game.name }}
              </h3>
              <p class="text-gray-400 text-sm leading-relaxed">{{ game.desc }}</p>
            </div>
            <div class="flex flex-col items-end gap-1">
              <div v-if="game.lastPlayed" class="text-gray-600 text-xs">
                上次 {{ formatTime(game.lastPlayed) }}
              </div>
            </div>
          </div>

          <!-- 堆叠未来：继续/新游戏 -->
          <div v-if="game.id === 'stack'" class="flex gap-2">
            <button 
              v-if="hasStackSave"
              @click.stop="launchGame('stack', true)"
              class="flex-1 py-2.5 bg-[#00f3ff]/20 hover:bg-[#00f3ff]/30 border border-[#00f3ff]/40 rounded-lg text-[#00f3ff] text-sm font-bold transition-all"
            >
              ▶ 继续游戏
            </button>
            <button 
              @click.stop="launchGame('stack', false)"
              class="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-white text-sm font-bold transition-all"
              :class="!hasStackSave ? 'w-full' : ''"
            >
              {{ hasStackSave ? '新游戏' : '▶ 开始游戏' }}
            </button>
          </div>

          <!-- 音律哈吉米 -->
          <div v-else-if="game.id === 'rhythm'">
            <button 
              @click.stop="launchGame(game.id)"
              class="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-white text-sm font-bold transition-all"
            >
              ▶ 开始游戏
            </button>
          </div>

          <!-- 未完工游戏：禁用 -->
          <div v-else>
            <button 
              disabled
              class="w-full py-2.5 bg-white/3 border border-white/5 rounded-lg text-gray-600 text-sm font-bold cursor-not-allowed"
            >
              🚧 开发中
            </button>
          </div>

          <!-- 悬停边框光效 -->
          <div class="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
               style="box-shadow: inset 0 0 30px rgba(0,243,255,0.05)" />
        </div>
      </div>
    </div>

    <!-- 底部设置 -->
    <div class="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-4 pointer-events-auto">
      <div class="text-gray-600 text-sm">
        按 <span class="text-[#00f3ff] font-bold">ESC</span> 在游戏中返回大厅
      </div>
      <button @click="showSettings = true" class="flex items-center gap-2 text-gray-400 hover:text-white text-base transition-colors">
        <span>⚙</span> 设置
      </button>
    </div>

    <!-- 设置弹窗 -->
    <div v-if="showSettings" class="absolute inset-0 z-30 bg-black/80 backdrop-blur flex items-center justify-center" @click="showSettings = false">
      <div class="bg-[#0a0a12] border border-white/10 rounded-2xl p-8 max-w-md w-full" @click.stop>
        <h2 class="text-[#00f3ff] font-black text-xl mb-6">系统设置</h2>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-gray-300 text-base">主音量</span>
            <input type="range" v-model="settings.volume" min="0" max="100" class="w-32 accent-[#00f3ff]" />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-300 text-base">全屏启动游戏</span>
            <button @click="settings.fullscreen = !settings.fullscreen" class="w-12 h-6 rounded-full transition-colors relative"
                    :class="settings.fullscreen ? 'bg-[#00f3ff]' : 'bg-gray-700'">
              <div class="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                   :class="settings.fullscreen ? 'left-7' : 'left-1'" />
            </button>
          </div>
          <button @click="clearStackSave" class="w-full py-2 border border-yellow-500/30 text-yellow-400 rounded-lg hover:bg-yellow-500/10 text-sm transition-all">
            清除堆叠未来存档
          </button>
          <button @click="clearSave" class="w-full py-2 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 text-sm transition-all">
            清除所有存档
          </button>
        </div>
        <button @click="showSettings = false" class="mt-6 w-full py-3 bg-[#00f3ff]/20 text-[#00f3ff] rounded-xl hover:bg-[#00f3ff]/30 transition-all">
          关闭
        </button>
      </div>
    </div>

    <!-- CORE 兑换次数弹窗 -->
    <div v-if="showRedeemModal" class="absolute inset-0 z-30 bg-black/80 backdrop-blur flex items-center justify-center" @click="showRedeemModal = false">
      <div class="bg-[#0a0a12] border border-yellow-500/30 rounded-2xl p-8 max-w-md w-full" @click.stop>
        <h2 class="text-yellow-400 font-black text-xl mb-2 flex items-center gap-2">
          <span>💎</span> CORE 兑换中心
        </h2>
        <div class="text-gray-400 text-sm mb-6">
          使用游戏获得的 CORE 兑换额外下载次数<br>
          <span class="text-yellow-500">1 CORE = 1 次额外额度</span>
        </div>

        <div class="flex items-center justify-between mb-6 bg-black/40 rounded-xl p-4 border border-white/5">
          <span class="text-gray-400 text-sm">当前持有</span>
          <span class="text-yellow-400 font-bold text-xl font-mono">{{ player.cores }} CORE</span>
        </div>

        <div class="space-y-3 mb-6">
          <div 
            v-for="n in [1, 2, 3]" 
            :key="n"
            @click="redeemAmount = n"
            class="flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer"
            :class="redeemAmount === n 
              ? 'border-yellow-500/50 bg-yellow-500/10' 
              : 'border-white/10 hover:border-white/20'"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold">{{ n }}</div>
              <span class="text-white text-sm">兑换 {{ n }} 次额度</span>
            </div>
            <span class="text-yellow-400 font-mono text-sm">{{ n }} CORE</span>
          </div>
        </div>

        <div v-if="redeemError" class="text-red-400 text-sm mb-4 text-center font-mono">
          {{ redeemError }}
        </div>
        <div v-if="redeemSuccess" class="text-green-400 text-sm mb-4 text-center font-mono animate-pulse">
          ✓ 兑换成功！额度已到账
        </div>

        <div class="flex gap-3">
          <button 
            @click="showRedeemModal = false"
            class="flex-1 py-3 border border-white/20 text-gray-400 rounded-xl hover:text-white hover:border-white/40 transition-all text-sm font-bold"
          >
            取消
          </button>
          <button 
            @click="doRedeem"
            :disabled="redeeming || player.cores < redeemAmount || redeemAmount <= 0"
            class="flex-1 py-3 bg-yellow-500/20 hover:bg-yellow-500/30 disabled:opacity-30 disabled:cursor-not-allowed border border-yellow-500/40 text-yellow-300 rounded-xl transition-all text-sm font-bold"
          >
            {{ redeeming ? '兑换中...' : '确认兑换' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 加载遮罩 -->
    <div v-if="loadingGame" class="absolute inset-0 z-40 bg-black/90 flex flex-col items-center justify-center">
      <div class="w-16 h-16 border-4 border-[#00f3ff]/20 border-t-[#00f3ff] rounded-full animate-spin mb-4" />
      <div class="text-[#00f3ff] font-bold text-lg animate-pulse">正在初始化...</div>
    </div>

    <!-- 游戏容器 -->
    <div v-if="currentGame" class="absolute inset-0 z-50 bg-black">
      <component
        :is="gameComponents[currentGame]"
        :continue-game="shouldContinue"
        @exit="exitGame"
        @update:stats="updateGameStats"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, markRaw } from 'vue';
import { usePlayerStore } from '../stores/playerStore';
import RhythmHajimi from './games/RhythmHajimi.vue';
import StackFuture from './games/StackFuture.vue';

const player = usePlayerStore();
const currentGame = ref<string | null>(null);
const loadingGame = ref(false);
const showSettings = ref(false);
const gameCanvases = ref<Record<string, HTMLCanvasElement>>({});
const bgCanvas = ref<HTMLCanvasElement>();
const hasStackSave = ref(false);
const shouldContinue = ref(false);

const settings = ref({
  volume: 80,
  fullscreen: false
});

const showRedeemModal = ref(false);
const redeemAmount = ref(1);
const redeeming = ref(false);
const redeemSuccess = ref(false);
const redeemError = ref('');

const games = ref([
  {
    id: 'rhythm',
    name: '音律哈吉米',
    desc: '捕获桌面音频，踩节拍斩击，BOSS 超频打鼓模式',
    lastPlayed: localStorage.getItem('hajimi_last_rhythm') || null
  },
  {
    id: 'stack',
    name: '堆叠未来',
    desc: '异星卡牌堆叠，合成装备，抵御虚空收割者',
    lastPlayed: localStorage.getItem('hajimi_last_stack') || null
  },
  {
    id: 'beatmap',
    name: '节拍图谱',
    desc: '导入 MP3，预计算 BPM，下落式音游',
    lastPlayed: null
  },
  {
    id: 'idle',
    name: '星尘放置',
    desc: '离线收益，收集物资，摸鱼首选',
    lastPlayed: null
  }
]);

const gameComponents: Record<string, any> = {
  rhythm: markRaw(RhythmHajimi),
  stack: markRaw(StackFuture)
};

function drawGamePreview(gameId: string, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width = canvas.clientWidth * 2;
  const h = canvas.height = canvas.clientHeight * 2;
  ctx.scale(2, 2);
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;

  let animId: number;
  let time = 0;

  function draw() {
    time += 0.016;
    ctx.clearRect(0, 0, cw, ch);

    if (gameId === 'rhythm') {
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < cw; x += 4) {
        const y = ch / 2 + Math.sin(x * 0.03 + time * 4) * 20 + Math.sin(x * 0.05 + time * 2) * 10;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = '#00f3ff';
      ctx.beginPath(); ctx.arc(cw / 2, ch / 2, 8 + Math.sin(time * 3) * 3, 0, Math.PI * 2); ctx.fill();
    } else if (gameId === 'stack') {
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const x = 30 + col * 35 + (row % 2) * 17;
          const y = 25 + row * 30;
          const s = 15;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i - Math.PI / 2;
            const px = x + Math.cos(a) * s;
            const py = y + Math.sin(a) * s;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath(); ctx.stroke();
        }
      }
    } else if (gameId === 'beatmap') {
      for (let i = 0; i < 4; i++) {
        const x = 20 + i * 30;
        const y = (time * 60 + i * 40) % (ch + 20) - 10;
        ctx.fillStyle = ['#00f3ff', '#ff6b35', '#a855f7', '#ffd700'][i];
        ctx.fillRect(x, y, 20, 8);
      }
      ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, ch - 20); ctx.lineTo(cw, ch - 20); ctx.stroke();
    } else if (gameId === 'idle') {
      const cx = cw / 2, cy = ch / 2;
      ctx.fillStyle = '#00f3ff';
      ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,243,255,0.3)';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, 30 + i * 10, 8 + i * 3, time + i, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let i = 0; i < 5; i++) {
        const a = time * 2 + i * 1.2;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 40, cy + Math.sin(a) * 15, 2, 0, Math.PI * 2); ctx.fill();
      }
    }

    animId = requestAnimationFrame(draw);
  }

  draw();
  return () => cancelAnimationFrame(animId);
}

const cleanupFns: (() => void)[] = [];

onMounted(() => {
  hasStackSave.value = !!localStorage.getItem('stackfuture_save');
  nextTick(() => {
    games.value.forEach(g => {
      const canvas = gameCanvases.value[g.id];
      if (canvas) cleanupFns.push(drawGamePreview(g.id, canvas));
    });

    if (bgCanvas.value) {
      const ctx = bgCanvas.value.getContext('2d')!;
      const w = bgCanvas.value.width = bgCanvas.value.clientWidth * 2;
      const h = bgCanvas.value.height = bgCanvas.value.clientHeight * 2;
      ctx.scale(2, 2);
      const stars = Array.from({ length: 100 }, () => ({
        x: Math.random() * w / 2, y: Math.random() * h / 2,
        size: Math.random() * 2, speed: Math.random() * 0.5
      }));
      let bgAnim: number;
      function drawBg() {
        ctx.clearRect(0, 0, w / 2, h / 2);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        stars.forEach(s => {
          s.y += s.speed;
          if (s.y > h / 2) s.y = 0;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
        });
        bgAnim = requestAnimationFrame(drawBg);
      }
      drawBg();
      cleanupFns.push(() => cancelAnimationFrame(bgAnim));
    }
  });
});

onUnmounted(() => {
  cleanupFns.forEach(fn => fn());
});

function launchGame(id: string, continueGame = false) {
  if (id === 'stack' && !continueGame) {
    localStorage.removeItem('stackfuture_save');
  }
  loadingGame.value = true;
  shouldContinue.value = continueGame;
  setTimeout(() => {
    currentGame.value = id;
    loadingGame.value = false;
    localStorage.setItem(`hajimi_last_${id}`, new Date().toISOString());
    games.value.find(g => g.id === id)!.lastPlayed = localStorage.getItem(`hajimi_last_${id}`);
    player.totalPlayTime += 1;
  }, 500);
}

function exitGame() {
  currentGame.value = null;
  hasStackSave.value = !!localStorage.getItem('stackfuture_save');
}

function updateGameStats(stats: { scrap?: number; cores?: number }) {
  if (stats.scrap) player.scrap += stats.scrap;
  if (stats.cores) player.cores += stats.cores;
}

function formatTime(iso: string | null) {
  if (!iso) return '未玩过';
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diff < 60) return `${diff}分钟前`;
  if (diff < 1440) return `${Math.floor(diff / 60)}小时前`;
  return `${Math.floor(diff / 1440)}天前`;
}

function clearSave() {
  if (confirm('确定清除所有游戏存档？')) {
    localStorage.clear();
    player.$reset();
    showSettings.value = false;
    hasStackSave.value = false;
  }
}

function clearStackSave() {
  if (confirm('确定清除堆叠未来的存档？')) {
    localStorage.removeItem('stackfuture_save');
    hasStackSave.value = false;
    showSettings.value = false;
  }
}

async function doRedeem() {
  if (redeeming.value || player.cores < redeemAmount.value || redeemAmount.value <= 0) return;

  redeeming.value = true;
  redeemError.value = '';
  redeemSuccess.value = false;

  try {
    const score = redeemAmount.value * 10000;
    const res = await window.electron.invoke('sys:redeem-cores', score, redeemAmount.value);

    if (res?.success && res.data) {
      player.cores -= redeemAmount.value;
      redeemSuccess.value = true;
      setTimeout(() => { redeemSuccess.value = false; }, 3000);
    } else {
      redeemError.value = res?.error === 'QUOTA_EXHAUSTED' 
        ? '今日兑换次数已达上限 (3/3)' 
        : (res?.error || '兑换失败，请重试');
    }
  } catch (e: any) {
    redeemError.value = '网络错误，请检查连接';
    console.error('[HajimiBeat] 兑换失败:', e);
  } finally {
    redeeming.value = false;
  }
}
</script>