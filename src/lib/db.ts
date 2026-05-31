/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Alarm, AppSettings } from '../types';

const DB_NAME = 'AlarmasDB';
const DB_VERSION = 1;
const ALARMS_STORE = 'alarms';
const SETTINGS_STORE = 'settings';

const DEFAULT_SETTINGS: AppSettings = {
  soundType: 'digital',
  ringDuration: 60, // 1 minute
  snoozeDuration: 5, // 5 minutes
  energySaving: false,
};

export class AlarmDB {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  private static getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(ALARMS_STORE)) {
          db.createObjectStore(ALARMS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE);
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  // ALARMS ACTIONS
  public static async getAllAlarms(): Promise<Alarm[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(ALARMS_STORE, 'readonly');
      const store = transaction.objectStore(ALARMS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        // Sort alarms chronologically (upcoming / most recent created first)
        const alarms = request.result as Alarm[];
        alarms.sort((a, b) => b.createdAt - a.createdAt);
        resolve(alarms);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  public static async saveAlarm(alarm: Alarm): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(ALARMS_STORE, 'readwrite');
      const store = transaction.objectStore(ALARMS_STORE);
      const request = store.put(alarm);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  public static async deleteAlarm(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(ALARMS_STORE, 'readwrite');
      const store = transaction.objectStore(ALARMS_STORE);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // SETTINGS ACTIONS
  public static async getSettings(): Promise<AppSettings> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SETTINGS_STORE, 'readonly');
      const store = transaction.objectStore(SETTINGS_STORE);
      const request = store.get('current_config');

      request.onsuccess = () => {
        resolve(request.result ? { ...DEFAULT_SETTINGS, ...request.result } : DEFAULT_SETTINGS);
      };

      request.onerror = () => {
        // Fallback to default
        resolve(DEFAULT_SETTINGS);
      };
    });
  }

  public static async saveSettings(settings: AppSettings): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SETTINGS_STORE, 'readwrite');
      const store = transaction.objectStore(SETTINGS_STORE);
      const request = store.put(settings, 'current_config');

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // BACKUP OPERATIONS - EXPORT / IMPORT
  public static async exportBackup(): Promise<string> {
    const alarms = await this.getAllAlarms();
    const settings = await this.getSettings();
    const backupData = {
      version: '1.0',
      exportedAt: Date.now(),
      settings,
      alarms,
    };
    return JSON.stringify(backupData, null, 2);
  }

  public static async importBackup(jsonString: string): Promise<{ success: boolean; message: string }> {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') {
        return { success: false, message: 'El formato de archivo es inválido.' };
      }

      const db = await this.getDB();

      // Validate and import settings
      if (data.settings && typeof data.settings === 'object') {
        const importedSettings: AppSettings = {
          soundType: data.settings.soundType || 'digital',
          ringDuration: typeof data.settings.ringDuration === 'number' ? data.settings.ringDuration : 60,
          snoozeDuration: typeof data.settings.snoozeDuration === 'number' ? data.settings.snoozeDuration : 5,
          energySaving: !!data.settings.energySaving,
        };
        await this.saveSettings(importedSettings);
      }

      // Validate and import alarms
      if (Array.isArray(data.alarms)) {
        const transaction = db.transaction(ALARMS_STORE, 'readwrite');
        const store = transaction.objectStore(ALARMS_STORE);

        for (const rawAlarm of data.alarms) {
          if (rawAlarm && typeof rawAlarm === 'object' && rawAlarm.id) {
            const importedAlarm: Alarm = {
              id: String(rawAlarm.id),
              date: String(rawAlarm.date || ''),
              time: String(rawAlarm.time || ''),
              messageType: rawAlarm.messageType === 'voice' ? 'voice' : 'text',
              message: String(rawAlarm.message || ''),
              voiceData: rawAlarm.voiceData ? String(rawAlarm.voiceData) : undefined,
              status: ['active', 'triggered', 'dismissed', 'postponed'].includes(rawAlarm.status) 
                ? rawAlarm.status 
                : 'active',
              snoozedUntil: typeof rawAlarm.snoozedUntil === 'number' ? rawAlarm.snoozedUntil : null,
              snoozeCount: typeof rawAlarm.snoozeCount === 'number' ? rawAlarm.snoozeCount : 0,
              createdAt: typeof rawAlarm.createdAt === 'number' ? rawAlarm.createdAt : Date.now(),
            };
            store.put(importedAlarm);
          }
        }
      }

      return { success: true, message: 'Copia de seguridad importada con éxito.' };
    } catch (e: any) {
      return { success: false, message: `Error al importar: ${e.message || String(e)}` };
    }
  }
}
