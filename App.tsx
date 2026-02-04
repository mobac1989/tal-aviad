
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Episode, PlaybackState, YearGroup, MonthGroup, Summary, SharedClip } from './types';
import { parseCSV } from './constants';
import Player from './components/Player';
import AdminDashboard from './components/AdminDashboard';

const PROFILE_IMAGE = "https://lh3.googleusercontent.com/d/1q-biyLBEkqFf7eUgrh0lAUWcsoW-tyNw";
const DATA_YEARS = [2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023];

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

  const [sharedClips, setSharedClips] = useState<SharedClip[]>(() => {
    const saved = localStorage.getItem('tal_aviad_shared_clips');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [initialSeekTime, setInitialSeekTime] = useState<number | null>(null);
  const [playerKey, setPlayerKey] = useState<number>(0);
  const [sharedDescription, setSharedDescription] = useState<string | null>(null);
  // Default to 2011 as requested
  const [activeYear, setActiveYear] = useState<number>(2011);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  const yearScrollRef = useRef<HTMLDivElement>(null);
  const adminClickCounter = useRef(0);
  const adminClickTimer = useRef<any>(null);

  const sortedEpisodes = useMemo(() => {
    return [...episodes].sort((a, b) => {
      const dateA = new Date(a.dateISO).getTime();
      const dateB = new Date(b.dateISO).getTime();
      return dateA - dateB;
    });
  }, [episodes]);

  useEffect(() => {
    if (!loading && activeYear && yearScrollRef.current) {
      const timer = setTimeout(() => {
        const container = yearScrollRef.current;
        if (!container) return;
        
        const activeButton = container.querySelector(`button[data-year="${activeYear}"]`) as HTMLElement;
        if (activeButton) {
          activeButton.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      }, 150); // Slightly increased delay to ensure data is rendered
      return () => clearTimeout(timer);
    }
  }, [loading, activeYear]);

  useEffect(() => {
    const loadAnnualData = async () => {
      try {
        const results = await Promise.all(
          DATA_YEARS.map(year => 
            fetch(`/${year}.csv`)
              .then(res => res.ok ? res.text() : "")
              .catch(() => "")
          )
        );

        const allParsed = results.flatMap(text => text ? parseCSV(text) : []);
        
        if (allParsed.length === 0) {
          throw new Error("לא ניתן היה לטעון את קבצי הנתונים.");
        }

        setEpisodes(allParsed);
        setLoading(false);
        
        const params = new URLSearchParams(window.location.search);
        const epId = params.get('ep');
        const timestamp = params.get('t');
        const desc = params.get('n');

        if (epId) {
          const ep = allParsed.find(e => e.id === epId);
          if (ep) {
            handlePlay(ep, timestamp ? parseFloat(timestamp) : undefined);
            if (desc) setSharedDescription(decodeURIComponent(desc));
            setActiveYear(ep.year);
            window.history.replaceState({}, '', window.location.pathname);
            return;
          }
        }

        if (allParsed.length > 0) {
          let initialYear = 2011; // Default to 2011 as requested
          if (playback.lastPlayedId) {
            const lastPlayedEpisode = allParsed.find(e => e.id === playback.lastPlayedId);
            if (lastPlayedEpisode) initialYear = lastPlayedEpisode.year;
          }
          setActiveYear(initialYear);
        }
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadAnnualData();
  }, []);

  useEffect(() => {
    localStorage.setItem('tal_aviad_v3_state', JSON.stringify(playback));
  }, [playback]);

  useEffect(() => {
    localStorage.setItem('tal_aviad_summaries', JSON.stringify(summaries));
  }, [summaries]);

  useEffect(() => {
    localStorage.setItem('tal_aviad_shared_clips', JSON.stringify(sharedClips));
  }, [sharedClips]);

  const handlePlay = (episode: Episode, seekTo?: number) => {
    const savedProgress = playback.progress[episode.id] || 0;
    const startTime = seekTo !== undefined ? seekTo : savedProgress;

    if (seekTo === undefined) setSharedDescription(null);
    
    setInitialSeekTime(startTime);
    setCurrentEpisode(episode);
    setPlayerKey(Date.now());
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
      yearScrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
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
      .map(yg => ({ ...yg, months: yg.months.sort((a, b) => a.month - b.month) }));
  }, [episodes]);

  const featuredEpisode = useMemo(() => {
    if (playback.lastPlayedId) {
      const last = episodes.find(e => e.id === playback.lastPlayedId);
      if (last) return last;
    }
    // If nothing played, feature the EARLIEST episode from 2011 as requested
    const episodes2011 = episodes.filter(e => e.year === 2011);
    if (episodes2011.length > 0) {
      return episodes2011.sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime())[0];
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
    const q = searchQuery.toLowerCase();
    const results = episodes.filter(ep => 
      ep.date.includes(q) || 
      ep.display.toLowerCase().includes(q) || 
      ep.notes.toLowerCase().includes(q) ||
      (summaries[ep.id]?.status === 'approved' && summaries[ep.id]?.text.toLowerCase().includes(q))
    );
    if (results.length === 0) return null;
    
    const sortedResults = results.sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime());
    
    return { year: 0, months: [{ month: 0, monthName: "תוצאות חיפוש", episodes: sortedResults }] };
  }, [currentYearData, searchQuery, episodes, summaries]);

  const handleAddSummary = (epId: string, text: string) => {
    setSummaries(prev => ({ ...prev, [epId]: { episodeId: epId, text, status: 'pending', createdAt: Date.now() } }));
  };

  const handleUpdateSummaries = (newSummaries: Record<string, Summary>) => { setSummaries(newSummaries); };

  const handleAddSharedClip = (clip: SharedClip) => { setSharedClips(prev => [clip, ...prev]); };

  const handleAdminClick = () => {
    adminClickCounter.current += 1;
    if (adminClickTimer.current) clearTimeout(adminClickTimer.current);
    if (adminClickCounter.current >= 7) {
      setShowAdmin(true);
      adminClickCounter.current = 0;
    } else {
      adminClickTimer.current = setTimeout(() => { adminClickCounter.current = 0; }, 2000);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-brand text-white p-6 text-center">
      <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
      <h2 className="text-xl font-bold">טוען את הארכיון...</h2>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-rose-50 text-rose-900 p-6 text-center">
      <h2 className="text-xl font-bold mb-4">{error}</h2>
      <button onClick={() => window.location.reload()} className="bg-brand text-white px-6 py-2 rounded-full font-bold">נסה שוב</button>
    </div>
  );

  const isFeaturedPlaying = currentEpisode?.id === featuredEpisode?.id;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 pt-6 pb-2 space-y-4">
        {showAdmin ? (
          <AdminDashboard 
            episodes={episodes} summaries={summaries} sharedClips={sharedClips}
            onUpdate={handleUpdateSummaries} 
            onPlayClip={(ep, t) => handlePlay(ep, t)}
            onClose={() => setShowAdmin(false)} 
          />
        ) : (
          <>
            {!searchQuery && featuredEpisode && (
              <div className="overflow-hidden rounded-4xl hero-gradient py-10 px-4 md:py-14 md:px-12 text-white flex items-center gap-1 md:gap-8 mb-2 border border-white/5">
                <button onClick={() => navigateFeatured('prev')} className="flex-shrink-0 w-10 h-10 md:w-14 md:h-14 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all z-10 md:hover:scale-110 md:active:scale-95">
                  <ChevronRightIcon className="w-6 h-6 md:w-8 md:h-8" />
                </button>
                <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-14 overflow-hidden">
                  <div className="relative flex-shrink-0">
                    <div onClick={handleAdminClick} className="w-48 h-48 md:w-64 md:h-64 rounded-3xl overflow-hidden border-[4px] border-white/10 bg-slate-800 cursor-pointer">
                      <img src={PROFILE_IMAGE} alt="טל ואביעד" className="w-full h-full object-cover object-center" referrerPolicy="no-referrer" />
                    </div>
                  </div>
                  <div className="text-center md:text-right flex-1 space-y-1 md:max-w-md">
                    <span className="text-white/30 text-xs md:text-sm font-bold uppercase tracking-widest block mb-1">הבא בתור</span>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black leading-[1] tracking-tighter mb-2">{featuredEpisode.weekday}</h2>
                    <h2 className="text-xl md:text-2xl text-white/60 font-black tabular-nums">{featuredEpisode.date}</h2>
                    <div className="pt-8 md:pt-6">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isFeaturedPlaying) {
                            setCurrentEpisode(null);
                          } else {
                            handlePlay(featuredEpisode);
                          }
                        }} 
                        className={`px-8 md:px-12 py-3 md:py-4 rounded-2xl font-black text-lg md:text-xl flex items-center justify-center gap-4 mx-auto md:mr-0 md:ml-auto md:hover:scale-105 active:scale-95 transition-all whitespace-nowrap overflow-hidden relative min-w-fit ${isFeaturedPlaying ? 'shimmer-light text-brandDark' : 'bg-white text-brand'}`}
                      >
                        <PlayIconSmall className={`w-6 h-6 ${isFeaturedPlaying ? 'fill-brandDark' : 'fill-brand'}`} />
                        <span>{isFeaturedPlaying ? 'מתנגן עכשיו...' : 'נגן עכשיו'}</span>
                      </button>
                    </div>
                  </div>
                </div>
                <button onClick={() => navigateFeatured('next')} className="flex-shrink-0 w-10 h-10 md:w-14 md:h-14 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all z-10 md:hover:scale-110 md:active:scale-95">
                  <ChevronLeftIcon className="w-6 h-6 md:w-8 md:h-8" />
                </button>
              </div>
            )}

            {!searchQuery && (
              <div className="sticky top-0 z-[110] -mx-4 px-4 border-b border-slate-100 overflow-y-hidden h-[68px] flex items-center group/years relative bg-slate-50">
                <button onClick={() => scrollYears('right')} className="hidden md:flex absolute right-0 z-20 w-12 h-full items-center justify-center bg-gradient-to-l from-slate-50 to-transparent text-slate-400 hover:text-brand transition-all"><ChevronRightIcon className="w-6 h-6" /></button>
                <div ref={yearScrollRef} className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1.5 w-full md:px-12">
                  {yearGroups.map(yg => (
                    <button key={yg.year} data-year={yg.year} onClick={() => { setActiveYear(yg.year); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`flex-shrink-0 px-7 py-2 rounded-full font-bold text-base transition-all border-2 shadow-none ${activeYear === yg.year ? 'bg-brand text-white border-brand scale-105' : 'bg-white text-slate-400 border-transparent hover:border-slate-200'}`}>{yg.year}</button>
                  ))}
                </div>
                <button onClick={() => scrollYears('left')} className="hidden md:flex absolute left-0 z-20 w-12 h-full items-center justify-center bg-gradient-to-r from-slate-50 to-transparent text-slate-400 hover:text-brand transition-all"><ChevronLeftIcon className="w-6 h-6" /></button>
              </div>
            )}

            <div className="space-y-3 pb-0">
              {filteredData?.months.map((mg) => {
                const monthKey = `${filteredData.year}-${mg.month}`;
                const isExpanded = expandedMonths[monthKey] || !!searchQuery;
                return (
                  <div key={monthKey} className="relative">
                    <button 
                      onClick={() => setExpandedMonths(prev => ({ ...prev, [monthKey]: !isExpanded }))} 
                      className={`w-full flex items-center justify-between p-4 transition-all duration-200 sticky top-[68px] z-[90] border border-slate-200 shadow-none md:hover:border-slate-300 ${isExpanded ? 'rounded-t-xl border-b-brand/20 bg-white' : 'rounded-xl bg-white'}`}
                    >
                      <div className="absolute right-0 top-3 bottom-3 w-1 bg-brand rounded-l-full"></div>
                      <div className="flex items-center gap-4"><h3 className="text-slate-800 font-bold text-lg">{mg.monthName}</h3><span className="text-slate-400 text-xs font-medium bg-slate-50 px-2 py-0.5 rounded">{mg.episodes.length} תוכניות</span></div>
                      <div className={`text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}><ChevronDownIcon /></div>
                    </button>
                    {isExpanded && (
                      <div className="bg-white border-x border-b border-slate-200 rounded-b-xl overflow-hidden shadow-none">
                        <div className="divide-y divide-slate-100">
                          {mg.episodes.sort((a, b) => a.day - b.day).map(ep => {
                            const isCurrent = currentEpisode?.id === ep.id;
                            const isPlayed = playback.playedIds.includes(ep.id);
                            return (
                              <div key={ep.id} onClick={() => isCurrent ? setCurrentEpisode(null) : handlePlay(ep)} className={`group flex items-center justify-between p-4 cursor-pointer transition-all ${isCurrent ? 'bg-brand/5' : 'hover:bg-slate-50'} ${isPlayed && !isCurrent ? 'opacity-60' : 'opacity-100'}`}>
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${isCurrent ? 'bg-brand text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-brand/10 group-hover:text-brand'}`}>{isCurrent ? <VolumeIcon /> : <PlayIconSmall className="w-3.5 h-3.5 fill-current translate-x-0.5" />}</div>
                                  <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                                    <div className="flex items-center gap-2 text-base"><span className="text-brand font-bold">{ep.weekday}</span><span className="text-slate-300 font-light">|</span><span className="text-black font-bold tabular-nums">{ep.date}</span></div>
                                    <div className="flex flex-col gap-0.5">{ep.notes && <span className="text-[10px] text-slate-300 line-clamp-1 font-medium">{ep.notes}</span>}{summaries[ep.id]?.status === 'approved' && <span className="text-[10px] text-slate-400 line-clamp-1 font-medium">{summaries[ep.id].text}</span>}</div>
                                  </div>
                                </div>
                                <div className="flex items-center mr-4"><button onClick={(e) => toggleMarkAsPlayed(ep.id, e)} className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all shadow-none md:hover:scale-110 active:scale-90 ${isPlayed ? 'bg-brand/10 border-brand text-brand' : 'bg-white border-slate-100 text-slate-200 hover:border-brand/30 hover:text-brand/30'}`}><CheckIconSmall className={`w-4 h-4 ${isPlayed ? 'opacity-100' : 'opacity-30'}`} /></button></div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              
              <footer className="pt-2 pb-1 flex flex-col items-center justify-center space-y-3 opacity-80 hover:opacity-100 transition-opacity">
                <div className="w-full h-px bg-slate-200/80"></div>
                <div className="text-[10px] font-normal text-slate-600 flex items-center gap-2 tracking-wider">
                  <span>עיצוב ופיתוח אפליקציה</span>
                  <a href="mailto:mobac89@gmail.com" className="text-brand hover:text-brandDark transition-colors">mobac89</a>
                </div>
              </footer>

              {searchQuery && !filteredData && (
                <div className="py-20 text-center text-slate-300 font-bold">לא נמצאו תוכניות התואמות לחיפוש</div>
              )}
            </div>
          </>
        )}
      </main>

      {currentEpisode && (
        <Player 
          key={`${currentEpisode.id}-${playerKey}`}
          episode={currentEpisode} 
          initialTime={initialSeekTime ?? 0}
          summary={summaries[currentEpisode.id]}
          sharedDescription={sharedDescription}
          onAddSummary={(text) => handleAddSummary(currentEpisode.id, text)}
          onAddSharedClip={handleAddSharedClip}
          onProgress={(time) => updateProgress(currentEpisode.id, time)}
          onComplete={handleEpisodeComplete}
          onClose={() => setCurrentEpisode(null)}
        />
      )}
    </div>
  );
};

const ChevronRightIcon = ({className}: {className?: string}) => (<svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>);
const ChevronLeftIcon = ({className}: {className?: string}) => (<svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>);
const ChevronDownIcon = () => (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>);
const PlayIconSmall = ({className}: {className?: string}) => (<svg className={className || "w-4 h-4 fill-current translate-x-0.5"} viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>);
const VolumeIcon = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>);
const CheckIconSmall = ({className}: {className?: string}) => (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>);

export default App;
