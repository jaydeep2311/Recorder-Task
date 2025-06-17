export interface ScreenSource {
  id: string;
  name: string;
  thumbnail: string;
}

export interface RecordingSession {
  recordingId: string;
  recordingDir: string;
  startTime: Date;
  duration: number;
  customName?: string;
}
