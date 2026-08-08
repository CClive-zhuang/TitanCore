// 文件名: src/components/SettingsView.vue
<template>
  <div class="w-full h-full p-8 animate-fade-in overflow-y-auto scrollbar-hide relative">

    <div class="mb-10 flex items-end justify-between border-b border-white/5 pb-6">
      <div>
        <h2 class="text-4xl theme-header text-primary mb-2 tracking-widest drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]">
          {{ t('settings.title') }}
        </h2>
      </div>
      <div class="flex flex-col items-end gap-2">
        <div class="flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/10 backdrop-blur-sm">
          <button 
            type="button"
            v-for="lang in availableLangs" 
            :key="lang.code"
            @click="setLanguage(lang.code)"
            class="px-4 py-1.5 rounded-md text-sm font-bold font-code transition-all tracking-wider uppercase border border-transparent flex items-center gap-2"
            :class="currentLang === lang.code ? 'bg-primary text-black shadow-[0_0_10px_var(--primary)]' : 'text-text-muted hover:text-white hover:bg-white/5'"
          >
            {{ lang.label.split(' ')[0] }} 
          </button>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-10 w-full pb-20">

      <section class="group relative rounded-theme bg-bg-panel border border-white/5 p-1 overflow-hidden transition-all hover:border-primary/30">
        <div class="relative bg-bg-panel h-full rounded-theme p-6 md:p-8 flex flex-col gap-6">
          <h3 class="text-base font-bold text-white flex items-center gap-3 tracking-widest">
            <span class="w-2.5 h-2.5 rounded-full shadow-[0_0_8px]" :class="authStore.isConnected ? 'bg-green-500 shadow-green-500 animate-pulse' : 'bg-red-500 shadow-red-500'"></span>
            {{ t('settings.connection.title') }}
          </h3>

          <div class="flex items-stretch gap-3 w-full flex-wrap lg:flex-nowrap">
            <button 
              type="button"
              v-for="node in authStore.nodeList" 
              :key="node.id"
              @click.stop.prevent="selectNode(node.id)"
              :disabled="authStore.isProcessing"
              class="flex-1 py-3 px-2 rounded-lg font-bold font-code text-sm tracking-widest transition-all duration-300 select-none flex items-center justify-center gap-2 min-w-[120px]"
              :class="authStore.selectedNode === node.id ? NODE_STYLES[node.id] : 'bg-[#141414] text-[#888] border border-white/5 hover:border-white/20 hover:text-white disabled:opacity-40'"
            >
              <span v-if="authStore.isProcessing && authStore.selectedNode === node.id" class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
              {{ t(node.label) }}
            </button>

            <template v-if="!authStore.isConnected">
              <button 
                type="button"
                @click.stop.prevent="handleConnect"
                :disabled="authStore.isProcessing"
                class="px-8 py-3 bg-[#141414] border border-primary/50 text-primary hover:bg-primary hover:text-black font-bold font-code tracking-widest rounded-lg transition-colors disabled:opacity-50 text-sm whitespace-nowrap min-w-[120px]"
              >
                {{ authStore.isProcessing ? t('settings.connection.connecting') : t('settings.connection.connect') }}
              </button>
            </template>
            <template v-else>
              <button 
                type="button"
                @click.stop.prevent="handleDisconnect"
                :disabled="authStore.isProcessing"
                class="px-8 py-3 bg-[#141414] border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white font-bold font-code tracking-widest rounded-lg transition-colors whitespace-nowrap text-sm min-w-[120px]"
              >
                {{ t('settings.connection.disconnect') }}
              </button>
            </template>
          </div>

          <div class="flex items-center gap-3">
            <template v-if="!authStore.isConnected">
              <input 
                v-model="inputKey" 
                type="text" 
                :placeholder="t('settings.connection.keyPlaceholder')" 
                class="flex-1 bg-[#141414] border border-white/5 rounded-lg px-5 py-3 text-primary font-code text-sm focus:outline-none focus:border-primary transition-all max-w-md"
                @keyup.enter="handleConnect"
              />
              <span class="text-sm text-[#888] hidden md:block">
                {{ t('settings.connection.keyHint') }}
              </span>
            </template>
            <template v-else>
              <div class="flex gap-3 items-center">
                <span class="px-5 py-2.5 rounded-lg bg-[#141414] border border-white/5 text-sm font-bold font-code text-[#888] tracking-wider select-none">{{ t('settings.connection.noDEncrypt') }}</span>
                <span class="px-5 py-2.5 rounded-lg bg-[#141414] border border-white/5 text-sm font-bold font-code text-[#888] tracking-wider select-none">{{ t('settings.connection.noOnline') }}</span>
              </div>
            </template>
          </div>
        </div>
      </section>

      <section v-if="authStore.isConnected" class="flex flex-col gap-10 animate-fade-in">
        
        <div v-if="!authStore.isLoggedIn" class="group relative rounded-theme bg-bg-panel border border-white/5 p-1 overflow-hidden transition-all hover:border-accent/30">
          <div class="relative bg-bg-panel h-full rounded-theme p-8 flex flex-col md:flex-row gap-10">
            <div class="flex-1 space-y-5 border-r border-white/5 pr-10">
              <div class="flex items-center justify-between mb-2">
                <h3 class="font-bold text-xl text-white">{{ t('settings.identity.title') }}</h3>
              </div>
              <input v-model="email" type="text" :placeholder="t('settings.identity.emailPlaceholder')" class="w-full bg-black/20 border border-white/10 p-4 rounded-theme text-base focus:border-primary focus:outline-none font-code text-primary"/>
              <input v-model="password" type="password" :placeholder="t('settings.identity.passwordPlaceholder')" class="w-full bg-black/20 border border-white/10 p-4 rounded-theme text-base focus:border-primary focus:outline-none font-code text-primary" @keyup.enter="handleLogin"/>

              <div class="flex items-center justify-between pt-2">
                <span class="text-sm text-red-500 font-code font-bold">{{ statusMsg }}</span>
                <div class="flex items-center gap-4">
                  <button type="button" @click="openForgot" class="text-sm text-gray-500 hover:text-[#00f3ff] font-code transition-colors">{{ t('settings.identity.forgotPassword') }}</button>
                  <button type="button" @click="handleLogin" :disabled="authStore.isProcessing" class="px-10 py-3 bg-white/5 border border-white/10 hover:bg-primary hover:text-black hover:border-primary text-white font-bold rounded-theme transition-all font-code text-sm tracking-widest">
                    {{ authStore.isProcessing ? t('settings.identity.loggingIn') : t('settings.identity.login') }}
                  </button>
                </div>
              </div>
            </div>

            <div class="w-1/3 flex flex-col justify-center items-center text-center pl-4">
              <div class="w-16 h-16 mb-6 text-text-muted opacity-50">
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 256 256"><path d="M208,32H48A16,16,0,0,0,32,56V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM64,48h32V80H64Zm128,80H128V96h64Zm0-64H128V48h64Z"></path></svg>
              </div>
              <p class="text-sm text-text-muted mb-6 leading-relaxed whitespace-pre-line">{{ t('settings.identity.noAccount') }}</p>
              <button type="button" @click="handleOpenRegister" :disabled="authStore.isProcessing" class="w-full py-4 border border-primary/30 text-primary bg-primary/5 hover:bg-primary hover:text-black rounded-theme font-bold font-code text-sm tracking-widest transition-all shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]">
                <span>{{ t('settings.identity.register') }}</span>
              </button>
            </div>
          </div>
        </div>

        <div v-else class="group relative rounded-theme bg-bg-panel border border-white/5 p-1 overflow-hidden transition-all hover:border-accent/30">
          <div class="relative bg-bg-panel h-full rounded-theme p-8 flex flex-col gap-8">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-6">
                <div class="w-20 h-20 rounded-full border-2 border-primary p-0.5 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]">
                  <div class="w-full h-full rounded-full bg-gray-800 flex items-center justify-center text-primary font-bold text-3xl">
                    {{ authStore.user?.username?.charAt(0).toUpperCase() }}
                  </div>
                </div>
                <div>
                  <h3 class="text-3xl font-bold text-white mb-2">{{ authStore.user?.username }}</h3>
                  <div class="flex items-center gap-3">
                    <span class="text-sm font-code px-3 py-1 rounded border font-bold tracking-wide" :class="authStore.isVip ? 'border-accent text-accent bg-accent/10' : 'border-gray-500 text-gray-400'">
                      {{ authStore.isVip ? t('settings.identity.vipMember') : t('settings.identity.normalUser') }}
                    </span>
                    <span class="text-sm text-text-muted font-code">ID: {{ authStore.user?.id }}</span>
                    <span v-if="authStore.isVip && authStore.user?.vipExpireDate" class="text-sm text-accent font-code border-l border-white/20 pl-3">
                      {{ t('settings.identity.expire') }}: {{ authStore.user.vipExpireDate }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-4">
                <div class="flex items-center gap-4 bg-black/40 border border-white/10 px-5 py-2.5 rounded-lg relative overflow-hidden group/dbbtn">
                  <div class="flex flex-col text-right z-10">
                    <span class="text-[10px] text-white/50 font-code tracking-widest mb-0.5 uppercase">DOCUMENTATION</span>
                    <span class="text-sm font-bold tracking-wide text-white">{{ t('settings.docs.btnTitle') }}</span>
                  </div>
                  <button type="button" @click="showDocs = true" class="px-4 py-2 bg-[#00f3ff]/10 hover:bg-[#00f3ff]/20 text-[#00f3ff] border border-[#00f3ff]/30 rounded transition-all font-bold font-code text-sm tracking-widest relative overflow-hidden z-10 whitespace-nowrap">
                    <span>{{ t('settings.docs.openBtn') }}</span>
                  </button>
                </div>
                <button type="button" @click="handleLogout" :disabled="authStore.isProcessing" class="px-8 py-3 border border-white/20 text-text-muted hover:text-white hover:border-white rounded-theme font-code text-sm tracking-widest transition-all">
                  {{ t('settings.identity.logout') }}
                </button>
              </div>
            </div>

            <div v-if="authStore.isVip" class="vip-flow-line"></div>

            <div class="border-t border-white/5 pt-8">
              <h3 class="text-xl font-bold text-white mb-6 font-code tracking-wider flex items-center gap-2">
                {{ t('settings.redeem.title') }}
                <span class="text-xl font-bold text-[#00f3ff] opacity-70 tracking-wide">/ CORE</span>
              </h3>
              <div class="flex flex-col md:flex-row gap-6 items-stretch">
                <div class="flex-1 flex gap-4 items-center">
                  <input v-model="redeemCode" type="text" :placeholder="t('settings.redeem.codePlaceholder')" class="flex-1 bg-black/20 border border-white/10 rounded-theme px-5 py-3.5 text-[#00f3ff] font-code text-base focus:outline-none focus:border-[#00f3ff] transition-all" />
                  <input v-model="redeemContact" type="text" :placeholder="t('settings.redeem.contactPlaceholder')" class="w-56 bg-black/20 border border-white/10 rounded-theme px-5 py-3.5 text-white font-code text-base focus:outline-none focus:border-[#00f3ff] transition-all" />
                  <button type="button" @click="handleRedeem" :disabled="authStore.isProcessing" class="px-8 py-3.5 min-w-[100px] bg-[#00f3ff] text-black font-black font-code tracking-widest rounded-theme hover:bg-white transition-colors disabled:opacity-50 whitespace-nowrap">
                    {{ authStore.isProcessing ? t('settings.redeem.processing') : t('settings.redeem.activate') }}
                  </button>
                </div>
                <div class="w-px bg-white/10 mx-2 hidden md:block"></div>
                <button type="button" @click="handleOpenShop" class="px-8 py-3.5 min-w-[160px] border border-[#00f3ff]/30 text-[#00f3ff] hover:bg-[#00f3ff] hover:text-black rounded-theme font-bold font-code tracking-widest transition-all whitespace-nowrap">
                  {{ t('settings.redeem.getKey') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <section class="group relative rounded-theme bg-bg-panel border border-white/5 p-1 overflow-hidden transition-all hover:border-primary/30 animate-fade-in delay-100">
          <div class="relative bg-bg-panel h-full rounded-theme p-8 flex flex-col gap-6">

            <div class="flex items-center justify-between">
              <h3 class="text-base font-bold text-white flex items-center gap-3 tracking-widest">
                <span class="w-2.5 h-2.5 rounded-full shadow-[0_0_8px]" :class="coreStatusColor"></span>
                {{ t('settings.coreEnv.titleCore') }}
              </h3>
              <button 
                type="button"
                @click="runSystemDiagnostics"
                :disabled="isRunningDiagnostics"
                class="shrink-0 ml-4 px-5 py-2 bg-transparent border border-white/10 text-gray-400 hover:text-primary hover:border-primary/50 hover:bg-primary/5 font-code text-sm tracking-widest rounded-full transition-all disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
              >
                <span v-if="isRunningDiagnostics" class="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                {{ isRunningDiagnostics ? t('settings.manifest.scanning') : t('settings.manifest.diagnostics') }}
              </button>
            </div>

            <div class="flex flex-col md:flex-row gap-10 items-center">
              <div class="w-full md:w-1/2 pr-0 md:pr-10 border-b md:border-b-0 md:border-r border-white/5 flex flex-col justify-center gap-4 pb-8 md:pb-0">
                <div class="text-sm text-text-muted font-code tracking-widest uppercase flex items-center gap-2">
                  <span class="w-1.5 h-1.5 rounded-full bg-primary/50"></span>
                  {{ t('settings.version.title') }}
                </div>

                <div class="flex items-end gap-3">
                  <span class="font-code text-4xl font-light text-white tracking-wider">v{{ currentAppVersion || '1.7' }}</span>
                  <span class="text-sm text-primary border border-primary/30 bg-primary/10 px-2 py-0.5 rounded-full font-code tracking-widest mb-1.5">{{ t('settings.version.latest') }}</span>
                </div>

                 <button 
                  type="button"
                  @click="handleCheckAppUpdate"
                  :disabled="authStore.isProcessing"
                  class="w-fit mt-1 px-6 py-2 bg-transparent border border-white/10 text-gray-400 hover:text-primary hover:border-primary/50 hover:bg-primary/5 font-code text-sm tracking-widest rounded-full transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <svg v-if="!authStore.isProcessing" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Zm-96-88a88,88,0,1,0,88,88A88.1,88.1,0,0,0,128,40Z"></path></svg>
                  <span v-else class="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                  {{ authStore.isProcessing ? t('settings.version.scanning') : t('settings.version.checkUpdate') }}
                </button>
              </div>

              <div class="w-full md:w-1/2 pl-0 md:pl-4 flex flex-col justify-center gap-5">
                <div class="text-sm text-text-muted font-code tracking-widest uppercase flex items-center gap-2">
                  <span class="w-1.5 h-1.5 rounded-full shadow-[0_0_8px]" :class="engineStatus.ready ? 'bg-green-500 shadow-green-500 animate-pulse' : 'bg-yellow-500 shadow-yellow-500'"></span>
                  {{ t('settings.engine.title') }}
                </div>

                <div class="flex bg-[#0a0a0a] p-1.5 rounded-xl border border-white/5 w-fit shadow-inner">
                  <button 
                    type="button"
                    @click="openEngineConfirm('steamtools')"
                    :disabled="authStore.isProcessing || isSwitchingEngine"
                    class="px-8 py-2.5 rounded-lg font-bold font-code text-sm tracking-widest transition-all duration-300 select-none flex items-center justify-center gap-2"
                    :class="unlockEngine === 'steamtools' ? 'bg-[#00f3ff] text-black shadow-[0_0_15px_rgba(0,243,255,0.5)]' : 'text-gray-500 hover:text-white hover:bg-white/5 disabled:opacity-40'"
                  >
                    <span v-if="isSwitchingEngine && unlockEngine !== 'steamtools'" class="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                    <div class="flex flex-col items-center leading-tight">
                      <span>{{ t('settings.engine.st') }}</span>
                    </div>
                  </button>
                  <button 
                    type="button"
                    @click="openEngineConfirm('ost')"
                    :disabled="authStore.isProcessing || isSwitchingEngine"
                    class="px-8 py-2.5 rounded-lg font-bold font-code text-sm tracking-widest transition-all duration-300 select-none flex items-center justify-center gap-2"
                    :class="unlockEngine === 'ost' ? 'bg-[#00f3ff] text-black shadow-[0_0_15px_rgba(0,243,255,0.5)]' : 'text-gray-500 hover:text-white hover:bg-white/5 disabled:opacity-40'"
                  >
                    <span v-if="isSwitchingEngine && unlockEngine !== 'ost'" class="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                    <div class="flex flex-col items-center leading-tight">
                      <span>{{ t('settings.engine.ost') }}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between bg-[#0a0a0a] p-4 rounded-xl border border-white/5 shadow-inner">
              <div class="flex flex-col gap-1 overflow-hidden">
                <span class="text-sm font-bold font-code tracking-wider" :class="steamSource === 'manual' ? 'text-[#eab308]' : (steamPath ? 'text-gray-400' : 'text-red-500')">
                  {{ steamSource === 'manual' ? t('steam.sourceManual') : steamSource !== 'none' ? t('steam.sourceAuto') : t('steam.sourceNone') }}
                </span>
                <span class="font-code text-sm truncate" :class="!steamPath ? 'text-red-400' : 'text-[#00f3ff]'">
                  {{ steamPath || t('steam.pathNotFound') }}
                </span>
              </div>
              <button type="button" @click="handleSelectSteamPath" :disabled="isDetectingSteam" class="ml-4 px-6 py-2.5 bg-[#141414] border border-white/10 text-white hover:text-black hover:bg-[#00f3ff] hover:border-[#00f3ff] rounded-lg font-bold font-code text-sm tracking-widest transition-all disabled:opacity-50 whitespace-nowrap">
                <span v-if="isDetectingSteam" class="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block mr-2 align-middle"></span>
                {{ t('steam.manualSelect') }}
              </button>
            </div>

            <div class="bg-[#0a0a0a] p-4 rounded-xl border border-white/5 shadow-inner">
              <div class="flex flex-col gap-2 min-w-0">
                <span class="text-sm font-bold font-code tracking-wider text-gray-400">{{ t('settings.coreEnv.manifestNode') }}</span>
                <div class="flex items-center justify-between flex-wrap gap-2">
                  <div class="flex gap-2 flex-wrap">
                    <button 
                      type="button"
                      v-for="node in manifestNodeList" 
                      :key="node.key"
                      @click="selectManifestNode(node.key)"
                      :disabled="isSwitchingManifestNode"
                      class="px-6 py-2.5 rounded-lg font-bold font-code text-sm tracking-widest border transition-all duration-300 select-none flex items-center justify-center gap-2"
                      :class="selectedManifestNode === node.key ? 'bg-primary text-black border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]' : 'bg-[#141414] border-white/10 text-gray-400 hover:text-white hover:border-white/30 disabled:opacity-40'"
                    >
                      <span v-if="isSwitchingManifestNode && pendingManifestNode === node.key" class="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                      <span v-else class="w-1.5 h-1.5 rounded-full shadow-[0_0_6px]" :class="[manifestNodeDot(node.key), selectedManifestNode === node.key ? 'ring-1 ring-black/40' : '']"></span>
                      {{ node.label }}
                    </button>
                  </div>
                  <button 
                    type="button"
                    @click="handleImportLua"
                    :disabled="isImportingLua"
                    class="px-6 py-2.5 bg-[#141414] border border-white/10 text-white hover:text-black hover:bg-[#00f3ff] hover:border-[#00f3ff] rounded-lg font-bold font-code text-sm tracking-widest transition-all disabled:opacity-50 whitespace-nowrap flex items-center gap-2"
                  >
                    <span v-if="isImportingLua" class="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                    {{ isImportingLua ? '导入中...' : '导入清单' }}
                  </button>
                </div>
              </div>
            </div>

             <div v-if="showDiagnostics && diagnosticResults.length > 0" ref="diagnosticsRef" class="mt-2 space-y-3 animate-fade-in">
              <div class="h-px bg-white/5"></div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3 text-sm font-code font-bold tracking-wider">
                  <span class="text-green-400">✓ {{ diagnosticPassCount }} {{ t('settings.manifest.passLabel') }}</span>
                  <span class="text-white/20">·</span>
                  <span :class="diagnosticFailCount > 0 ? 'text-red-400' : 'text-gray-500'">✗ {{ diagnosticFailCount }} {{ t('settings.manifest.failLabel') }}</span>
                </div>
                <button 
                  type="button"
                  @click="diagnosticsCollapsed = !diagnosticsCollapsed"
                  class="px-3 py-1 text-sm font-code text-gray-500 hover:text-[#00f3ff] transition-colors flex items-center gap-1"
                >
                  {{ diagnosticsCollapsed ? t('settings.manifest.expand') : t('settings.manifest.collapse') }}
                  <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" class="transition-transform duration-300" :class="diagnosticsCollapsed ? 'rotate-180' : ''"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
              <div v-show="!diagnosticsCollapsed" class="space-y-2">
                <div 
                  v-for="item in diagnosticResults" 
                  :key="item.name"
                  class="flex items-start gap-3 p-3 rounded-lg border"
                  :class="item.ok ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'"
                >
                  <div class="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" :class="item.ok ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'">
                    <svg v-if="item.ok" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                    <svg v-else width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-bold mb-1" :class="item.ok ? 'text-green-400' : 'text-red-400'">{{ item.name }}</div>
                    <div class="text-sm leading-relaxed" :class="item.ok ? 'text-green-300/80' : 'text-red-300/80'">{{ item.message }}</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

      </section>

      <section class="group relative rounded-theme bg-bg-panel border border-red-500/20 p-1 overflow-hidden transition-all hover:border-red-500/50">
        <div class="relative bg-bg-panel h-full rounded-theme p-8 flex flex-col">
          <h3 class="text-xl font-bold text-red-400 mb-6 flex items-center gap-3">
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 256 256" class="text-red-500"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-8,56a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm8,104a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z"></path></svg>
            {{ t('settings.maintain.title') }}
          </h3>
          <div class="bg-red-500/5 p-6 rounded-theme border border-red-500/10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div class="text-base font-bold text-red-400 mb-2">{{ t('settings.maintain.restoreTitle') }}</div>
              <p class="text-sm text-gray-400 leading-relaxed max-w-xl">{{ t('settings.maintain.restoreDesc') }}</p>
            </div>
            <button type="button" @click="handleEmergencyRestore" :disabled="isRestoring" class="px-8 py-3 bg-red-500/10 border border-red-500/50 hover:bg-red-500 hover:text-white text-red-500 font-bold rounded-theme transition-all font-code whitespace-nowrap disabled:opacity-50 flex items-center gap-2">
              <span v-if="isRestoring" class="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
              {{ isRestoring ? t('settings.maintain.restoring') : t('settings.maintain.restoreBtn') }}
            </button>
          </div>
        </div>
      </section>

    </div>

    <BaseModal :visible="showEngineModal" @close="showEngineModal = false" :show-close="true" container-class="max-w-md w-full bg-[#0e0e14] border border-[#00f3ff]/30 shadow-[0_0_50px_rgba(0,243,255,0.15)] p-8">
      <div class="flex flex-col items-center text-center">
        <div class="w-14 h-14 rounded-full bg-[#00f3ff]/10 border border-[#00f3ff]/40 flex items-center justify-center text-[#00f3ff] mb-6 shadow-[0_0_20px_rgba(0,243,255,0.2)]">
          <svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
        <h3 class="text-xl font-black text-white tracking-widest uppercase mb-2">{{ t('settings.engine.switchConfirmTitle') }}</h3>
        <p class="text-sm text-gray-400 leading-relaxed mb-6 font-code">
          {{ t('settings.engine.switchDesc') }}<span class="text-[#00f3ff] font-bold tracking-wider px-1">{{ targetEngineName }}</span>{{ t('settings.engine.switchDescEnd') }}
        </p>
        <div class="w-full bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-8 text-left">
          <div class="flex items-center gap-2 text-red-400 font-bold text-sm tracking-wider uppercase mb-1">
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-8,56a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm8,104a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z"></path></svg>
            <span>{{ t('settings.engine.warningTitle') }}</span>
          </div>
          <p class="text-sm text-red-300/80 leading-relaxed">{{ t('settings.engine.warningText') }}</p>
        </div>
        <div class="flex items-center gap-4 w-full">
          <button type="button" @click="showEngineModal = false" class="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-bold font-code tracking-wider text-sm rounded-lg transition-all">{{ t('common.cancel') }}</button>
          <button type="button" @click="confirmEngineSwitch" :disabled="isSwitchingEngine" class="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-black font-code tracking-widest text-sm rounded-lg shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            <span v-if="isSwitchingEngine" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>{{ t('settings.engine.confirmBtn') }}</span>
          </button>
        </div>
      </div>
    </BaseModal>

    <BaseModal :visible="showNoticeModal" @close="showNoticeModal = false" :show-close="true" container-class="max-w-sm w-full bg-[#0e0e14] border border-white/10 p-6 text-center">
      <div class="flex flex-col items-center">
        <div class="w-12 h-12 rounded-full flex items-center justify-center mb-4" :class="noticeConfig.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'">
          <svg v-if="noticeConfig.type === 'success'" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
          <svg v-else width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </div>
        <h4 class="text-base font-bold text-white mb-2">{{ noticeConfig.title }}</h4>
        <p class="text-sm text-gray-400 mb-6 leading-relaxed whitespace-pre-line">{{ noticeConfig.text }}</p>
        <button @click="showNoticeModal = false" class="w-full py-2.5 bg-[#00f3ff] text-black font-black font-code text-sm tracking-widest rounded transition-all">{{ t('hints.swalOk') }}</button>
      </div>
    </BaseModal>

    <BaseModal :visible="showForgot" @close="showForgot = false" :show-close="true" container-class="max-w-sm w-full bg-[#0a0a0f] border border-white/10 p-8 shadow-[0_0_40px_rgba(0,243,255,0.08)]">
      <div class="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#00f3ff]/50 to-transparent"></div>
      <div class="flex flex-col items-center mb-6">
        <div class="w-12 h-12 rounded-full bg-[#00f3ff]/10 border border-[#00f3ff]/30 flex items-center justify-center text-[#00f3ff] mb-4 shadow-[0_0_15px_rgba(0,243,255,0.15)]">
          <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
        </div>
        <h3 class="text-lg font-black tracking-widest text-white uppercase">{{ t('settings.forgot.title') }}</h3>
        <div class="flex items-center gap-1.5 mt-3">
          <span v-for="step in 3" :key="step" class="h-1 rounded-full transition-all duration-300" :class="forgotStep >= step ? 'w-6 bg-[#00f3ff]' : 'w-3 bg-white/10'"></span>
        </div>
      </div>

      <div v-if="forgotStep === 1" class="space-y-4">
        <input v-model="forgotUsername" type="text" :placeholder="t('settings.forgot.usernamePlaceholder')" class="w-full bg-black/20 border border-white/10 rounded-theme px-5 py-3.5 text-white font-code text-base focus:outline-none focus:border-[#00f3ff] transition-all" @keyup.enter="handleForgotCheck"/>
        <input v-model="forgotEmail" type="email" :placeholder="t('settings.forgot.emailPlaceholder')" class="w-full bg-black/20 border border-white/10 rounded-theme px-5 py-3.5 text-white font-code text-base focus:outline-none focus:border-[#00f3ff] transition-all" @keyup.enter="handleForgotCheck"/>
        <button @click="handleForgotCheck" :disabled="!forgotUsername || !forgotEmail || authStore.isProcessing" class="w-full py-3 bg-[#00f3ff] text-black font-black font-code tracking-widest rounded-theme hover:bg-white transition-colors disabled:opacity-50">
          {{ authStore.isProcessing ? t('settings.forgot.searching') : t('settings.forgot.next') }}
        </button>
      </div>

      <div v-if="forgotStep === 2" class="space-y-4">
        <p class="text-sm text-gray-500 font-code">{{ t('settings.forgot.account') }}：<span class="text-white">{{ forgotUsername }}</span></p>
        <input v-model="forgotPass" type="password" :placeholder="t('settings.forgot.passwordPlaceholder')" class="w-full bg-black/20 border border-white/10 rounded-theme px-5 py-3.5 text-white font-code text-base focus:outline-none focus:border-[#00f3ff] transition-all" @keyup.enter="handleForgotReset"/>
        <button @click="handleForgotReset" :disabled="!forgotPass || forgotPass.length < 6 || authStore.isProcessing" class="w-full py-3 bg-[#00f3ff] text-black font-black font-code tracking-widest rounded-theme hover:bg-white transition-colors disabled:opacity-50">
          {{ authStore.isProcessing ? t('settings.forgot.resetting') : t('settings.forgot.reset') }}
        </button>
      </div>

      <div v-if="forgotStep === 3" class="text-center space-y-4">
        <p class="text-green-400 font-code text-sm">{{ t('settings.forgot.success') }}</p>
        <button @click="closeForgotAndLogin" class="w-full py-3 bg-white/5 border border-white/10 hover:bg-[#00f3ff]/10 hover:border-[#00f3ff]/30 hover:text-[#00f3ff] text-white font-black font-code tracking-widest rounded-theme transition-all">
          {{ t('settings.forgot.goLogin') }}
        </button>
      </div>

      <p v-if="statusMsg && showForgot" class="mt-4 text-sm text-red-500 font-code text-center">{{ statusMsg }}</p>
      <button @click="showForgot = false" class="mt-6 w-full text-sm text-gray-500 hover:text-white font-code transition-colors">{{ t('common.cancel') }}</button>
    </BaseModal>

    <BaseModal :visible="showRegister" @close="showRegister = false" :show-close="true" container-class="max-w-sm w-full bg-[#0a0a0f] border border-[#00f3ff]/20 p-8 shadow-[0_0_40px_rgba(0,243,255,0.08)]">
      <div class="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#00f3ff]/50 to-transparent"></div>
      <div class="flex flex-col items-center mb-6">
        <div class="w-12 h-12 rounded-full bg-[#00f3ff]/10 border border-[#00f3ff]/30 flex items-center justify-center text-[#00f3ff] mb-4 shadow-[0_0_15px_rgba(0,243,255,0.15)]">
          <svg width="22" height="22" fill="currentColor" viewBox="0 0 256 256"><path d="M256,136a8,8,0,0,1-8,8H224v24a8,8,0,0,1-16,0V144H184a8,8,0,0,1,0-16h24V104a8,8,0,0,1,16,0v24h24A8,8,0,0,1,256,136ZM140,56A44,44,0,1,1,96,100,44,44,0,0,1,140,56ZM96,112a48,48,0,0,0-33.94,14.06A76.2,76.2,0,0,0,40.2,169.73a8,8,0,0,0,7.6,5.52H96a8,8,0,0,0,0-16H57.07C64.56,139.82,79.48,128,96,128s31.44,11.82,38.93,31.23a8,8,0,0,0,14.14-7.51A64.85,64.85,0,0,0,133,143.3,48,48,0,0,0,96,112Z"/></svg>
        </div>
        <h3 class="text-xl font-code tracking-[4px] text-white uppercase">{{ t('register.title') }}</h3>
      </div>

      <div class="space-y-4">
        <input v-model="regUsername" type="text" :placeholder="t('register.usernamePlaceholder')" autocomplete="off" class="w-full bg-[#00f3ff]/5 border border-[#00f3ff]/20 rounded text-[#00f3ff] font-code text-sm focus:outline-none focus:border-[#00f3ff] focus:shadow-[0_0_15px_rgba(0,243,255,0.2)] transition-all px-4 py-3" @keyup.enter="handleRegisterSubmit"/>
        <input v-model="regEmail" type="email" :placeholder="t('register.emailPlaceholder')" autocomplete="off" class="w-full bg-[#00f3ff]/5 border border-[#00f3ff]/20 rounded text-[#00f3ff] font-code text-sm focus:outline-none focus:border-[#00f3ff] focus:shadow-[0_0_15px_rgba(0,243,255,0.2)] transition-all px-4 py-3" @keyup.enter="handleRegisterSubmit"/>
        <p class="text-[#ffc107] text-sm text-center font-sans leading-relaxed px-4">{{ t('register.emailHint') }}</p>
        <input v-model="regPassword" type="password" :placeholder="t('register.passwordPlaceholder')" autocomplete="off" class="w-full bg-[#00f3ff]/5 border border-[#00f3ff]/20 rounded text-[#00f3ff] font-code text-sm focus:outline-none focus:border-[#00f3ff] focus:shadow-[0_0_15px_rgba(0,243,255,0.2)] transition-all px-4 py-3" @keyup.enter="handleRegisterSubmit"/>
        <button @click="handleRegisterSubmit" :disabled="!regUsername || !regEmail || !regPassword || authStore.isProcessing" class="w-full py-3 bg-[#00f3ff] text-black font-black font-code tracking-widest rounded hover:bg-white transition-colors disabled:opacity-50 mt-2">
          {{ t('register.confirmBtn') }}
        </button>
      </div>

      <p v-if="regError" class="mt-4 text-[13px] text-[#ff4444] font-code text-center bg-[#1a1a1a] border border-[#ff4444]/30 py-2">{{ regError }}</p>
      <button @click="showRegister = false" class="mt-4 w-full text-sm text-gray-500 hover:text-white font-code transition-colors">{{ t('common.cancel') }}</button>
    </BaseModal>

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
        <h3 class="text-xl font-black text-white tracking-widest uppercase mb-2">
          {{ t('settings.update.title') }}
        </h3>
        <p class="text-sm text-gray-400 font-code mb-6">
          v{{ appUpdateInfo.currentVersion }} → v{{ appUpdateInfo.latestVersion }}
        </p>
        <div class="w-full bg-black/40 border border-white/10 rounded-lg p-4 mb-6">
          <p class="text-sm font-bold font-code tracking-wider text-[#00f3ff]">
            更新任务将加入全局下载队列，下载完成后将自动安装
          </p>
        </div>
        <div class="flex items-center gap-4 w-full">
          <button type="button" @click="showAppUpdateModal = false" class="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-bold font-code tracking-wider text-sm rounded-lg transition-all">
            {{ t('common.cancel') }}
          </button>
          <button type="button" @click="startAppUpdate" class="flex-1 py-3 bg-[#00f3ff] text-black font-black font-code tracking-widest rounded hover:bg-white transition-colors">
            确认更新
          </button>
        </div>
      </div>
    </BaseModal>
	<DocumentationModal :visible="showDocs" @close="showDocs = false" />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { t, setLang, currentLang } from '../i18n'
import { useAuthStore } from '../stores/authStore'
import { useLibraryStore } from '../stores/libraryStore'
import BaseModal from './common/BaseModal.vue'
import DocumentationModal from './DocumentationModal.vue'
import Swal from 'sweetalert2'

const authStore = useAuthStore()
const libraryStore = useLibraryStore()

const tx = (msg?: string) => (msg && msg.startsWith('ERR_') ? t(msg) : msg || '')

const currentAppVersion = ref('')
const availableLangs = computed(() => [
  { code: 'zh-CN', label: t('lang.zhCN') }, 
  { code: 'en-US', label: 'English' }
])
const setLanguage = (code: string) => setLang(code)

const NODE_STYLES: Record<string, string> = {
  node1: 'bg-[#00f3ff] text-black border border-[#00f3ff] shadow-[0_0_15px_rgba(0,243,255,0.4)]',
  node2: 'bg-[#eab308] text-black border border-[#eab308] shadow-[0_0_15px_rgba(234,179,8,0.4)]',
  node3: 'bg-[#8b5cf6] text-black border border-[#8b5cf6] shadow-[0_0_15px_rgba(139,92,246,0.4)]'
}
const inputKey = ref('TITAN-==QI7wDO+hzJnojJ3YxIo4DK8A3WdNFHqVQZxkTKmISNo03fl1TMg0DP')

const selectNode = (id: string) => !authStore.isProcessing && authStore.selectedNode !== id && authStore.connect(id)
const handleConnect = () => authStore.connect(authStore.selectedNode)
const handleDisconnect = () => authStore.disconnect()

const email = ref('')
const password = ref('')
const statusMsg = ref('')
const redeemCode = ref('')
const redeemContact = ref('')

const handleLogin = async () => {
  if (!email.value || !password.value) return (statusMsg.value = t('settings.identity.inputRequired'))
  statusMsg.value = ''
  const err = await authStore.login(email.value, password.value)
  err ? (statusMsg.value = tx(err)) : (email.value = password.value = '')
}

const handleLogout = () => { 
  authStore.logout()
  email.value = ''
  password.value = ''
  statusMsg.value = '' 
}

const handleRedeem = async () => {
  if (authStore.isProcessing) return
  const code = redeemCode.value.trim()
  if (!code) {
    showNotice(t('errors.emptyCodeTitle'), t('errors.emptyCodeDesc'), 'error')
    return
  }
  const res = await authStore.redeem(code, redeemContact.value.trim())
  if (res.success) {
    showNotice(t('redeem.successTitle'), `${t('settings.identity.expire')}: ${res.msg}`, 'success')
    redeemCode.value = ''
    redeemContact.value = ''
  } else {
    showNotice(t('redeem.failTitle'), tx(res.msg) || t('redeem.failDefault'), 'error')
  }
}

const handleOpenShop = async () => {
  const res = await authStore.openShop()
  if (!res.success) showNotice(t('errors.shopOpenFail'), tx(res.msg), 'error')
}

const steamPath = ref('')
const steamSource = ref('none')
const isDetectingSteam = ref(false)

const isSwitchingEngine = ref(false)
const unlockEngine = ref<'steamtools' | 'ost'>('ost')
const engineStatus = ref<{ ready: boolean; version: number; path: string | null }>({ ready: false, version: 0, path: '' })

const showEngineModal = ref(false)
const pendingEngine = ref<'steamtools' | 'ost'>('steamtools')
const targetEngineName = computed(() => pendingEngine.value === 'steamtools' ? t('settings.engine.steamtoolsName') : t('settings.engine.ostName'))

const showNoticeModal = ref(false)
const noticeConfig = ref({ title: '', text: '', type: 'success' as 'success' | 'error' })

const showNotice = (title: string, text: string, type: 'success' | 'error' = 'success') => {
  noticeConfig.value = { title, text, type }
  showNoticeModal.value = true
}

const engineBackendKey = (frontendKey: 'steamtools' | 'ost'): 'st' | 'ost' => {
  return frontendKey === 'steamtools' ? 'st' : 'ost'
}

const handleDetectSteam = async () => {
  isDetectingSteam.value = true
  try {
    const res = await window.electron.invoke('steam:detect')
    steamPath.value = res.path || ''
    steamSource.value = res.source || 'none'
  } catch (e) {
    console.error('[Settings] Steam Detect Interrupted', e)
  } finally {
    isDetectingSteam.value = false
  }
}

const handleSelectSteamPath = async () => {
  if (isDetectingSteam.value) return
  isDetectingSteam.value = true
  try {
    const res = await window.electron.invoke('steam:select-folder')
    if (res.canceled) return
    if (res.success) {
      steamPath.value = res.path
      steamSource.value = res.source
    } else {
      showNotice(t('errors.validateFailTitle'), tx(res.msg) || t('errors.steamNotFoundExe'), 'error')
    }
  } catch (e) {
    console.error('[Settings] Steam Folder Select Error', e)
  } finally {
    isDetectingSteam.value = false
  }
}

const handleCheckEngine = async () => {
  try {
    const res = await window.electron.invoke('engine:check', engineBackendKey(unlockEngine.value))
    engineStatus.value = res
  } catch (e) { console.error('[Engine] Check fail:', e) }
}

const openEngineConfirm = (targetEngine: 'steamtools' | 'ost') => {
  if (isSwitchingEngine.value || unlockEngine.value === targetEngine) return
  pendingEngine.value = targetEngine
  showEngineModal.value = true
}

const confirmEngineSwitch = async () => {
  if (isSwitchingEngine.value) return
  isSwitchingEngine.value = true
  try {
    await window.electron.invoke('sys:restart-steam')
    
    const targetEngine = pendingEngine.value
    unlockEngine.value = targetEngine
    const res = await window.electron.invoke('engine:switch', engineBackendKey(targetEngine))

    showEngineModal.value = false

    if (!res.success) {
      showNotice(t('errors.engineSwitchFail'), tx(res.msg), 'error')
    } else {
      showNotice(t('settings.engine.switchSuccessTitle'), tx(res.msg) || t('settings.engine.switchSuccessDesc'), 'success')
    }

    await handleCheckEngine()
  } catch (e: any) {
    showEngineModal.value = false
    showNotice(t('errors.engineSwitchFail'), tx(e?.message) || '未知系统错误', 'error')
  } finally {
    isSwitchingEngine.value = false
  }
}

const showRegister = ref(false)
const regUsername = ref('')
const regEmail = ref('')
const regPassword = ref('')
const regError = ref('')

const resetRegisterState = () => {
  regUsername.value = ''
  regEmail.value = ''
  regPassword.value = ''
  regError.value = ''
}

const handleOpenRegister = () => {
  if (authStore.isProcessing) return
  showRegister.value = true
}

const handleRegisterSubmit = async () => {
  if (!regUsername.value.trim() || !regEmail.value.trim() || !regPassword.value.trim()) {
    regError.value = t('errors.registerRequiredFields')
    return
  }
  regError.value = ''
  const err = await authStore.register(regUsername.value.trim(), regEmail.value.trim(), regPassword.value.trim())
  if (err) {
    regError.value = tx(err)
  } else {
    showRegister.value = false
    resetRegisterState()
  }
}

const showForgot = ref(false)
const forgotStep = ref(1)
const forgotUsername = ref('')
const forgotEmail = ref('')
const forgotUid = ref(0)
const forgotPass = ref('')

const resetForgotState = () => { 
  forgotStep.value = 1
  forgotUsername.value = ''
  forgotEmail.value = ''
  forgotPass.value = ''
  forgotUid.value = 0 
}

const openForgot = () => { 
  showForgot.value = true
  statusMsg.value = '' 
}

const closeForgotAndLogin = () => { 
  showForgot.value = false
  statusMsg.value = ''
  resetForgotState() 
}

const handleForgotCheck = async () => {
  if (!forgotUsername.value.trim() || !forgotEmail.value.trim()) return (statusMsg.value = t('errors.forgotInputRequired'))
  statusMsg.value = ''
  const res = await authStore.forgotSearch(forgotUsername.value.trim(), forgotEmail.value.trim())
  res.ok && res.id ? (forgotUid.value = res.id, forgotStep.value = 2, statusMsg.value = '') : (statusMsg.value = tx(res.msg) || t('errors.verifyFail'))
}

const handleForgotReset = async () => {
  if (forgotPass.value?.length < 6) return (statusMsg.value = t('errors.passwordMinLength'))
  statusMsg.value = ''
  const res = await authStore.forgotReset(forgotUid.value, forgotPass.value, forgotEmail.value)
  res.ok ? (forgotStep.value = 3, statusMsg.value = '') : (statusMsg.value = tx(res.msg) || t('errors.forgotResetFail'))
}

const showDocs = ref(false)

const showAppUpdateModal = ref(false)
const appUpdateInfo = ref({ latestVersion: '', currentVersion: '' })

const handleCheckAppUpdate = async () => {
  if (authStore.isProcessing) return
  authStore.isProcessing = true
  try {
    const res = await window.electron.sys.checkUpdate()
    if (!res.hasUpdate) {
      showNotice(t('settings.version.latest'), t('settings.version.noUpdate'), 'success')
      return
    }
    appUpdateInfo.value = { 
      latestVersion: res.latestVersion, 
      currentVersion: res.currentVersion 
    }
    showAppUpdateModal.value = true
  } finally {
    authStore.isProcessing = false
  }
}

const startAppUpdate = async () => {
  try {
    const res = await window.electron.sys.startUpdate()
    if (res.success) {
      showNotice(t('settings.update.toastStarted'), t('settings.update.toastStartedDesc'), 'success')
      showAppUpdateModal.value = false
    } else {
      showNotice(t('settings.update.toastStartFail'), tx(res.msg), 'error')
      showAppUpdateModal.value = false
    }
  } catch (e: any) {
    showNotice(t('settings.update.toastSystemError'), e.message, 'error')
    showAppUpdateModal.value = false
  }
}

const manifestNodeList = [
    { key: 'auto', label: t('settings.manifest.nodeAuto') },
    { key: 'opensteamtool', label: t('settings.manifest.nodeOst') },
    { key: 'wudrm', label: t('settings.manifest.nodeWdr') },
    { key: 'steamrun', label: t('settings.manifest.nodeStr') }
]
const selectedManifestNode = ref('auto')
const pendingManifestNode = ref('')
const isSwitchingManifestNode = ref(false)
const manifestNodeStatuses = ref<Record<string, boolean>>({})
const diagnosticResults = ref<{ name: string; ok: boolean; message: string }[]>([])
const showDiagnostics = ref(false)
const isRunningDiagnostics = ref(false)
const diagnosticsRef = ref<HTMLElement | null>(null)

const diagnosticsCollapsed = ref(false)
const diagnosticPassCount = computed(() => diagnosticResults.value.filter(i => i.ok).length)
const diagnosticFailCount = computed(() => diagnosticResults.value.filter(i => !i.ok).length)

const selectedNodeAlive = computed(() => {
    if (selectedManifestNode.value === 'auto') {
        return Object.values(manifestNodeStatuses.value).some(v => v)
    }
    return !!manifestNodeStatuses.value[selectedManifestNode.value]
})

const coreStatusColor = computed(() => {
    const score = [engineStatus.value.ready, !!steamPath.value, selectedNodeAlive.value].filter(Boolean).length
    if (score === 3) return 'bg-green-500 shadow-green-500 animate-pulse'
    if (score >= 1) return 'bg-yellow-500 shadow-yellow-500'
    return 'bg-red-500 shadow-red-500'
})

const manifestNodeDot = (key: string) => {
    if (Object.keys(manifestNodeStatuses.value).length === 0) return 'bg-gray-600'
    const ok = key === 'auto'
        ? Object.values(manifestNodeStatuses.value).some(v => v)
        : !!manifestNodeStatuses.value[key]
    return ok ? 'bg-green-500 shadow-green-500' : 'bg-red-500 shadow-red-500'
}

const loadManifestNode = async () => {
    try {
        const res = await window.electron.invoke('sys:get-manifest-node')
        if (res.success) {
            selectedManifestNode.value = res.selectedNode || 'auto'
            manifestNodeStatuses.value = res.statuses || {}
        }
    } catch (e) {
        console.error('[Settings] Load manifest node failed:', e)
    }
}

const selectManifestNode = async (node: string) => {
    if (selectedManifestNode.value === node || isSwitchingManifestNode.value) return
    pendingManifestNode.value = node
    isSwitchingManifestNode.value = true
    try {
        const res = await window.electron.invoke('sys:set-manifest-node', node)
        if (res.success) {
            selectedManifestNode.value = node
            showNotice(t('settings.manifest.switchSuccess'), res.msg, 'success')
        } else {
            showNotice(t('settings.manifest.switchFail'), tx(res.msg), 'error')
        }
    } catch (e: any) {
        showNotice(t('settings.manifest.switchFail'), e?.message || '未知错误', 'error')
    } finally {
        isSwitchingManifestNode.value = false
        pendingManifestNode.value = ''
    }
}

const runSystemDiagnostics = async () => {
    isRunningDiagnostics.value = true
    showDiagnostics.value = false
    try {
        const res = await window.electron.invoke('titan:run-diagnostics')
        if (res.success) {
            diagnosticResults.value = res.data || []
            diagnosticsCollapsed.value = false
            showDiagnostics.value = true
            loadManifestNode()
            await nextTick()
            diagnosticsRef.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        } else {
            showNotice(t('settings.manifest.diagFail'), tx(res.msg), 'error')
        }
    } catch (e: any) {
        showNotice(t('settings.manifest.diagFail'), e?.message || '系统自检过程中发生错误', 'error')
    } finally {
        isRunningDiagnostics.value = false
    }
}

const isRestoring = ref(false)

const handleEmergencyRestore = async () => {
  if (isRestoring.value) return
  const confirm = await Swal.fire({
    title: t('settings.maintain.restoreConfirmTitle'),
    text: t('settings.maintain.restoreConfirmDesc'),
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: t('settings.maintain.restoreConfirmBtn'),
    cancelButtonText: t('common.cancel'),
    background: '#121212',
    color: '#fff',
    confirmButtonColor: '#ef4444'
  })
  if (!confirm.isConfirmed) return

  isRestoring.value = true
  try {
    const detectRes = await window.electron.invoke('steam:detect')
    if (!detectRes?.path) {
      showNotice(t('errors.validateFailTitle'), t('errors.steamNotFoundExe'), 'error')
      return
    }
    const res = await window.electron.invoke('titan:force-restore', detectRes.path)
    if (res?.success) {
      showNotice(
        t('settings.maintain.restoreSuccessTitle'),
        t('settings.maintain.restoreSuccessDesc'),
        'success'
      )
    } else {
      showNotice(t('settings.maintain.restoreFailTitle'), tx(res?.msg) || t('settings.maintain.restoreFailDefault'), 'error')
    }
  } catch (e: any) {
    showNotice(t('settings.maintain.restoreFailTitle'), tx(e?.message) || t('settings.maintain.restoreFailDefault'), 'error')
  } finally {
    isRestoring.value = false
  }
}

const isImportingLua = ref(false)

const handleImportLua = async () => {
  if (isImportingLua.value) return
  isImportingLua.value = true
  try {
    const res = await window.electron.invoke('sys:import-lua-folder')
    if (res.success) {
      showNotice(
        '清单导入完成',
        `成功导入 ${res.imported} 个，跳过 ${res.skipped} 个${res.failed > 0 ? '，失败 ' + res.failed + ' 个' : ''}`,
        'success'
      )
      libraryStore.load()
    } else {
      showNotice('导入失败', tx(res.msg) || '未知错误', 'error')
    }
  } catch (e: any) {
    showNotice('导入失败', e.message || '系统错误', 'error')
  } finally {
    isImportingLua.value = false
  }
}

onMounted(async () => {
  currentAppVersion.value = await window.electron.sys.getVersion()

  const savedPath = await window.electron.invoke('sys:get-config', 'steam_install_path')
  const savedSource = await window.electron.invoke('sys:get-config', 'steam_detect_source')
  if (savedPath) {
    steamPath.value = savedPath
    steamSource.value = savedSource || 'manual'
  }

  const savedEngine = await window.electron.invoke('sys:get-config', 'unlock_engine')
  if (savedEngine === 'st' || savedEngine === 'steamtools') {
    unlockEngine.value = 'steamtools'
  } else if (savedEngine === 'ost') {
    unlockEngine.value = 'ost'
  }
  
  handleCheckEngine()
  loadManifestNode()
  
  if (!steamPath.value && !isDetectingSteam.value) {
    handleDetectSteam()
  }
})

onUnmounted(() => {
  // 清理工作已随组件卸载自动完成，无需额外处理更新监听
})

watch(() => authStore.connectionError, (err) => {
  if (!err || authStore.isConnected) return
  const errMsg = err && err.startsWith('ERR_') ? t(err) : err
  showNotice(t('errors.connectionFailTitle'), `${errMsg}\n${t('errors.connectionFailSolution')}`, 'error')
  authStore.connectionError = null
})
</script>