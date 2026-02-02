
import React, { useState, useEffect, useRef } from 'react';
import { Episode, Summary, SharedClip } from '../types';

interface PlayerProps {
  episode: Episode;
  initialTime: number;
  summary?: Summary;
  sharedDescription?: string | null;
  onAddSummary: (text: string) => void;
  onAddSharedClip: (clip: SharedClip) => void;
  onProgress: (time: number) => void;
  onComplete: () => void;
  onClose: () => void;
}

const Player: React.FC<PlayerProps> = ({ 
  episode, 
  initialTime, 
  summary, 
  sharedDescription,
  onAddSummary, 
  onAddSharedClip, 
  onProgress, 
  onComplete, 
  onClose 
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasSeekedInitialRef = useRef(false);
  const lastSavedTimeRef = useRef(initialTime);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  
  const [isMounted, setIsMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareClipDescription, setShareClipDescription] = useState("");
  const [shareTimestamp, setShareTimestamp] = useState(0);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    hasSeekedInitialRef.current = false;
    lastSavedTimeRef.current = initialTime;
    setIsLoading(true);
    setAutoplayBlocked(false);
    setAudioError(null);
    setShowShareModal(false);
    setShowSettings(false);
    setShareClipDescription("");
    
    if (audioRef.current) {
      audioRef.current.load();
    }
  }, [episode.id]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const handleCanPlay = () => {
    if (audioRef.current && !hasSeekedInitialRef.current) {
      const audio = audioRef.current;
      setTimeout(() => {
        if (audio) {
          audio.currentTime = initialTime;
          hasSeekedInitialRef.current = true;
          setIsLoading(false);
          setAudioError(null);
          
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              console.log("Autoplay prevented:", error);
              setAutoplayBlocked(true);
            });
          }
        }
      }, 150);
    }
  };

  const handleAudioError = () => {
    setIsLoading(false);
    setAudioError("מצטערים, לא ניתן להפעיל את התוכנית הזו כרגע.");
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (audioRef.current && !audioError) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        setAutoplayBlocked(false);
        audioRef.current.play();
      }
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      const newTime = audioRef.current.currentTime + seconds;
      audioRef.current.currentTime = Math.max(0, Math.min(newTime, duration));
      setCurrentTime(audioRef.current.currentTime);
      onProgress(audioRef.current.currentTime);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && !isDragging) {
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      
      if (Math.abs(time - lastSavedTimeRef.current) >= 3) {
        onProgress(time);
        lastSavedTimeRef.current = time;
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const onSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
  };

  const onSeekStart = () => setIsDragging(true);
  const onSeekEnd = () => {
    setIsDragging(false);
    if (audioRef.current) {
      audioRef.current.currentTime = currentTime;
      onProgress(currentTime);
      lastSavedTimeRef.current = currentTime;
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const openShareModal = () => {
    if (audioRef.current) {
      setShareTimestamp(audioRef.current.currentTime);
      setShowShareModal(true);
    }
  };

  const handleInternalClose = () => {
    if (audioRef.current) {
      onProgress(audioRef.current.currentTime);
    }
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const generateShareUrl = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    params.set('ep', episode.id);
    params.set('t', Math.floor(shareTimestamp).toString());
    if (shareClipDescription.trim()) {
      params.set('n', encodeURIComponent(shareClipDescription.trim()));
    }
    return `${baseUrl}?${params.toString()}`;
  };

  const handleShareAction = (platform: 'wa' | 'fb' | 'ig' | 'copy') => {
    const url = generateShareUrl();
    const text = `מישהו חייב לשמוע את זה! (טל ואביעד, ${episode.date}): ${shareClipDescription ? `"${shareClipDescription}"` : ''} \n ${url}`;

    onAddSharedClip({
      id: Math.random().toString(36).substr(2, 9),
      episodeId: episode.id,
      timestamp: shareTimestamp,
      description: shareClipDescription.trim(),
      createdAt: Date.now()
    });

    if (platform === 'wa') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else if (platform === 'fb') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    } else {
      navigator.clipboard.writeText(url);
      setCopyStatus(platform === 'ig' ? "הקישור הועתק! הדביקו בסטורי" : "הקישור הועתק!");
      setTimeout(() => setCopyStatus(null), 2000);
    }
  };

  const progressPct = duration ? (currentTime / duration) * 100 : 0;
  const speeds = [1, 1.2, 1.5, 2];
  const transitionClass = isExiting || !isMounted ? "translate-y-full" : "translate-y-0";

  return (
    <>
      <div 
        dir="ltr" 
        className={`fixed bottom-0 left-0 right-0 z-[150] bg-white text-slate-900 border-t border-slate-100 shadow-[0_-15px_40px_rgba(0,0,0,0.12)] rounded-t-[2.5rem] transition-transform duration-300 ease-in-out transform ${transitionClass}`}
      >
        {autoplayBlocked && !audioError && (
          <div className="absolute inset-0 z-[170] bg-white/80 backdrop-blur-md rounded-t-[2.5rem] flex items-center justify-center">
            <button onClick={togglePlay} className="flex flex-col items-center gap-4 group">
              <div className="w-24 h-24 bg-brand text-white rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300 ease-in-out active:scale-95">
                <PlayIconLarge className="w-10 h-10 translate-x-1" />
              </div>
              <span className="text-brand font-black text-lg" dir="rtl">לחצו להאזנה</span>
            </button>
          </div>
        )}

        {audioError && (
          <div className="absolute inset-0 z-[175] bg-white rounded-t-[2.5rem] flex items-center justify-center p-8 text-center">
            <div className="space-y-4 max-w-xs">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                <ErrorIcon className="w-8 h-8" />
              </div>
              <p className="text-slate-800 font-bold" dir="rtl">{audioError}</p>
              <button onClick={handleInternalClose} className="text-brand font-black text-sm uppercase tracking-widest">סגור נגן</button>
            </div>
          </div>
        )}

        <div className="max-w-xl mx-auto px-6 py-6 md:py-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <button onClick={handleInternalClose} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-brand transition-all duration-300 bg-slate-50 hover:bg-brand/10 rounded-full flex-shrink-0">
                <CloseIcon />
              </button>
              <div className="relative">
                <button onClick={() => setShowSettings(!showSettings)} className={`w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300 ${showSettings ? 'bg-brand text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                  <SettingsIcon />
                </button>
                {showSettings && (
                  <div dir="rtl" className="absolute bottom-full left-0 mb-3 bg-white border border-slate-100 shadow-2xl rounded-2xl p-2 min-w-[160px] animate-in fade-in slide-in-from-bottom-2 duration-200 z-[160]">
                    <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase border-b border-slate-50 mb-1 text-right">מהירות ניגון</div>
                    {speeds.map(speed => (
                      <button key={speed} onClick={() => { setPlaybackRate(speed); setShowSettings(false); }}
                        className={`w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-between ${playbackRate === speed ? 'bg-brand/10 text-brand' : 'hover:bg-slate-50 text-slate-600'}`}>
                        <span>x{speed}</span>
                        {playbackRate === speed && <div className="w-1.5 h-1.5 bg-brand rounded-full"></div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0 text-right relative">
              <h4 className="font-black text-lg md:text-2xl text-slate-800 leading-tight truncate">
                {episode.weekday} <span className="text-brand/30 font-light mx-0.5">|</span> {episode.date}
              </h4>
              {playbackRate !== 1 && (
                <div className="absolute top-full right-0 mt-0.5" dir="rtl">
                  <span className="text-[9px] font-black text-brand bg-brandLight/50 px-1.5 py-0.5 rounded-md border border-brand/20 leading-none inline-block">
                    מהירות x{playbackRate}
                  </span>
                </div>
              )}
            </div>
          </div>

          {sharedDescription ? (
            <div className="mb-4" dir="rtl">
              <div className="bg-brand/5 border border-brand/10 p-4 rounded-2xl">
                <span className="text-[10px] font-black text-brand uppercase tracking-widest block mb-1">קטע משותף:</span>
                <p className="text-slate-800 text-sm md:text-base leading-relaxed font-black">"{sharedDescription}"</p>
              </div>
            </div>
          ) : summary?.status === 'approved' && (
            <div className="mb-2" dir="rtl">
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                <p className="text-slate-600 text-xs md:text-sm leading-relaxed font-medium">{summary.text}</p>
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
                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 
                             [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand [&::-webkit-slider-thumb]:border-[1px] 
                             [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-lg"
                />
              </div>
              <div className="flex justify-between text-[10px] font-black text-slate-400 tabular-nums tracking-wider">
                <span className="text-brand font-bold">{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Gap logic: Default is gap-8, grows to 10 on modern large phones, shrinks to 4 only if screen < 360px */}
            <div className="flex items-center justify-center gap-8 min-[400px]:gap-10 max-[360px]:gap-4 md:gap-16">
              <button onClick={() => skip(-10)} className="flex-shrink-0 flex flex-col items-center text-slate-300 md:hover:text-brand active:text-brand transition-all active:scale-90">
                <SkipBack10Icon className="w-8 h-8 md:w-9 md:h-9" /><span className="text-[8px] md:text-[9px] font-black mt-1">10s</span>
              </button>
              <button onClick={() => skip(-30)} className="flex-shrink-0 flex flex-col items-center text-slate-300 md:hover:text-brand active:text-brand transition-all active:scale-90">
                <SkipBackIcon className="w-8 h-8 md:w-9 md:h-9" /><span className="text-[8px] md:text-[9px] font-black mt-1">30s</span>
              </button>
              
              {/* Play/Pause Button with Animated Ring - Adjusted to have a 5px gap (inset-[-5px]) */}
              <div className="relative flex-shrink-0">
                {isPlaying && !isLoading && (
                  <>
                    <div className="absolute inset-[-5px] border-2 border-brand/30 border-dashed rounded-full animate-rotate-slow pointer-events-none z-0" />
                    <div className="absolute inset-[-5px] bg-brand/20 rounded-full animate-soft-pulse pointer-events-none z-0" />
                  </>
                )}
                <button 
                  onClick={togglePlay} 
                  className={`relative z-10 w-16 h-16 md:w-22 md:h-22 bg-brand text-white rounded-full flex items-center justify-center shadow-xl shadow-brand/20 md:hover:scale-105 active:scale-95 transition-all`}
                >
                  {isLoading ? (
                    <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : isPlaying ? (
                    <PauseIconLarge className="w-8 h-8 md:w-10 md:h-10" />
                  ) : (
                    <PlayIconLarge className="w-8 h-8 md:w-10 md:h-10" />
                  )}
                </button>
              </div>

              <button onClick={() => skip(30)} className="flex-shrink-0 flex flex-col items-center text-slate-300 md:hover:text-brand active:text-brand transition-all active:scale-90">
                <SkipForwardIcon className="w-8 h-8 md:w-9 md:h-9" /><span className="text-[8px] md:text-[9px] font-black mt-1">30s</span>
              </button>
              <button onClick={() => skip(10)} className="flex-shrink-0 flex flex-col items-center text-slate-300 md:hover:text-brand active:text-brand transition-all active:scale-90">
                <SkipForward10Icon className="w-8 h-8 md:w-9 md:h-9" /><span className="text-[8px] md:text-[9px] font-black mt-1">10s</span>
              </button>
            </div>
          </div>

          <div className="mt-8 px-1" dir="rtl">
            <button 
              onClick={openShareModal}
              className="shimmer-light w-full border border-brandDark/40 text-brandDark px-6 py-3 rounded-xl font-medium text-sm md:text-base flex items-center justify-center gap-3 md:hover:bg-[#D5EFEF] active:scale-[0.98] transition-all overflow-hidden relative"
            >
              <ShareIcon className="w-5 h-5" />
              <span className="tracking-tight">מישהו חייב לשמוע את זה!</span>
            </button>
          </div>
        </div>

        <audio 
          ref={audioRef} 
          src={episode.url} 
          onTimeUpdate={handleTimeUpdate} 
          onLoadedMetadata={handleLoadedMetadata} 
          onCanPlay={handleCanPlay}
          onError={handleAudioError}
          onEnded={onComplete} 
          onPlay={() => setIsPlaying(true)} 
          onPause={() => setIsPlaying(false)} 
        />
      </div>

      {showShareModal && (
        <div 
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-[250ms]"
          onClick={() => setShowShareModal(false)}
        >
          <div 
            dir="rtl" 
            className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-[250ms] border border-slate-100 flex flex-col overflow-hidden transition-[height] ease-in-out"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-5 text-right py-1">
              <div className="w-16 h-16 bg-brandLight text-brandDark rounded-[1.25rem] flex items-center justify-center flex-shrink-0 border border-brand/20 shadow-sm overflow-hidden">
                <EqualizerIcon />
              </div>
              <div className="flex-1 space-y-[6px]">
                <h3 className="text-xl font-black text-slate-800 leading-tight">שיתוף של הרגע הזה</h3>
                <p className="text-slate-500 text-xs font-medium">הקישור יתחיל מדקה <span className="text-brand font-black tabular-nums">{formatTime(shareTimestamp)}</span></p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-1">תיאור הקטע (אופציונלי)</label>
              <input type="text" maxLength={50} placeholder="מה קורה בחלק הזה?" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-1 focus:ring-brand/30 font-bold text-slate-700 placeholder:text-slate-300 transition-all text-sm" value={shareClipDescription} onChange={(e) => setShareClipDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-4 gap-3 pt-1">
              <button onClick={() => handleShareAction('wa')} className="flex flex-col items-center gap-1.5 group">
                <div className="w-12 h-12 bg-[#25D366] text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><WhatsAppIcon className="w-6 h-6" /></div>
                <span className="text-[10px] font-medium text-slate-600">WhatsApp</span>
              </button>
              <button onClick={() => handleShareAction('fb')} className="flex flex-col items-center gap-1.5 group">
                <div className="w-12 h-12 bg-[#1877F2] text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><FacebookIcon className="w-6 h-6" /></div>
                <span className="text-[10px] font-medium text-slate-600">Facebook</span>
              </button>
              <button onClick={() => handleShareAction('ig')} className="flex flex-col items-center gap-1.5 group">
                <div className="w-12 h-12 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><InstagramIcon className="w-6 h-6" /></div>
                <span className="text-[10px] font-medium text-slate-600">Instagram</span>
              </button>
              <button onClick={() => handleShareAction('copy')} className="flex flex-col items-center gap-1.5 group">
                <div className="w-12 h-12 bg-slate-800 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><CopyIcon className="w-6 h-6" /></div>
                <span className="text-[10px] font-medium text-slate-600">העתק קישור</span>
              </button>
            </div>
            {copyStatus && (
              <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="w-full text-center bg-[#E4F6F6] text-brandDark py-1.5 rounded-xl text-[11px] font-black">
                  {copyStatus}
                </div>
              </div>
            )}
            <button onClick={() => setShowShareModal(false)} className="w-full py-2 text-slate-600 font-bold text-sm hover:text-brand transition-colors border-t border-slate-50 pt-3">סגור</button>
          </div>
        </div>
      )}
    </>
  );
};

const EqualizerIcon = () => (
  <div className="flex items-end gap-[3px] h-6 w-8">
    <div className="w-1.5 bg-brand eq-bar eq-bar-1 rounded-full"></div>
    <div className="w-1.5 bg-brand eq-bar eq-bar-2 rounded-full"></div>
    <div className="w-1.5 bg-brand eq-bar eq-bar-3 rounded-full"></div>
    <div className="w-1.5 bg-brand eq-bar eq-bar-4 rounded-full"></div>
  </div>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
);
const ErrorIcon = ({className}: {className?: string}) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
);
const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const ShareIcon = ({className}: {className?: string}) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
);
const WhatsAppIcon = ({className}: {className?: string}) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .004 5.411.002 12.046c0 2.121.54 4.193 1.566 6.06L0 24l6.102-1.6a11.803 11.803 0 005.948 1.587h.005c6.634 0 12.043-5.411 12.046-12.047a11.85 11.85 0 00-3.483-8.43z"/></svg>
);
const FacebookIcon = ({className}: {className?: string}) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
);
const InstagramIcon = ({className}: {className?: string}) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.058-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
);
const CopyIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
);
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
const SkipBack10Icon = ({className}: {className?: string}) => (
  <svg className={className || "w-8 h-8"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 19l-7-7 7-7" /></svg>
);
const SkipForward10Icon = ({className}: {className?: string}) => (
  <svg className={className || "w-8 h-8"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 5l7 7-7 7" /></svg>
);

export default Player;
