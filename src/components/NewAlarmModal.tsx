/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, Square, Play, Trash2, Calendar, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Alarm } from '../types';

interface NewAlarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: {
    date: string;
    time: string;
    messageType: 'text' | 'voice';
    message: string;
    voiceData?: string;
  }) => void;
  energySaving: boolean;
}

export default function NewAlarmModal({ isOpen, onClose, onAdd, energySaving }: NewAlarmModalProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [messageType, setMessageType] = useState<'text' | 'voice'>('text');
  const [message, setMessage] = useState('');
  const [voiceData, setVoiceData] = useState<string | undefined>(undefined);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Set default date as today, default time as +1 minute from now
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      
      // format YYYY-MM-DD
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      setDate(`${year}-${month}-${day}`);

      // format HH:MM
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String((now.getMinutes() + 1) % 60).padStart(2, '0');
      setTime(`${hours}:${minutes}`);

      // Reset state
      setMessageType('text');
      setMessage('');
      setVoiceData(undefined);
      setIsRecording(false);
      setRecordingSeconds(0);
      setAudioError(null);
    }
  }, [isOpen]);

  // Handle Recording Timer
  useEffect(() => {
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
          setVoiceData(base64data);
        };
        
        // Stop all tracks to release mic
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
    } catch (err: any) {
      console.error(err);
      setAudioError(err.message || 'No se pudo acceder al micrófono. Por favor permita el permiso de audio.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const deleteRecording = () => {
    setVoiceData(undefined);
    setRecordingSeconds(0);
  };

  const playRecording = () => {
    if (voiceData) {
      const audio = new Audio(voiceData);
      audio.play().catch((e) => {
        setAudioError('Error al reproducir el audio: ' + e.message);
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!date) {
      alert('Por favor, selecciona una fecha.');
      return;
    }
    if (!time) {
      alert('Por favor, selecciona un horario.');
      return;
    }

    if (messageType === 'text' && !message.trim()) {
      alert('Por favor, escribe un mensaje de alarma.');
      return;
    }

    if (messageType === 'voice' && !voiceData) {
      alert('Por favor, graba un mensaje de voz o cambia a mensaje escrito.');
      return;
    }

    onAdd({
      date,
      time,
      messageType,
      message: messageType === 'text' ? message.trim() : 'Mensaje de voz grabado 🎙️',
      voiceData: messageType === 'voice' ? voiceData : undefined,
    });

    onClose();
  };

  if (!isOpen) return null;

  // Format record duration
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      id="new_alarm_modal_backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if ((e.target as HTMLElement).id === 'new_alarm_modal_backdrop') onClose();
      }}
    >
      <motion.div
        id="new_alarm_modal_content"
        initial={energySaving ? undefined : { scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={energySaving ? undefined : { scale: 0.95, opacity: 0 }}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative"
      >
        {/* Header */}
        <div id="new_alarm_hdr" className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <span className="text-xl">⏰</span>
            <h2 className="text-lg font-semibold text-slate-100">Crear Nueva Alarma</h2>
          </div>
          <button
            id="close_modal_btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content form */}
        <form id="new_alarm_form" onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Calendar Picker & Clock Picker in Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar size={12} /> Fecha
              </label>
              <input
                id="alarm_date_picker"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-blue-600 transition-colors [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock size={12} /> Horario
              </label>
              <input
                id="alarm_time_picker"
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-blue-600 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Selector de tipo de mensaje: Escrito o Grabado de voz */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Tipo de Mensaje
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800/80">
              <button
                id="msg_text_tab"
                type="button"
                onClick={() => setMessageType('text')}
                className={`py-2 px-3 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                  messageType === 'text'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Escrito ✍️
              </button>
              <button
                id="msg_voice_tab"
                type="button"
                onClick={() => setMessageType('voice')}
                className={`py-2 px-3 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                  messageType === 'voice'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Grabado de Voz 🎙️
              </button>
            </div>
          </div>

          {/* Conditional Message Type Area */}
          <div className="min-h-[140px] bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-center">
            {messageType === 'text' ? (
              <div className="w-full h-full space-y-1">
                <label className="block text-xs text-slate-400 mb-1">
                  Mensaje de Alerta
                </label>
                <textarea
                  id="alarm_message_input"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ej: Tomar medicina de la tarde 💊"
                  required={messageType === 'text'}
                  rows={3}
                  className="w-full p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-blue-600 resize-none text-sm"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-3 py-2">
                {audioError && (
                  <div className="flex items-center gap-1.5 p-2 bg-red-950/40 border border-red-900/30 text-red-400 text-xs rounded-lg text-center">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{audioError}</span>
                  </div>
                )}

                {!voiceData && !isRecording && (
                  <div className="text-center">
                    <p className="text-xs text-slate-400 mb-3">Graba un mensaje de voz personalizado para reproducirlo cuando suene tu alarma.</p>
                    <button
                      id="rec_voice_start_btn"
                      type="button"
                      onClick={startRecording}
                      className="flex items-center justify-center gap-2 px-5 py-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 hover:text-red-300 font-medium rounded-xl transition-colors cursor-pointer text-sm w-fit mx-auto shadow-sm"
                    >
                      <Mic size={16} className="animate-pulse" />
                      Grabar Mensaje
                    </button>
                  </div>
                )}

                {isRecording && (
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      <span className="text-sm font-semibold text-red-500 tracking-widest">{formatTime(recordingSeconds)}</span>
                    </div>
                    
                    {/* Tiny responsive waveform representation */}
                    {!energySaving && (
                      <div className="flex justify-center items-center gap-0.5 h-6">
                        {[1, 2, 3, 4, 3, 2, 4, 5, 2, 3, 4, 3, 1].map((h, i) => (
                          <div 
                            key={i} 
                            style={{ height: `${h * 4}px` }}
                            className="w-1 bg-red-500 rounded-full animate-bounce" 
                          />
                        ))}
                      </div>
                    )}

                    <button
                      id="rec_voice_stop_btn"
                      type="button"
                      onClick={stopRecording}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors cursor-pointer text-sm"
                    >
                      <Square size={14} />
                      Detener Grabación
                    </button>
                  </div>
                )}

                {voiceData && !isRecording && (
                  <div className="text-center space-y-3">
                    <div className="flex items-center gap-1 text-emerald-500 justify-center">
                      <span>✓</span>
                      <span className="text-xs font-medium">Clips de voz listo para usar</span>
                    </div>

                    <div className="flex items-center justify-center gap-3">
                      <button
                        id="play_recorded_voice_btn"
                        type="button"
                        onClick={playRecording}
                        className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        <Play size={14} /> Reproducir
                      </button>
                      <button
                        id="delete_recorded_voice_btn"
                        type="button"
                        onClick={deleteRecording}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} /> Borrar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Guardar Alarma Button */}
          <div className="pt-2">
            <button
              id="submit_new_alarm_btn"
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer text-center text-sm"
            >
              Guardar Alarma 💾
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
