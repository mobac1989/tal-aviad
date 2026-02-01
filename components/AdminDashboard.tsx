
import React, { useState, useMemo } from 'react';
import { Episode, Summary, SharedClip } from '../types';

interface AdminDashboardProps {
  episodes: Episode[];
  summaries: Record<string, Summary>;
  sharedClips: SharedClip[];
  onUpdate: (summaries: Record<string, Summary>) => void;
  onPlayClip: (episode: Episode, timestamp: number) => void;
  onClose: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ episodes, summaries, sharedClips, onUpdate, onPlayClip, onClose }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'shares'>('pending');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [approvedSearch, setApprovedSearch] = useState("");

  const allSummariesList = useMemo(() => Object.values(summaries) as Summary[], [summaries]);
  
  const pendingList = useMemo(() => 
    allSummariesList.filter(s => s.status === 'pending').sort((a, b) => b.createdAt - a.createdAt),
  [allSummariesList]);

  const approvedList = useMemo(() => 
    allSummariesList.filter(s => s.status === 'approved'),
  [allSummariesList]);

  const filteredApprovedByYear = useMemo(() => {
    const years: Record<number, { episode: Episode, summary: Summary }[]> = {};
    
    approvedList.forEach(s => {
      const ep = episodes.find(e => e.id === s.episodeId);
      if (ep) {
        const matchesSearch = s.text.includes(approvedSearch) || ep.date.includes(approvedSearch) || ep.weekday.includes(approvedSearch);
        if (matchesSearch) {
          if (!years[ep.year]) years[ep.year] = [];
          years[ep.year].push({ episode: ep, summary: s });
        }
      }
    });

    return Object.keys(years)
      .map(Number)
      .sort((a, b) => b - a)
      .map(year => ({
        year,
        items: years[year].sort((a, b) => new Date(b.episode.dateISO).getTime() - new Date(a.episode.dateISO).getTime())
      }));
  }, [approvedList, episodes, approvedSearch]);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleApprove = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const newSummaries = { ...summaries, [id]: { ...summaries[id], status: 'approved' as const } };
    onUpdate(newSummaries);
  };

  const handleRejectOrDelete = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (window.confirm('האם אתה בטוח שברצונך למחוק את התקציר?')) {
      const newSummaries = { ...summaries };
      delete newSummaries[id];
      onUpdate({ ...newSummaries });
      if (editingId === id) setEditingId(null);
    }
  };

  const startEdit = (id: string, text: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingId(id);
    setEditText(text);
  };

  const cancelEdit = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      if ('stopPropagation' in e) e.stopPropagation();
    }
    if (editingId && editText.trim()) {
      const newSummaries = { ...summaries, [editingId]: { ...summaries[editingId], text: editText.trim() } };
      onUpdate(newSummaries);
      setEditingId(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in duration-300">
      <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black">ניהול תוכן קהילתי</h2>
          <p className="text-slate-400 text-xs mt-1">אישור תקצירים ומעקב שיתופים</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <CloseIcon />
        </button>
      </div>

      <div className="flex border-b border-slate-100 bg-slate-50/50 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`flex-1 min-w-[120px] py-4 text-xs font-bold transition-all relative flex items-center justify-center gap-2 ${activeTab === 'pending' ? 'text-brand' : 'text-slate-400'}`}
        >
          ממתינים ({pendingList.length})
          {activeTab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand" />}
        </button>
        <button 
          onClick={() => setActiveTab('approved')}
          className={`flex-1 min-w-[120px] py-4 text-xs font-bold transition-all relative flex items-center justify-center gap-2 ${activeTab === 'approved' ? 'text-brand' : 'text-slate-400'}`}
        >
          מאושרים ({approvedList.length})
          {activeTab === 'approved' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand" />}
        </button>
        <button 
          onClick={() => setActiveTab('shares')}
          className={`flex-1 min-w-[120px] py-4 text-xs font-bold transition-all relative flex items-center justify-center gap-2 ${activeTab === 'shares' ? 'text-brand' : 'text-slate-400'}`}
        >
          שיתופים ({sharedClips.length})
          {activeTab === 'shares' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand" />}
        </button>
      </div>

      {/* Added pb-48 to ensure content isn't covered by the fixed player */}
      <div className="p-4 pb-48 max-h-[70vh] overflow-y-auto no-scrollbar bg-white">
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {pendingList.length === 0 ? (
              <div className="py-20 text-center text-slate-300 font-bold">אין תקצירים ממתינים</div>
            ) : (
              pendingList.map(s => {
                const ep = episodes.find(e => e.id === s.episodeId);
                return (
                  <div key={s.episodeId} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-brand font-black text-sm">{ep?.weekday} | {ep?.date}</span>
                    </div>
                    {editingId === s.episodeId ? (
                      <div className="space-y-2">
                        <textarea className="w-full p-3 text-sm border border-slate-200 rounded-xl outline-none bg-white" value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => cancelEdit()} className="text-slate-400 px-4 py-1.5 text-xs font-bold">ביטול</button>
                          <button onClick={() => saveEdit()} className="bg-brand text-white px-5 py-1.5 rounded-full text-xs font-bold">שמור</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-slate-700 text-sm font-medium">{s.text}</p>
                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/50">
                          <button onClick={(e) => handleApprove(s.episodeId, e)} className="bg-emerald-500 text-white p-2 rounded-full shadow-lg"><CheckIconSmall /></button>
                          <button onClick={(e) => startEdit(s.episodeId, s.text, e)} className="bg-blue-500 text-white p-2 rounded-full shadow-lg"><EditIconSmall className="w-4 h-4" /></button>
                          <button onClick={(e) => handleRejectOrDelete(s.episodeId, e)} className="bg-rose-500 text-white p-2 rounded-full shadow-lg"><TrashIconSmall className="w-4 h-4" /></button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'approved' && (
          <div className="space-y-8">
            <input type="text" placeholder="חיפוש..." className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-2xl text-sm outline-none mb-4" value={approvedSearch} onChange={(e) => setApprovedSearch(e.target.value)} />
            {filteredApprovedByYear.map(yg => (
              <div key={yg.year} className="space-y-3">
                <h3 className="text-slate-900 font-black text-xl flex items-center gap-3"><span className="w-1 h-6 bg-brand rounded-full"></span>{yg.year}</h3>
                <div className="grid gap-3">
                  {yg.items.map(({ episode, summary }) => (
                    <div key={episode.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                      <div className="text-[10px] text-brand font-black mb-2">{episode.weekday} | {episode.date}</div>
                      <p className="text-slate-600 text-sm font-medium">{summary.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'shares' && (
          <div className="space-y-4">
            {sharedClips.length === 0 ? (
              <div className="py-20 text-center text-slate-300 font-bold">טרם בוצעו שיתופים מהמכשיר</div>
            ) : (
              sharedClips.map(clip => {
                const ep = episodes.find(e => e.id === clip.episodeId);
                return (
                  <div key={clip.id} className="p-4 bg-slate-50 rounded-3xl border border-slate-100 hover:border-brand/30 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col">
                        <span className="text-brand font-black text-sm">{ep?.weekday} | {ep?.date}</span>
                        <span className="text-slate-400 text-[10px] font-bold">דקה: {formatTime(clip.timestamp)}</span>
                      </div>
                      <span className="text-[10px] text-slate-300 font-bold">{new Date(clip.createdAt).toLocaleDateString('he-IL')}</span>
                    </div>
                    {clip.description && (
                      <p className="text-slate-700 text-sm font-bold italic bg-white p-3 rounded-2xl border border-slate-100 mb-3">"{clip.description}"</p>
                    )}
                    <div className="flex justify-end">
                      <button 
                        onClick={() => ep && onPlayClip(ep, clip.timestamp)}
                        className="bg-brand text-white px-5 py-2 rounded-full text-[10px] font-black flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
                      >
                        <PlayIconSmall className="w-3 h-3 fill-current" />
                        נגן קטע
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Icons
const CloseIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>;
const CheckIconSmall = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>;
const EditIconSmall = ({className}: {className?: string}) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
const TrashIconSmall = ({className}: {className?: string}) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const PlayIconSmall = ({className}: {className?: string}) => <svg className={className} viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>;

export default AdminDashboard;
