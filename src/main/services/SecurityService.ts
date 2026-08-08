// src/main/services/SecurityService.ts
import { safeStorage } from 'electron';
import crypto from 'crypto';

export class SecurityService {
    
    private static readonly HMAC_KEY = crypto.createHmac('sha256', 'TITAN_SALT_V15').update('TITAN_PROTOCOL_V3_2026_HAJIMI').digest();
    
    private static sessionKey: Buffer | null = null;
    private static isKeysInitialized = false;
    
    // 🛡️ 性能优化：静态缓存安全加解密可用性状态，消除向系统秘钥环的重复 IPC 阻塞查询
    private static isEncAvail: boolean | null = null;

    private static canEncrypt(): boolean {
        if (this.isEncAvail === null) {
            this.isEncAvail = safeStorage.isEncryptionAvailable();
        }
        return this.isEncAvail;
    }

    private static resetContext() {
        this.sessionKey = null;
        this.isKeysInitialized = false;
    }

    static initializeNetworkSecurity(hexKey: string) {
        if (!hexKey) {
            this.resetContext();
            console.log('[Security] Session Key Cleared');
            return;
        }
        try {
            const buf = Buffer.from(hexKey, 'hex');
            if (buf.length !== 32) throw new Error('Invalid Length');
            this.sessionKey = buf;
            this.isKeysInitialized = true;
            console.log('[Security] Network Crypto Context Initialized');
        } catch {
            this.resetContext();
        }
    }

    static hasSessionKey(): boolean {
        return this.isKeysInitialized && !!this.sessionKey && this.sessionKey.length === 32;
    }

    static encryptSensitiveData(plainText: string): string {
        if (!plainText) return '';
        try { 
            return this.canEncrypt() ? safeStorage.encryptString(plainText).toString('base64') : Buffer.from(plainText).toString('base64'); 
        } 
        catch { return ''; }
    }

    static decryptSensitiveData(cipherText: string): string {
        if (!cipherText) return '';
        try {
            const buf = Buffer.from(cipherText, 'base64');
            if (!this.canEncrypt()) return buf.toString('utf-8');
            try { return safeStorage.decryptString(buf); } 
            catch { return ''; }
        } catch { return ''; }
    }

    static encryptPayload(data: unknown): string {
        try { return data != null ? Buffer.from(typeof data === 'string' ? data : JSON.stringify(data)).toString('base64') : ''; } 
        catch { return ''; }
    }

    static decryptPayload<T>(base64Payload: string): T | null {
        try { return JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf-8')) as T; } 
        catch { return null; }
    }

    static decryptNetworkPayload<T>(hexPayload: string): T | null {
        const base64Res = this.decryptPayload<T>(hexPayload);
        if (base64Res !== null) return base64Res;
        
        if (!this.hasSessionKey() || !hexPayload || hexPayload.length < 32) return null;

        try {
            const decipher = crypto.createDecipheriv('aes-256-cbc', this.sessionKey!, Buffer.from(hexPayload.substring(0, 32), 'hex'));
            return JSON.parse(Buffer.concat([decipher.update(Buffer.from(hexPayload.substring(32), 'hex')), decipher.final()]).toString('utf-8')) as T;
        } catch { return null; }
    }

    static signHeartbeat(payload: string): string {
        try { return payload ? crypto.createHmac('sha256', this.HMAC_KEY).update(payload).digest('hex') : ''; } 
        catch { return ''; }
    }
}