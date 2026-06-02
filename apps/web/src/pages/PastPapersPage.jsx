
import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronRight, ArrowLeft, FileText, Lock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import PDFViewer from '@/components/PDFViewer';

const SOURCES = [
  { key: 'GCE_BOARD',  label: 'GCE Board' },
  { key: 'NORTH_WEST', label: 'NW Mock' },
  { key: 'SOUTH_WEST', label: 'SW Mock' },
  { key: 'CENTRE',     label: 'Centre' },
  { key: 'LITTORAL',   label: 'Littoral' },
  { key: 'WEST',       label: 'West' },
  { key: 'ADAMAWA',    label: 'Adamawa' },
  { key: 'NORTH',      label: 'North' },
  { key: 'FAR_NORTH',  label: 'Far North' },
  { key: 'EAST',       label: 'East' },
  { key: 'SOUTH',      label: 'South' },
];

const CATEGORY_FILTERS = ['Sciences', 'Arts', 'Commercial', 'Languages'];

export default function PastPapersPage({ navigate }) {
  const { user } = useUser();
  const [view, setView]                       = useState('list');
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjects, setSubjects]               = useState([]);
  const [papers, setPapers]                   = useState([]);
  const [selectedSource, setSelectedSource]   = useState('GCE_BOARD');
  const [selectedLevel, setSelectedLevel]     = useState('A_Level');
  const [search, setSearch]                   = useState('');
  const [activeCategories, setActiveCategories] = useState([]);
  const [selectedPaper, setSelectedPaper]     = useState(null); // { url, year, paper_number }
  const [signedUrl, setSignedUrl]             = useState(null);
  const [pdfLoading, setPdfLoading]           = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingPapers, setLoadingPapers]     = useState(false);
  const [error, setError]                     = useState(null);

  // Fetch subjects — cache localStorage + refresh Supabase en arrière-plan
  useEffect(() => {
    let cancelled = false;

    const CACHE_KEY = 'passmark_gce_subjects_v2';

    // 1. Afficher le cache immédiatement si disponible
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        setSubjects(JSON.parse(cached));
        setLoadingSubjects(false);
      }
    } catch {}

    // 2. Rafraîchir depuis Supabase en arrière-plan
    const fetchSubjects = async () => {
      try {
        const { data, error } = await supabase
          .from('gce_papers')
          .select('subject, subject_code, level, category')
          .eq('source', 'GCE_BOARD')
          .eq('year', 2024)
          .eq('is_active', true);

        if (cancelled || error || !data) return;

        const seen = new Set();
        const unique = data.filter(row => {
          const key = `${row.subject_code}-${row.level}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        localStorage.setItem(CACHE_KEY, JSON.stringify(unique));
        setSubjects(unique);
        setError(null);
      } catch {
        // Silencieux si cache déjà affiché
      } finally {
        if (!cancelled) setLoadingSubjects(false);
      }
    };

    fetchSubjects();
    return () => { cancelled = true; };
  }, []);

  // Fetch papers for selected subject + source
  useEffect(() => {
    if (!selectedSubject) return;
    let cancelled = false;
    setLoadingPapers(true);
    setPapers([]);

    supabase
      .from('gce_papers')
      .select('year, paper_number, pdf_url')
      .eq('subject_code', selectedSubject.subject_code)
      .eq('level', selectedSubject.level)
      .eq('source', selectedSource)
      .eq('is_active', true)
      .order('year', { ascending: false })
      .order('paper_number', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) setPapers(data);
        setLoadingPapers(false);
      })
      .catch(() => {
        if (!cancelled) setLoadingPapers(false);
      });

    return () => { cancelled = true; };
  }, [selectedSubject, selectedSource]);

  const papersByYear = useMemo(() => {
    const map = {};
    papers.forEach(p => {
      if (!map[p.year]) map[p.year] = {};
      map[p.year][p.paper_number] = p.pdf_url;
    });
    return map;
  }, [papers]);

  const years    = Object.keys(papersByYear).sort((a, b) => b - a);
  const maxPaper = papers.reduce((max, p) => Math.max(max, p.paper_number), 2);

  const toggleCategory = (c) =>
    setActiveCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);

  const filteredSubjects = useMemo(() => {
    return subjects
      .filter(sub => sub.level === selectedLevel)
      .filter(sub => {
        const matchesSearch =
          sub.subject.toLowerCase().includes(search.toLowerCase()) ||
          sub.subject_code.includes(search);
        if (!matchesSearch) return false;
        if (activeCategories.length === 0) return true;
        return activeCategories.includes(sub.category);
      })
      .sort((a, b) => a.subject.localeCompare(b.subject));
  }, [subjects, search, activeCategories, selectedLevel]);

  // Generate signed URL (expires 30 min) when reader opens
  useEffect(() => {
    if (!selectedPaper?.url || view !== 'reader') return;
    setSignedUrl(null);
    setPdfLoading(true);

    const path = selectedPaper.url.split('/object/public/past-papers/')[1];
    if (!path) { setPdfLoading(false); return; }

    supabase.storage.from('past-papers').createSignedUrl(path, 1800)
      .then(({ data, error }) => {
        const resolved = (!error && typeof data?.signedUrl === 'string') ? data.signedUrl : selectedPaper.url;
        setSignedUrl(typeof resolved === 'string' ? resolved : null);
        setPdfLoading(false);
      })
      .catch(() => {
        const fallback = selectedPaper.url;
        setSignedUrl(typeof fallback === 'string' ? fallback : null);
        setPdfLoading(false);
      });
  }, [selectedPaper, view]);

  const handleOpenSubject = (sub) => {
    setSelectedSubject(sub);
    setSelectedSource('GCE_BOARD');
    setPapers([]);
    setView('detail');
  };

  // ─── READER VIEW ───────────────────────────────────────────────────────────
  if (view === 'reader' && selectedPaper && selectedSubject) {
    const levelLabel  = selectedSubject.level === 'A_Level' ? 'A Level' : 'O Level';
    const sourceLabel = SOURCES.find(s => s.key === selectedSource)?.label || selectedSource;
    const aiMessage   = `I'm studying GCE ${levelLabel} ${selectedSubject.subject} Paper ${selectedPaper.paper_number} ${selectedPaper.year} (${sourceLabel}). Help me understand and solve questions from this paper.`;
    const watermark   = user?.email || user?.name || 'PassMark';

    return (
      <div className="fade-in flex flex-col" style={{ height: 'calc(100dvh - 130px)', minHeight: '500px' }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-3 shrink-0">
          <button
            onClick={() => setView('detail')}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#1E293B] flex items-center justify-center hover:bg-slate-200 dark:hover:bg-[#334155] transition-colors shrink-0"
          >
            <ArrowLeft size={16} className="text-slate-500 dark:text-[#94A3B8]" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] font-medium text-slate-900 dark:text-[#F1F5F9] truncate">
              {selectedSubject.subject} · Paper {selectedPaper.paper_number} · {selectedPaper.year}
            </h2>
            <p className="text-[11px] text-slate-400 dark:text-[#64748B]">
              {levelLabel} · {selectedSubject.subject_code} · {sourceLabel}
            </p>
          </div>
          <button
            onClick={() => navigate('tutor', {
              initialMessage: aiMessage,
              ...(signedUrl ? { initialPdfUrl: signedUrl, initialPdfName: `${selectedSubject.subject} P${selectedPaper.paper_number} ${selectedPaper.year}.pdf` } : {}),
            })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#3B82F6] text-white text-[12px] font-medium hover:bg-[#2563EB] transition-colors shrink-0"
          >
            <Sparkles size={13} />
            Ask AI
          </button>
        </div>

        {/* PDF viewer — PDF.js canvas rendering */}
        <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 dark:border-[#334155]/50 bg-slate-100 dark:bg-[#0F172A] flex flex-col">
          {pdfLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
              <span className="text-[12px] text-slate-400 dark:text-[#64748B]">Loading paper...</span>
            </div>
          ) : signedUrl ? (
            <PDFViewer url={signedUrl} watermark={watermark} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[13px] text-slate-400 dark:text-[#64748B]">Unable to load paper. Try again.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── DETAIL VIEW ───────────────────────────────────────────────────────────
  if (view === 'detail' && selectedSubject) {
    const paperCols = Array.from({ length: maxPaper }, (_, i) => i + 1);
    return (
      <div className="fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setView('list')}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#1E293B] flex items-center justify-center hover:bg-slate-200 dark:hover:bg-[#334155] transition-colors shrink-0"
          >
            <ArrowLeft size={16} className="text-slate-500 dark:text-[#94A3B8]" />
          </button>
          <div className="min-w-0">
            <h2 className="text-[16px] font-medium text-slate-900 dark:text-[#F1F5F9] truncate">
              {selectedSubject.subject}
            </h2>
            <p className="text-[12px] text-slate-400 dark:text-[#64748B]">
              {selectedSubject.level === 'A_Level' ? 'A Level' : 'O Level'}
              {' · '}{selectedSubject.subject_code}
              {' · '}{selectedSubject.category}
            </p>
          </div>
        </div>

        {/* Source pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar mb-5">
          {SOURCES.map(s => (
            <button
              key={s.key}
              onClick={() => setSelectedSource(s.key)}
              className={cn(
                'whitespace-nowrap px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all',
                selectedSource === s.key
                  ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/50'
                  : 'bg-slate-100 dark:bg-[#1E293B] text-slate-500 dark:text-[#94A3B8] border-transparent hover:border-slate-300 dark:hover:border-[#334155]'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Papers grid */}
        {loadingPapers ? (
          <div className="flex flex-col gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 bg-slate-100 dark:bg-[#1E293B] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl overflow-hidden border border-slate-200 dark:border-[#334155]/50">
            <div
              className="grid px-4 py-2.5 border-b border-slate-100 dark:border-[#334155]/50"
              style={{ gridTemplateColumns: `1fr repeat(${paperCols.length}, 1fr)` }}
            >
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-[#64748B]">Year</span>
              {paperCols.map(pn => (
                <span key={pn} className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-[#64748B] text-center">
                  P{pn}
                </span>
              ))}
            </div>

            {years.length === 0 ? (
              <div className="py-14 text-center text-slate-400 dark:text-[#64748B] text-[13px]">
                No papers for this source yet
              </div>
            ) : (
              years.map((year, idx) => (
                <div
                  key={year}
                  className={cn(
                    'grid px-4 py-3 items-center',
                    idx !== years.length - 1 && 'border-b border-slate-100 dark:border-[#334155]/30'
                  )}
                  style={{ gridTemplateColumns: `1fr repeat(${paperCols.length}, 1fr)` }}
                >
                  <span className="text-[13px] font-medium text-slate-700 dark:text-[#F1F5F9]">{year}</span>
                  {paperCols.map(pn => {
                    const url = papersByYear[year]?.[pn];
                    return (
                      <div key={pn} className="flex justify-center">
                        {url ? (
                          <button
                            onClick={() => { setSelectedPaper({ url, year, paper_number: pn }); setView('reader'); }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-100 dark:bg-[#14532D] text-green-700 dark:text-[#22C55E] text-[11px] font-medium hover:bg-green-200 dark:hover:bg-[#166534] transition-colors"
                          >
                            <FileText size={11} />
                            Open
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#0F172A] text-slate-400 dark:text-[#475569] text-[11px]">
                            <Lock size={10} />
                            Soon
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── LIST VIEW ─────────────────────────────────────────────────────────────
  return (
    <div className="fade-in">
      {/* Level toggle */}
      <div className="flex gap-2 mb-4">
        {[{ key: 'A_Level', label: 'A Level' }, { key: 'O_Level', label: 'O Level' }].map(lv => (
          <button
            key={lv.key}
            onClick={() => { setSelectedLevel(lv.key); setActiveCategories([]); setSearch(''); }}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-[14px] font-medium border transition-all',
              selectedLevel === lv.key
                ? 'bg-[#22C55E] text-white border-[#22C55E]'
                : 'bg-slate-100 dark:bg-[#1E293B] text-slate-600 dark:text-[#94A3B8] border-slate-200 dark:border-[#334155]/50 hover:border-[#22C55E]/40'
            )}
          >
            {lv.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#64748B]" size={18} />
        <input
          type="text"
          placeholder="Search subjects..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F1F5F9] rounded-2xl py-3.5 pl-11 pr-4 text-[14px] outline-none border border-slate-200 dark:border-[#334155]/50 focus:border-[#22C55E] transition-all placeholder:text-slate-400 dark:placeholder:text-[#64748B]"
        />
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar mb-5">
        {CATEGORY_FILTERS.map(cat => (
          <button
            key={cat}
            onClick={() => toggleCategory(cat)}
            className={cn(
              'whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-medium border transition-all h-[36px]',
              activeCategories.includes(cat)
                ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/50'
                : 'bg-slate-100 dark:bg-[#1E293B] text-slate-500 dark:text-[#94A3B8] border-transparent hover:border-slate-300 dark:hover:border-[#334155]'
            )}
          >
            {cat}
          </button>
        ))}
        {activeCategories.length > 0 && (
          <button
            onClick={() => setActiveCategories([])}
            className="whitespace-nowrap px-3 py-2 rounded-full text-[12px] text-red-400 border border-transparent hover:border-red-200 transition-all h-[36px]"
          >
            Clear
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 text-[13px]">
          Failed to load subjects. Check your connection.
        </div>
      )}

      {/* Subject grid */}
      {loadingSubjects ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-[68px] bg-slate-100 dark:bg-[#1E293B] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredSubjects.map(sub => (
            <div
              key={`${sub.subject_code}-${sub.level}`}
              onClick={() => handleOpenSubject(sub)}
              className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155]/50 rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:border-[#22C55E]/50 hover:-translate-y-0.5 transition-all group shadow-sm dark:shadow-none"
            >
              <div className="w-[42px] h-[42px] rounded-xl bg-slate-100 dark:bg-[#0F172A] flex items-center justify-center shrink-0">
                <span className="font-medium text-[15px] text-slate-700 dark:text-[#F1F5F9]">
                  {sub.subject.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-medium text-slate-900 dark:text-[#F1F5F9] truncate">{sub.subject}</h3>
                <p className="text-[12px] text-slate-400 dark:text-[#64748B]">{sub.subject_code} · {sub.category}</p>
              </div>
              <ChevronRight size={18} className="text-slate-300 dark:text-[#64748B] group-hover:text-[#22C55E] transition-colors shrink-0" />
            </div>
          ))}

          {!loadingSubjects && filteredSubjects.length === 0 && !error && (
            <div className="col-span-full py-12 text-center">
              <p className="text-slate-500 dark:text-[#94A3B8] text-[13px]">No subjects found</p>
              <p className="text-slate-400 dark:text-[#64748B] text-[12px] mt-1">Try 'Physics' or '0780'</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
