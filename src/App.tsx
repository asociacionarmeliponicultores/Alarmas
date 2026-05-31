/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Plus, 
  ClipboardList, 
  CalendarClock, 
  Sliders, 
  Clock, 
  Settings as SettingsIcon, 
  Zap, 
  ZapOff 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Alarm, AppSettings } from './types';
import { AlarmDB } from './lib/db';
import NewAlarmModal from './components/NewAlarmModal';
import AlarmListModal from './components/AlarmListModal';
import FutureAlarmsModal from './components/FutureAlarmsModal';
import SettingsModal from './components/SettingsModal';
import ActiveAlarmOverlay from './components/ActiveAlarmOverlay';

export default function App() {
  // Application settings and alarm configurations
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    soundType: 'digital',
    ringDuration: 60,
    snoozeDuration: 5,
    energySaving: false,
  });

  // Current states for live triggering
  const [activeAlarm, setActiveAlarm] = useState<Alarm | null>(null);
  const [dateTime, setDateTime] = useState<Date>(new Date());

  // Modal display states
  const [isNewAlarmOpen, setIsNewAlarmOpen] = useState(false);
  const [isAlarmListOpen, setIsAlarmListOpen] = useState(false);
  const [isFutureAlarmsOpen, setIsFutureAlarmsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // References and locks
  const triggeredAlarmsRef = useRef<Set<string>>(new Set());

  // Load initial data from offline local IndexedDB on startup
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const loadedAlarms = await AlarmDB.getAllAlarms();
        setAlarms(loadedAlarms);

        const loadedSettings = await AlarmDB.getSettings();
        setSettings(loadedSettings);
      } catch (err) {
        console.error('Error loading initial data from IndexedDB:', err);
      }
    };
    loadInitialData();

    // Register offline Service Worker for Android installation support
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Service Worker registrado correctamente.', reg.scope))
        .catch((err) => console.error('Error de registro del Service Worker:', err));
    }

    // Attempt to request notification permissions early on first load
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Central Clock Ticker & Matching Trigger Engine
  useEffect(() => {
    // Ticking frequency: normal mode ticks every 1000ms, energy saving checks every 3000ms
    const intervalTime = settings.energySaving ? 3000 : 1000;

    const tick = async () => {
      const now = new Date();
      setDateTime(now);

      // Perform trigger checks
      const localYear = now.getFullYear();
      const localMonth = String(now.getMonth() + 1).padStart(2, '0');
      const localDay = String(now.getDate()).padStart(2, '0');
      const formattedDate = `${localYear}-${localMonth}-${localDay}`; // YYYY-MM-DD

      const localHours = String(now.getHours()).padStart(2, '0');
      const localMinutes = String(now.getMinutes()).padStart(2, '0');
      const formattedTime = `${localHours}:${localMinutes}`; // HH:MM

      const currentTimestamp = now.getTime();

      let changesMade = false;
      const updatedAlarms = [...alarms];

      for (let i = 0; i < updatedAlarms.length; i++) {
        const alarm = updatedAlarms[i];

        // 1. Match active scheduled alarms
        if (alarm.status === 'active' && alarm.date === formattedDate && alarm.time === formattedTime) {
          // Verify we haven't already triggered this specific alarm in this run-time context
          if (!triggeredAlarmsRef.current.has(alarm.id)) {
            triggerAlarm(alarm);
            alarm.status = 'triggered';
            changesMade = true;
          }
        }

        // 2. Match postponed snoozed alarms
        if (
          alarm.status === 'postponed' &&
          alarm.snoozedUntil !== null &&
          currentTimestamp >= alarm.snoozedUntil
        ) {
          if (!triggeredAlarmsRef.current.has(alarm.id + '_snooze_' + alarm.snoozeCount)) {
            triggerAlarm(alarm);
            alarm.status = 'triggered';
            alarm.snoozedUntil = null;
            changesMade = true;
          }
        }
      }

      if (changesMade) {
        setAlarms(updatedAlarms);
        // Persist modified states in IndexedDB offline
        for (const alarm of updatedAlarms) {
          await AlarmDB.saveAlarm(alarm);
        }
      }
    };

    const timer = setInterval(tick, intervalTime);
    return () => clearInterval(timer);
  }, [alarms, settings.energySaving]);

  // Handle Triggering an Alarm and prompting OS warning
  const triggerAlarm = (alarm: Alarm) => {
    setActiveAlarm(alarm);
    
    // Add to trigger tracking lists
    if (alarm.status === 'postponed') {
      triggeredAlarmsRef.current.add(alarm.id + '_snooze_' + alarm.snoozeCount);
    } else {
      triggeredAlarmsRef.current.add(alarm.id);
    }

    // Trigger local PWA service worker background notification if permissible
    if ('Notification' in window && Notification.permission === 'granted') {
      const msg = alarm.messageType === 'voice' 
        ? '¡Tienes un mensaje de voz grabado! 🎙️' 
        : alarm.message;
      
      try {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification('¡Alarma Sonando! ⏰', {
            body: msg,
            icon: 'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2225%22 fill=%22%232563eb%22/><text y=%2265%22 x=%2215%22 font-size=%2260%22 fill=%22white%22>⏰</text></svg>',
            vibrate: [300, 100, 300, 100, 300],
            requireInteraction: true,
            tag: 'alarm-firing',
          } as any);
        });
      } catch (err) {
        // Fallback to basic window notification if sw is unavailable
        new Notification('¡Alarma Sonando! ⏰', { body: msg, tag: 'alarm-firing' });
      }
    }
  };

  // 4 Core Action Handlers mapped to buttons

  // BUTTON 1: Add new alarm callback
  const handleAddNewAlarm = async (data: {
    date: string;
    time: string;
    messageType: 'text' | 'voice';
    message: string;
    voiceData?: string;
  }) => {
    const newAlarm: Alarm = {
      id: Math.random().toString(36).substring(2, 9),
      date: data.date,
      time: data.time,
      messageType: data.messageType,
      message: data.message,
      voiceData: data.voiceData,
      status: 'active',
      snoozedUntil: null,
      snoozeCount: 0,
      createdAt: Date.now(),
    };

    const nextAlarms = [newAlarm, ...alarms];
    setAlarms(nextAlarms);
    await AlarmDB.saveAlarm(newAlarm);
  };

  // BUTTON 3: Update alarm callback (modification)
  const handleUpdateAlarm = async (updatedAlarm: Alarm) => {
    // Clear trigger track caches for this updated target so it can ring again properly
    triggeredAlarmsRef.current.delete(updatedAlarm.id);
    for (let c = 0; c <= updatedAlarm.snoozeCount + 2; c++) {
      triggeredAlarmsRef.current.delete(updatedAlarm.id + '_snooze_' + c);
    }

    const nextAlarms = alarms.map((a) => (a.id === updatedAlarm.id ? updatedAlarm : a));
    setAlarms(nextAlarms);
    await AlarmDB.saveAlarm(updatedAlarm);
  };

  // Delete Alarm callback
  const handleDeleteAlarm = async (id: string) => {
    const nextAlarms = alarms.filter((a) => a.id !== id);
    setAlarms(nextAlarms);
    await AlarmDB.deleteAlarm(id);
    
    // Cleanup reference memory
    triggeredAlarmsRef.current.delete(id);
    if (activeAlarm?.id === id) {
      setActiveAlarm(null);
    }
  };

  // BUTTON 4: Settings callback
  const handleSaveSettings = async (nextSettings: AppSettings) => {
    setSettings(nextSettings);
    await AlarmDB.saveSettings(nextSettings);
  };

  // Export settings to JSON backup file
  const handleExportBackup = async () => {
    try {
      const backupJson = await AlarmDB.exportBackup();
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `respaldo_alarmas_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al generar la exportación de respaldo.');
    }
  };

  // Import settings from JSON backup file
  const handleImportBackup = async (file: File): Promise<{ success: boolean; message: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        try {
          const result = await AlarmDB.importBackup(text);
          if (result.success) {
            // Reload all localized fields
            const loadedAlarms = await AlarmDB.getAllAlarms();
            setAlarms(loadedAlarms);
            const loadedSettings = await AlarmDB.getSettings();
            setSettings(loadedSettings);
          }
          resolve(result);
        } catch (e: any) {
          resolve({ success: false, message: 'Archivo dañado o formato incorrecto.' });
        }
      };
      reader.onerror = () => {
        resolve({ success: false, message: 'No se pudo leer el archivo de respaldo.' });
      };
      reader.readAsText(file);
    });
  };

  // Active Alarm Callback: manual Stop (Apagar)
  const handleDismissActiveAlarm = async (id: string) => {
    const updatedAlarms = alarms.map((alarm) => {
      if (alarm.id === id) {
        return {
          ...alarm,
          status: 'dismissed' as const,
          snoozedUntil: null,
        };
      }
      return alarm;
    });

    setAlarms(updatedAlarms);
    setActiveAlarm(null);

    const alarmToSave = updatedAlarms.find((a) => a.id === id);
    if (alarmToSave) {
      await AlarmDB.saveAlarm(alarmToSave);
    }
  };

  // Active Alarm Callback: Postpone (Posponer)
  const handleSnoozeActiveAlarm = async (id: string) => {
    const nextSnoozeEndTime = Date.now() + settings.snoozeDuration * 60 * 1000;
    
    const updatedAlarms = alarms.map((alarm) => {
      if (alarm.id === id) {
        return {
          ...alarm,
          status: 'postponed' as const,
          snoozeCount: alarm.snoozeCount + 1,
          snoozedUntil: nextSnoozeEndTime,
        };
      }
      return alarm;
    });

    setAlarms(updatedAlarms);
    setActiveAlarm(null);

    const alarmToSave = updatedAlarms.find((a) => a.id === id);
    if (alarmToSave) {
      await AlarmDB.saveAlarm(alarmToSave);
    }
  };

  // Layout presentation calculations
  const displayHours = String(dateTime.getHours()).padStart(2, '0');
  const displayMinutes = String(dateTime.getMinutes()).padStart(2, '0');
  const displaySeconds = String(dateTime.getSeconds()).padStart(2, '0');
  const displayDayName = dateTime.toLocaleDateString('es-ES', { weekday: 'long' });
  const displayDayNum = dateTime.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600/30">
      
      {/* Header Bar */}
      <header id="main_hdr" className="px-6 py-4 flex items-center justify-between border-b border-slate-900 bg-slate-950 z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl animate-spin-slow">⏰</span>
          <div>
            <h1 className="text-md font-black tracking-wider uppercase bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Alarmas
            </h1>
            <span className="text-[10px] text-slate-500 font-medium">Offline Personal Assistant</span>
          </div>
        </div>

        {/* Energy saving fast indicator */}
        <div id="energy_saving_badge">
          {settings.energySaving ? (
            <div className="flex items-center gap-1.5 bg-emerald-900/20 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full text-xs font-semibold">
              <Zap size={11} className="animate-pulse" />
              <span>Ahorro Activo</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 text-slate-400 px-2.5 py-1 rounded-full text-xs">
              <ZapOff size={11} />
              <span>Normal</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Clock Area */}
      <main id="main_content" className="flex-1 flex flex-col justify-center items-center px-6 py-8 max-w-lg mx-auto w-full space-y-10">
        
        {/* Realtime clock display widget */}
        <div id="clock_widget" className="text-center space-y-3.5 select-none w-full">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1 bg-slate-900/60 border border-slate-800 px-3 py-1 rounded-full w-fit mx-auto">
            <Clock size={12} className="text-blue-500" /> Reloj del Dispositivo
          </div>
          
          <div className="flex items-baseline justify-center font-mono">
            <h2 className="text-7xl font-extrabold tracking-tighter text-slate-100 drop-shadow-md">
              {displayHours}
              <span className={`text-blue-500 ${settings.energySaving ? '' : 'animate-pulse'}`}>:</span>
              {displayMinutes}
            </h2>
            
            {/* Smoothly hide seconds display in energy-saving mode to completely prevent render updates */}
            {!settings.energySaving && (
              <span className="text-3xl font-medium text-slate-500 ml-1.5">
                {displaySeconds}
              </span>
            )}
          </div>

          <p className="text-sm font-semibold text-slate-300 capitalize">
            {displayDayName}, {displayDayNum}
          </p>
        </div>

        {/* The 4 CORE buttons specified by the user */}
        <div id="action_dashboard" className="grid grid-cols-2 gap-4 w-full">
          
          {/* BUTTON 1: CARGAR NUEVA ALARMA */}
          <button
            id="dash_bt_cargar_nueva"
            onClick={() => setIsNewAlarmOpen(true)}
            className="flex flex-col items-center justify-center p-5 rounded-2xl bg-gradient-to-tr from-blue-600/10 to-indigo-600/10 hover:from-blue-600/20 hover:to-indigo-600/20 border border-slate-800 hover:border-blue-500/40 text-slate-200 transition-all cursor-pointer h-28 space-y-2 group group-hover:scale-105"
          >
            <div className="p-2.5 rounded-xl bg-blue-600 text-white transition-transform group-hover:scale-110">
              <Plus size={18} />
            </div>
            <span className="text-xs font-bold tracking-wide text-center">Cargar nueva alarma 📥</span>
          </button>

          {/* BUTTON 2: LISTA DE ALARMAS */}
          <button
            id="dash_bt_lista_alarmas"
            onClick={() => setIsAlarmListOpen(true)}
            className="flex flex-col items-center justify-center p-5 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-200 transition-all cursor-pointer h-28 space-y-2 group"
          >
            <div className="p-2.5 rounded-xl bg-slate-800 text-indigo-400 group-hover:text-indigo-300 transition-transform group-hover:scale-110">
              <ClipboardList size={18} />
            </div>
            <span className="text-xs font-bold tracking-wide text-center">Lista de alarmas 🗂️</span>
          </button>

          {/* BUTTON 3: FUTURAS NOTIFICACIONES */}
          <button
            id="dash_bt_futuras_notif"
            onClick={() => setIsFutureAlarmsOpen(true)}
            className="flex flex-col items-center justify-center p-5 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-200 transition-all cursor-pointer h-28 space-y-2 group"
          >
            <div className="p-2.5 rounded-xl bg-slate-800 text-blue-400 group-hover:text-blue-300 transition-transform group-hover:scale-110">
              <CalendarClock size={18} />
            </div>
            <span className="text-xs font-bold tracking-wide text-center">Futuras notificaciones 📅</span>
          </button>

          {/* BUTTON 4: CONFIGURACION DE NOTIFICACIONES */}
          <button
            id="dash_bt_config_notif"
            onClick={() => setIsSettingsOpen(true)}
            className="flex flex-col items-center justify-center p-5 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-200 transition-all cursor-pointer h-28 space-y-2 group"
          >
            <div className="p-2.5 rounded-xl bg-slate-800 text-amber-500 group-hover:text-amber-400 transition-transform group-hover:scale-110">
              <Sliders size={18} />
            </div>
            <span className="text-xs font-bold tracking-wide text-center">Config. notificaciones ⚙️</span>
          </button>

        </div>

        {/* Quick Summary Section explaining the application properties */}
        <div id="offline_indicator_board" className="w-full text-center p-3.5 bg-slate-900/30 border border-slate-900 rounded-xl space-y-1">
          <p className="text-[11px] text-slate-400 leading-normal">
            ⚙️ <span className="text-slate-200 font-semibold text-[11px]">Modo Offline Completo</span>: No requiere conexión de datos. Los sonidos se autogeneran de forma sintética para optimizar la compatibilidad.
          </p>
        </div>

      </main>

      {/* Footer copyright */}
      <footer id="main_ftr" className="py-4 border-t border-slate-900 text-center text-[10px] text-slate-600 bg-slate-950">
        Alarmas PWA © 2026 • Funciona sin internet y con pantalla apagada en Android
      </footer>

      {/* MODALS RENDERING */}
      <AnimatePresence>
        
        {/* Modals are opened conditionally */}
        {isNewAlarmOpen && (
          <NewAlarmModal
            isOpen={isNewAlarmOpen}
            onClose={() => setIsNewAlarmOpen(false)}
            onAdd={handleAddNewAlarm}
            energySaving={settings.energySaving}
          />
        )}
        
        {isAlarmListOpen && (
          <AlarmListModal
            isOpen={isAlarmListOpen}
            onClose={() => setIsAlarmListOpen(false)}
            alarms={alarms}
            onDelete={handleDeleteAlarm}
            energySaving={settings.energySaving}
          />
        )}

        {isFutureAlarmsOpen && (
          <FutureAlarmsModal
            isOpen={isFutureAlarmsOpen}
            onClose={() => setIsFutureAlarmsOpen(false)}
            alarms={alarms}
            onUpdate={handleUpdateAlarm}
            onDelete={handleDeleteAlarm}
            energySaving={settings.energySaving}
          />
        )}

        {isSettingsOpen && (
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            settings={settings}
            onSave={handleSaveSettings}
            onExport={handleExportBackup}
            onImport={handleImportBackup}
            energySaving={settings.energySaving}
          />
        )}

        {/* RINGING FULLSCREEN OVERLAY */}
        {activeAlarm && (
          <ActiveAlarmOverlay
            alarm={activeAlarm}
            onDismiss={handleDismissActiveAlarm}
            onSnooze={handleSnoozeActiveAlarm}
            settings={settings}
            energySaving={settings.energySaving}
          />
        )}

      </AnimatePresence>
    </div>
  );
}
