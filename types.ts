
export interface Episode {
  id: string;
  date: string;
  dateISO: string;
  weekday: string;
  year: number;
  month: number;
  monthName: string;
  day: number;
  url: string;
  notes: string;
  display: string;
}

export interface Summary {
  episodeId: string;
  text: string;
  status: 'pending' | 'approved';
  createdAt: number;
}

export interface SharedClip {
  id: string;
  episodeId: string;
  timestamp: number;
  description: string;
  createdAt: number;
}

export interface PlaybackState {
  lastPlayedId: string | null;
  progress: Record<string, number>; // id -> seconds
  playedIds: string[]; // List of completed episode IDs
}

export interface MonthGroup {
  month: number;
  monthName: string;
  episodes: Episode[];
}

export interface YearGroup {
  year: number;
  months: MonthGroup[];
}