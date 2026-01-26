
import React, { useState, useMemo } from 'react';
import { Episode, Summary } from '../types';

interface AdminDashboardProps {
  episodes: Episode[];
  summaries: Record<string, Summary>;
  onUpdate: (summaries: Record<string, Summary>) => void;
  onClose: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ episodes, summaries, onUpdate, onClose }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
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
      onUpdate({ ...newSummaries }); // Spread to ensure new reference
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
          <p className="text-slate-400 text-xs mt-1">אישור ועריכת תקצירים מוצעים</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <CloseIcon />
        </button>
      </div>

      <div className="flex border-b border-slate-100 bg-slate-50/50">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-4 text-sm font-bold transition-all relative flex items-center justify-center gap-2 ${activeTab === 'pending' ? 'text-brand' : 'text-slate-400 hover:text-slate-600'}`}
        >
          ממתינים לאישור
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'pending' ? 'bg-brand text-white' : 'bg-slate-200 text-slate-500'}`}>
            {pendingList.length}
          </span>
          {activeTab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand" />}
        </button>
        <button 
          onClick={() => setActiveTab('approved')}
          className={`flex-1 py-4 text-sm font-bold transition-all relative flex items-center justify-center gap-2 ${activeTab === 'approved' ? 'text-brand' : 'text-slate-400 hover:text-slate-600'}`}
        >
          תקצירים מאושרים
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'approved' ? 'bg-brand text-white' : 'bg-slate-200 text-slate-500'}`}>
            {approvedList.length}
          </span>
          {activeTab === 'approved' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand" />}
        </button>
      </div>

      <div className="p-4 max-h-[70vh] overflow-y-auto no-scrollbar bg-white">
        {activeTab === 'approved' && (
          <div className="mb-6 sticky top-0 z-10 bg-white pb-2">
            <div className="relative">
              <input 
                type="text"
                placeholder="חיפוש בתוך המאושרים (טקסט או תאריך)..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-brand/20 outline-none"
                value={approvedSearch}
                onChange={(e) => setApprovedSearch(e.target.value)}
              />
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              {approvedSearch && (
                <button 
                  onClick={() => setApprovedSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <CloseIconSmall className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'pending' ? (
          pendingList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <CheckIcon className="w-8 h-8 opacity-20" />
              </div>
              <span className="font-bold">אין תקצירים חדשים הממתינים לבדיקה</span>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingList.map(s => {
                const ep = episodes.find(e => e.id === s.episodeId);
                return (
                  <div key={s.episodeId} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 hover:border-brand/20 transition-colors">
                    <div className="flex justify-between items-start">
                      <span className="text-brand font-black text-sm">{ep?.weekday} | {ep?.date}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{new Date(s.createdAt).toLocaleDateString('he-IL')}</span>
                    </div>
                    {editingId === s.episodeId ? (
                      <div className="space-y-2">
                        <textarea 
                          className="w-full p-3 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand/20 bg-white"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={3}
                          maxLength={150}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={(e) => cancelEdit(e)} className="text-slate-400 px-4 py-1.5 text-xs font-bold">ביטול</button>
                          <button onClick={(e) => saveEdit(e)} className="bg-brand text-white px-5 py-1.5 rounded-full text-xs font-bold">עדכן ושמור</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-slate-700 text-sm font-medium leading-relaxed">{s.text}</p>
                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/50">
                          <button onClick={(e) => handleApprove(s.episodeId, e)} className="bg-emerald-500 text-white p-2 rounded-full hover:scale-110 active:scale-95 transition-all shadow-lg shadow-emerald-500/20" title="אשר"><CheckIconSmall /></button>
                          <button onClick={(e) => startEdit(s.episodeId, s.text, e)} className="bg-blue-500 text-white p-2 rounded-full hover:scale-110 active:scale-95 transition-all shadow-lg shadow-blue-500/20" title="ערוך"><EditIconSmall className="w-4 h-4" /></button>
                          <button onClick={(e) => handleRejectOrDelete(s.episodeId, e)} className="bg-rose-500 text-white p-2 rounded-full hover:scale-110 active:scale-95 transition-all shadow-lg shadow-rose-500/20" title="דחה"><TrashIconSmall className="w-4 h-4" /></button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="space-y-8">
            {filteredApprovedByYear.length === 0 ? (
              <div className="text-center py-20 text-slate-300 font-bold">לא נמצאו תקצירים מאושרים התואמים לחיפוש</div>
            ) : (
              filteredApprovedByYear.map(yearGroup => (
                <div key={yearGroup.year} className="space-y-3">
                  <h3 className="text-slate-900 font-black text-xl flex items-center gap-3 pr-2">
                    <span className="w-1 h-6 bg-brand rounded-full"></span>
                    {yearGroup.year}
                  </h3>
                  <div className="grid gap-3">
                    {yearGroup.items.map(({ episode, summary }) => (
                      <div key={episode.id} className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-brand/20 transition-all group flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <div className="text-[10px] text-brand font-black uppercase tracking-wider">{episode.weekday} | {episode.date}</div>
                        </div>
                        
                        {editingId === episode.id ? (
                          <div className="space-y-2">
                            <textarea 
                              className="w-full p-2 text-sm border-b-2 border-brand outline-none bg-slate-50 rounded-lg"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              rows={2}
                              maxLength={150}
                              autoFocus
                            />
                            <div className="flex justify-end gap-2">
                              <button onClick={(e) => cancelEdit(e)} className="text-slate-400 px-3 py-1 text-[10px] font-bold">ביטול</button>
                              <button onClick={(e) => saveEdit(e)} className="bg-brand text-white px-4 py-1 rounded-full text-[10px] font-bold">שמור שינויים</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-slate-600 text-sm font-medium leading-relaxed">{summary.text}</p>
                            <div className="flex justify-end gap-3 pt-2 border-t border-slate-50 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => startEdit(episode.id, summary.text, e)} 
                                className="flex items-center gap-1.5 text-blue-500 hover:bg-blue-50 px-3 py-1 rounded-full transition-colors"
                              >
                                <EditIconSmall className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold">ערוך</span>
                              </button>
                              <button 
                                onClick={(e) => handleRejectOrDelete(episode.id, e)} 
                                className="flex items-center gap-1.5 text-rose-500 hover:bg-rose-50 px-3 py-1 rounded-full transition-colors"
                              >
                                <TrashIconSmall className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold">מחק</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Icons
const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
);
const CloseIconSmall = ({className}: {className?: string}) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
);
const CheckIcon = ({className}: {className?: string}) => (
  <svg className={className || "w-5 h-5"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
);
const CheckIconSmall = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
);
const EditIconSmall = ({className}: {className?: string}) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
);
const TrashIconSmall = ({className}: {className?: string}) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
);
const SearchIcon = ({className}: {className?: string}) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
);

export default AdminDashboard;
