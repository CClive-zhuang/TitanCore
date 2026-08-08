// 文件名: src/i18n/index.ts
import { ref } from 'vue'
import zhCN from './zh-CN.json'
import enUS from './en-US.json'

const dicts: Record<string, any> = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

export const currentLang = ref('zh-CN')

const ERROR_CODE_MAP: Record<string, string> = {
  'ERR_INVALID_CREDENTIALS': 'errors.invalidCredentials',
  'ERR_IDENTITY_OCCUPIED': 'errors.identityOccupied',
  'ERR_TOO_MANY_REQUESTS': 'errors.tooManyRequests',
  'ERR_SERVER_MAINTENANCE': 'errors.serverMaintenance',
  'ERR_DECRYPT_FAIL': 'errors.decryptFail',
  'ERR_NETWORK_TIMEOUT': 'errors.networkTimeout',
  'ERR_NETWORK_ERROR': 'errors.networkError',
  'ERR_BOOTSTRAP_FAIL': 'errors.bootstrapFail',
  'ERR_TICKET_STORE_FAIL': 'errors.ticketStoreFail',
  'ERR_SYNC_FAIL': 'errors.syncFail',
  'ERR_REGISTER_REJECTED': 'errors.registerRejected',
  'ERR_TICKET_LOST': 'errors.ticketLost',
  'ERR_TICKET_EXPIRED': 'errors.ticketExpired',
  'ERR_SESSION_INVALID': 'errors.sessionInvalid',
  'ERR_LOGIN_REQUIRED': 'errors.loginRequired',
  'ERR_SERVER_REQUIRED': 'errors.serverRequired',
  'ERR_SESSION_EXPIRED': 'errors.sessionExpired',
  'ERR_SECURITY_CHECK_FAIL': 'errors.securityCheckFail',
  'ERR_INVALID_CARD': 'errors.invalidCard',
  'ERR_CARD_USED': 'errors.cardUsed',
  'ERR_EMPTY_CODE': 'errors.emptyCode',
  'ERR_PARAM_ERROR': 'errors.paramError',
  'ERR_SERVICE_ERROR': 'errors.serviceError',
  'ERR_OFFLINE_MODE': 'errors.offlineMode',
  'ERR_ACCOUNT_NOT_FOUND': 'errors.accountNotFound',
  'ERR_STEAM_VALIDATE_FAIL': 'errors.steamValidateFail',
  'ERR_STEAM_NOT_FOUND': 'errors.steamNotFound',
  'ERR_STEAM_NOT_FOUND_EXE': 'errors.steamNotFoundExe',
  'ERR_STEAM_RESTART_FAIL': 'errors.steamRestartFail',
  'ERR_ENGINE_METADATA_FAIL': 'errors.engineMetadataFail',
  'ERR_ENGINE_DECRYPT_FAIL': 'errors.engineDecryptFail',
  'ERR_MIRRORS_UNAVAILABLE': 'errors.mirrorsUnavailable',
  'ERR_ENGINE_EXTRACT_FAIL': 'errors.engineExtractFail',
  'ERR_ENGINE_UP_TO_DATE': 'errors.engineUpToDate',
  'ERR_ENGINE_DEPLOY_SUCCESS': 'errors.engineDeploySuccess',
  'ERR_ENGINE_NETWORK_INTERCEPT': 'errors.engineNetworkIntercept',
  'ERR_ENGINE_SWITCH_FAIL': 'errors.engineSwitchFail',
  'ERR_NODE_FAIL': 'errors.nodeFail',
  'ERR_CONNECTION_FAIL_TITLE': 'errors.connectionFailTitle',
  'ERR_CONNECTION_FAIL_DESC': 'errors.connectionFailDesc',
  'ERR_CONNECTION_FAIL_SOLUTION': 'errors.connectionFailSolution',
  'ERR_OFFLINE_MODE_FAIL': 'errors.offlineModeFail',
  'ERR_REGISTER_REQUIRED_FIELDS': 'errors.registerRequiredFields',
  'ERR_EMAIL_INVALID': 'errors.emailInvalid',
  'ERR_FORGOT_INPUT_REQUIRED': 'errors.forgotInputRequired',
  'ERR_FORGOT_PASSWORD_MIN_LENGTH': 'errors.forgotPasswordMinLength',
  'ERR_FORGOT_RESET_FAIL': 'errors.forgotResetFail',
  'ERR_VERIFY_FAIL': 'errors.verifyFail',
  'ERR_JSON_PARSE_FAIL': 'errors.jsonParseFail',
  'ERR_INVALID_PACK_FORMAT': 'errors.invalidPackFormat',
  'ERR_TOGGLE_REJECTED': 'errors.toggleRejected',
  'ERR_UPDATE_FAIL': 'errors.updateFail',
  'ERR_DEPLOY_ENOENT': 'protocol.ERR_DEPLOY_ENOENT',
  'ERR_DEPLOY_NETWORK': 'protocol.ERR_DEPLOY_NETWORK',
  'ERR_DEPLOY_EACCES': 'protocol.ERR_DEPLOY_EACCES',
  'ERR_DEPLOY_EBUSY': 'protocol.ERR_DEPLOY_EBUSY',
  'ERR_DEPLOY_UNKNOWN': 'protocol.ERR_DEPLOY_UNKNOWN',
  'ERR_NO_GATEWAY_NODE': 'protocol.ERR_NO_GATEWAY_NODE',
  'ERR_NODE_CONNECT_FAIL': 'errors.nodeConnectFail',
  'ERR_AUTH_PROCESSING': 'errors.authProcessing',
  'ERR_LOGIN_FAILED': 'errors.loginFailed',
  'ERR_REGISTER_FAILED': 'errors.registerFailed',
  'ERR_REDEEM_EXCEPTION': 'errors.redeemException',
  'ERR_SHOP_NOT_CONFIGURED': 'errors.shopNotConfigured',
  'ERR_CANNOT_OPEN_BROWSER': 'errors.cannotOpenBrowser',
  'ERR_RESOURCE_NOT_FOUND': 'errors.resourceNotFound',
  'ERR_QUOTA_EXHAUSTED': 'errors.quotaExhausted',
  'ERR_KEYWORD_INVALID': 'errors.keywordInvalid',
  'ERR_VALIDATE_FAIL': 'errors.validateFailTitle'
}

const SUCCESS_CODE_MAP: Record<string, string> = {
  'SUCCESS_ENGINE_CACHED': 'errors.engineUpToDate',
  'SUCCESS_ENGINE_DEPLOYED': 'errors.engineDeploySuccess',
  'SUCCESS_AUTH': 'auth.success',
  'SUCCESS_REFRESH': 'auth.refreshSuccess'
}

export function t(key: string, fallback?: string): string
export function t(key: string, params?: Record<string, any>, fallback?: string): string
export function t(key: string, paramsOrFallback?: Record<string, any> | string, fallbackStr?: string): string {
  const lang = currentLang.value
  let params: Record<string, any> | undefined
  let fallback: string | undefined

  if (typeof paramsOrFallback === 'string') {
    fallback = paramsOrFallback
    params = undefined
  } else {
    params = paramsOrFallback
    fallback = fallbackStr
  }

  let actualKey = key
  if (key && key.startsWith('ERR_')) {
    const [codeName, extraParam] = key.split(':')
    if (ERROR_CODE_MAP[codeName]) {
      actualKey = ERROR_CODE_MAP[codeName]
      if (extraParam && !params) {
        params = { node: extraParam, code: extraParam }
      }
    }
  }

  if (key && key.startsWith('SUCCESS_')) {
    const [codeName, ...extraParts] = key.split(':')
    if (SUCCESS_CODE_MAP[codeName]) {
      actualKey = SUCCESS_CODE_MAP[codeName]
      if (extraParts.length > 0 && !params) {
        if (codeName === 'SUCCESS_ENGINE_DEPLOYED') {
          params = { engine: extraParts[0], version: extraParts[1] }
        }
      }
    }
  }

  const keys = actualKey.split('.')
  let val: any = dicts[lang]

  for (const k of keys) {
    val = val?.[k]
    if (val === undefined) break
  }

  let result = val || fallback || actualKey

  if (params && typeof result === 'string') {
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(new RegExp(`\{${k}\}`, 'g'), String(v))
    }
  }

  return result
}

export async function setLang(code: string) {
  if (dicts[code]) {
    currentLang.value = code
    if (window.electron && window.electron.invoke) {
      await window.electron.invoke('sys:set-config', 'app_lang', code)
    }
  }
}

export async function initLang() {
  if (window.electron && window.electron.invoke) {
    const saved = await window.electron.invoke('sys:get-config', 'app_lang')
    if (saved && dicts[saved]) {
      currentLang.value = saved
    }
  }
}

export function getCurrentLang() {
  return currentLang.value
}