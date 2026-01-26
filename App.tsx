
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Episode, PlaybackState, YearGroup, MonthGroup, Summary } from './types';
import { parseCSV } from './constants';
import Player from './components/Player';
import AdminDashboard from './components/AdminDashboard';

const PROFILE_IMAGE = "https://lh3.googleusercontent.com/d/1q-biyLBEkqFf7eUgrh0lAUWcsoW-tyNw";

const App: React.FC = () => {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  
  const [playback, setPlayback] = useState<PlaybackState>(() => {
    const saved = localStorage.getItem('tal_aviad_v3_state');
    return saved ? JSON.parse(saved) : { lastPlayedId: null, progress: {}, playedIds: [] };
  });

  const [summaries, setSummaries] = useState<Record<string, Summary>>(() => {
    const saved = localStorage.getItem('tal_aviad_summaries');
    return saved ? JSON.parse(saved) : {};
  });

  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [activeYear, setActiveYear] = useState<number>(2023);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  const yearScrollRef = useRef<HTMLDivElement>(null);
  const adminClickCounter = useRef(0);
  // Fix: Changed NodeJS.Timeout to any to fix "Cannot find namespace 'NodeJS'" error in browser environments.
  const adminClickTimer = useRef<any>(null);

  const sortedEpisodes = useMemo(() => {
    return [...episodes].sort((a, b) => {
      const dateA = new Date(a.dateISO).getTime();
      const dateB = new Date(b.dateISO).getTime();
      return dateA - dateB;
    });
  }, [episodes]);

  useEffect(() => {
    fetch('/episodes.csv')
      .then(res => {
        if (!res.ok) throw new Error("לא ניתן היה לטעון את קובץ הנתונים.");
        return res.text();
      })
      .then(text => {
        const parsed = parseCSV(text);
        setEpisodes(parsed);
        setLoading(false);
        
        if (parsed.length > 0) {
          // Logic: Set initial year based on last played episode if it exists, otherwise max year
          let initialYear = Math.max(...parsed.map(e => e.year));
          
          if (playback.lastPlayedId) {
            const lastPlayedEpisode = parsed.find(e => e.id === playback.lastPlayedId);
            if (lastPlayedEpisode) {
              initialYear = lastPlayedEpisode.year;
            }
          }
          
          setActiveYear(initialYear);
        }
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    localStorage.setItem('tal_aviad_v3_state', JSON.stringify(playback));
  }, [playback]);

  useEffect(() => {
    localStorage.setItem('tal_aviad_summaries', JSON.stringify(summaries));
  }, [summaries]);

  const handlePlay = (episode: Episode) => {
    setCurrentEpisode(episode);
    setPlayback(prev => ({ ...prev, lastPlayedId: episode.id }));
  };

  const updateProgress = (id: string, time: number) => {
    setPlayback(prev => ({
      ...prev,
      progress: { ...prev.progress, [id]: time }
    }));
  };

  const toggleMarkAsPlayed = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPlayback(prev => {
      const isPlayed = prev.playedIds.includes(id);
      const newPlayedIds = isPlayed 
        ? prev.playedIds.filter(pid => pid !== id)
        : [...prev.playedIds, id];
      return { ...prev, playedIds: newPlayedIds };
    });
  };

  const handleEpisodeComplete = () => {
    if (!currentEpisode) return;
    const epId = currentEpisode.id;
    setPlayback(prev => ({
      ...prev,
      playedIds: prev.playedIds.includes(epId) ? prev.playedIds : [...prev.playedIds, epId]
    }));
    const currentIndex = sortedEpisodes.findIndex(e => e.id === epId);
    if (currentIndex !== -1 && currentIndex < sortedEpisodes.length - 1) {
      const nextEp = sortedEpisodes[currentIndex + 1];
      setTimeout(() => handlePlay(nextEp), 500);
    }
  };

  const scrollYears = (direction: 'left' | 'right') => {
    if (yearScrollRef.current) {
      const scrollAmount = 300;
      yearScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const yearGroups = useMemo(() => {
    const years: Record<number, YearGroup> = {};
    episodes.forEach(ep => {
      if (!years[ep.year]) years[ep.year] = { year: ep.year, months: [] };
      let monthGroup = years[ep.year].months.find(m => m.month === ep.month);
      if (!monthGroup) {
        monthGroup = { month: ep.month, monthName: ep.monthName, episodes: [] };
        years[ep.year].months.push(monthGroup);
      }
      monthGroup.episodes.push(ep);
    });
    return Object.values(years)
      .sort((a, b) => b.year - a.year)
      .map(yg => ({
        ...yg,
        months: yg.months.sort((a, b) => a.month - b.month)
      }));
  }, [episodes]);

  const featuredEpisode = useMemo(() => {
    if (playback.lastPlayedId) {
      const last = episodes.find(e => e.id === playback.lastPlayedId);
      if (last) return last;
    }
    return episodes[0] || null;
  }, [episodes, playback.lastPlayedId]);

  const navigateFeatured = (direction: 'next' | 'prev') => {
    if (!featuredEpisode || episodes.length === 0) return;
    const currentIndex = sortedEpisodes.findIndex(e => e.id === featuredEpisode.id);
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= sortedEpisodes.length) nextIndex = sortedEpisodes.length - 1;
    const nextEp = sortedEpisodes[nextIndex];
    setPlayback(prev => ({ ...prev, lastPlayedId: nextEp.id }));
  };

  const currentYearData = useMemo(() => {
    return yearGroups.find(yg => yg.year === activeYear);
  }, [yearGroups, activeYear]);

  const filteredData = useMemo(() => {
    if (!searchQuery) return currentYearData;
    const results = episodes.filter(ep => 
      ep.date.includes(searchQuery) || 
      ep.display.includes(searchQuery) || 
      ep.notes.includes(searchQuery) ||
      (summaries[ep.id]?.status === 'approved' && summaries[ep.id]?.text.includes(searchQuery))
    );
    if (results.length === 0) return null;
    return {
      year: 0,
      months: [{ month: 0, monthName: "תוצאות חיפוש", episodes: results }]
    };
  }, [currentYearData, searchQuery, episodes, summaries]);

  const handleAddSummary = (epId: string, text: string) => {
    setSummaries(prev => ({
      ...prev,
      [epId]: { episodeId: epId, text, status: 'pending', createdAt: Date.now() }
    }));
  };

  const handleUpdateSummaries = (newSummaries: Record<string, Summary>) => {
    setSummaries(newSummaries);
  };

  const handleAdminClick = () => {
    adminClickCounter.current += 1;
    if (adminClickTimer.current) clearTimeout(adminClickTimer.current);
    
    if (adminClickCounter.current >= 7) {
      setShowAdmin(true);
      adminClickCounter.current = 0;
    } else {
      adminClickTimer.current = setTimeout(() => {
        adminClickCounter.current = 0;
      }, 2000);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-brand text-white p-6 text-center">
      <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
      <h2 className="text-xl font-bold">טוען את הארכיון...</h2>
    </div>
  );

  const isFeaturedPlaying = currentEpisode?.id === featuredEpisode?.id;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 space-y-4">
        
        {showAdmin ? (
          <AdminDashboard 
            episodes={episodes} 
            summaries={summaries} 
            onUpdate={handleUpdateSummaries} 
            onClose={() => setShowAdmin(false)} 
          />
        ) : (
          <>
            {!searchQuery && featuredEpisode && (
              <div className="overflow-hidden rounded-4xl hero-gradient py-10 px-4 md:py-14 md:px-12 text-white flex items-center gap-1 md:gap-8 mb-4 border border-white/5">
                <button 
                  onClick={() => navigateFeatured('prev')}
                  className="flex-shrink-0 w-10 h-10 md:w-14 md:h-14 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all z-10 hover:scale-110 active:scale-95"
                  aria-label="Previous Episode"
                >
                  <ChevronRightIcon className="w-6 h-6 md:w-8 md:h-8" />
                </button>

                <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-14 overflow-hidden">
                  <div className="relative flex-shrink-0">
                    <div 
                      onClick={handleAdminClick}
                      className="w-48 h-48 md:w-64 md:h-64 rounded-3xl overflow-hidden border-[4px] border-white/10 bg-slate-800 cursor-pointer"
                    >
                      <img 
                        src={PROFILE_IMAGE} 
                        alt="טל ואביעד" 
                        className="w-full h-full object-cover object-center"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x400/1e3a3a/ffffff?text=%D7%98%D7%9C+%D7%95%D7%90%D7%91%D7%99%D7%A2%D7%93';
                        }}
                      />
                    </div>
                  </div>

                  <div className="text-center md:text-right flex-1 space-y-1 md:max-w-md">
                    <span className="text-white/30 text-xs md:text-sm font-bold uppercase tracking-widest block mb-1">הבא בתור</span>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black leading-[1] tracking-tighter mb-2">
                      {featuredEpisode.weekday}
                    </h2>
                    <h2 className="text-xl md:text-2xl text-white/60 font-black tabular-nums">
                      {featuredEpisode.date}
                    </h2>
                    
                    <div className="pt-8 md:pt-6">
                      <button 
                        onClick={() => handlePlay(featuredEpisode)}
                        className={`${
                          isFeaturedPlaying 
                            ? 'bg-teal-100 text-brandDark' 
                            : 'bg-white text-brand'
                        } px-10 md:px-12 py-3 md:py-4 rounded-2xl font-black text-lg md:text-xl flex items-center gap-4 mx-auto md:mr-0 md:ml-auto hover:scale-105 active:scale-95 transition-all`}
                      >
                        <PlayIconSmall className="w-6 h-6 fill-current" />
                        <span>{isFeaturedPlaying ? 'מתנגן עכשיו...' : 'נגן עכשיו'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => navigateFeatured('next')}
                  className="flex-shrink-0 w-10 h-10 md:w-14 md:h-14 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all z-10 hover:scale-110 active:scale-95"
                  aria-label="Next Episode"
                >
                  <ChevronLeftIcon className="w-6 h-6 md:w-8 md:h-8" />
                </button>
              </div>
            )}

            {!searchQuery && (
              <div className="sticky top-0 z-[110] -mx-4 px-4 border-b border-slate-100 overflow-y-hidden h-[68px] flex items-center group/years relative bg-slate-50">
                <button 
                  onClick={() => scrollYears('right')}
                  className="hidden md:flex absolute right-0 z-20 w-12 h-full items-center justify-center bg-gradient-to-l from-slate-50 to-transparent text-slate-400 hover:text-brand transition-all"
                  aria-label="Scroll Years Right"
                >
                  <ChevronRightIcon className="w-6 h-6" />
                </button>
                <div 
                  ref={yearScrollRef}
                  className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1.5 w-full md:px-12"
                >
                  {yearGroups.map(yg => (
                    <button
                      key={yg.year}
                      onClick={() => {
                        setActiveYear(yg.year);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`flex-shrink-0 px-7 py-2 rounded-full font-bold text-base transition-all border-2 shadow-none ${
                        activeYear === yg.year 
                          ? 'bg-brand text-white border-brand scale-105' 
                          : 'bg-white text-slate-400 border-transparent hover:border-slate-200'
                      }`}
                    >
                      {yg.year}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => scrollYears('left')}
                  className="hidden md:flex absolute left-0 z-20 w-12 h-full items-center justify-center bg-gradient-to-r from-slate-50 to-transparent text-slate-400 hover:text-brand transition-all"
                  aria-label="Scroll Years Left"
                >
                  <ChevronLeftIcon className="w-6 h-6" />
                </button>
              </div>
            )}

            <div className="space-y-3 pb-44">
              {filteredData?.months.map((mg) => {
                const monthKey = `${filteredData.year}-${mg.month}`;
                const isExpanded = expandedMonths[monthKey] || !!searchQuery;
                
                return (
                  <div key={monthKey} className="relative">
                    <button 
                      onClick={() => setExpandedMonths(prev => ({ ...prev, [monthKey]: !isExpanded }))}
                      className={`w-full flex items-center justify-between p-4 transition-all sticky top-[68px] z-[90] border border-slate-200 shadow-none ${isExpanded ? 'rounded-t-xl border-b-brand/20 bg-white' : 'rounded-xl bg-white'}`}
                    >
                      <div className="absolute right-0 top-3 bottom-3 w-1 bg-brand rounded-l-full"></div>
                      <div className="flex items-center gap-4">
                        <h3 className="text-slate-800 font-bold text-lg">{mg.monthName}</h3>
                        <span className="text-slate-400 text-xs font-medium bg-slate-50 px-2 py-0.5 rounded">
                          {mg.episodes.length} תוכניות
                        </span>
                      </div>
                      <div className={`text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                        <ChevronDownIcon />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="bg-white border-x border-b border-slate-200 rounded-b-xl overflow-hidden shadow-none">
                        <div className="divide-y divide-slate-100">
                          {mg.episodes.sort((a, b) => a.day - b.day).map(ep => {
                            const isCurrent = currentEpisode?.id === ep.id;
                            const isPlayed = playback.playedIds.includes(ep.id);
                            
                            return (
                              <div 
                                key={ep.id}
                                onClick={() => handlePlay(ep)}
                                className={`group flex items-center justify-between p-4 cursor-pointer transition-all ${isCurrent ? 'bg-brand/5' : 'hover:bg-slate-50'} ${isPlayed && !isCurrent ? 'opacity-60' : 'opacity-100'}`}
                              >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                                      isCurrent 
                                        ? 'bg-brand text-white shadow-none' 
                                        : 'bg-slate-50 text-slate-400 group-hover:bg-brand/10 group-hover:text-brand'
                                    }`}>
                                    {isCurrent ? <VolumeIcon /> : <PlayIconSmall className="w-3.5 h-3.5 fill-current translate-x-0.5" />}
                                  </div>
                                  
                                  <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                                    <div className="flex items-center gap-2 text-base">
                                      <span className="text-brand font-bold">{ep.weekday}</span>
                                      <span className="text-slate-300 font-light">|</span>
                                      <span className="text-black font-bold tabular-nums">{ep.date}</span>
                                    </div>
                                    {/* Community summaries are hidden globally for now as per user request. Only ep.notes are shown. */}
                                    {ep.notes ? (
                                      <span className="text-[10px] text-slate-300 line-clamp-1 font-medium mt-0.5">{ep.notes}</span>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="flex items-center mr-4">
                                  <button 
                                    onClick={(e) => toggleMarkAsPlayed(ep.id, e)}
                                    className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all shadow-none hover:scale-110 active:scale-90 ${
                                      isPlayed 
                                        ? 'bg-brand/10 border-brand text-brand' 
                                        : 'bg-white border-slate-100 text-slate-200 hover:border-brand/30 hover:text-brand/30'
                                    }`}
                                    title={isPlayed ? "סמן כלא הואזן" : "סמן כהואזן"}
                                  >
                                    <CheckIconSmall className={`w-4 h-4 ${isPlayed ? 'opacity-100' : 'opacity-30'}`} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {currentEpisode && (
        <Player 
          episode={currentEpisode} 
          initialTime={playback.progress[currentEpisode.id] || 0}
          summary={summaries[currentEpisode.id]}
          onAddSummary={(text) => handleAddSummary(currentEpisode.id, text)}
          onProgress={(time) => updateProgress(currentEpisode.id, time)}
          onComplete={handleEpisodeComplete}
          onClose={() => setCurrentEpisode(null)}
        />
      )}
    </div>
  );
};

const ChevronRightIcon = ({className}: {className?: string}) => (
  <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
);
const ChevronLeftIcon = ({className}: {className?: string}) => (
  <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
);
const ChevronDownIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
);
const PlayIconSmall = ({className}: {className?: string}) => (
  <svg className={className || "w-4 h-4 fill-current translate-x-0.5"} viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
);
const VolumeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
);
const CheckIconSmall = ({className}: {className?: string}) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
);

export default App;
