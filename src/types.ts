/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Alarm {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  messageType: 'text' | 'voice';
  message: string;
  voiceData?: string; // Base64 data string for the recording
  status: 'active' | 'triggered' | 'dismissed' | 'postponed';
  snoozedUntil: number | null; // Timestamp
  snoozeCount: number;
  createdAt: number;
}

export type SoundType = 'digital' | 'analog' | 'bell' | 'birds' | 'melodic';

export interface AppSettings {
  soundType: SoundType;
  ringDuration: number; // in seconds, 0 means infinite/until turned off
  snoozeDuration: number; // in minutes
  energySaving: boolean; // toggles lightweight rendering/stops secondary calculations
}
