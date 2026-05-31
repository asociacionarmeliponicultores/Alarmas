/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Trash2, Calendar, Clock, AlertTriangle, Play } from 'lucide-react';
import { motion } from 'motion/react';
import { Alarm } from '../types';

interface AlarmListModalProps {
  isOpen: boolean;
  onClose: () => void;
  alarms: Alarm[];
  onDelete: (id: string) => void;
  energySaving: boolean;
}

export default function AlarmListModal({ isOpen, onClose, alarms, onDelete, energySaving }: AlarmListModalProps) {
  if (!isOpen) return null;

  const playVoice = (voiceData?: string) => {
    if (voiceData) {
      const audio = new Audio(voiceData);
      audio.play().catch(e => console.error('Error al reproducir audio de alarma:', e));
    }
  };

  const getStatusBadge = (status: Alarm['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Pendiente ⏰
          </span>
        );
      case 'triggered':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
            Sonando 🚨
          </span>
        );
      case 'dismissed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Apagada ✓
          </span>
        );
      case 'postponed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Pospuesta 💤
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      id="alarm_list_modal_backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if ((e.target as HTMLElement).id === 'alarm_list_modal_backdrop') onClose();
      }}
    >
      <motion.div
        id="alarm_list_modal_content"
        initial={energySaving ? undefined : { scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={energySaving ? undefined : { scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative"
      >
        {/* Header */}
        <div id="alarm_list_hdr" className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <span className="text-xl">🗂️</span>
            <h2 className="text-lg font-semibold text-slate-100">Historial completo de Alarmas</h2>
          </div>
          <button
            id="close_alarm_list_modal_btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Alarm list */}
        <div id="alarm_list_scroll_container" className="p-5 max-h-[420px] overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
          {alarms.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <span className="text-3xl block">📋</span>
              <p className="text-sm">No hay alarmas creadas aún.</p>
            </div>
          ) : (
            alarms.map((alarm) => (
              <div
                id={`alarm_item_${alarm.id}`}
                key={alarm.id}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-800 flex items-center justify-between gap-4 transition-all"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-200 flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800/60">
                      <Clock size={12} className="text-blue-400" />
                      {alarm.time}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                      <Calendar size={12} />
                      {alarm.date}
                    </span>
                    {getStatusBadge(alarm.status)}
                  </div>

                  <p className="text-sm text-slate-200 truncate pr-2">
                    {alarm.messageType === 'voice' ? '🎙️ Mensaje de voz personalizado' : alarm.message}
                  </p>

                  {alarm.messageType === 'voice' && alarm.voiceData && (
                    <button
                      id={`play_list_voice_btn_${alarm.id}`}
                      onClick={() => playVoice(alarm.voiceData)}
                      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium bg-blue-500/5 hover:bg-blue-500/10 px-2 py-1 rounded transition-colors cursor-pointer"
                    >
                      <Play size={10} /> Escuchar mensaje de voz
                    </button>
                  )}
                  
                  {alarm.snoozedUntil && alarm.status === 'postponed' && (
                    <p className="text-[11px] text-purple-400 font-medium">
                      Suena de nuevo: {new Date(alarm.snoozedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    id={`delete_alarm_btn_${alarm.id}`}
                    onClick={() => {
                      if (confirm('¿Estás seguro de eliminar esta alarma?')) {
                        onDelete(alarm.id);
                      }
                    }}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                    title="Eliminar alarma"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div id="alarm_list_ftr" className="p-4 border-t border-slate-800/80 bg-slate-950/80 text-center text-xs text-slate-400">
          Total de alarmas registradas en este dispositivo: <span className="text-slate-200 font-semibold">{alarms.length}</span>
        </div>
      </motion.div>
    </div>
  );
}
