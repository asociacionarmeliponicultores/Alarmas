/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Edit2, Check, Calendar, Clock, Trash2, Mic, Play, Square, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Alarm } from '../types';

interface FutureAlarmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alarms: Alarm[];
  onUpdate: (alarm: Alarm) => void;
  onDelete: (id: string) => void;
  energySaving: boolean;
}

export default function FutureAlarmsModal({ isOpen, onClose, alarms, onUpdate, onDelete, energySaving }: FutureAlarmsModalProps) {
  // Filter only upcoming (not triggered or dismissed unless snoozed/active)
  const futureAlarms = alarms.filter((a) => a.status === 'active' || a.status === 'postponed');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editMsgType, setEditMsgType] = useState<'text' | 'voice'>('text');
  const [editMessage, setEditMessage] = useState('');
  const [editVoiceData, setEditVoiceData] = useState<string | undefined>(undefined);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<any>(null);

  // Trigger Recording Timer
  React.useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  if (!isOpen) return null;

  const startEditing = (alarm: Alarm) => {
    setEditingId(alarm.id);
    setEditDate(alarm.date);
    setEditTime(alarm.time);
    setEditMsgType(alarm.messageType);
    setEditMessage(alarm.messageType === 'text' ? alarm.message : '');
    setEditVoiceData(alarm.voiceData);
    setIsRecording(false);
    setAudioError(null);
  };

  const handleSave = (id: string) => {
    if (!editDate || !editTime) {
      alert('Fecha y hora requeridas.');
      return;
    }
    if (editMsgType === 'text' && !editMessage.trim()) {
      alert('Mensaje requerido.');
      return;
    }
    if (editMsgType === 'voice' && !editVoiceData) {
      alert('Grabe un mensaje de voz o escriba un texto.');
      return;
    }

    const originalAlarm = alarms.find((a) => a.id === id);
    if (originalAlarm) {
      onUpdate({
        ...originalAlarm,
        date: editDate,
        time: editTime,
        messageType: editMsgType,
        message: editMsgType === 'text' ? editMessage.trim() : 'Mensaje de voz grabado 🎙️',
        voiceData: editMsgType === 'voice' ? editVoiceData : undefined,
        // Reset postpone status if rescheduled
        status: originalAlarm.status === 'postponed' ? 'active' : originalAlarm.status,
        snoozedUntil: originalAlarm.status === 'postponed' ? null : originalAlarm.snoozedUntil,
      });
    }

    setEditingId(null);
  };

  const startRecording = async () => {
    audioChunksRef.current = [];
    setAudioError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La grabación de voz no está soportada en este navegador.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setEditVoiceData(base64data);
        };
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
    } catch (err: any) {
      setAudioError(err.message || 'No se pudo acceder al micrófono.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playVoice = (data?: string) => {
    if (data) {
      const audio = new Audio(data);
      audio.play().catch(e => console.error(e));
    }
  };

  return (
    <div 
      id="future_alarms_modal_backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if ((e.target as HTMLElement).id === 'future_alarms_modal_backdrop') onClose();
      }}
    >
      <motion.div
        id="future_alarms_modal_content"
        initial={energySaving ? undefined : { scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={energySaving ? undefined : { scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative"
      >
        {/* Header */}
        <div id="future_alarms_hdr" className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <span className="text-xl">📅</span>
            <h2 className="text-lg font-semibold text-slate-100">Próximas Alarmas (Futuras)</h2>
          </div>
          <button
            id="close_future_alarms_modal_btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content list */}
        <div id="future_alarms_scroll_container" className="p-5 max-h-[420px] overflow-y-auto space-y-3">
          {futureAlarms.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <span className="text-3xl block">🔔</span>
              <p className="text-sm">No hay alarmas programadas activas para el futuro.</p>
            </div>
          ) : (
            futureAlarms.map((alarm) => {
              const isEditing = editingId === alarm.id;

              return (
                <div
                  id={`future_alarm_card_${alarm.id}`}
                  key={alarm.id}
                  className={`p-4 rounded-xl border ${
                    isEditing 
                      ? 'bg-slate-950 border-blue-500/50' 
                      : 'bg-slate-950 border-slate-800/80 hover:border-slate-800'
                  } transition-all space-y-3`}
                >
                  {!isEditing ? (
                    // VIEW MODE
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-200 bg-blue-900/10 text-blue-400 px-2.5 py-0.5 rounded border border-blue-500/20 flex items-center gap-1">
                            <Clock size={12} />
                            {alarm.time}
                          </span>
                          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                            <Calendar size={12} />
                            {alarm.date}
                          </span>
                          {alarm.status === 'postponed' && (
                            <span className="text-[10px] font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-full">
                              Pospuesto 💤
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-300 truncate">
                          {alarm.messageType === 'voice' ? '🎙️ Mensaje de voz personalizado' : alarm.message}
                        </p>
                        
                        {alarm.messageType === 'voice' && alarm.voiceData && (
                          <button
                            id={`play_future_voice_${alarm.id}`}
                            onClick={() => playVoice(alarm.voiceData)}
                            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                          >
                            <Play size={10} /> Escuchar mensaje de voz
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                        <button
                          id={`edit_future_btn_${alarm.id}`}
                          onClick={() => startEditing(alarm)}
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          title="Modificar alarma"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          id={`delete_future_btn_${alarm.id}`}
                          onClick={() => {
                            if (confirm('¿Eliminar esta alarma?')) {
                              onDelete(alarm.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          title="Eliminar alarma"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // EDIT MODE
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-blue-400">Modificando Alarma</span>
                        <button
                          id="cancel_edit_btn"
                          onClick={() => setEditingId(null)}
                          className="text-xs text-slate-400 hover:text-slate-200"
                        >
                          Cancelar
                        </button>
                      </div>

                      {/* Pickers */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Fecha
                          </label>
                          <input
                            id="edit_date_field"
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-blue-600 [color-scheme:dark]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                            Horario
                          </label>
                          <input
                            id="edit_time_field"
                            type="time"
                            value={editTime}
                            onChange={(e) => setEditTime(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-blue-600 [color-scheme:dark]"
                          />
                        </div>
                      </div>

                      {/* Audio/Text Type Selector */}
                      <div className="bg-slate-900/60 p-1 rounded-lg border border-slate-800 flex justify-between gap-1">
                        <button
                          id="edit_msg_text_btn"
                          type="button"
                          onClick={() => setEditMsgType('text')}
                          className={`flex-1 py-1 px-2 text-xs font-medium rounded transition-all cursor-pointer ${
                            editMsgType === 'text' ? 'bg-blue-600 text-white' : 'text-slate-400'
                          }`}
                        >
                          Escrito ✍️
                        </button>
                        <button
                          id="edit_msg_voice_btn"
                          type="button"
                          onClick={() => setEditMsgType('voice')}
                          className={`flex-1 py-1 px-2 text-xs font-medium rounded transition-all cursor-pointer ${
                            editMsgType === 'voice' ? 'bg-blue-600 text-white' : 'text-slate-400'
                          }`}
                        >
                          Voz 🎙️
                        </button>
                      </div>

                      {/* Content editing */}
                      <div className="bg-slate-900 p-3 rounded-lg border border-slate-800/80 min-h-[90px] flex flex-col justify-center">
                        {editMsgType === 'text' ? (
                          <textarea
                            id="edit_text_area"
                            value={editMessage}
                            onChange={(e) => setEditMessage(e.target.value)}
                            placeholder="Mensaje de alarma..."
                            className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 text-xs focus:outline-none focus:border-blue-600 resize-none"
                            rows={2}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center space-y-2">
                            {audioError && <span className="text-[10px] text-red-400">{audioError}</span>}

                            {!editVoiceData && !isRecording && (
                              <button
                                id="edit_rec_start_btn"
                                type="button"
                                onClick={startRecording}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 text-xs rounded-lg cursor-pointer"
                              >
                                <Mic size={12} className="animate-pulse" /> Grabar Mensaje
                              </button>
                            )}

                            {isRecording && (
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-red-500">{recordingSeconds}s</span>
                                <button
                                  id="edit_rec_stop_btn"
                                  type="button"
                                  onClick={stopRecording}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-red-600 text-white text-xs rounded cursor-pointer"
                                >
                                  <Square size={10} /> Parar
                                </button>
                              </div>
                            )}

                            {editVoiceData && !isRecording && (
                              <div className="flex items-center gap-2">
                                <button
                                  id="edit_play_voice_btn"
                                  type="button"
                                  onClick={() => playVoice(editVoiceData)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 text-slate-200 text-xs rounded pointer-events-auto cursor-pointer"
                                >
                                  <Play size={10} /> Test
                                </button>
                                <button
                                  id="edit_clear_voice_btn"
                                  type="button"
                                  onClick={() => setEditVoiceData(undefined)}
                                  className="text-xs text-red-400 hover:text-red-300"
                                >
                                  Grabar de nuevo
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Save btn */}
                      <button
                        id="save_edit_alarm_btn"
                        onClick={() => handleSave(alarm.id)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg shadow transition-colors cursor-pointer"
                      >
                        <Check size={14} /> Aplicar cambios
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div id="future_alarms_ftr" className="p-4 border-t border-slate-800/80 bg-slate-950/80 text-center text-xs text-slate-400">
          Alarmas pendientes futuras: <span className="text-blue-400 font-semibold">{futureAlarms.length}</span>
        </div>
      </motion.div>
    </div>
  );
}
