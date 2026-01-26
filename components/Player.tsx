
import React, { useState, useEffect, useRef } from 'react';
import { Episode, Summary } from '../types';

interface PlayerProps {
  episode: Episode;
  initialTime: number;
  summary?: Summary;
  onAddSummary: (text: string) => void;
  onProgress: (time: number) => void;
  onComplete: () => void;
  onClose: () => void;
}

const Player: React.FC<PlayerProps> = ({ 
  episode, 
  initialTime, 
  summary, 
  onAddSummary, 
  onProgress, 
  onComplete, 
  onClose 
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  
  const [showSummaryForm, setShowSummaryForm] = useState(false);
  const [newSummaryText, setNewSummaryText] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = initialTime;
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
    setShowSummaryForm(false);
    setIsSubmitted(false);
    setNewSummaryText("");
    setShowSettings(false);
  }, [episode.id]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && !isDragging) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      onProgress(time);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoading(false);
    }
  };

  const onSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
  };

  const onSeekStart = () => setIsDragging(true);
  const onSeekEnd = () => {
    setIsDragging(false);
    if (audioRef.current) audioRef.current.currentTime = currentTime;
  };

  const handleSubmitSummary = () => {
    if (newSummaryText.trim()) {
      onAddSummary(newSummaryText);
      setIsSubmitted(true);
      setTimeout(() => setShowSummaryForm(false), 2000);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPct = duration ? (currentTime / duration) * 100 : 0;
  const speeds = [1, 1.2, 1.5, 2];

  return (
    <div dir="ltr" className="fixed bottom-0 left-0 right-0 z-[150] bg-white text-slate-900 border-t border-slate-100 shadow-[0_-15px_40px_rgba(0,0,0,0.08)] rounded-t-[2.5rem] animate-in slide-in-from-bottom duration-500 ease-out overflow-visible">
      <div className="max-w-xl mx-auto px-6 py-6 md:py-8">
        
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose} 
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-brand transition-all bg-slate-50 hover:bg-brand/10 rounded-full flex-shrink-0"
              aria-label="Close Player"
            >
              <CloseIcon />
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${showSettings ? 'bg-brand text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                title="Settings"
              >
                <SettingsIcon />
              </button>
              
              {showSettings && (
                <div className="absolute bottom-full left-0 mb-3 bg-white border border-slate-100 shadow-2xl rounded-2xl p-2 min-w-[120px] animate-in fade-in slide-in-from-bottom-2 duration-200 z-[160]">
                  <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-50 mb-1">מהירות ניגון</div>
                  {speeds.map(speed => (
                    <button
                      key={speed}
                      onClick={() => {
                        setPlaybackRate(speed);
                        setShowSettings(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${playbackRate === speed ? 'bg-brand/10 text-brand' : 'hover:bg-slate-50 text-slate-600'}`}
                    >
                      <span>x{speed}</span>
                      {playbackRate === speed && <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-1 min-w-0 text-right">
            <h4 className="font-black text-xl md:text-2xl text-slate-800 leading-tight truncate">
              {episode.weekday} <span className="text-brand/30 font-light mx-0.5">|</span> {episode.date}
            </h4>
            {playbackRate !== 1 && (
              <span className="text-[10px] font-black text-brand bg-brand/5 px-2 py-0.5 rounded-full inline-block mt-1">
                מנגן במהירות x{playbackRate}
              </span>
            )}
          </div>
        </div>

        {/* Summary Section - Smaller and tighter */}
        <div className="mb-4" dir="rtl">
          {summary?.status === 'approved' ? (
            <div className="bg-brand/5 border border-brand/5 p-3 rounded-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-brand/40"></div>
              <p className="text-slate-600 text-xs md:text-sm leading-relaxed font-medium">
                {summary.text}
              </p>
            </div>
          ) : isSubmitted ? (
            <div className="text-center py-2 text-brand text-xs font-bold">תודה! התקציר נשלח לבדיקה.</div>
          ) : showSummaryForm ? (
            <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <textarea 
                autoFocus
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-brand/20 outline-none transition-all resize-none"
                placeholder="מה קרה בפרק?"
                maxLength={150}
                rows={2}
                value={newSummaryText}
                onChange={(e) => setNewSummaryText(e.target.value)}
              />
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-slate-400 font-bold">{newSummaryText.length}/150</span>
                <div className="flex gap-2">
                  <button onClick={() => setShowSummaryForm(false)} className="px-3 py-1 text-[10px] font-bold text-slate-400">ביטול</button>
                  <button disabled={!newSummaryText.trim()} onClick={handleSubmitSummary} className="px-4 py-1 bg-brand text-white text-[10px] font-bold rounded-full disabled:opacity-50">שלח</button>
                </div>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setShowSummaryForm(true)}
              className="w-full py-2 px-4 border border-dashed border-slate-200 hover:border-brand/30 hover:bg-brand/5 rounded-xl flex items-center justify-center gap-2 text-slate-400 hover:text-brand transition-all group"
            >
              <EditIcon className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">הוסף תקציר לפרק</span>
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="relative h-4 flex items-center group">
              <div className="absolute w-full h-1.5 bg-slate-100 rounded-full"></div>
              <div className="absolute h-1.5 bg-brand rounded-full pointer-events-none z-10" style={{ width: `${progressPct}%` }} />
              <input type="range" min={0} max={duration || 100} step="1" value={currentTime}
                onChange={onSeekChange} onMouseDown={onSeekStart} onMouseUp={onSeekEnd} onTouchStart={onSeekStart} onTouchEnd={onSeekEnd}
                className="absolute w-full h-4 bg-transparent appearance-none cursor-pointer outline-none z-20 
                           [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                           [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand [&::-webkit-slider-thumb]:border-4 
                           [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-lg
                           [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
              />
            </div>
            <div className="flex justify-between text-[10px] font-black text-slate-400 tabular-nums tracking-wider">
              <span className="text-brand/70">{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-8 md:gap-12">
            <button onClick={() => skip(-30)} className="flex flex-col items-center text-slate-300 hover:text-brand transition-all active:scale-90" title="Rewind 30s">
              <SkipBackIcon className="w-7 h-7" /><span className="text-[9px] font-black mt-1 uppercase">30s</span>
            </button>
            <button onClick={togglePlay} className="w-16 h-16 md:w-20 md:h-20 bg-brand text-white rounded-full flex items-center justify-center shadow-xl shadow-brand/20 hover:scale-105 active:scale-95 transition-all">
              {isLoading ? <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin"></div> : isPlaying ? <PauseIconLarge className="w-8 h-8" /> : <PlayIconLarge className="w-8 h-8" />}
            </button>
            <button onClick={() => skip(30)} className="flex flex-col items-center text-slate-300 hover:text-brand transition-all active:scale-90" title="Forward 30s">
              <SkipForwardIcon className="w-7 h-7" /><span className="text-[9px] font-black mt-1 uppercase">30s</span>
            </button>
          </div>
        </div>
      </div>
      <audio 
        ref={audioRef} 
        src={episode.url} 
        onTimeUpdate={handleTimeUpdate} 
        onLoadedMetadata={handleLoadedMetadata} 
        onEnded={onComplete} 
        onPlay={() => setIsPlaying(true)} 
        onPause={() => setIsPlaying(false)} 
        autoPlay 
      />
    </div>
  );
};

const PlayIconLarge = ({className}: {className?: string}) => (
  <svg className={`fill-current ${className || "w-10 h-10 translate-x-1"}`} viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
);
const PauseIconLarge = ({className}: {className?: string}) => (
  <svg className={`fill-current ${className || "w-10 h-10"}`} viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
);
const SkipBackIcon = ({className}: {className?: string}) => (
  <svg className={className || "w-8 h-8"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
);
const SkipForwardIcon = ({className}: {className?: string}) => (
  <svg className={className || "w-8 h-8"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7-7 7M6 5l7 7-7 7" /></svg>
);
const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
);
const EditIcon = ({className}: {className?: string}) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
);
const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 00 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);

export default Player;
