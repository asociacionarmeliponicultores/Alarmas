/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Bell, BellOff, Moon, Volume2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Alarm, AppSettings } from '../types';
import { AlarmSynth } from '../lib/synth';

interface ActiveAlarmOverlayProps {
  alarm: Alarm;
  onDismiss: (id: string) => void;
  onSnooze: (id: string) => void;
  settings: AppSettings;
  energySaving: boolean;
}

export default function ActiveAlarmOverlay({
  alarm,
  onDismiss,
  onSnooze,
  settings,
  energySaving,
}: ActiveAlarmOverlayProps) {
  const voicePlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // 1. Play synthesized alarm ring loop
    AlarmSynth.start(settings.soundType);

    // 2. Play custom voice recording loop if defined
    if (alarm.messageType === 'voice' && alarm.voiceData) {
      try {
        const audio = new Audio(alarm.voiceData);
        audio.loop = true;
        audio.volume = 1.0;
        audio.play().catch((err) => {
          console.warn('Autoplay of voice was blocked by browser permissions. Needs user action.', err);
        });
        voicePlayerRef.current = audio;
      } catch (e) {
        console.error('Error starting voice recording playback:', e);
      }
    }

    // 3. Handle Auto-off timeout based on settings.ringDuration (if > 0)
    let autoOffTimeout: any = null;
    if (settings.ringDuration > 0) {
      autoOffTimeout = setTimeout(() => {
        onDismiss(alarm.id);
      }, settings.ringDuration * 1000);
    }

    // Cleanup on unmount
    return () => {
      AlarmSynth.stop();
      if (voicePlayerRef.current) {
        try {
          voicePlayerRef.current.pause();
          voicePlayerRef.current = null;
        } catch (e) {
          // ignore
        }
      }
      if (autoOffTimeout) {
        clearTimeout(autoOffTimeout);
      }
    };
  }, [alarm, settings, onDismiss]);

  // Fallback replay button if autoplay was blocked by Chrome/Android gesture constraint
  const handleForcePlayVoice = () => {
    if (voicePlayerRef.current) {
      voicePlayerRef.current.play().catch(e => console.error(e));
    } else if (alarm.voiceData) {
      const audio = new Audio(alarm.voiceData);
      audio.loop = true;
      audio.play().catch(e => console.error(e));
      voicePlayerRef.current = audio;
    }
  };

  return (
    <div
      id="active_alarm_overlay"
      className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-between p-6 text-center select-none"
    >
      {/* Top area */}
      <div className="w-full max-w-sm pt-12 space-y-4">
        <span className="text-sm font-semibold uppercase tracking-widest text-[#ef4444] block">
          ¡Alarma Activa! 🚨
        </span>
        <h1 className="text-6xl font-black text-slate-100 font-mono tracking-tight animate-pulse">
          {alarm.time}
        </h1>
        <p className="text-xs text-slate-400">
          {new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Middle visual alert symbol */}
      <div className="relative flex items-center justify-center my-6">
        {/* Generous animated ripples representing soundwaves */}
        {!energySaving && (
          <>
            <div className="absolute w-44 h-44 rounded-full bg-red-600/10 border border-red-500/10 animate-ping" />
            <div className="absolute w-64 h-64 rounded-full bg-indigo-600/5 border border-indigo-500/5 animate-ping delay-300" />
          </>
        )}
        
        <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-red-600 to-indigo-600 flex items-center justify-center shadow-2xl relative z-10 border border-red-400/20">
          <Bell size={48} className="text-white animate-bounce" />
        </div>
      </div>

      {/* Alert message / Voice player control */}
      <div className="w-full max-w-md px-4 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-inner">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">
            Nota de alarma:
          </p>
          <p className="text-lg font-medium text-slate-100 italic leading-snug">
            "{alarm.messageType === 'voice' ? 'Mensaje grabado de voz personalizado 🎙️' : alarm.message}"
          </p>

          {alarm.messageType === 'voice' && (
            <button
              id="active_force_play_voice_btn"
              onClick={handleForcePlayVoice}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 text-xs font-semibold rounded-lg border border-indigo-500/20 transition-colors cursor-pointer"
            >
              <Volume2 size={13} /> Re-reproducir voz
            </button>
          )}
        </div>
        
        {settings.ringDuration > 0 && (
          <p className="text-[10px] text-slate-500">
            Se apagará automáticamente en {(settings.ringDuration)} segundos.
          </p>
        )}
      </div>

      {/* Action buttons (Dismiss and Snooze) */}
      <div className="w-full max-w-sm pb-12 grid grid-cols-1 gap-4">
        {/* APAGAR ALARMA (DISMISS) */}
        <button
          id="active_dismiss_btn"
          onClick={() => onDismiss(alarm.id)}
          className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold rounded-2xl shadow-xl hover:shadow-red-900/50 transition-all cursor-pointer flex items-center justify-center gap-2 text-md border border-red-500/20"
        >
          <BellOff size={20} />
          Apagar Alarma 🛑
        </button>

        {/* POSPONER (SNOOZE) */}
        <button
          id="active_snooze_btn"
          onClick={() => onSnooze(alarm.id)}
          className="w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-slate-200 border border-slate-800 hover:border-slate-700 font-semibold rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
        >
          <Moon size={16} className="text-purple-400" />
          Posponer ({settings.snoozeDuration} min) 💤
        </button>
      </div>
    </div>
  );
}
