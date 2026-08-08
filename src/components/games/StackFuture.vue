<template>
  <div class="h-full w-full bg-[#020205] relative overflow-hidden select-none cursor-grab active:cursor-grabbing"
       @mousedown="handleMouseDown"
       @mousemove="handleMouseMove"
       @mouseup="handleMouseUp"
       @contextmenu.prevent>

    <canvas ref="gameCanvas" class="absolute inset-0 w-full h-full" />

    <!-- HUD -->
    <div class="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 pointer-events-none">
      <div class="flex items-center gap-4">
        <div class="text-[#00f3ff] font-black text-xl tracking-wider font-mono"
             style="text-shadow:0 0 10px rgba(0,243,255,0.5)">
          堆叠未来
        </div>
        <div class="text-white font-mono text-base">
          第 <span class="text-[#00f3ff] font-bold text-lg">{{ day }}</span> 天
        </div>
        <div class="text-white font-mono text-base">
          时间: <span class="text-yellow-400 font-bold text-lg">{{ timeOfDay }}</span>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <div class="text-white font-mono text-base">
          队员: <span class="text-green-400 font-bold text-lg">{{ population }}</span>
        </div>
        <div class="text-white font-mono text-base">
          星尘: <span class="text-purple-400 font-bold text-lg">{{ stardust }}</span>
        </div>
        <div class="text-white font-mono text-base">
          星币: <span class="text-yellow-400 font-bold text-lg">{{ starCoins }}</span>
        </div>
        <div class="text-white font-mono text-base">
          CORE: <span class="text-yellow-400 font-bold text-lg">{{ cores }}</span>
        </div>
      </div>
    </div>

    <!-- 底部信息栏 -->
    <div class="absolute bottom-0 left-0 right-0 z-20 bg-black/60 backdrop-blur border-t border-white/10 px-4 py-2 flex items-center justify-between pointer-events-auto">
      <div class="flex items-center gap-4 min-w-0">
        <button @click="showRecipeModal = true"
          class="px-2 py-1 bg-[#00f3ff]/10 hover:bg-[#00f3ff]/20 border border-[#00f3ff]/30 rounded text-[#00f3ff] text-base transition-all font-mono shrink-0">
          📋 配方
        </button>
        <span class="text-gray-400 text-base font-mono truncate">{{ statusText }}</span>
        <span v-if="selectedCard" class="text-[#00f3ff] text-base font-mono shrink-0">
          {{ selectedCard.name }} | ♥{{ selectedCard.hp }} ⚔{{ selectedCard.atk }}
          <span v-if="selectedCard.maxHunger > 0" class="text-yellow-400 ml-2">🍞{{ selectedCard.hunger }}</span>
          <span v-if="selectedCard.durability !== undefined" class="text-green-400 ml-2">🔧{{ selectedCard.durability }}</span>
        </span>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button @click="togglePause"
          class="px-3 py-1.5 bg-[#00f3ff]/20 hover:bg-[#00f3ff]/30 border border-[#00f3ff]/40 rounded text-[#00f3ff] text-base transition-all font-mono">
          {{ isPaused ? '▶ 继续' : '⏸ 暂停' }}
        </button>
        <button @click="exitToLobby"
          class="px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700/50 border border-white/20 rounded text-white text-base transition-all font-mono">
          ⏏ 返回大厅
        </button>
      </div>
    </div>

    <!-- 交互提示 -->
    <div v-if="craftingHint" class="absolute z-30 pointer-events-none"
         :style="{ left: craftingHint.x + 'px', top: craftingHint.y + 'px' }">
      <div class="bg-black/90 border rounded-lg px-3 py-1.5 text-base font-mono whitespace-nowrap shadow-lg"
           :class="craftingHint.valid ? 'border-[#00f3ff]/60 text-[#00f3ff]' : 'border-red-500/60 text-red-400'">
        {{ craftingHint.text }}
      </div>
    </div>

    <!-- 配方弹窗 -->
    <div v-if="showRecipeModal" class="absolute inset-0 z-40 bg-black/90 flex flex-col items-center justify-center p-4" @click="showRecipeModal = false">
      <div class="bg-[#0a0a12] border border-white/10 rounded-xl p-4 md:p-6 w-full max-w-xl max-h-[80vh] overflow-y-auto" @click.stop>
        <div class="text-[#00f3ff] font-bold mb-3 text-lg">📋 合成配方</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-sm font-mono text-gray-300">
          <div><span class="text-yellow-400">铁×2</span> → 2级铁锭</div>
          <div><span class="text-yellow-400">铜×2</span> → 2级铜锭</div>
          <div><span class="text-yellow-400">1级星尘×2</span> → 2级星尘团</div>
          <div><span class="text-yellow-400">1级星尘+铜</span> → 芯片</div>
          <div><span class="text-yellow-400">芯片+铁</span> → 电路板</div>
          <div><span class="text-yellow-400">2级铁锭+铁</span> → 铁棍</div>
          <div><span class="text-yellow-400">2级铁锭×2</span> → 护甲</div>
          <div><span class="text-yellow-400">2级铁锭+芯片</span> → 宿舍</div>
          <div><span class="text-yellow-400">电路板+2级铁锭×2</span> → 工程机器人</div>
          <div><span class="text-yellow-400">电路板+2级铜锭</span> → 战斗机器人</div>
          <div><span class="text-yellow-400">2级铜锭+芯片</span> → 补兽器</div>
          <div><span class="text-yellow-400">补兽器+2级铁锭</span> → 养殖场</div>
          <div><span class="text-yellow-400">电路板+2级铁锭</span> → 生产建筑</div>
          <div><span class="text-yellow-400">2级铁锭+2级铜锭</span> → 4级合金</div>
          <div><span class="text-yellow-400">工程机器人+4级合金+芯片</span> → 战斗机甲</div>
          <div><span class="text-yellow-400">2级铁锭+2级星尘团+电路板</span> → 镭射枪</div>
        </div>
        <div class="mt-3 text-gray-500 text-xs border-t border-white/10 pt-2">
          ⛏ 队员/机器人放矿上自动采集 | 🪤 补兽器放野猪上捕获 | 💎 队员放CORE宝箱上开采 | 空格键分类整理 | 每3天商人来访
        </div>
        <button @click="showRecipeModal = false" class="mt-4 w-full py-2 bg-[#00f3ff]/20 text-[#00f3ff] rounded hover:bg-[#00f3ff]/30 transition-all">
          关闭
        </button>
      </div>
    </div>

    <!-- 弃卡弹窗 -->
    <div v-if="showDiscardModal" class="absolute inset-0 z-40 bg-black/90 flex flex-col items-center justify-center p-4">
      <div class="text-4xl md:text-5xl font-black text-red-500 mb-4 md:mb-6 font-mono" style="text-shadow:0 0 20px rgba(239,68,68,0.5)">
        资源超载
      </div>
      <div class="text-white font-mono text-xl md:text-2xl mb-3">
        卡牌数量: <span class="text-red-400 font-bold">{{ cards.length }}</span> / 20
      </div>
      <div class="text-gray-400 font-mono text-base md:text-lg mb-6 md:mb-8">
        必须弃掉 <span class="text-red-400 font-bold">{{ cards.length - 20 }}</span> 张卡才能进入下一天
      </div>
      <div class="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-3 max-w-4xl mb-6 md:mb-8 max-h-[45vh] md:max-h-[50vh] overflow-y-auto p-2 md:p-4">
        <div v-for="card in cards" :key="card.id"
             @click="toggleDiscardSelection(card.id)"
             class="relative w-20 h-28 md:w-28 md:h-36 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-center text-sm md:text-base font-mono"
             :class="discardSelections.has(card.id) 
               ? 'border-red-500 bg-red-500/20 text-red-400' 
               : 'border-white/20 bg-black/40 text-white hover:border-white/40'">
          {{ card.name }}
          <div v-if="discardSelections.has(card.id)" class="absolute inset-0 flex items-center justify-center">
            <span class="text-red-500 text-2xl md:text-3xl font-black">✕</span>
          </div>
        </div>
      </div>
      <button @click="confirmDiscard"
        :disabled="discardSelections.size !== cards.length - 20"
        class="px-8 md:px-10 py-3 md:py-4 bg-red-500/20 hover:bg-red-500/40 disabled:opacity-30 disabled:cursor-not-allowed border-2 border-red-500/60 rounded-2xl text-red-300 text-lg md:text-xl font-bold font-mono transition-all">
        {{ discardSelections.size === cards.length - 20 ? '确认弃卡' : `还需选择 ${cards.length - 20 - discardSelections.size} 张` }}
      </button>
    </div>

    <!-- 商人弹窗 -->
    <div v-if="showMerchant" class="absolute inset-0 z-40 bg-black/90 flex flex-col items-center justify-center p-4">
      <div class="text-3xl md:text-4xl font-black text-yellow-400 mb-2 font-mono">🛸 星际商人（第{{ day }}天）</div>
      <div class="text-white font-mono text-base md:text-lg mb-4 md:mb-6">当前星尘币: <span class="text-yellow-400 font-bold text-xl md:text-2xl">{{ starCoins }}</span></div>
      
      <div class="flex flex-col md:flex-row gap-4 md:gap-6 w-full max-w-5xl h-[60vh]">
        <!-- 出售 -->
        <div class="flex-1 bg-[#0a0a12] border border-white/10 rounded-xl p-3 md:p-4 flex flex-col min-h-0">
          <div class="text-gray-400 text-sm md:text-base mb-2 md:mb-3 font-mono">💰 点击卡牌出售</div>
          <div class="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-2">
            <div v-for="card in cards" :key="card.id" 
                 @click="sellCard(card)"
                 class="p-2 border border-white/10 rounded text-center cursor-pointer hover:border-red-500/60 hover:bg-red-500/10 transition-all"
                 :class="getSellPrice(card) <= 0 ? 'opacity-30 pointer-events-none' : ''">
              <div class="text-white text-xs md:text-sm">{{ card.name }}</div>
              <div class="text-yellow-400 text-xs font-bold">{{ getSellPrice(card) }}币</div>
            </div>
          </div>
        </div>
        
        <!-- 购买 -->
        <div class="flex-1 bg-[#0a0a12] border border-white/10 rounded-xl p-3 md:p-4 flex flex-col min-h-0">
          <div class="text-gray-400 text-sm md:text-base mb-2 md:mb-3 font-mono">🛒 商人货物（点击购买）</div>
          <div class="flex-1 overflow-y-auto space-y-2">
            <div v-for="(item, idx) in merchantGoods" :key="idx"
                 @click="buyCard(item)"
                 class="flex items-center justify-between p-2 md:p-3 rounded-xl border transition-all cursor-pointer"
                 :class="starCoins < item.price ? 'border-white/5 opacity-40' : 'border-white/10 hover:border-[#00f3ff]/60 hover:bg-[#00f3ff]/10'">
              <span class="text-white text-sm md:text-base">{{ item.type }}</span>
              <span class="text-yellow-400 font-bold text-sm md:text-base">{{ item.price }}币</span>
            </div>
          </div>
        </div>
      </div>
      
      <button @click="closeMerchant" class="mt-4 md:mt-6 px-8 md:px-10 py-2 md:py-3 bg-[#00f3ff]/20 text-[#00f3ff] rounded-xl hover:bg-[#00f3ff]/30 transition-all text-base md:text-lg font-bold">
        关闭商人
      </button>
    </div>

    <!-- 时空门倒计时 -->
    <div v-if="portalCountdown > 0" class="absolute top-16 left-1/2 -translate-x-1/2 z-20">
      <div class="text-purple-400 font-mono text-base animate-pulse">
        ⚠ 时空门开启倒计时: {{ Math.ceil(portalCountdown) }}s
      </div>
    </div>

    <!-- 游戏结束 -->
    <div v-if="gameOver" class="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      <div class="text-5xl md:text-7xl font-black text-red-500 mb-4 font-mono" style="text-shadow:0 0 30px rgba(239,68,68,0.5)">
        {{ gameOverReason === 'boss_defeated' ? '胜利！' : '基地沦陷' }}
      </div>
      <div class="text-white font-mono text-base md:text-xl mb-2 max-w-lg text-center leading-relaxed">
        {{ gameOverText }}
      </div>
      <div v-if="gameOverReason === 'boss_defeated'" class="text-yellow-400 font-mono text-xl md:text-2xl font-bold mb-4">
        获得 CORE: <span class="text-2xl md:text-3xl">{{ earnedCores }}</span>
      </div>
      <div class="flex gap-4">
        <button @click="restart" class="px-8 md:px-10 py-2 md:py-3 bg-[#00f3ff] text-black font-black text-lg md:text-xl rounded-2xl hover:bg-white hover:scale-105 transition-all">
          重新开始
        </button>
        <button @click="exitToLobby" class="px-6 md:px-8 py-2 md:py-3 bg-gray-800 text-white font-bold text-lg md:text-xl rounded-2xl hover:bg-gray-700 hover:scale-105 transition-all">
          返回大厅
        </button>
      </div>
    </div>

    <!-- 开始提示 -->
    <div v-if="!hasStarted" class="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4 overflow-y-auto">
      <div class="text-4xl md:text-6xl font-black text-[#00f3ff] mb-4 font-mono" style="text-shadow:0 0 20px rgba(0,243,255,0.5)">
        堆叠未来
      </div>
      <div class="text-gray-400 mb-4 text-center leading-relaxed text-sm md:text-base max-w-lg">
        <p>拖拽卡牌堆叠合成，建立你的异星基地</p>
        <p>前5天安全发育，第6天起敌人入侵</p>
        <p>第30天：虚空收割者·噶比皮降临</p>
        <p class="mt-2 text-yellow-500/80">特遣队员HP=0会变成肉卡 | 饥饿归零会扣血</p>
      </div>
      <div class="bg-[#0a0a12]/80 border border-white/10 rounded-xl p-3 md:p-4 mb-4 w-full max-w-xl text-xs md:text-sm font-mono text-gray-300 max-h-60 md:max-h-80 overflow-y-auto">
        <div class="text-[#00f3ff] font-bold mb-2 text-base">合成配方（拖拽重叠自动合成）</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
          <div><span class="text-yellow-400">铁×2</span> → 2级铁锭</div>
          <div><span class="text-yellow-400">铜×2</span> → 2级铜锭</div>
          <div><span class="text-yellow-400">1级星尘×2</span> → 2级星尘团</div>
          <div><span class="text-yellow-400">1级星尘+铜</span> → 芯片</div>
          <div><span class="text-yellow-400">芯片+铁</span> → 电路板</div>
          <div><span class="text-yellow-400">2级铁锭+铁</span> → 铁棍</div>
          <div><span class="text-yellow-400">2级铁锭×2</span> → 护甲</div>
          <div><span class="text-yellow-400">2级铁锭+芯片</span> → 宿舍</div>
          <div><span class="text-yellow-400">电路板+2级铁锭×2</span> → 工程机器人</div>
          <div><span class="text-yellow-400">电路板+2级铜锭</span> → 战斗机器人</div>
          <div><span class="text-yellow-400">2级铜锭+芯片</span> → 补兽器</div>
          <div><span class="text-yellow-400">补兽器+2级铁锭</span> → 养殖场</div>
          <div><span class="text-yellow-400">电路板+2级铁锭</span> → 生产建筑</div>
          <div><span class="text-yellow-400">2级铁锭+2级铜锭</span> → 4级合金</div>
          <div><span class="text-yellow-400">工程机器人+4级合金+芯片</span> → 战斗机甲</div>
          <div><span class="text-yellow-400">2级铁锭+2级星尘团+电路板</span> → 镭射枪</div>
        </div>
        <div class="mt-3 text-gray-500 text-xs border-t border-white/10 pt-2">
          ⛏ 队员/机器人放矿上自动采集 | 🪤 补兽器放野猪上捕获 | 💎 队员放CORE宝箱上开采 | 空格键分类整理 | 每3天商人来访
        </div>
      </div>
      <button @click="startGame"
        class="px-8 md:px-10 py-3 md:py-4 bg-[#00f3ff]/20 hover:bg-[#00f3ff]/30 border border-[#00f3ff]/40 rounded-2xl text-[#00f3ff] text-base md:text-lg transition-all font-mono shadow-[0_0_20px_rgba(0,243,255,0.2)] hover:shadow-[0_0_30px_rgba(0,243,255,0.4)] hover:scale-105">
        ▶ 开始殖民
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';

const props = defineProps<{
  continueGame?: boolean;
}>();

const emit = defineEmits<{
  exit: [];
  'update:stats': [stats: { scrap?: number; cores?: number }];
}>();

// ============ 类型定义 ============

interface Card {
  id: string;
  type: string;
  name: string;
  tier: number;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  atk: number;
  hunger: number;
  maxHunger: number;
  isBaby?: boolean;
  babyDays?: number;
  isResourcePoint?: boolean;
  resourceType?: string;
  resourceStock?: number;
  craftProgress?: number;
  craftTarget?: string;
  craftTimer?: number;
  isEnemy?: boolean;
  isBuilding?: boolean;
  isUnit?: boolean;
  isFood?: boolean;
  isWeapon?: boolean;
  isArmor?: boolean;
  glowColor?: string;
  shake?: number;
  flash?: number;
  dying?: boolean;
  dyingTimer?: number;
  gatherTarget?: string;
  gatherTimer?: number;
  buildingTimer?: number;
  durability?: number;
  maxDurability?: number;
}

interface Warning {
  side: number;
  timer: number;
}

interface DelayedSpawn {
  type: string;
  x: number;
  y: number;
  timer: number;
  isBoss?: boolean;
}

interface MerchantItem {
  type: string;
  price: number;
}

// ============ 游戏状态 ============

const gameCanvas = ref<HTMLCanvasElement>();
const day = ref(1);
const dayTimer = ref(0);
const stardust = ref(0);
const cores = ref(0);
const starCoins = ref(0);
const population = ref(2);
const statusText = ref('拖拽卡牌进行合成');
const isPaused = ref(false);
const hasStarted = ref(false);
const gameOver = ref(false);
const gameOverReason = ref('');
const gameOverText = ref('');
const earnedCores = ref(0);
const selectedCard = ref<Card | null>(null);
const craftingHint = ref<{ x: number; y: number; text: string; valid: boolean } | null>(null);
const showDiscardModal = ref(false);
const showRecipeModal = ref(false);
const discardSelections = ref(new Set<string>());
const portalCountdown = ref(0);
const portalActive = ref(false);
const showMerchant = ref(false);
const merchantGoods = ref<MerchantItem[]>([]);
const warnings = ref<Warning[]>([]);
const delayedSpawns = ref<DelayedSpawn[]>([]);

const cards = ref<Card[]>([]);
let draggedCard: Card | null = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let dragGroup: Card[] = [];
let dragGroupOffsets: { id: string; dx: number; dy: number }[] = [];
let animId = 0;
let lastTime = 0;
let nextCardId = 1;
let audioCtx: AudioContext | null = null;

// ============ 常量 ============

const DAY_SECONDS = 90;
const CARD_W = 110;
const CARD_H = 140;
const MAX_CARDS = 20;
const HUNGER_DECAY_PER_20S = 3;
const RESOURCE_SPAWN_INTERVAL = 20;

const RECIPES: Record<string, { ingredients: string[]; time: number; result: string }> = {
  '2级铁锭': { ingredients: ['铁', '铁'], time: 3, result: '2级铁锭' },
  '2级铜锭': { ingredients: ['铜', '铜'], time: 3, result: '2级铜锭' },
  '2级星尘团': { ingredients: ['1级星尘', '1级星尘'], time: 3, result: '2级星尘团' },
  '芯片': { ingredients: ['1级星尘', '铜'], time: 3, result: '芯片' },
  '电路板': { ingredients: ['芯片', '铁'], time: 5, result: '电路板' },
  '铁棍': { ingredients: ['2级铁锭', '铁'], time: 5, result: '铁棍' },
  '镭射枪': { ingredients: ['2级铁锭', '2级星尘团', '电路板'], time: 10, result: '镭射枪' },
  '护甲': { ingredients: ['2级铁锭', '2级铁锭'], time: 5, result: '护甲' },
  '烤鱼': { ingredients: ['鱼', '鱼'], time: 3, result: '烤鱼' },
  '烤肉': { ingredients: ['肉', '肉'], time: 3, result: '烤肉' },
  '营养餐': { ingredients: ['浆果', '肉', '鱼'], time: 5, result: '营养餐' },
  '宿舍': { ingredients: ['2级铁锭', '芯片'], time: 10, result: '宿舍' },
  '工程机器人': { ingredients: ['电路板', '2级铁锭', '2级铁锭'], time: 15, result: '工程机器人' },
  '战斗机器人': { ingredients: ['电路板', '2级铜锭'], time: 10, result: '战斗机器人' },
  '补兽器': { ingredients: ['2级铜锭', '芯片'], time: 10, result: '补兽器' },
  '养殖场': { ingredients: ['补兽器', '2级铁锭'], time: 10, result: '养殖场' },
  '生产建筑': { ingredients: ['电路板', '2级铁锭'], time: 10, result: '生产建筑' },
  '4级合金': { ingredients: ['2级铁锭', '2级铜锭'], time: 5, result: '4级合金' },
  '战斗机甲': { ingredients: ['工程机器人', '4级合金', '芯片'], time: 20, result: '战斗机甲' },
};

const CARD_DEFS: Record<string, Partial<Card>> = {
  '1级铁矿': { tier: 1, glowColor: '#888888', isResourcePoint: true, resourceType: 'iron', resourceStock: 2 },
  '1级铜矿': { tier: 1, glowColor: '#b87333', isResourcePoint: true, resourceType: 'copper', resourceStock: 2 },
  '星尘矿': { tier: 1, glowColor: '#a855f7', isResourcePoint: true, resourceType: 'stardust', resourceStock: 2 },
  '果树': { tier: 1, glowColor: '#22c55e', isResourcePoint: true, resourceType: 'berry', resourceStock: 3 },
  '野果': { tier: 1, glowColor: '#22c55e', isFood: true },
  '鱼': { tier: 1, glowColor: '#3b82f6', isFood: true },
  '肉': { tier: 1, glowColor: '#ef4444', isFood: true },
  '铁': { tier: 1, glowColor: '#888888' },
  '铜': { tier: 1, glowColor: '#b87333' },
  '浆果': { tier: 1, glowColor: '#22c55e', isFood: true },
  '1级星尘': { tier: 1, glowColor: '#a855f7' },
  '2级铁锭': { tier: 2, glowColor: '#a0a0a0' },
  '2级铜锭': { tier: 2, glowColor: '#cd853f' },
  '2级星尘团': { tier: 2, glowColor: '#c084fc' },
  '芯片': { tier: 2, glowColor: '#00f3ff' },
  '电路板': { tier: 3, glowColor: '#00f3ff' },
  '铁棍': { tier: 3, glowColor: '#ff6b6b', isWeapon: true, atk: 1 },
  '镭射枪': { tier: 4, glowColor: '#ff0040', isWeapon: true, atk: 3 },
  '护甲': { tier: 3, glowColor: '#60a5fa', isArmor: true },
  '烤鱼': { tier: 2, glowColor: '#fbbf24', isFood: true },
  '烤肉': { tier: 2, glowColor: '#f97316', isFood: true },
  '营养餐': { tier: 3, glowColor: '#ffd700', isFood: true },
  '宿舍': { tier: 3, glowColor: '#8b5cf6', isBuilding: true },
  '工程机器人': { tier: 4, glowColor: '#00f3ff', isUnit: true, hp: 5, atk: 0 },
  '战斗机器人': { tier: 4, glowColor: '#ff0040', isUnit: true, hp: 5, atk: 2 },
  '补兽器': { tier: 3, glowColor: '#a855f7' },
  '养殖场': { tier: 4, glowColor: '#22c55e', isBuilding: true },
  '生产建筑': { tier: 4, glowColor: '#00f3ff', isBuilding: true },
  '4级合金': { tier: 4, glowColor: '#e879f9' },
  '战斗机甲': { tier: 5, glowColor: '#ffd700', isUnit: true, hp: 10, atk: 3 },
  '特遣队员': { tier: 0, glowColor: '#00f3ff', hp: 3, atk: 1 },
  '婴儿': { tier: 0, glowColor: '#fbbf24', hp: 1, atk: 0, isBaby: true, babyDays: 3 },
  '主基地': { tier: 0, glowColor: '#00f3ff', hp: 20, atk: 0, isBuilding: true },
  '家猪': { tier: 1, glowColor: '#fbbf24', hp: 2, atk: 0 },
  '废铁': { tier: 1, glowColor: '#666666' },
  'CORE宝箱': { tier: 5, glowColor: '#ffd700' },
  '异星怪兽': { tier: 1, glowColor: '#ef4444', isEnemy: true, hp: 3, atk: 1 },
  '异星狼狗': { tier: 1, glowColor: '#f97316', isEnemy: true, hp: 2, atk: 1 },
  '异星野猪': { tier: 1, glowColor: '#a16207', isEnemy: true, hp: 3, atk: 1 },
  '外星杂兵': { tier: 2, glowColor: '#dc2626', isEnemy: true, hp: 5, atk: 2 },
  '虚空收割者·噶比皮': { tier: 5, glowColor: '#7f1d1d', isEnemy: true, hp: 60, atk: 5 },
};

const BORDER_COLORS: Record<string, string> = {
  '特遣队员': '#00f3ff', '婴儿': '#fbbf24', '主基地': '#00f3ff',
  '1级铁矿': '#666666', '1级铜矿': '#b87333', '星尘矿': '#a855f7', '果树': '#22c55e',
  '铁': '#888888', '铜': '#b87333', '1级星尘': '#a855f7', '浆果': '#22c55e',
  '野果': '#22c55e', '鱼': '#3b82f6', '肉': '#ef4444',
  '2级铁锭': '#a0a0a0', '2级铜锭': '#cd853f', '2级星尘团': '#c084fc',
  '芯片': '#00f3ff', '电路板': '#00f3ff',
  '铁棍': '#ff6b6b', '镭射枪': '#ff0040', '护甲': '#60a5fa',
  '烤鱼': '#fbbf24', '烤肉': '#f97316', '营养餐': '#ffd700',
  '宿舍': '#8b5cf6', '养殖场': '#22c55e', '生产建筑': '#00f3ff',
  '工程机器人': '#00f3ff', '战斗机器人': '#ff0040', '战斗机甲': '#ffd700',
  '补兽器': '#a855f7', '4级合金': '#e879f9', '家猪': '#fbbf24',
  'CORE宝箱': '#ffd700',
  '异星怪兽': '#ef4444', '异星狼狗': '#f97316', '异星野猪': '#a16207',
  '外星杂兵': '#dc2626', '虚空收割者·噶比皮': '#7f1d1d', '废铁': '#666666',
};

const SELL_PRICES: Record<string, number> = {
  '铁': 1, '铜': 1, '1级星尘': 1, '浆果': 1, '野果': 1, '鱼': 1, '肉': 2,
  '2级铁锭': 2, '2级铜锭': 2, '2级星尘团': 2, '芯片': 3, '电路板': 4,
  '铁棍': 5, '护甲': 5, '镭射枪': 8,
  '烤鱼': 2, '烤肉': 3, '营养餐': 5,
  '工程机器人': 6, '战斗机器人': 8, '战斗机甲': 15,
  '宿舍': 4, '养殖场': 5, '生产建筑': 5,
  '补兽器': 4, '家猪': 2, '废铁': 1,
};

const MERCHANT_CATALOG: MerchantItem[] = [
  { type: '1级铁矿', price: 3 }, { type: '1级铜矿', price: 3 },
  { type: '2级铁锭', price: 5 }, { type: '2级铜锭', price: 5 },
  { type: '芯片', price: 8 }, { type: '电路板', price: 10 },
  { type: '战斗机器人', price: 15 }, { type: '护甲', price: 8 },
  { type: '铁棍', price: 6 }, { type: '镭射枪', price: 12 },
  { type: '宿舍', price: 6 }, { type: '营养餐', price: 5 },
  { type: '果树', price: 4 }, { type: '野果', price: 2 },
];

// ============ 音效 ============

function ensureAudio() {
  if (!audioCtx) audioCtx = new AudioContext();
}

function playSound(type: string) {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    switch (type) {
      case 'craft':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
        break;
      case 'hit':
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        osc.start(); osc.stop(audioCtx.currentTime + 0.05);
        break;
      case 'drag':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.02);
        osc.start(); osc.stop(audioCtx.currentTime + 0.02);
        break;
      case 'portal':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        const lfo = audioCtx.createOscillator();
        lfo.frequency.value = 5;
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 50;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();
        gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2);
        osc.start(); osc.stop(audioCtx.currentTime + 2);
        setTimeout(() => lfo.stop(), 2000);
        break;
      case 'boss':
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.setValueAtTime(0, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc.start(); osc.stop(audioCtx.currentTime + 0.5);
        break;
      case 'boss_attack':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
        break;
      case 'core':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1800, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
        break;
      case 'gather':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(900, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        osc.start(); osc.stop(audioCtx.currentTime + 0.08);
        break;
      case 'start':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
        break;
    }
  } catch {}
}

// ============ 卡牌创建 ============

function createCard(type: string, x: number, y: number): Card {
  const def = CARD_DEFS[type] || {};
  const id = `c${nextCardId++}`;
  const isUnit = def.isUnit || type === '特遣队员';
  const isBaby = def.isBaby || false;
  const card: Card = {
    id, type, name: type,
    tier: def.tier || 1,
    x, y, w: CARD_W, h: CARD_H,
    hp: def.hp || 1,
    maxHp: def.hp || 1,
    atk: def.atk || 0,
    hunger: isBaby ? 30 : (isUnit ? 100 : 0),
    maxHunger: isBaby ? 30 : (isUnit ? 100 : 0),
    isBaby,
    babyDays: def.babyDays || 0,
    isResourcePoint: def.isResourcePoint || false,
    resourceType: def.resourceType || '',
    resourceStock: def.resourceStock || 0,
    isEnemy: def.isEnemy || false,
    isBuilding: def.isBuilding || false,
    isUnit: def.isUnit || false,
    isFood: def.isFood || false,
    isWeapon: def.isWeapon || false,
    isArmor: def.isArmor || false,
    glowColor: def.glowColor || '#888888',
    shake: 0, flash: 0,
    dying: false, dyingTimer: 0,
    gatherTarget: undefined,
    gatherTimer: 0,
    buildingTimer: 0,
  };
  if (type === '工程机器人') {
    card.durability = 50;
    card.maxDurability = 50;
  }
  return card;
}

// ============ 存档系统 ============

const SAVE_KEY = 'stackfuture_save';

function saveGame() {
  const saveData = {
    day: day.value,
    dayTimer: dayTimer.value,
    cards: cards.value,
    population: population.value,
    stardust: stardust.value,
    cores: cores.value,
    starCoins: starCoins.value,
    hungerTimer,
    resourceSpawnTimer,
    portalTimer,
    nextCardId,
    portalActive: portalActive.value,
    portalCountdown: portalCountdown.value,
    dayTransitioning,
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  } catch (e) {
    console.error('[StackFuture] 存档失败', e);
  }
}

function loadGame(): boolean {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    day.value = data.day ?? 1;
    dayTimer.value = data.dayTimer ?? 0;
    cards.value = data.cards ?? [];
    population.value = data.population ?? 2;
    stardust.value = data.stardust ?? 0;
    cores.value = data.cores ?? 0;
    starCoins.value = data.starCoins ?? 0;
    hungerTimer = data.hungerTimer ?? 0;
    resourceSpawnTimer = data.resourceSpawnTimer ?? 0;
    portalTimer = data.portalTimer ?? 0;
    nextCardId = data.nextCardId ?? 1;
    portalActive.value = data.portalActive ?? false;
    portalCountdown.value = data.portalCountdown ?? 0;
    dayTransitioning = data.dayTransitioning ?? false;
    return true;
  } catch (e) {
    console.error('[StackFuture] 读档失败', e);
    return false;
  }
}

// ============ 初始化 ============

function initGame() {
  cards.value = [];
  day.value = 1;
  dayTimer.value = 0;
  stardust.value = 0;
  cores.value = 0;
  starCoins.value = 0;
  population.value = 2;
  gameOver.value = false;
  gameOverReason.value = '';
  gameOverText.value = '';
  earnedCores.value = 0;
  isPaused.value = false;
  portalCountdown.value = 0;
  portalActive.value = false;
  showDiscardModal.value = false;
  showRecipeModal.value = false;
  showMerchant.value = false;
  discardSelections.value = new Set();
  warnings.value = [];
  delayedSpawns.value = [];
  nextCardId = 1;

  const c = gameCanvas.value!;
  const cx = c.width / 2;
  const cy = c.height / 2;

  cards.value.push(createCard('主基地', cx - CARD_W/2, cy - 100));
  cards.value.push(createCard('特遣队员', cx - 120, cy + 50));
  cards.value.push(createCard('特遣队员', cx + 50, cy + 50));
  cards.value.push(createCard('1级铁矿', 80, cy - 50));
  cards.value.push(createCard('果树', c.width - 150, cy - 50));
  cards.value.push(createCard('鱼', cx - CARD_W/2, c.height - 120));
  cards.value.push(createCard('1级铁矿', cx - 200, cy + 100));
  cards.value.push(createCard('1级铜矿', cx + 150, cy + 80));
  cards.value.push(createCard('星尘矿', cx - 50, cy + 150));
  cards.value.push(createCard('野果', cx + 100, cy + 150));
}

function startGame() {
  ensureAudio();
  playSound('start');
  hasStarted.value = true;
  if (props.continueGame && loadGame()) {
    statusText.value = '继续上次的殖民...';
  } else {
    initGame();
  }
  lastTime = performance.now();
  loop();
}

function restart() {
  localStorage.removeItem(SAVE_KEY);
  initGame();
  lastTime = performance.now();
}

function exitToLobby() {
  cancelAnimationFrame(animId);
  saveGame();
  emit('exit');
}

function togglePause() {
  isPaused.value = !isPaused.value;
}

// ============ 输入处理 ============

function handleMouseDown(e: MouseEvent) {
  if (gameOver.value || isPaused.value || showDiscardModal.value || showMerchant.value || showRecipeModal.value || !hasStarted.value) return;
  const c = gameCanvas.value!;
  const r = c.getBoundingClientRect();
  const mx = (e.clientX - r.left) * (c.width / r.width);
  const my = (e.clientY - r.top) * (c.height / r.height);

  for (let i = cards.value.length - 1; i >= 0; i--) {
    const card = cards.value[i];
    if (card.isEnemy) continue;
    if (mx >= card.x && mx <= card.x + card.w && my >= card.y && my <= card.y + card.h) {
      draggedCard = card;
      dragOffsetX = mx - card.x;
      dragOffsetY = my - card.y;
      selectedCard.value = card;
      
      dragGroup = [];
      dragGroupOffsets = [];
      for (const other of cards.value) {
        if (other.id === card.id) continue;
        if (other.type === card.type && Math.hypot(other.x - card.x, other.y - card.y) < 20) {
          dragGroup.push(other);
          dragGroupOffsets.push({ id: other.id, dx: other.x - card.x, dy: other.y - card.y });
        }
      }
      
      playSound('drag');
      break;
    }
  }
}

function handleMouseMove(e: MouseEvent) {
  if (!draggedCard) return;
  const c = gameCanvas.value!;
  const r = c.getBoundingClientRect();
  const mx = (e.clientX - r.left) * (c.width / r.width);
  const my = (e.clientY - r.top) * (c.height / r.height);

  let newX = Math.max(0, Math.min(c.width - draggedCard.w, mx - dragOffsetX));
  let newY = Math.max(0, Math.min(c.height - draggedCard.h, my - dragOffsetY));

  for (const card of cards.value) {
    if (card.id === draggedCard.id) continue;
    if (dragGroup.find(g => g.id === card.id)) continue;
    if (card.type === draggedCard.type && Math.abs(card.x - newX) < 60 && Math.abs(card.y - newY) < 60) {
      newX = card.x + 12;
      newY = card.y + 12;
      break;
    }
  }

  draggedCard.x = newX;
  draggedCard.y = newY;
  
  for (let i = 0; i < dragGroup.length; i++) {
    const g = dragGroup[i];
    const off = dragGroupOffsets[i];
    g.x = newX + off.dx;
    g.y = newY + off.dy;
  }

  checkCraftingHint(draggedCard);
}

function handleMouseUp(e: MouseEvent) {
  if (!draggedCard) return;
  const crafted = tryCraft(draggedCard);
  if (!crafted) {
    tryEquip(draggedCard);
    tryFeed(draggedCard);
    tryGather(draggedCard);
    tryTrap(draggedCard);
  }
  draggedCard = null;
  dragGroup = [];
  dragGroupOffsets = [];
  craftingHint.value = null;
}

// ============ 自动整理（空格键） ============

function autoStackCards() {
  const c = gameCanvas.value!;
  const categories = [
    { name: '队员', filter: (c: Card) => c.type === '特遣队员' || c.type === '婴儿' },
    { name: '食物', filter: (c: Card) => c.isFood && !c.isResourcePoint && c.type !== '肉' },
    { name: '材料', filter: (c: Card) => ['铁','铜','1级星尘','浆果'].includes(c.type) },
    { name: '资源点', filter: (c: Card) => c.isResourcePoint },
  ];

  let currentX = 50, currentY = 80;
  const colW = CARD_W + 15;
  const rowH = CARD_H + 15;

  for (const cat of categories) {
    const group = cards.value.filter(cat.filter);
    if (group.length === 0) continue;
    for (let i = 0; i < group.length; i++) {
      group[i].x = currentX + (i % 2) * colW;
      group[i].y = currentY + Math.floor(i / 2) * rowH;
    }
    currentX += colW * 2 + 40;
    if (currentX > c.width - colW * 2) {
      currentX = 50;
      currentY += rowH * 3 + 30;
    }
  }
  statusText.value = '卡牌已分类整理';
  playSound('craft');
}

// ============ 交互提示系统 ============

function checkCraftingHint(card: Card) {
  for (const other of cards.value) {
    if (other.id === card.id) continue;
    if (!isOverlapping(card, other)) continue;

    if ((card.type === '特遣队员' || card.type === '工程机器人') && other.isResourcePoint) {
      const interval = card.type === '工程机器人' ? '5秒' : '10秒';
      craftingHint.value = {
        x: (card.x + other.x) / 2,
        y: Math.min(card.y, other.y) - 35,
        text: `⛏ 采集${other.name}（${interval}/个，剩余${other.resourceStock}）`,
        valid: true
      };
      return;
    }

    if (card.type === '特遣队员' && other.type === 'CORE宝箱') {
      craftingHint.value = {
        x: (card.x + other.x) / 2,
        y: Math.min(card.y, other.y) - 35,
        text: '💎 开采CORE宝箱（20秒）',
        valid: true
      };
      return;
    }

    if (card.type === '补兽器' && other.type === '异星野猪') {
      craftingHint.value = {
        x: (card.x + other.x) / 2,
        y: Math.min(card.y, other.y) - 35,
        text: '🪤 捕获野猪 → 家猪',
        valid: true
      };
      return;
    }

    if ((card.isWeapon || card.isArmor) && (other.type === '特遣队员' || other.type === '战斗机器人')) {
      if (card.isArmor && other.type === '战斗机器人') {
        craftingHint.value = {
          x: (card.x + other.x) / 2,
          y: Math.min(card.y, other.y) - 35,
          text: '❌ 战斗机器人无法装备护甲',
          valid: false
        };
        return;
      }
      craftingHint.value = {
        x: (card.x + other.x) / 2,
        y: Math.min(card.y, other.y) - 35,
        text: `🛡 ${card.name} → 装备到${other.name}`,
        valid: true
      };
      return;
    }

    if (card.isFood && (other.type === '特遣队员' || other.type === '婴儿')) {
      const hungerRestore = card.type === '野果' || card.type === '浆果' ? 10 :
                           card.type === '肉' ? 15 :
                           card.type === '烤鱼' ? 20 :
                           card.type === '烤肉' ? 30 : 50;
      const healText = card.type === '营养餐' ? ' HP+1' : '';
      craftingHint.value = {
        x: (card.x + other.x) / 2,
        y: Math.min(card.y, other.y) - 35,
        text: `🍖 喂食${other.name}（饥饿+${hungerRestore}${healText}）`,
        valid: true
      };
      return;
    }

    const recipe = findRecipe([card.type, other.type]);
    if (recipe) {
      craftingHint.value = {
        x: (card.x + other.x) / 2,
        y: Math.min(card.y, other.y) - 35,
        text: `⚗ ${card.name} + ${other.name} → ${recipe.result}（${recipe.time}秒）`,
        valid: true
      };
      return;
    }

    for (const third of cards.value) {
      if (third.id === card.id || third.id === other.id) continue;
      if (isOverlapping(card, third) || isOverlapping(other, third)) {
        const recipe3 = findRecipe([card.type, other.type, third.type]);
        if (recipe3) {
          craftingHint.value = {
            x: (card.x + other.x + third.x) / 3,
            y: Math.min(card.y, other.y, third.y) - 35,
            text: `⚗ ${card.name} + ${other.name} + ${third.name} → ${recipe3.result}（${recipe3.time}秒）`,
            valid: true
          };
          return;
        }
      }
    }

    craftingHint.value = {
      x: (card.x + other.x) / 2,
      y: Math.min(card.y, other.y) - 35,
      text: '❌ 无法合成',
      valid: false
    };
    return;
  }
  craftingHint.value = null;
}

function isOverlapping(a: Card, b: Card): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function findRecipe(types: string[]) {
  const sorted = [...types].sort();
  for (const [key, recipe] of Object.entries(RECIPES)) {
    const rSorted = [...recipe.ingredients].sort();
    if (JSON.stringify(sorted) === JSON.stringify(rSorted)) {
      return recipe;
    }
  }
  return null;
}

function tryCraft(card: Card): boolean {
  if (card.type === '工程机器人' || card.type === '铁') {
    const robot = card.type === '工程机器人' ? card : cards.value.find(c => c.id !== card.id && c.type === '工程机器人' && isOverlapping(card, c));
    const iron = card.type === '铁' ? card : cards.value.find(c => c.id !== card.id && c.type === '铁' && isOverlapping(card, c));
    if (robot && iron && isOverlapping(robot, iron)) {
      const cx = (robot.x + iron.x) / 2;
      const cy = (robot.y + iron.y) / 2;
      cards.value = cards.value.filter(c => c.id !== iron.id);
      const result = createCard('铁棍', cx, cy);
      cards.value.push(result);
      playSound('craft');
      statusText.value = `工程机器人制作了 铁棍！`;
      return true;
    }
  }

  for (const other of cards.value) {
    if (other.id === card.id) continue;
    if (!isOverlapping(card, other)) continue;

    let recipe = findRecipe([card.type, other.type]);
    let ingredients = [card, other];

    if (!recipe) {
      for (const third of cards.value) {
        if (third.id === card.id || third.id === other.id) continue;
        if (isOverlapping(card, third) || isOverlapping(other, third)) {
          const r3 = findRecipe([card.type, other.type, third.type]);
          if (r3) {
            recipe = r3;
            ingredients = [card, other, third];
            break;
          }
        }
      }
    }

    if (recipe) {
      const cx = ingredients.reduce((s, c) => s + c.x, 0) / ingredients.length;
      const cy = ingredients.reduce((s, c) => s + c.y, 0) / ingredients.length;
      cards.value = cards.value.filter(c => !ingredients.find(i => i.id === c.id));
      const result = createCard(recipe.result, cx, cy);
      result.craftProgress = 0;
      result.craftTarget = recipe.result;
      result.craftTimer = recipe.time;
      cards.value.push(result);
      playSound('craft');
      statusText.value = `正在合成 ${recipe.result}...`;
      return true;
    }
  }
  return false;
}

// ============ 装备系统 ============

function tryEquip(card: Card) {
  if (!card.isWeapon && !card.isArmor) return;
  for (const other of cards.value) {
    if (other.id === card.id) continue;
    if (other.type !== '特遣队员' && other.type !== '战斗机器人') continue;
    if (!isOverlapping(card, other)) continue;
    if (card.isArmor && other.type === '战斗机器人') continue;

    if (card.isWeapon) {
      other.atk = 1 + card.atk;
      statusText.value = `${other.name} 装备了 ${card.name}，攻击力 ${other.atk}`;
    } else if (card.isArmor) {
      const oldMax = other.maxHp;
      other.maxHp = oldMax + 3;
      other.hp = Math.min(other.hp + 3, other.maxHp);
      statusText.value = `${other.name} 装备了 ${card.name}，HP ${other.hp}/${other.maxHp}`;
    }
    cards.value = cards.value.filter(c => c.id !== card.id);
    playSound('craft');
    return;
  }
}

// ============ 喂食系统 ============

function tryFeed(card: Card) {
  if (!card.isFood) return;
  for (const other of cards.value) {
    if (other.id === card.id) continue;
    if (other.type !== '特遣队员' && other.type !== '婴儿') continue;
    if (!isOverlapping(card, other)) continue;

    let heal = 0;
    let hungerRestore = 0;
    if (card.type === '野果' || card.type === '浆果') { heal = 0; hungerRestore = 10; }
    else if (card.type === '肉') { heal = 0; hungerRestore = 15; }
    else if (card.type === '烤鱼') { heal = 0; hungerRestore = 20; }
    else if (card.type === '烤肉') { heal = 0; hungerRestore = 30; }
    else if (card.type === '营养餐') { heal = 1; hungerRestore = 50; }

    other.hp = Math.min(other.maxHp, other.hp + heal);
    other.hunger = Math.min(other.maxHunger, other.hunger + hungerRestore);

    cards.value = cards.value.filter(c => c.id !== card.id);
    statusText.value = `${other.name} 吃了 ${card.name}${heal > 0 ? '，HP+' + heal : ''}，饥饿+${hungerRestore}`;
    playSound('craft');
    return;
  }
}

// ============ 采集系统 ============

function tryGather(card: Card) {
  if (card.type !== '特遣队员' && card.type !== '工程机器人') return;
  for (const other of cards.value) {
    if (other.id === card.id) continue;
    if (!other.isResourcePoint && other.type !== 'CORE宝箱') continue;
    if (!isOverlapping(card, other)) continue;

    if (!card.gatherTarget) {
      card.gatherTarget = other.id;
      card.gatherTimer = 0;
      if (other.type === 'CORE宝箱') {
        statusText.value = `${card.name} 开始开采 CORE宝箱...`;
      } else {
        statusText.value = `${card.name} 开始采集 ${other.name}...`;
      }
      playSound('gather');
    }
    return;
  }
  if (card.gatherTarget) {
    card.gatherTarget = undefined;
    card.gatherTimer = 0;
  }
}

// ============ 捕获系统 ============

function tryTrap(card: Card) {
  if (card.type !== '补兽器') return;
  for (const other of cards.value) {
    if (other.id === card.id) continue;
    if (other.type !== '异星野猪') continue;
    if (!isOverlapping(card, other)) continue;

    other.type = '家猪';
    other.name = '家猪';
    other.glowColor = '#fbbf24';
    other.isEnemy = false;
    other.atk = 0;
    cards.value = cards.value.filter(c => c.id !== card.id);
    statusText.value = '捕获成功！野猪变成了家猪';
    playSound('craft');
    return;
  }
}

// ============ 商人系统 ============

function generateMerchantGoods() {
  const goods: MerchantItem[] = [{ type: '星尘矿', price: 5 }];
  const pool = [...MERCHANT_CATALOG];
  const shuffled = pool.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 4);
  goods.push(...selected);
  return goods.sort((a, b) => b.price - a.price);
}

function sellCard(card: Card) {
  const price = getSellPrice(card);
  if (price <= 0) return;
  starCoins.value += price;
  cards.value = cards.value.filter(c => c.id !== card.id);
  statusText.value = `出售 ${card.name} 获得 ${price} 星币`;
  playSound('craft');
}

function buyCard(item: MerchantItem) {
  if (starCoins.value < item.price) return;
  if (cards.value.length >= MAX_CARDS) {
    statusText.value = '卡牌已满，无法购买';
    return;
  }
  starCoins.value -= item.price;
  const c = gameCanvas.value!;
  const x = 100 + Math.random() * (c.width - 200);
  const y = 100 + Math.random() * (c.height - 200);
  cards.value.push(createCard(item.type, x, y));
  statusText.value = `购买 ${item.type} 花费 ${item.price} 星币`;
  playSound('craft');
}

function closeMerchant() {
  showMerchant.value = false;
  isPaused.value = false;
}

function getSellPrice(card: Card): number {
  if (card.type === '主基地' || card.isEnemy || card.type === 'CORE宝箱') return 0;
  return SELL_PRICES[card.type] || 1;
}

// ============ 战斗系统 ============

let lastBattleTick = 0;

function updateBattle(dt: number) {
  lastBattleTick += dt;
  if (lastBattleTick < 2) return;
  lastBattleTick = 0;

  const enemies = cards.value.filter(c => c.isEnemy && c.hp > 0);
  const allies = cards.value.filter(c => (c.type === '特遣队员' || c.isUnit) && c.hp > 0);
  const base = cards.value.find(c => c.type === '主基地');

  if (enemies.length === 0) return;

  for (const enemy of enemies) {
    if (!base) continue;
    const dx = base.x + base.w/2 - (enemy.x + enemy.w/2);
    const dy = base.y + base.h/2 - (enemy.y + enemy.h/2);
    const dist = Math.hypot(dx, dy);
    if (dist > 80) {
      enemy.x += (dx / dist) * 20;
      enemy.y += (dy / dist) * 20;
    } else {
      const targets = [...allies, base].filter(t => t && t.hp > 0);
      if (targets.length > 0) {
        const target = targets.reduce((closest, t) => {
          const d = Math.hypot(t.x - enemy.x, t.y - enemy.y);
          const cd = Math.hypot(closest.x - enemy.x, closest.y - enemy.y);
          return d < cd ? t : closest;
        }, targets[0]);

        target.hp -= enemy.atk;
        target.shake = 5;
        playSound('hit');
        if (enemy.type === '虚空收割者·噶比皮') {
          playSound('boss_attack');
        }
        if (target.hp <= 0) handleDeath(target);
      }
    }
  }

  for (const ally of allies) {
    if (enemies.length === 0) break;
    const liveEnemies = enemies.filter(e => e.hp > 0);
    if (liveEnemies.length === 0) break;
    const target = liveEnemies.reduce((closest, e) => {
      const d = Math.hypot(e.x - ally.x, e.y - ally.y);
      const cd = Math.hypot(closest.x - ally.x, closest.y - ally.y);
      return d < cd ? e : closest;
    }, liveEnemies[0]);

    if (Math.hypot(target.x - ally.x, target.y - ally.y) < 150) {
      target.hp -= ally.atk;
      target.shake = 5;
      target.flash = 1;
      playSound('hit');
      if (target.hp <= 0) handleEnemyDeath(target);
    }
  }
}

function handleDeath(card: Card) {
  if (card.type === '主基地') {
    gameOver.value = true;
    gameOverReason.value = 'base_destroyed';
    gameOverText.value = '主基地被摧毁，殖民计划失败。';
    return;
  }
  if (card.type === '特遣队员') {
    const meat = createCard('肉', card.x, card.y);
    cards.value.push(meat);
    statusText.value = '特遣队员牺牲了...变成了肉卡';
    population.value = Math.max(0, population.value - 1);
  }
  card.dying = true;
  card.dyingTimer = 1;
}

function handleEnemyDeath(card: Card) {
  if (card.type === '异星怪兽') {
    cards.value.push(createCard('肉', card.x, card.y));
    cards.value.push(createCard('肉', card.x + 20, card.y));
    stardust.value += 1;
  } else if (card.type === '异星狼狗') {
    cards.value.push(createCard('肉', card.x, card.y));
    stardust.value += 1;
  } else if (card.type === '异星野猪') {
    cards.value.push(createCard('肉', card.x, card.y));
    cards.value.push(createCard('肉', card.x + 15, card.y));
    cards.value.push(createCard('肉', card.x - 15, card.y));
    stardust.value += 1;
  } else if (card.type === '外星杂兵') {
    stardust.value += 3;
  } else if (card.type === '虚空收割者·噶比皮') {
    gameOver.value = true;
    gameOverReason.value = 'boss_defeated';
    gameOverText.value = '第30天，虚空收割者·噶比皮的舰队被击退。你的特遣队在异星荒野上建立了第一个永久前哨站。星尘在夜空中闪烁，仿佛在庆祝这场来之不易的胜利。感谢你的指挥，指挥官。';
    earnedCores.value = 3;
    emit('update:stats', { cores: 3 });
    return;
  }
  card.dying = true;
  card.dyingTimer = 1;
}

// ============ 游戏逻辑更新 ============

let resourceSpawnTimer = 0;
let hungerTimer = 0;
let portalTimer = 0;
let dayTransitioning = false;

function update(dt: number) {
  if (gameOver.value || isPaused.value || showDiscardModal.value || showMerchant.value || showRecipeModal.value || !hasStarted.value) return;
  const c = gameCanvas.value!;

  const aliveUnits = cards.value.filter(c => c.type === '特遣队员' && c.hp > 0);
  if (aliveUnits.length === 0 && day.value > 1) {
    gameOver.value = true;
    gameOverReason.value = 'all_dead';
    gameOverText.value = '所有特遣队员都已牺牲，殖民计划失败。';
    return;
  }

  dayTimer.value += dt;
  if (dayTimer.value >= DAY_SECONDS) {
    dayTimer.value = 0;
    endDay();
  }

  hungerTimer += dt;
  if (hungerTimer >= 20) {
    hungerTimer = 0;
    for (const card of cards.value) {
      if (card.maxHunger > 0) {
        card.hunger = Math.max(0, card.hunger - HUNGER_DECAY_PER_20S);
        if (card.hunger <= 0) {
          card.hp -= 1;
          card.shake = 3;
          if (card.hp <= 0) handleDeath(card);
        }
      }
    }
  }

  resourceSpawnTimer += dt;
  if (resourceSpawnTimer >= RESOURCE_SPAWN_INTERVAL) {
    resourceSpawnTimer = 0;
    const roll = Math.random();
    let resType: string;
    if (roll < 0.25) resType = '1级铁矿';
    else if (roll < 0.45) resType = '1级铜矿';
    else if (roll < 0.70) resType = '野果';
    else if (roll < 0.80) resType = '鱼';
    else if (roll < 0.90) resType = '星尘矿';
    else resType = '果树';
    const x = 50 + Math.random() * (c.width - 100);
    const y = 50 + Math.random() * (c.height - 150);
    cards.value.push(createCard(resType, x, y));
  }

  for (const card of cards.value) {
    if (card.craftTimer && card.craftTimer > 0) {
      card.craftTimer -= dt;
      card.craftProgress = 1 - (card.craftTimer / (RECIPES[card.craftTarget || '']?.time || 1));
      if (card.craftTimer <= 0) {
        card.craftTimer = 0;
        card.craftProgress = 1;
        statusText.value = `${card.name} 合成完成！`;
        playSound('craft');
      }
    }

    if (card.gatherTarget && (card.type === '特遣队员' || card.type === '工程机器人')) {
      card.gatherTimer = (card.gatherTimer || 0) + dt;
      const gatherInterval = card.type === '工程机器人' ? 5 : 10;
      if (card.gatherTimer >= gatherInterval) {
        card.gatherTimer = 0;
        const target = cards.value.find(c => c.id === card.gatherTarget);
        if (target) {
          if (target.type === 'CORE宝箱') {
            if (card.type === '特遣队员') {
              target.buildingTimer = (target.buildingTimer || 0) + 1;
              if (target.buildingTimer >= 2) {
                target.buildingTimer = 0;
                cores.value += 1;
                emit('update:stats', { cores: 1 });
                cards.value = cards.value.filter(c => c.id !== target.id);
                card.gatherTarget = undefined;
                statusText.value = '💎 获得 1 CORE！';
                playSound('core');
              }
            }
            continue;
          }

          if (target.isResourcePoint) {
            const resourceMap: Record<string, string> = {
              iron: '铁', copper: '铜', stardust: '1级星尘', berry: '浆果'
            };
            const resType = resourceMap[target.resourceType || ''];
            if (resType) {
              const newCard = createCard(resType, target.x + (Math.random() - 0.5) * 60, target.y + CARD_H + 15);
              cards.value.push(newCard);
              target.resourceStock = (target.resourceStock || 0) - 1;
              playSound('gather');
              statusText.value = `⛏ 采集到 ${resType}！`;
              if (target.resourceStock <= 0) {
                cards.value = cards.value.filter(c => c.id !== target.id);
                card.gatherTarget = undefined;
                statusText.value = `${target.name} 已枯竭`;
              }
            }
          } else {
            card.gatherTarget = undefined;
          }
        } else {
          card.gatherTarget = undefined;
        }
      }
    }

    if (card.dying) {
      card.dyingTimer -= dt;
      if (card.dyingTimer <= 0) {
        cards.value = cards.value.filter(c => c.id !== card.id);
      }
    }

    if (card.shake > 0) card.shake *= 0.9;
    if (card.flash > 0) card.flash -= dt * 2;
  }

  for (const building of cards.value) {
    if (building.type !== '养殖场') continue;
    const pigs = cards.value.filter(c => c.type === '家猪' && isOverlapping(c, building));
    if (pigs.length >= 2) {
      building.buildingTimer = (building.buildingTimer || 0) + dt;
      if (building.buildingTimer >= 10) {
        building.buildingTimer = 0;
        const meat = createCard('肉', building.x + (Math.random() - 0.5) * 40, building.y + CARD_H + 15);
        cards.value.push(meat);
        statusText.value = '🐷 养殖场产出了肉！';
        playSound('craft');
      }
    } else {
      building.buildingTimer = 0;
    }
  }

  updateBattle(dt);
  updatePortal(dt);

  for (const warning of warnings.value) {
    warning.timer -= dt;
  }
  warnings.value = warnings.value.filter(w => w.timer > 0);

  for (let i = delayedSpawns.value.length - 1; i >= 0; i--) {
    const ds = delayedSpawns.value[i];
    ds.timer -= dt;
    if (ds.timer <= 0) {
      cards.value.push(createCard(ds.type, ds.x, ds.y));
      if (ds.isBoss) {
        statusText.value = '⚠⚠⚠ 虚空收割者·噶比皮降临！⚠⚠⚠';
        playSound('boss');
      } else if (ds.type === '外星杂兵') {
        statusText.value = '外星杂兵入侵！';
        playSound('boss');
      }
      delayedSpawns.value.splice(i, 1);
    }
  }
}

function endDay() {
  if (dayTransitioning) return;
  dayTransitioning = true;

  if (cards.value.length > MAX_CARDS) {
    showDiscardModal.value = true;
    discardSelections.value = new Set();
    statusText.value = `卡牌超载！必须弃掉 ${cards.value.length - MAX_CARDS} 张`;
    return;
  }

  finishDayTransition();
}

function finishDayTransition() {
  day.value++;
  dayTransitioning = false;

  for (const card of cards.value) {
    if (card.isBaby && card.babyDays !== undefined) {
      card.babyDays -= 1;
      if (card.babyDays <= 0) {
        const def = CARD_DEFS['特遣队员'];
        card.type = '特遣队员';
        card.name = '特遣队员';
        card.isBaby = false;
        card.hp = 3; card.maxHp = 3; card.atk = 1;
        card.hunger = 100; card.maxHunger = 100;
        card.glowColor = def.glowColor || '#00f3ff';
        population.value += 1;
        statusText.value = '婴儿长大了！';
      }
    }
  }

  for (const card of cards.value) {
    if (card.type === '工程机器人' && card.durability !== undefined) {
      card.durability -= 10;
      if (card.durability <= 0) {
        card.type = '废铁';
        card.name = '废铁';
        card.glowColor = '#666666';
        card.isUnit = false;
        card.atk = 0;
        card.durability = 0;
        statusText.value = '工程机器人报废了...';
      }
    }
  }

  if (day.value >= 6 && day.value < 30) {
    spawnWildlife();
  }

  if (day.value >= 15 && day.value < 30 && day.value % 3 === 0) {
    spawnAliens();
  }

  if (day.value === 30) {
    spawnBoss();
  }

  if (day.value % 5 === 0) {
    const buildings = cards.value.filter(c => c.type === '生产建筑');
    for (const b of buildings) {
      for (let i = 0; i < 2; i++) {
        const sd = createCard('1级星尘', b.x + (Math.random() - 0.5) * 60, b.y + CARD_H + 15 + i * 20);
        cards.value.push(sd);
      }
      statusText.value = '🏭 生产建筑产出了星尘';
    }
  }

  const dorms = cards.value.filter(c => c.type === '宿舍');
  const adults = cards.value.filter(c => c.type === '特遣队员' && c.hp > 0 && !c.isBaby);
  const babies = cards.value.filter(c => c.type === '婴儿');
  const maxPop = dorms.length * 2 + 2;
  
  for (const dorm of dorms) {
    if (adults.length >= 2 && babies.length < dorms.length && population.value < maxPop) {
      if (Math.random() < 0.5) {
        const baby = createCard('婴儿', dorm.x + 20, dorm.y + CARD_H + 10);
        cards.value.push(baby);
        statusText.value = '新生命诞生了！';
        playSound('craft');
        break;
      }
    }
  }

  if (day.value % 3 === 0 && day.value > 0) {
    merchantGoods.value = generateMerchantGoods();
    showMerchant.value = true;
    isPaused.value = true;
    statusText.value = '🛸 星际商人来了！';
  }
}

function toggleDiscardSelection(cardId: string) {
  const needed = cards.value.length - MAX_CARDS;
  if (discardSelections.value.has(cardId)) {
    discardSelections.value.delete(cardId);
  } else if (discardSelections.value.size < needed) {
    discardSelections.value.add(cardId);
  }
}

function confirmDiscard() {
  const needed = cards.value.length - MAX_CARDS;
  if (discardSelections.value.size !== needed) return;
  cards.value = cards.value.filter(c => !discardSelections.value.has(c.id));
  showDiscardModal.value = false;
  discardSelections.value = new Set();
  finishDayTransition();
}

// ============ 敌人生成 ============

function spawnWildlife() {
  const c = gameCanvas.value!;
  const base = cards.value.find(c => c.type === '主基地');
  const enemies = ['异星怪兽', '异星狼狗', '异星野猪'];
  const count = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    const type = enemies[Math.floor(Math.random() * enemies.length)];
    let x, y;
    if (base) {
      x = base.x + (Math.random() - 0.5) * 400;
      y = base.y + (Math.random() - 0.5) * 400;
    } else {
      x = Math.random() * c.width;
      y = Math.random() * c.height;
    }
    x = Math.max(0, Math.min(c.width - CARD_W, x));
    y = Math.max(0, Math.min(c.height - CARD_H, y));

    const card = createCard(type, x, y);
    if (day.value >= 10) { card.hp += 2; card.maxHp += 2; card.atk += 1; }
    if (day.value >= 20) { card.hp += 2; card.maxHp += 2; card.atk += 1; }
    cards.value.push(card);
  }
  statusText.value = `第${day.value}天，野生动物出现了！`;
}

function spawnAliens() {
  const c = gameCanvas.value!;
  const side = Math.random() < 0.5 ? 1 : 3;
  warnings.value.push({ side, timer: 3 });
  for (let i = 0; i < 2; i++) {
    const x = side === 1 ? c.width + CARD_W : -CARD_W;
    const y = 100 + Math.random() * (c.height - 200);
    delayedSpawns.value.push({ type: '外星杂兵', x, y, timer: 3 });
  }
  statusText.value = '侦测到外星信号！3秒后抵达...';
  playSound('portal');
}

function spawnBoss() {
  const c = gameCanvas.value!;
  const side = 0;
  warnings.value.push({ side, timer: 5 });
  delayedSpawns.value.push({ type: '虚空收割者·噶比皮', x: c.width/2 - CARD_W/2, y: -120, timer: 5, isBoss: true });
  for (let i = 0; i < 3; i++) {
    const x = c.width/2 - 150 + i * 150;
    delayedSpawns.value.push({ type: '外星杂兵', x, y: -60, timer: 5 });
  }
  statusText.value = '⚠⚠⚠ 侦测到虚空收割者！5秒后降临！⚠⚠⚠';
  playSound('portal');
}

// ============ 时空门 ============

function updatePortal(dt: number) {
  if (day.value < 6 || day.value >= 30) return;
  portalTimer += dt;
  if (!portalActive.value && portalTimer > 45 + Math.random() * 30) {
    portalActive.value = true;
    portalCountdown.value = 10;
    playSound('portal');
    statusText.value = '时空门出现了！10秒后开启';
  }
  if (portalActive.value && portalCountdown.value > 0) {
    portalCountdown.value -= dt;
    if (portalCountdown.value <= 0) {
      portalActive.value = false;
      portalTimer = 0;
      portalCountdown.value = 0;
      openPortal();
    }
  }
}

function openPortal() {
  const roll = Math.random();
  if (roll < 0.1) {
    const c = gameCanvas.value!;
    cards.value.push(createCard('CORE宝箱', c.width/2, c.height/2));
    statusText.value = '时空门送来了 CORE 宝箱！';
    playSound('core');
  } else if (roll < 0.3) {
    spawnWildlife();
  } else {
    const resources = ['1级铁矿', '1级铜矿', '星尘矿', '野果', '鱼'];
    const c = gameCanvas.value!;
    for (let i = 0; i < 3; i++) {
      const type = resources[Math.floor(Math.random() * resources.length)];
      cards.value.push(createCard(type, c.width/2 + (Math.random()-0.5)*100, c.height/2 + (Math.random()-0.5)*100));
    }
    statusText.value = '时空门送来了物资';
  }
}

// ============ 渲染 ============

function draw() {
  const c = gameCanvas.value!;
  const ctx = c.getContext('2d')!;
  const dayProgress = dayTimer.value / DAY_SECONDS;

  drawBackground(ctx, c);

  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(0, 0, c.width, 4);
  let progressColor = '#00f3ff';
  if (dayProgress > 0.7) progressColor = '#fbbf24';
  if (dayProgress > 0.9) progressColor = '#a855f7';
  ctx.fillStyle = progressColor;
  ctx.fillRect(0, 0, c.width * dayProgress, 4);

  for (const warning of warnings.value) {
    const alpha = Math.abs(Math.sin(performance.now() * 0.01)) * 0.8 + 0.2;
    ctx.fillStyle = `rgba(255, 50, 50, ${alpha})`;
    const cx = c.width / 2, cy = c.height / 2;
    if (warning.side === 0) {
      ctx.beginPath(); ctx.moveTo(cx - 20, 40); ctx.lineTo(cx, 10); ctx.lineTo(cx + 20, 40); ctx.closePath(); ctx.fill();
    } else if (warning.side === 1) {
      ctx.beginPath(); ctx.moveTo(c.width - 40, cy - 20); ctx.lineTo(c.width - 10, cy); ctx.lineTo(c.width - 40, cy + 20); ctx.closePath(); ctx.fill();
    } else if (warning.side === 2) {
      ctx.beginPath(); ctx.moveTo(cx - 20, c.height - 40); ctx.lineTo(cx, c.height - 10); ctx.lineTo(cx + 20, c.height - 40); ctx.closePath(); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(40, cy - 20); ctx.lineTo(10, cy); ctx.lineTo(40, cy + 20); ctx.closePath(); ctx.fill();
    }
  }

  for (const card of cards.value) {
    if (card.isResourcePoint) {
      ctx.strokeStyle = card.glowColor + '40';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(card.x - 5, card.y - 5, card.w + 10, card.h + 10);
      ctx.setLineDash([]);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`剩余${card.resourceStock || 0}`, card.x + card.w/2, card.y - 8);
    }
  }

  for (const card of cards.value) {
    drawCard(ctx, card);
  }

  if (portalActive.value && portalCountdown.value > 0) {
    drawPortal(ctx, c);
  }

  if (dayProgress > 0.85) {
    ctx.fillStyle = 'rgba(0,0,30,0.3)';
    ctx.fillRect(0, 0, c.width, c.height);
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement) {
  const time = performance.now() * 0.0003;

  if (day.value >= 30) {
    const pulse = Math.sin(performance.now() * 0.002) * 0.15;
    ctx.fillStyle = `rgb(${25 + pulse * 60}, 2, 2)`;
    ctx.fillRect(0, 0, c.width, c.height);
    const t = performance.now() * 0.003;
    ctx.fillStyle = `rgba(255,50,0,${0.05 + Math.sin(t) * 0.03})`;
    ctx.beginPath(); ctx.arc(c.width/2, c.height/2, 100 + Math.sin(t * 2) * 30, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,0.5)`;
    for (let i = 0; i < 30; i++) {
      const sx = ((i * 137.5 + time * (20 + i % 10)) % c.width);
      const sy = ((i * 89.7 + time * (10 + i % 5)) % c.height);
      ctx.beginPath(); ctx.arc(sx, sy, 1 + (i % 2), 0, Math.PI * 2); ctx.fill();
    }
  } else if (day.value >= 21) {
    ctx.fillStyle = '#020a08';
    ctx.fillRect(0, 0, c.width, c.height);
    const t = performance.now() * 0.001;
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(0, 255, 150, ${0.1 + Math.sin(t + i) * 0.05})`;
      ctx.lineWidth = 20;
      ctx.beginPath();
      for (let x = 0; x < c.width; x += 10) {
        const y = c.height * 0.3 + i * 60 + Math.sin(x * 0.01 + t + i) * 40;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(255,255,255,0.6)`;
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 137.5 + time * (15 + i % 8)) % c.width);
      const sy = ((i * 89.7 + time * (8 + i % 4)) % c.height);
      ctx.beginPath(); ctx.arc(sx, sy, 1 + (i % 2), 0, Math.PI * 2); ctx.fill();
    }
  } else if (day.value >= 11) {
    ctx.fillStyle = '#080510';
    ctx.fillRect(0, 0, c.width, c.height);
    const t = performance.now() * 0.001;
    ctx.strokeStyle = 'rgba(138,43,226,0.15)'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const r = 50 + i * 30;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 2; a += 0.1) {
        const dist = r + Math.sin(a * 3 + t + i) * 10;
        const x = c.width/2 + Math.cos(a + t * 0.5) * dist;
        const y = c.height/2 + Math.sin(a + t * 0.5) * dist;
        if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
    }
    ctx.fillStyle = `rgba(255,255,255,0.6)`;
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 137.5 + time * (12 + i % 6)) % c.width);
      const sy = ((i * 89.7 + time * (6 + i % 3)) % c.height);
      ctx.beginPath(); ctx.arc(sx, sy, 1 + (i % 2), 0, Math.PI * 2); ctx.fill();
    }
  } else {
    ctx.fillStyle = '#020205';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = `rgba(255,255,255,0.8)`;
    for (let i = 0; i < 50; i++) {
      const sx = ((i * 137.5 + time * (10 + i % 5)) % c.width);
      const sy = ((i * 89.7 + time * (5 + i % 3)) % c.height);
      const size = 1 + (i % 3) * 0.5;
      ctx.beginPath(); ctx.arc(sx, sy, size, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function getStackCount(card: Card): number {
  return cards.value.filter(c => c.type === card.type && c.id !== card.id && Math.hypot(c.x - card.x, c.y - card.y) < 15).length + 1;
}

function drawCard(ctx: CanvasRenderingContext2D, card: Card) {
  if (card.dying) ctx.globalAlpha = Math.max(0, card.dyingTimer);
  ctx.save();

  if (card.shake > 0.5) {
    ctx.translate((Math.random() - 0.5) * card.shake, (Math.random() - 0.5) * card.shake);
  }

  const grad = ctx.createLinearGradient(card.x, card.y, card.x, card.y + card.h);
  grad.addColorStop(0, 'rgba(10,10,20,0.95)');
  grad.addColorStop(1, 'rgba(5,5,10,0.95)');
  ctx.fillStyle = grad;

  ctx.shadowBlur = card.flash > 0 ? 20 : (card.isEnemy ? 10 : 5);
  ctx.shadowColor = card.flash > 0 ? '#ffffff' : (BORDER_COLORS[card.type] || card.glowColor);

  roundRect(ctx, card.x, card.y, card.w, card.h, 8);
  ctx.fill();

  const borderColor = BORDER_COLORS[card.type] || card.glowColor || '#888';
  ctx.strokeStyle = borderColor + '80';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;

  drawCardContent(ctx, card);

  const stackCount = getStackCount(card);
  if (stackCount > 1) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath(); ctx.arc(card.x + card.w - 14, card.y + 14, 11, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`x${stackCount}`, card.x + card.w - 14, card.y + 18);
  }

  if (card.craftTimer && card.craftTimer > 0) {
    const progress = card.craftProgress || 0;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(card.x + 4, card.y + card.h - 10, card.w - 8, 6);
    ctx.fillStyle = '#00f3ff';
    ctx.fillRect(card.x + 4, card.y + card.h - 10, (card.w - 8) * progress, 6);
  }

  if (card.gatherTarget && (card.type === '特遣队员' || card.type === '工程机器人')) {
    const interval = card.type === '工程机器人' ? 5 : 10;
    const progress = Math.min((card.gatherTimer || 0) / interval, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(card.x + 4, card.y + card.h - 16, card.w - 8, 4);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(card.x + 4, card.y + card.h - 16, (card.w - 8) * progress, 4);
  }

  if (card.type === '工程机器人' && card.durability !== undefined) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(card.x + 4, card.y + card.h - 22, card.w - 8, 4);
    ctx.fillStyle = card.durability > 20 ? '#22c55e' : '#ef4444';
    ctx.fillRect(card.x + 4, card.y + card.h - 22, (card.w - 8) * (card.durability / (card.maxDurability || 50)), 4);
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawCardContent(ctx: CanvasRenderingContext2D, card: Card) {
  const cx = card.x + card.w / 2;
  const cy = card.y + card.h / 2;

  ctx.fillStyle = card.glowColor;
  ctx.textAlign = 'center';
  ctx.font = 'bold 14px monospace';

  switch (card.type) {
    case '特遣队员':
      drawPerson(ctx, cx, cy - 5, card.glowColor);
      ctx.fillText('队员', cx, card.y + card.h - 8);
      break;
    case '婴儿':
      drawBaby(ctx, cx, cy - 5, card.glowColor);
      ctx.fillText('婴儿', cx, card.y + card.h - 8);
      break;
    case '主基地':
      drawBase(ctx, cx, cy - 5, card.glowColor);
      ctx.fillText('基地', cx, card.y + card.h - 8);
      break;
    case '1级铁矿':
      drawRock(ctx, cx, cy - 5, '#888888');
      ctx.fillText('铁矿', cx, card.y + card.h - 8);
      break;
    case '1级铜矿':
      drawRock(ctx, cx, cy - 5, '#b87333');
      ctx.fillText('铜矿', cx, card.y + card.h - 8);
      break;
    case '星尘矿':
      drawStar(ctx, cx, cy - 5, '#a855f7');
      ctx.fillText('星尘矿', cx, card.y + card.h - 8);
      break;
    case '果树':
      drawBerry(ctx, cx, cy - 5, '#22c55e');
      ctx.fillText('果树', cx, card.y + card.h - 8);
      break;
    case '野果':
      drawBerry(ctx, cx, cy - 5, '#22c55e');
      ctx.fillText('野果', cx, card.y + card.h - 8);
      break;
    case '鱼':
      drawFish(ctx, cx, cy - 5, '#3b82f6');
      ctx.fillText('鱼', cx, card.y + card.h - 8);
      break;
    case '肉':
      drawMeat(ctx, cx, cy - 5, '#ef4444');
      ctx.fillText('肉', cx, card.y + card.h - 8);
      break;
    case '铁':
      ctx.fillStyle = '#888888';
      ctx.fillRect(cx - 8, cy - 8, 16, 16);
      ctx.fillText('铁', cx, card.y + card.h - 8);
      break;
    case '铜':
      ctx.fillStyle = '#b87333';
      ctx.fillRect(cx - 8, cy - 8, 16, 16);
      ctx.fillText('铜', cx, card.y + card.h - 8);
      break;
    case '浆果':
      drawBerry(ctx, cx, cy - 5, '#22c55e');
      ctx.fillText('浆果', cx, card.y + card.h - 8);
      break;
    case '1级星尘':
      drawStar(ctx, cx, cy - 5, '#a855f7');
      ctx.fillText('星尘', cx, card.y + card.h - 8);
      break;
    case '铁棍':
      drawSword(ctx, cx, cy - 5, '#a0a0a0');
      ctx.fillText('铁棍', cx, card.y + card.h - 8);
      break;
    case '镭射枪':
      drawLaserGun(ctx, cx, cy - 5, '#ff0040');
      ctx.fillText('镭射枪', cx, card.y + card.h - 8);
      break;
    case '护甲':
      drawShield(ctx, cx, cy - 5, '#60a5fa');
      ctx.fillText('护甲', cx, card.y + card.h - 8);
      break;
    case '工程机器人':
      drawRobot(ctx, cx, cy - 5, '#00f3ff', false);
      ctx.fillText('工程机', cx, card.y + card.h - 8);
      break;
    case '战斗机器人':
      drawRobot(ctx, cx, cy - 5, '#ff0040', true);
      ctx.fillText('战斗兵', cx, card.y + card.h - 8);
      break;
    case '战斗机甲':
      drawMecha(ctx, cx, cy - 5, '#ffd700');
      ctx.fillText('机甲', cx, card.y + card.h - 8);
      break;
    case '家猪':
      drawPig(ctx, cx, cy - 5, '#fbbf24');
      ctx.fillText('家猪', cx, card.y + card.h - 8);
      break;
    case 'CORE宝箱':
      drawChest(ctx, cx, cy - 5, '#ffd700');
      ctx.fillText('宝箱', cx, card.y + card.h - 8);
      break;
    case '异星怪兽':
      drawMonster(ctx, cx, cy - 5, '#ef4444');
      ctx.fillText('怪兽', cx, card.y + card.h - 8);
      break;
    case '异星狼狗':
      drawWolf(ctx, cx, cy - 5, '#f97316');
      ctx.fillText('狼狗', cx, card.y + card.h - 8);
      break;
    case '异星野猪':
      drawBoar(ctx, cx, cy - 5, '#a16207');
      ctx.fillText('野猪', cx, card.y + card.h - 8);
      break;
    case '外星杂兵':
      drawAlien(ctx, cx, cy - 5, '#dc2626');
      ctx.fillText('杂兵', cx, card.y + card.h - 8);
      break;
    case '虚空收割者·噶比皮':
      drawBoss(ctx, cx, cy - 5, '#7f1d1d');
      ctx.fillText('噶比皮', cx, card.y + card.h - 8);
      break;
    case '废铁':
      ctx.fillStyle = '#666666';
      ctx.fillRect(cx - 8, cy - 8, 16, 16);
      ctx.fillText('废铁', cx, card.y + card.h - 8);
      break;
    default:
      ctx.beginPath(); ctx.arc(cx, cy - 5, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(card.name.slice(0, 4), cx, card.y + card.h - 8);
  }

  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  const statusParts: string[] = [];
  if (card.maxHp > 1) statusParts.push(`♥${card.hp}`);
  if (card.atk > 0) statusParts.push(`⚔${card.atk}`);
  if (card.maxHunger > 0) statusParts.push(`🍞${card.hunger}`);
  if (statusParts.length > 0) {
    ctx.fillStyle = '#fff';
    ctx.fillText(statusParts.join(' '), cx, card.y + card.h - 26);
  }
}

// ============ 图标绘制函数 ============

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawPerson(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y - 8, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(x - 5, y - 2, 10, 14);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - 2, y - 9, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 2, y - 9, 2, 0, Math.PI * 2); ctx.fill();
}

function drawBaby(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y - 5, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(x - 4, y, 8, 10);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - 1.5, y - 6, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 1.5, y - 6, 1.5, 0, Math.PI * 2); ctx.fill();
}

function drawBase(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x - 12, y - 5, 24, 15);
  ctx.beginPath(); ctx.moveTo(x - 15, y - 5); ctx.lineTo(x, y - 18); ctx.lineTo(x + 15, y - 5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#00f3ff';
  ctx.fillRect(x - 3, y - 2, 6, 8);
}

function drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - 10, y + 8);
  ctx.lineTo(x - 5, y - 10);
  ctx.lineTo(x + 8, y - 8);
  ctx.lineTo(x + 10, y + 5);
  ctx.closePath();
  ctx.fill();
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const px = x + Math.cos(a) * 10;
    const py = y + Math.sin(a) * 10;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    const ia = a + Math.PI / 5;
    const ix = x + Math.cos(ia) * 4;
    const iy = y + Math.sin(ia) * 4;
    ctx.lineTo(ix, iy);
  }
  ctx.closePath(); ctx.fill();
}

function drawBerry(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x - 3, y + 2, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 3, y + 2, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y - 3, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#166534';
  ctx.fillRect(x - 1, y - 10, 2, 5);
}

function drawFish(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 10, y);
  ctx.lineTo(x + 16, y - 5);
  ctx.lineTo(x + 16, y + 5);
  ctx.closePath();
  ctx.fill();
}

function drawMeat(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, 10, 7, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#991b1b';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x - 5, y - 3); ctx.lineTo(x + 5, y + 3); ctx.stroke();
}

function drawSword(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x, y + 8); ctx.stroke();
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 6, y + 8); ctx.lineTo(x + 6, y + 8); ctx.stroke();
}

function drawLaserGun(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x - 3, y - 10, 6, 18);
  ctx.fillRect(x - 8, y - 4, 16, 4);
  ctx.fillStyle = '#00f3ff';
  ctx.beginPath(); ctx.arc(x, y - 12, 3, 0, Math.PI * 2); ctx.fill();
}

function drawShield(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - 12);
  ctx.quadraticCurveTo(x + 10, y - 5, x + 8, y + 8);
  ctx.quadraticCurveTo(x, y + 12, x - 8, y + 8);
  ctx.quadraticCurveTo(x - 10, y - 5, x, y - 12);
  ctx.closePath();
  ctx.fill();
}

function drawRobot(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, isCombat: boolean) {
  ctx.fillStyle = color;
  ctx.fillRect(x - 8, y - 10, 16, 14);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - 4, y - 8, 3, 3);
  ctx.fillRect(x + 1, y - 8, 3, 3);
  ctx.fillStyle = color;
  ctx.fillRect(x - 10, y + 2, 6, 8);
  ctx.fillRect(x + 4, y + 2, 6, 8);
  if (isCombat) {
    ctx.strokeStyle = '#ff0040';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 10, y - 5); ctx.lineTo(x + 16, y - 8); ctx.stroke();
  }
}

function drawMecha(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x - 12, y - 15, 24, 20);
  ctx.fillStyle = '#ff0040';
  ctx.beginPath(); ctx.arc(x - 4, y - 10, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 4, y - 10, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(x - 16, y + 3, 8, 12);
  ctx.fillRect(x + 8, y + 3, 8, 12);
  ctx.fillRect(x - 6, y + 5, 12, 10);
}

function drawPig(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x, y, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - 3, y - 2, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 3, y - 2, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(x - 3, y - 2, 1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 3, y - 2, 1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath(); ctx.ellipse(x + 10, y + 2, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
}

function drawChest(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x - 10, y - 8, 20, 16);
  ctx.fillStyle = '#b8860b';
  ctx.fillRect(x - 2, y - 4, 4, 8);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x, y - 10, 3, 0, Math.PI * 2); ctx.fill();
}

function drawMonster(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y - 5, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - 4, y - 8, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 4, y - 8, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(x - 4, y - 8, 1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 4, y - 8, 1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(x - 8, y + 2); ctx.lineTo(x - 12, y + 8); ctx.lineTo(x - 4, y + 5); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 8, y + 2); ctx.lineTo(x + 12, y + 8); ctx.lineTo(x + 4, y + 5); ctx.closePath(); ctx.fill();
}

function drawWolf(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - 12, y + 5);
  ctx.lineTo(x - 8, y - 10);
  ctx.lineTo(x, y - 5);
  ctx.lineTo(x + 8, y - 10);
  ctx.lineTo(x + 12, y + 5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - 3, y - 5, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 3, y - 5, 2, 0, Math.PI * 2); ctx.fill();
}

function drawBoar(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, 12, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fcd34d';
  ctx.beginPath(); ctx.arc(x + 10, y, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x + 11, y - 1, 1, 0, Math.PI * 2); ctx.fill();
}

function drawAlien(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x - 8, y - 12, 16, 20);
  ctx.fillStyle = '#00f3ff';
  ctx.beginPath(); ctx.arc(x - 3, y - 8, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 3, y - 8, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(x - 12, y, 4, 10);
  ctx.fillRect(x + 8, y, 4, 10);
}

function drawBoss(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x - 15, y - 18, 30, 24);
  ctx.fillStyle = '#ff0000';
  ctx.beginPath(); ctx.arc(x - 5, y - 12, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 5, y - 12, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(x - 5, y - 12, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 5, y - 12, 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(x - 20, y + 4, 8, 14);
  ctx.fillRect(x + 12, y + 4, 8, 14);
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 15, y + 8); ctx.lineTo(x - 25, y + 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 15, y + 8); ctx.lineTo(x + 25, y + 2); ctx.stroke();
}

function drawPortal(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement) {
  const time = performance.now() * 0.003;
  const cx = c.width / 2;
  const cy = c.height / 2;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 3; i++) {
    const r = 40 + i * 20 + Math.sin(time + i) * 5;
    const alpha = 0.1 + Math.sin(time * 2 + i) * 0.05;
    ctx.strokeStyle = `rgba(168,85,247,${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(168,85,247,0.2)`;
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0, Math.PI * 2);
  ctx.fill();
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

// ============ 计算属性 ============

const timeOfDay = computed(() => {
  const progress = dayTimer.value / DAY_SECONDS;
  if (progress < 0.2) return '黎明';
  if (progress < 0.7) return '白天';
  if (progress < 0.9) return '黄昏';
  return '夜晚';
});

// ============ 生命周期 ============

const resizeHandler = () => {
  const c = gameCanvas.value;
  if (!c) return;
  const p = c.parentElement!;
  const oldW = c.width, oldH = c.height;
  c.width = p.clientWidth;
  c.height = p.clientHeight;
  if (oldW > 0 && cards.value.length > 0) {
    for (const card of cards.value) {
      card.x = Math.max(0, Math.min(c.width - card.w, card.x));
      card.y = Math.max(0, Math.min(c.height - card.h, card.y));
    }
  }
};

onMounted(() => {
  resizeHandler();
  window.addEventListener('resize', resizeHandler);
  window.addEventListener('keydown', onKeyDown);
  lastTime = performance.now();
  if (props.continueGame) {
    startGame();
  }
});

onUnmounted(() => {
  cancelAnimationFrame(animId);
  window.removeEventListener('resize', resizeHandler);
  window.removeEventListener('keydown', onKeyDown);
  if (audioCtx) audioCtx.close().catch(() => {});
});

function onKeyDown(e: KeyboardEvent) {
  if (e.code === 'Escape') {
    e.preventDefault();
    exitToLobby();
  }
  if (e.code === 'Space') {
    e.preventDefault();
    autoStackCards();
  }
}
</script>