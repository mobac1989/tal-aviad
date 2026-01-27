
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
  const [isDownloading, setIsDownloading] = useState(false);
  
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

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(episode.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `טל ואביעד - ${episode.weekday} ${episode.date.replace(/\//g, '-')}.mp3`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setShowSettings(false);
    } catch (error) {
      console.error('Download failed', error);
      window.open(episode.url, '_blank');
    } finally {
      setIsDownloading(false);
    }
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

  // Logic to hide the "Add Summary" button if a summary already exists or was just submitted
  const shouldHideAddButton = !!summary || isSubmitted;

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
                <div 
                  dir="rtl"
                  className="absolute bottom-full left-0 mb-3 bg-white border border-slate-100 shadow-2xl rounded-2xl p-2 min-w-[160px] animate-in fade-in slide-in-from-bottom-2 duration-200 z-[160]"
                >
                  <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-50 mb-1 text-right">מהירות ניגון</div>
                  {speeds.map(speed => (
                    <button
                      key={speed}
                      onClick={() => {
                        setPlaybackRate(speed);
                        setShowSettings(false);
                      }}
                      className={`w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${playbackRate === speed ? 'bg-brand/10 text-brand' : 'hover:bg-slate-50 text-slate-600'}`}
                    >
                      <span>x{speed}</span>
                      {playbackRate === speed && <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>}
                    </button>
                  ))}
                  
                  <div className="h-px bg-slate-50 my-1 mx-2"></div>
                  
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="w-full text-right px-3 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-between text-slate-600 hover:bg-brand/5 hover:text-brand"
                  >
                    <span>הורדה למכשיר</span>
                    {isDownloading ? (
                      <div className="w-3.5 h-3.5 border-2 border-brand/20 border-t-brand rounded-full animate-spin"></div>
                    ) : (
                      <DownloadIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {!shouldHideAddButton && (
              <button 
                onClick={() => setShowSummaryForm(!showSummaryForm)}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${showSummaryForm ? 'bg-brand text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                title="Add Summary"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
            )}
          </div>
          
          <div className="flex-1 min-w-0 text-right">
            <h4 className="font-black text-lg md:text-2xl text-slate-800 leading-tight truncate">
              {episode.weekday} <span className="text-brand/30 font-light mx-0.5">|</span> {episode.date}
            </h4>
            {playbackRate !== 1 && (
              <span className="text-[10px] font-black text-brand bg-brand/5 px-2 py-0.5 rounded-full inline-block mt-1">
                מנגן במהירות x{playbackRate}
              </span>
            )}
          </div>
        </div>

        {/* Community Summary Display */}
        <div className="mb-4" dir="rtl">
          {summary?.status === 'approved' ? (
            <div className="bg-brand/5 border border-brand/5 p-3 rounded-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-brand/40"></div>
              <p className="text-slate-600 text-xs md:text-sm leading-relaxed font-medium">
                {summary.text}
              </p>
            </div>
          ) : null}
        </div>

        {/* Summary Submission Form */}
        {showSummaryForm && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300" dir="rtl">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-inner">
              {isSubmitted ? (
                <div className="text-center py-4 space-y-2">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h5 className="font-bold text-slate-800">התקציר נשלח בהצלחה!</h5>
                  <p className="text-xs text-slate-500">תודה שעזרת לקהילה. התקציר יפורסם לאחר אישור המערכת.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider">הוסיפו תקציר לטובת כולם</label>
                    <span className="text-[10px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full">יישלח לאישור המערכת</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">מה היה בפרק? התקציר שלכם יעזור למאזינים אחרים למצוא רגעים אהובים ויוצג לכל המשתמשים.</p>
                  <textarea 
                    className="w-full p-3 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand/20 bg-white"
                    placeholder="כתבו כאן את התקציר (עד 150 תווים)..."
                    value={newSummaryText}
                    onChange={(e) => setNewSummaryText(e.target.value)}
                    rows={3}
                    maxLength={150}
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-300 font-bold">{newSummaryText.length}/150</span>
                    <button 
                      onClick={handleSubmitSummary}
                      disabled={!newSummaryText.trim()}
                      className="bg-brand text-white px-6 py-2 rounded-full text-xs font-black shadow-lg shadow-brand/20 disabled:opacity-30 disabled:shadow-none transition-all active:scale-95"
                    >
                      שלח לאישור ופרסום
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 00 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);
const DownloadIcon = ({className}: {className?: string}) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
);

export default Player;