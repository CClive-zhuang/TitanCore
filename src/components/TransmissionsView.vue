// 文件名: src/components/TransmissionsView.vue
<template>
  <div class="h-full flex flex-col p-8 animate-fade-in relative select-none">
    
    <div class="flex flex-col gap-6 mb-8">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-6">
          <h2 class="text-4xl theme-header text-primary mb-1 tracking-wider drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]">{{ t('transmissions.title') }}</h2>
          <div class="px-4 py-2 rounded-lg border border-primary/20 text-primary font-code font-bold flex items-center gap-3 shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)] bg-primary/10">
            <span class="text-sm opacity-70">{{ t('transmissions.speed') }}:</span>
            <span class="text-xl tracking-wider">{{ formatBytes(transmissionStore.globalSpeed) }}/s</span>
          </div>
        </div>
        
        <div class="flex items-center gap-3 bg-black/30 px-4 py-2 rounded-lg border border-white/10">
          <span class="text-xs text-text-muted font-bold tracking-wider">{{ t('transmissions.speedLimit') }}</span>
          <div class="flex gap-1">
            <button 
              v-for="opt in speedOptions" 
              :key="opt.value"
              @click="setSpeedLimit(opt.value)"
              class="px-4 py-1.5 rounded text-xs font-black tracking-wider transition-all"
              :class="transmissionStore.speedLimit === opt.value ? 'bg-primary text-black shadow-[0_0_10px_rgba(var(--primary-rgb),0.4)]' : 'bg-white/5 text-text-muted hover:text-primary hover:bg-white/10'"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
        
        <div class="flex gap-4 items-center">
           <div class="flex bg-bg-panel/50 rounded-lg p-1 border border-white/5">
              <button @click="handleUnpauseAll()" class="p-2 hover:text-primary transition-colors" :title="t('transmissions.unpauseAll')">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
                  <path d="M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z"></path>
                </svg>
              </button>
              <div class="w-[1px] bg-white/10 my-1"></div>
              <button @click="handlePauseAll()" class="p-2 hover:text-primary transition-colors" :title="t('transmissions.pauseAll')">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
                  <path d="M216,48V208a16,16,0,0,1-16,16H160a16,16,0,0,1-16-16V48a16,16,0,0,1,16-16h40A16,16,0,0,1,216,48ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Z"></path>
                </svg>
              </button>
           </div>
           
           <div class="relative group">
             <div class="absolute inset-0 bg-primary opacity-20 group-hover:opacity-40 transition-opacity"></div>
             <button @click="showAddModal = true" class="relative bg-primary text-bg-main flex items-center justify-center w-10 h-10 rounded-theme font-bold hover:brightness-110 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)] transition-all active:scale-95" :title="t('transmissions.addTask')">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
                 <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"></path>
               </svg>
             </button>
           </div>
        </div>
      </div>

      <div class="glass-panel flex items-center justify-between p-3 rounded-theme bg-[#0a0f16] border border-white/10 z-20">
        <div class="flex items-center gap-4 flex-1 mr-8">
          <span class="text-sm text-text-muted font-bold whitespace-nowrap pl-2">{{ t('transmissions.savePath') }}:</span>
          
          <button @click="chooseDirectory" class="titan-action-btn p-2 rounded-md hover:bg-white/10 transition-colors text-accent" :title="t('transmissions.changePath')">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
               <path d="M216,72H131.31L104,44.69A15.86,15.86,0,0,0,92.69,40H40A16,16,0,0,0,24,56V200.62A15.4,15.4,0,0,0,39.38,216H216.89A15.13,15.13,0,0,0,232,200.89V88A16,16,0,0,0,216,72ZM40,56H92.69l27.32,27.31A15.86,15.86,0,0,0,131.31,88H216v24H40Z"></path>
             </svg>
          </button>

          <div 
            class="flex-1 bg-black/30 px-4 py-2 rounded text-sm font-code text-text-muted truncate select-text border border-text-muted/10 hover:border-primary/50 transition-colors group cursor-pointer" 
            @click="chooseDirectory"
          >
            <span class="group-hover:text-primary transition-colors font-bold">{{ transmissionStore.defaultDownloadDir || '正在初始化系统下载路径...' }}</span>
          </div>

          <button @click="handleOpenDownloadsFolder" class="titan-action-btn" :title="t('transmissions.openFolder')">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
              <path d="M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16h96A16,16,0,0,1,200,64Z"></path>
            </svg>
          </button>
        </div>

        <div class="flex bg-black/30 p-1 rounded border border-text-muted/10">
           <button 
            @click="filter = 'all'"
            class="px-6 py-2 rounded-[2px] text-xs font-black uppercase transition-all tracking-wider"
            :class="filter === 'all' ? 'bg-primary text-bg-main shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)] scale-105' : 'text-text-muted hover:text-primary'"
          >{{ t('transmissions.filterAll') }}</button>
          <button 
            @click="filter = 'active'"
            class="px-6 py-2 rounded-[2px] text-xs font-black uppercase transition-all tracking-wider"
            :class="filter === 'active' ? 'bg-primary text-bg-main shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)] scale-105' : 'text-text-muted hover:text-primary'"
          >{{ t('transmissions.filterActive') }}</button>
          <button 
            @click="filter = 'completed'"
            class="px-6 py-2 rounded-[2px] text-xs font-black uppercase transition-all tracking-wider"
            :class="filter === 'completed' ? 'bg-primary text-bg-main shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)] scale-105' : 'text-text-muted hover:text-primary'"
          >{{ t('transmissions.filterCompleted') }}</button>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-[50px_minmax(150px,1.5fr)_minmax(180px,2fr)_120px_120px_160px] gap-6 px-4 py-3 text-sm font-black text-text-muted border-b border-text-muted/10 uppercase tracking-wider bg-black/20 rounded-t-lg z-10">
      <div class="flex items-center justify-center">
        <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll" class="accent-primary w-5 h-5"/>
      </div>
      <div>{{ t('transmissions.taskName') }}</div>
      <div>{{ t('transmissions.progress') }}</div>
      <div>{{ t('transmissions.speed') }}</div>
      <div>{{ t('transmissions.timeLeft') }}</div>
      <div class="text-right pr-6">{{ t('transmissions.actions') }}</div>
    </div>

    <div class="flex-1 overflow-y-auto space-y-3 py-3 scrollbar-hide z-0" @contextmenu="handleContextMenu($event)">
      <div 
        v-for="task in filteredTasks" 
        :key="task.gid"
        @contextmenu.stop="handleContextMenu($event, task.gid)"
        class="glass-panel group grid grid-cols-[50px_minmax(150px,1.5fr)_minmax(180px,2fr)_120px_120px_160px] gap-6 items-center px-4 py-4 rounded-theme transition-all text-base hover:bg-white/5 border border-transparent"
        :class="[
          selectedGids.has(task.gid) ? 'border-primary/40 bg-primary/5' : 'hover:border-primary/20',
          task.status === 'error' ? 'border-red-500/20 hover:border-red-500/40' : ''
        ]"
        @click="toggleSelect(task.gid)" 
      >
        <div class="flex items-center justify-center" @click.stop>
           <input 
             type="checkbox" 
             :checked="selectedGids.has(task.gid)" 
             @change="toggleSelect(task.gid)" 
             class="accent-primary w-5 h-5"
           />
        </div>

        <div class="min-w-0 pr-4">
          <div class="font-bold text-text-main truncate mb-0.5 leading-tight" :title="task.name">{{ task.name }}</div>
          
          <div v-if="task.filePath" class="text-[10px] font-mono text-primary/70 truncate mb-1 flex items-center gap-1" :title="task.filePath">
             <span class="opacity-50">📄</span> {{ getFileName(task.filePath) }}
          </div>
          
          <div class="text-xs font-code flex gap-3 font-bold">
            <span class="text-text-muted opacity-80">{{ formatBytes(task.totalSize) }}</span>
            <span :class="{
              'text-primary animate-pulse': task.status === 'active',
              'text-yellow-500': task.status === 'paused',
              'text-green-500': task.status === 'completed',
              'text-red-500': task.status === 'error'
            }">[{{ formatStatus(task.status) }}]</span>
          </div>
        </div>

        <div class="relative w-full h-4 bg-black/40 rounded-full overflow-hidden border border-text-muted/10 shadow-inner">
          <div 
            v-if="task.status !== 'error'"
            class="absolute inset-y-0 left-0 transition-all duration-300 ease-out flex items-center bg-primary"
            :style="{ width: task.progress + '%' }"
            :class="task.status === 'active' ? 'opacity-100' : 'opacity-60 grayscale'"
          >
          </div>
          
          <div v-else class="absolute inset-0 bg-red-500/20 flex items-center px-2">
             <div class="text-[10px] font-bold text-red-500 animate-pulse truncate w-full flex items-center gap-1">
                ⚠️ {{ task.errorMessage || 'Unknown Error' }}
             </div>
          </div>

          <div v-if="task.status !== 'error'" class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-code font-bold text-white z-10 mix-blend-difference drop-shadow-md">
            {{ task.progress.toFixed(1) }}%
          </div>
        </div>

        <div class="font-code text-sm text-text-muted font-bold">
          <span v-if="task.status === 'active'" class="text-text-main shadow-primary/20 drop-shadow-[0_0_5px_rgba(var(--primary-rgb),0.5)]">{{ formatBytes(task.speed) }}/s</span>
          <span v-else>--</span>
        </div>

        <div class="font-code text-sm text-text-muted font-medium">
           {{ formatTime(task.timeLeft) }}
        </div>

        <div class="flex items-center justify-end gap-3 pr-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            @click.stop="handleToggleTask(task)" 
            class="titan-action-btn hover:scale-110 transform p-2 bg-white/5 rounded-md transition-colors" 
            :class="task.status === 'error' ? 'text-red-400 hover:text-red-500 hover:bg-red-500/10' : 'hover:text-primary'"
          >
            <svg v-if="task.status === 'active'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
              <path d="M216,48V208a16,16,0,0,1-16,16H160a16,16,0,0,1-16-16V48a16,16,0,0,1,16-16h40A16,16,0,0,1,216,48ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Z"></path>
            </svg>
            <svg v-else-if="task.status === 'error'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
              <path d="M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z"></path>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
              <path d="M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z"></path>
            </svg>
          </button>
          
          <button @click.stop="openFilePosition(task.gid)" class="titan-action-btn hover:text-accent transition-colors hover:scale-110 transform p-2 bg-white/5 rounded-md" title="打开文件位置">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
              <path d="M200,64V168a8,8,0,0,1-16,0V83.31L69.66,197.66a8,8,0,0,1-11.32-11.32L172.69,72H88a8,8,0,0,1,0-16h96A16,16,0,0,1,200,64Z"></path>
            </svg>
          </button>

          <button @click.stop="promptDelete(task.gid)" class="titan-action-btn text-red-400 hover:text-red-500 transition-colors hover:scale-110 transform p-2 bg-white/5 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
              <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8-8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path>
            </svg>
          </button>
        </div>
      </div>
      
      <div v-if="filteredTasks.length === 0" class="h-96 flex flex-col items-center justify-center text-text-muted opacity-40">
        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" fill="currentColor" viewBox="0 0 256 256" class="mb-4">
          <path d="M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,8-8H216A8,8,0,0,1,224,144Zm-16-64a8,8,0,0,0-8,8v24H144V32a8,8,0,0,0-16,0V112H56V88a8,8,0,0,0-16,0v64a8,8,0,0,0,8,8h64v24a8,8,0,0,0,16,0V160h64a8,8,0,0,0,8-8V88A8,8,0,0,0,208,80Z"></path>
        </svg>
        <p class="font-code text-xl tracking-[0.3em] font-bold">{{ t('transmissions.empty') }}</p>
      </div>
    </div>

    <BaseModal :visible="showAddModal" @close="showAddModal = false" containerClass="w-full max-w-3xl">
      <div class="bg-bg-panel p-8 w-full rounded-theme shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative border border-white/10 overflow-hidden">
        <div class="absolute -top-32 -right-32 w-80 h-80 bg-[radial-gradient(circle_at_center,_rgba(var(--primary-rgb),0.15)_0%,_transparent_60%)] pointer-events-none"></div>
        
        <h3 class="text-2xl text-primary font-black mb-6 tracking-wide relative z-10">{{ t('transmissions.addModal.title') }}</h3>
        
        <textarea 
          v-model="newUrls" 
          :placeholder="t('transmissions.addModal.placeholder')" 
          class="w-full h-64 bg-black/30 border border-text-muted/20 rounded-theme p-6 font-code text-sm text-text-main focus:border-primary focus:bg-primary/5 focus:outline-none mb-6 resize-none leading-relaxed relative z-10"
        ></textarea>
        
        <div class="flex justify-end gap-6 relative z-10">
          <button @click="showAddModal = false" class="px-8 py-3 text-text-muted font-bold hover:text-text-main transition-colors text-sm tracking-widest">{{ t('transmissions.addModal.cancel') }}</button>
          <button @click="handleAddTasks" class="px-8 py-3 bg-primary text-black font-bold rounded shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)] hover:scale-105 transition-all text-sm tracking-widest">{{ t('transmissions.addModal.download') }}</button>
        </div>
      </div>
    </BaseModal>

    <BaseModal :visible="showDeleteModal" @close="showDeleteModal = false" containerClass="w-full max-w-lg">
      <div class="bg-bg-panel border border-primary/30 p-8 w-full rounded-theme shadow-2xl">
        <h3 class="text-2xl font-black mb-6 flex items-center gap-3" :class="isDestroyMode ? 'text-red-400' : 'text-primary'">
          <span>{{ isDestroyMode ? '💣 ' + t('transmissions.deleteModal.destroyTitle') : '🧹 ' + t('transmissions.deleteModal.removeRecord') }}</span>
        </h3>

        <div class="text-text-muted mb-8 text-base leading-relaxed">
          <p class="mb-2">{{ t('transmissions.deleteModal.targetCount', { count: targetGidsForDelete.length }) }}</p>
          <div v-if="isDestroyMode" class="bg-red-500/10 border border-red-500/30 rounded p-3 text-red-400 text-sm font-bold flex gap-2 items-start">
            <span>⚠️</span>
            <span>{{ t('transmissions.deleteModal.destroyWarning') }}</span>
          </div>
          <div v-else class="bg-primary/10 border border-primary/20 rounded p-3 text-primary text-sm font-bold flex gap-2 items-start">
            <span>ℹ</span>
            <span>{{ t('transmissions.deleteModal.info') }}</span>
          </div>
        </div>

        <div class="flex justify-end gap-6">
          <button @click="showDeleteModal = false" class="px-8 py-3 text-text-muted font-bold hover:text-text-main transition-colors text-sm tracking-widest uppercase">
            {{ t('common.cancel') }}
          </button>
          <button 
            @click="confirmDelete" 
            class="px-8 py-3 font-black rounded transition-all text-sm tracking-widest uppercase hover:scale-105 active:scale-95"
            :class="isDestroyMode ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-primary text-bg-main'"
          >
            {{ isDestroyMode ? t('transmissions.deleteModal.confirmDestroy') : t('transmissions.deleteModal.confirmRemove') }}
          </button>
        </div>
      </div>
    </BaseModal>

    <ContextMenu 
      :visible="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :title="selectedGids.size > 1 ? t('transmissions.contextMenu.batchOp', { count: selectedGids.size }) : t('transmissions.contextMenu.title')"
    >
      <div class="flex flex-col py-1 text-sm font-code">
        <button 
          v-if="hasErrorInSelection"
          @click="handleRetry" 
          class="group px-4 py-2.5 flex items-center gap-3 text-left transition-all hover:bg-primary/20 hover:text-primary text-text-main font-bold border-l-2 border-transparent hover:border-primary"
        >
          <span class="text-base group-hover:scale-110 transition-transform">🔄</span> 
          <span>重新下载</span>
        </button>

        <button 
          @click="batchToggle('unpause')" 
          class="group px-4 py-2.5 flex items-center gap-3 text-left transition-all hover:bg-primary/20 hover:text-primary text-text-main font-bold border-l-2 border-transparent hover:border-primary"
          :class="hasErrorInSelection ? 'text-primary' : ''"
        >
          <span class="text-base group-hover:scale-110 transition-transform">{{ hasErrorInSelection ? '⚡' : '▶' }}</span> 
          <span>{{ hasErrorInSelection ? '强制继续' : '开始/恢复' }}</span>
        </button>

        <button 
          @click="batchToggle('pause')" 
          class="group px-4 py-2.5 flex items-center gap-3 text-left transition-all hover:bg-primary/20 hover:text-primary text-text-main font-bold border-l-2 border-transparent hover:border-primary"
        >
          <span class="text-base group-hover:scale-110 transition-transform">⏸</span> 
          <span>{{ t('transmissions.contextMenu.pause') }}</span>
        </button>
        
        <div class="h-[1px] bg-white/10 my-1.5 mx-3"></div>
        
        <template v-if="selectedGids.size <= 1 && contextMenu.targetGid">
          <button 
            @click="openFilePosition(contextMenu.targetGid)" 
            class="group px-4 py-2.5 flex items-center gap-3 text-left transition-all hover:bg-accent/20 hover:text-accent text-text-main font-bold border-l-2 border-transparent hover:border-accent"
          >
            <span class="text-base group-hover:scale-110 transition-transform">🎯</span> 
            <span>{{ t('transmissions.openFileLocation') }}</span>
          </button>
          
          <div class="h-[1px] bg-white/10 my-1.5 mx-3"></div>
        </template>

        <button 
          @click="promptDelete(undefined, false)" 
          class="group px-4 py-2.5 flex items-center gap-3 text-left transition-all hover:bg-white/10 hover:text-white text-text-muted font-bold border-l-2 border-transparent hover:border-white"
        >
          <span class="text-base group-hover:scale-110 transition-transform">🧹</span> 
          <span>{{ t('transmissions.contextMenu.removeRecord') }}</span>
        </button>

        <button 
          @click="promptDelete(undefined, true)" 
          class="group px-4 py-2.5 flex items-center gap-3 text-left transition-all hover:bg-red-500/20 hover:text-red-400 text-red-500/80 font-bold border-l-2 border-transparent hover:border-red-500"
        >
          <span class="text-base group-hover:scale-110 transition-transform">💣</span> 
          <span>{{ t('transmissions.contextMenu.destroy') }}</span>
        </button>
      </div>
    </ContextMenu>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import Swal from 'sweetalert2'
import { t } from '../i18n'
import { useTransmissionStore } from '../stores/transmissionStore'
import { formatBytes, formatTime } from '../utils/format'
import BaseModal from "./common/BaseModal.vue"
import ContextMenu from "./common/ContextMenu.vue"
import type { TaskStatus, DownloadTask } from '../stores/transmissionStore'

const transmissionStore = useTransmissionStore()

const filter = ref<'all' | 'active' | 'completed'>('all')
const searchQuery = ref('')
const selectedGids = ref<Set<string>>(new Set())
const showAddModal = ref(false)
const showDeleteModal = ref(false)
const newUrls = ref('')
const targetGidsForDelete = ref<string[]>([])
const isDestroyMode = ref(false)

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  targetGid: ''
})

const speedOptions = [
  { label: '2M', value: 2 * 1024 * 1024 },
  { label: '10M', value: 10 * 1024 * 1024 },
  { label: '满速', value: 0 }
]

onMounted(async () => {
  transmissionStore.initListeners()
  await loadDownloadPath()
  window.addEventListener('click', closeContextMenu)
})

onUnmounted(() => {
  window.removeEventListener('click', closeContextMenu)
  transmissionStore.cleanupListeners?.()
})

watch(() => transmissionStore.tasks, (newTasks) => {
  const validGids = new Set(newTasks.map(t => t.gid))
  const currentSelected = Array.from(selectedGids.value)
  const hasInvalid = currentSelected.some(gid => !validGids.has(gid))
  if (hasInvalid) {
    selectedGids.value = new Set(currentSelected.filter(gid => validGids.has(gid)))
  }
}, { deep: true })

const filteredTasks = computed(() => {
  let list = transmissionStore.tasks
  if (filter.value === 'active') {
    list = list.filter(t => t.status === 'active' || t.status === 'paused' || t.status === 'waiting')
  }
  if (filter.value === 'completed') {
    list = list.filter(t => t.status === 'completed' || t.status === 'error')
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(t => t.name.toLowerCase().includes(q))
  }
  return list
})

const isAllSelected = computed(() => 
  filteredTasks.value.length > 0 && selectedGids.value.size === filteredTasks.value.length
)

const hasErrorInSelection = computed(() => {
  const target = contextMenu.value.targetGid
  if (target) {
    const task = transmissionStore.tasks.find(t => t.gid === target)
    if (task?.status === 'error') return true
  }
  if (selectedGids.value.size > 0) {
    for (const gid of selectedGids.value) {
      const task = transmissionStore.tasks.find(t => t.gid === gid)
      if (task?.status === 'error') return true
    }
  }
  return false
})

function formatStatus(status: TaskStatus): string {
  const map: Record<string, string> = {
    'active': t('status.active'),
    'waiting': t('status.waiting'),
    'paused': t('status.paused'),
    'completed': t('status.completed'),
    'error': t('status.error')
  }
  return map[status] || status.toUpperCase()
}

function getFileName(fullPath: string): string {
  if (!fullPath) return ''
  return fullPath.split(/[/\\]/).pop() || fullPath
}

async function loadDownloadPath() {
  try {
    const saved = await window.electron.invoke('sys:get-config', 'download_path')
    if (saved && typeof saved === 'string') {
      transmissionStore.defaultDownloadDir = saved
    } else {
      const defaultDir = await window.electron.invoke('download:get-default-dir')
      if (defaultDir) {
        transmissionStore.defaultDownloadDir = defaultDir
      }
    }
  } catch (e) {
    console.error('[Transmissions] Load path error:', e)
  }
}

async function chooseDirectory() {
  const selectedPath = await transmissionStore.selectDirectory()
  if (selectedPath && typeof selectedPath === 'string') {
    transmissionStore.defaultDownloadDir = selectedPath
    await window.electron.invoke('sys:set-config', 'download_path', selectedPath)
  }
}

async function handleOpenDownloadsFolder() {
  if (transmissionStore.defaultDownloadDir) {
    await window.electron.invoke('sys:open-local-folder', transmissionStore.defaultDownloadDir)
  }
}

async function setSpeedLimit(bytesPerSecond: number) {
  await transmissionStore.setSpeedLimit(bytesPerSecond)
}

async function handleAddTasks() {
  if (!newUrls.value.trim()) return
  const lines = newUrls.value.split('\n').map(l => l.trim()).filter(l => l)
  if (lines.length === 0) return
  
  try {
    await transmissionStore.addTasks(lines, transmissionStore.defaultDownloadDir)
    newUrls.value = ''
    showAddModal.value = false
    Swal.fire({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true,
      title: t('transmissions.toastTasksAdded', { count: lines.length }),
      icon: 'success',
      background: '#0a0f16',
      color: '#00f3ff',
      customClass: {
        popup: 'border border-[#00f3ff]/30 shadow-[0_0_20px_rgba(0,243,255,0.2)] rounded-lg'
      }
    })
  } catch (e: any) {
    if (e.message?.includes('MAGNET_NOT_SUPPORTED')) {
      showAddModal.value = false
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        title: t('transmissions.errorMagnetTitle'),
        text: t('transmissions.errorMagnetDesc'),
        icon: 'warning',
        background: '#0a0f16',
        color: '#00f3ff',
        customClass: {
          popup: 'border border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.2)] rounded-lg'
        }
      })
    } else if (e.message?.includes('DIR_NOT_FOUND')) {
      showAddModal.value = false
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        title: t('transmissions.errorDirTitle'),
        text: t('transmissions.errorDirDesc'),
        icon: 'warning',
        background: '#0a0f16',
        color: '#00f3ff',
        customClass: {
          popup: 'border border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.2)] rounded-lg'
        }
      })
    } else if (e.message?.includes('Engine not ready')) {
      showAddModal.value = false
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        title: t('transmissions.errorEngineTitle'),
        text: t('transmissions.errorEngineDesc'),
        icon: 'error',
        background: '#0a0f16',
        color: '#00f3ff',
        customClass: {
          popup: 'border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)] rounded-lg'
        }
      })
    } else {
      showAddModal.value = false
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        title: t('transmissions.errorAddTaskTitle'),
        text: e.message || t('transmissions.errorAddTaskDesc'),
        icon: 'error',
        background: '#0a0f16',
        color: '#00f3ff',
        customClass: {
          popup: 'border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)] rounded-lg'
        }
      })
    }
  }
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedGids.value.clear()
  } else {
    filteredTasks.value.forEach(t => selectedGids.value.add(t.gid))
  }
}

function toggleSelect(gid: string) {
  if (selectedGids.value.has(gid)) {
    selectedGids.value.delete(gid)
  } else {
    selectedGids.value.add(gid)
  }
}

function handleContextMenu(e: MouseEvent, gid?: string) {
  e.preventDefault()
  e.stopPropagation()
  if (gid && !selectedGids.value.has(gid)) {
    selectedGids.value.clear()
    selectedGids.value.add(gid)
  }
  contextMenu.value = { visible: true, x: e.clientX, y: e.clientY, targetGid: gid || '' }
}

function closeContextMenu() {
  contextMenu.value.visible = false
}

function promptDelete(specificGid?: string, isDestroy = false) {
  isDestroyMode.value = isDestroy
  targetGidsForDelete.value = []
  if (specificGid) {
    targetGidsForDelete.value = [specificGid]
  } else {
    if (contextMenu.value.targetGid && !selectedGids.value.has(contextMenu.value.targetGid)) {
      targetGidsForDelete.value = [contextMenu.value.targetGid]
    } else {
      targetGidsForDelete.value = Array.from(selectedGids.value)
    }
  }
  if (targetGidsForDelete.value.length === 0) return
  showDeleteModal.value = true
  closeContextMenu()
}

async function confirmDelete() {
  const gids = [...targetGidsForDelete.value]
  for (const gid of gids) {
    if (isDestroyMode.value) {
      try {
        await transmissionStore.destroyTask(gid)
      } catch (e: any) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 4000,
          title: e.message || t('transmissions.errorDestroyFiles', { msg: 'unknown' }),
          icon: 'error',
          background: '#0a0f16',
          color: '#ff4444'
        })
        continue
      }
    } else {
      await transmissionStore.removeTask(gid)
    }
    selectedGids.value.delete(gid)
  }
  showDeleteModal.value = false
  targetGidsForDelete.value = []
  isDestroyMode.value = false
}

async function openFilePosition(gid: string) {
  const task = transmissionStore.tasks.find(t => t.gid === gid)
  if (task?.filePath || task?.dir) {
    const targetPath = task.filePath || task.dir
    try {
      await window.electron.invoke('sys:show-item-in-folder', targetPath)
    } catch (e) {
      if (task.dir) {
        await window.electron.invoke('sys:open-local-folder', task.dir)
      }
    }
  }
  closeContextMenu()
}

async function batchToggle(action: 'pause' | 'unpause') {
  const gidsToProcess = Array.from(selectedGids.value)
  for (const gid of gidsToProcess) {
    const task = transmissionStore.tasks.find(t => t.gid === gid)
    if (!task) continue
    if (action === 'unpause' && task.status === 'active') continue
    if (action === 'pause' && task.status !== 'active' && task.status !== 'waiting') continue
    await transmissionStore.toggleTask(gid, task.status)
  }
  closeContextMenu()
}

async function handleRetry() {
  const gidsToRetry = Array.from(selectedGids.value)
  for (const gid of gidsToRetry) {
    const task = transmissionStore.tasks.find(t => t.gid === gid)
    if (!task || task.status !== 'error') continue
    if (!task.url) continue
    await transmissionStore.removeTask(gid)
    await transmissionStore.addTask(task.url, task.dir, task.resourceId)
  }
  closeContextMenu()
}

function handleUnpauseAll() {
  transmissionStore.unpauseAll()
}

function handlePauseAll() {
  transmissionStore.pauseAll()
}

async function handleToggleTask(task: DownloadTask) {
  if (task.status === 'error') {
    await handleRetrySingle(task)
  } else {
    await transmissionStore.toggleTask(task.gid, task.status)
  }
}

async function handleRetrySingle(task: DownloadTask) {
  if (!task.url) return
  await transmissionStore.removeTask(task.gid)
  await transmissionStore.addTask(task.url, task.dir, task.resourceId)
}
</script>