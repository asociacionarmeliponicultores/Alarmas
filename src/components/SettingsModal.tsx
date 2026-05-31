/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { X, Play, ShieldAlert, Download, Upload, Cpu, Smartphone, Bell, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { AppSettings, SoundType } from '../types';
import { AlarmSynth } from '../lib/synth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onExport: () => void;
  onImport: (file: File) => Promise<{ success: boolean; message: string }>;
  energySaving: boolean;
}

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
  onExport,
  onImport,
  energySaving,
}: SettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  if (!isOpen) return null;

  const handleSoundChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSave({
      ...settings,
      soundType: e.target.value as SoundType,
    });
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSave({
      ...settings,
      ringDuration: parseInt(e.target.value, 10),
    });
  };

  const handleSnoozeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSave({
      ...settings,
      snoozeDuration: parseInt(e.target.value, 10),
    });
  };

  const handleEnergyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSave({
      ...settings,
      energySaving: e.target.checked,
    });
  };

  const testSound = () => {
    AlarmSynth.preview(settings.soundType);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportStatus(null);
      const res = await onImport(file);
      setImportStatus(res);
      // reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const ringOptions = [
    { value: 15, label: '15 Segundos' },
    { value: 30, label: '30 Segundos' },
    { value: 60, label: '1 Minuto' },
    { value: 120, label: '2 Minutos' },
    { value: 300, label: '5 Minutos' },
    { value: 0, label: 'Continuo (Hasta apagar manualmente)' },
  ];

  const snoozeOptions = [
    { value: 2, label: '2 Minutos' },
    { value: 5, label: '5 Minutos' },
    { value: 10, label: '10 Minutos' },
    { value: 15, label: '15 Minutos' },
    { value: 30, label: '30 Minutos' },
  ];

  return (
    <div 
      id="settings_modal_backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if ((e.target as HTMLElement).id === 'settings_modal_backdrop') onClose();
      }}
    >
      <motion.div
        id="settings_modal_content"
        initial={energySaving ? undefined : { scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={energySaving ? undefined : { scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative"
      >
        {/* Header */}
        <div id="settings_hdr" className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <h2 className="text-lg font-semibold text-slate-100">Configuración avanzada</h2>
          </div>
          <button
            id="close_settings_modal_btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scroll Container */}
        <div id="settings_scroll_container" className="p-5 max-h-[420px] overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
          
          {/* Section 1: Alertas y Sonidos */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/60 pb-1.5">
              <Bell size={13} className="text-blue-400" /> Tono de Alertas y Sonido
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Tipo de Tono</label>
                <div className="flex gap-2">
                  <select
                    id="sett_sound_type"
                    value={settings.soundType}
                    onChange={handleSoundChange}
                    className="flex-1 text-sm bg-slate-950 text-slate-200 border border-slate-800 rounded-xl p-2.5 outline-none [color-scheme:dark] focus:border-blue-500"
                  >
                    <option value="digital">Digital Ring (Beep Beep) 📟</option>
                    <option value="analog">Alarma Clásica (Ring-Ring) 🔔</option>
                    <option value="bell">Clave de Campanas Metálicas 🛎️</option>
                    <option value="birds">Trinos de Pájaros Sintéticos 🐦</option>
                    <option value="melodic">Arpegio Melódico Suave 🎶</option>
                  </select>
                  <button
                    id="sett_test_sound_btn"
                    type="button"
                    onClick={testSound}
                    className="p-2.5 bg-blue-600/10 text-blue-400 hover:bg-blue-600 border border-blue-500/20 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center px-4"
                    title="Probar sonido seleccionado"
                  >
                    <Play size={16} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Duración Máxima sonando</label>
                <select
                  id="sett_ring_duration"
                  value={settings.ringDuration}
                  onChange={handleDurationChange}
                  className="w-full text-sm bg-slate-950 text-slate-200 border border-slate-800 rounded-xl p-2.5 outline-none [color-scheme:dark] focus:border-blue-500"
                >
                  {ringOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Tiempo de Posponer (Snooze)</label>
                <select
                  id="sett_snooze_duration"
                  value={settings.snoozeDuration}
                  onChange={handleSnoozeChange}
                  className="w-full text-sm bg-slate-950 text-slate-200 border border-slate-800 rounded-xl p-2.5 outline-none [color-scheme:dark] focus:border-blue-500"
                >
                  {snoozeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Eficiencia de Energía */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/60 pb-1.5">
              <Cpu size={13} className="text-blue-400" /> Eficiencia Energética
            </h3>
            
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-sm font-semibold text-slate-200 block">Modo Ahorro de Energía</span>
                  <span className="text-xs text-slate-400 block leading-tight">
                    Optimiza el consumo reduciendo las animaciones, desactivando el segundero dinámico de la home, disminuyendo los estados de render y bajando la frecuencia de procesamiento visual en primer plano.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    id="sett_energy_saving_checkbox"
                    type="checkbox"
                    checked={settings.energySaving}
                    onChange={handleEnergyChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:bg-emerald-400 peer-checked:after:border-emerald-400 peer-checked:bg-emerald-600/35 border border-slate-700 peer-focus:border-slate-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Copia de Respaldo JSON */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800/60 pb-1.5">
              <Download size={13} className="text-blue-400" /> Respaldo de Configuración
            </h3>
            
            <div id="backup_settings_controls" className="grid grid-cols-2 gap-3">
              <button
                id="sett_export_btn"
                type="button"
                onClick={onExport}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
              >
                <Download size={14} className="text-indigo-400" /> Exportar JSON
              </button>

              <button
                id="sett_import_btn"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
              >
                <Upload size={14} className="text-indigo-400" /> Importar JSON
              </button>
            </div>
            
            <input
              id="sett_file_uploader"
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />

            {importStatus && (
              <div
                id="import_feedback_banner"
                className={`p-3 rounded-lg text-xs font-medium border ${
                  importStatus.success
                    ? 'bg-emerald-950/40 border-emerald-900/30 text-emerald-400'
                    : 'bg-red-950/40 border-red-900/40 text-red-400'
                }`}
              >
                {importStatus.message}
              </div>
            )}
          </div>

          {/* Section 4: Android & Background offline usage instructions */}
          <div className="space-y-4 bg-slate-950/50 p-4 border border-slate-800/50 rounded-xl">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone size={14} className="text-blue-400 animate-bounce" /> Guía para Teléfonos Android
            </h3>
            
            <p className="text-[11px] text-slate-400 leading-relaxed leading-tight">
              Para garantizar que las alarmas suenen con la <span className="text-slate-200 font-semibold">aplicación cerrada</span> y la <span className="text-slate-200 font-semibold">pantalla apagada</span> (sin depender de internet):
            </p>

            <ul className="text-[11px] text-slate-400 list-decimal pl-4.5 space-y-2 leading-relaxed">
              <li>
                <span className="text-slate-200 font-medium">Instalar como PWA (App)</span>: Haz clic en el botón de tres puntos de tu navegador (Chrome) y pulsa <span className="text-slate-200">"Instalar aplicación"</span> o <span className="text-slate-200">"Añadir a pantalla de inicio"</span>.
              </li>
              <li>
                <span className="text-slate-200 font-medium">Permitir Notificaciones</span>: Cuando la app solicite permisos de notificación en primer plano, haz clic en <span className="text-slate-200">"Permitir"</span>. Esto habilita que el dispositivo se autorice a mandar avisos al apagarse la pantalla.
              </li>
              <li>
                <span className="text-slate-200 font-medium">Batería sin restricciones (Crucial)</span>: En Android, mantén pulsado el icono de la aplicación, ve a <span className="text-slate-200">Información de la aplicación &gt; Batería / Uso de batería</span> y selecciona <span className="text-emerald-400 font-semibold">"Sin restricciones / Optimización desactivada"</span>. Esto evita que Android congele las alarmas en segundo plano.
              </li>
              <li>
                <span className="text-slate-200 font-medium">Usa el Modo Ahorro</span>: Activa el botón de "Modo Ahorro de Energía" del dispositivo que reducirá el uso de CPU de forma agresiva.
              </li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div id="settings_ftr" className="p-4 border-t border-slate-800/80 bg-slate-950/80 text-center text-xs text-slate-400 flex items-center justify-center gap-1">
          <HelpCircle size={12} /> Esta aplicación almacena tus alarmas en la memoria local segura (IndexedDB).
        </div>
      </motion.div>
    </div>
  );
}
