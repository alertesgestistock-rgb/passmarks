
import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronRight, ArrowLeft, FileText, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

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

export default function PastPapersPage() {
  const [view, setView]                   = useState('list'); // 'list' | 'detail'
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjects, setSubjects]           = useState([]);
  const [papers, setPapers]               = useState([]);
  const [selectedSource, setSelectedSource] = useState('GCE_BOARD');
  const [selectedLevel, setSelectedLevel] = useState('A_Level'); // required, always one selected
  const [search, setSearch]               = useState('');
  const [activeCategories, setActiveCategories] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingPapers, setLoadingPapers]     = useState(false);

  // Fetch distinct subjects from Supabase
  useEffect(() => {
    async function fetchSubjects() {
      setLoadingSubjects(true);
      const { data, error } = await supabase
        .from('gce_papers')
        .select('subject, subject_code, level, category')
        .eq('is_active', true)
        .eq('source', 'GCE_BOARD')
        .order('level').order('category').order('subject');

      if (!error && data) {
        const seen = new Set();
        const unique = data.filter(row => {
          const key = `${row.subject_code}-${row.level}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setSubjects(unique);
      }
      setLoadingSubjects(false);
    }
    fetchSubjects();
  }, []);

  // Fetch papers for selected subject + source
  useEffect(() => {
    if (!selectedSubject) return;
    async function fetchPapers() {
      setLoadingPapers(true);
      const { data, error } = await supabase
        .from('gce_papers')
        .select('year, paper_number, pdf_url')
        .eq('subject_code', selectedSubject.subject_code)
        .eq('level', selectedSubject.level)
        .eq('source', selectedSource)
        .eq('is_active', true)
        .order('year', { ascending: false })
        .order('paper_number', { ascending: true });

      if (!error && data) setPapers(data);
      setLoadingPapers(false);
    }
    fetchPapers();
  }, [selectedSubject, selectedSource]);

  // Group papers by year → { 2023: { 1: url, 2: url, 3: null }, ... }
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

  const handleOpenSubject = (sub) => {
    setSelectedSubject(sub);
    setSelectedSource('GCE_BOARD');
    setPapers([]);
    setView('detail');
  };

  // ─── DETAIL VIEW ───────────────────────────────────────────────────────────
  if (view === 'detail' && selectedSubject) {
    const paperCols = Array.from({ length: maxPaper }, (_, i) => i + 1);

    return (
      <div className="fade-in">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setView('list')}
            className="w-9 h-9 rounded-xl bg-[#1E293B] flex items-center justify-center hover:bg-[#334155] transition-colors shrink-0"
          >
            <ArrowLeft size={16} className="text-[#94A3B8]" />
          </button>
          <div className="min-w-0">
            <h2 className="text-[16px] font-medium text-[#F1F5F9] truncate">{selectedSubject.subject}</h2>
            <p className="text-[12px] text-[#64748B]">
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
                  : 'bg-[#1E293B] text-[#94A3B8] border-transparent hover:border-[#334155]'
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
              <div key={i} className="h-14 bg-[#1E293B] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-[#1E293B] rounded-2xl overflow-hidden border border-[#334155]/50">
            {/* Column headers */}
            <div
              className="grid px-4 py-2.5 border-b border-[#334155]/50"
              style={{ gridTemplateColumns: `1fr repeat(${paperCols.length}, 1fr)` }}
            >
              <span className="text-[11px] font-medium uppercase tracking-wide text-[#64748B]">Year</span>
              {paperCols.map(pn => (
                <span key={pn} className="text-[11px] font-medium uppercase tracking-wide text-[#64748B] text-center">
                  Paper {pn}
                </span>
              ))}
            </div>

            {/* Rows */}
            {years.length === 0 ? (
              <div className="py-14 text-center text-[#64748B] text-[13px]">
                No papers available for this source yet
              </div>
            ) : (
              years.map((year, idx) => (
                <div
                  key={year}
                  className={cn(
                    'grid px-4 py-3 items-center',
                    idx !== years.length - 1 && 'border-b border-[#334155]/30'
                  )}
                  style={{ gridTemplateColumns: `1fr repeat(${paperCols.length}, 1fr)` }}
                >
                  <span className="text-[13px] font-medium text-[#F1F5F9]">{year}</span>
                  {paperCols.map(pn => {
                    const url = papersByYear[year]?.[pn];
                    return (
                      <div key={pn} className="flex justify-center">
                        {url ? (
                          <button
                            onClick={() => window.open(url, '_blank')}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#14532D] text-[#22C55E] text-[11px] font-medium hover:bg-[#166534] transition-colors"
                          >
                            <FileText size={11} />
                            Open
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0F172A] text-[#475569] text-[11px]">
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

      {/* Level toggle — O Level / A Level, toujours 1 sélectionné */}
      <div className="flex gap-2 mb-4">
        {[{ key: 'A_Level', label: 'A Level' }, { key: 'O_Level', label: 'O Level' }].map(lv => (
          <button
            key={lv.key}
            onClick={() => { setSelectedLevel(lv.key); setActiveCategories([]); setSearch(''); }}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-[14px] font-medium border transition-all',
              selectedLevel === lv.key
                ? 'bg-[#22C55E] text-white border-[#22C55E]'
                : 'bg-[#1E293B] text-[#94A3B8] border-[#334155]/50 hover:border-[#22C55E]/40'
            )}
          >
            {lv.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" size={18} />
        <input
          type="text"
          placeholder="Search subjects..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#1E293B] text-[#F1F5F9] rounded-2xl py-3.5 pl-11 pr-4 text-[14px] outline-none border border-[#334155]/50 focus:border-[#22C55E] transition-all placeholder:text-[#64748B]"
        />
      </div>

      {/* Category filters — optionnels */}
      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar mb-5">
        {CATEGORY_FILTERS.map(cat => (
          <button
            key={cat}
            onClick={() => toggleCategory(cat)}
            className={cn(
              'whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-medium border transition-all h-[36px]',
              activeCategories.includes(cat)
                ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/50'
                : 'bg-[#1E293B] text-[#94A3B8] border-transparent hover:border-[#334155]'
            )}
          >
            {cat}
          </button>
        ))}
        {activeCategories.length > 0 && (
          <button
            onClick={() => setActiveCategories([])}
            className="whitespace-nowrap px-3 py-2 rounded-full text-[12px] text-[#EF4444] border border-transparent hover:border-[#EF4444]/30 transition-all h-[36px]"
          >
            Clear
          </button>
        )}
      </div>

      {/* Subject grid */}
      {loadingSubjects ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-[72px] bg-[#1E293B] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSubjects.map(sub => (
            <div
              key={`${sub.subject_code}-${sub.level}`}
              onClick={() => handleOpenSubject(sub)}
              className="bg-[#1E293B] border border-[#334155]/50 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-[#22C55E]/50 hover:-translate-y-0.5 transition-all group"
            >
              <div className="w-[44px] h-[44px] rounded-xl bg-[#0F172A] flex items-center justify-center shrink-0">
                <span className="font-medium text-[16px] text-[#F1F5F9]">
                  {sub.subject.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-medium text-[#F1F5F9] truncate">{sub.subject}</h3>
                <p className="text-[12px] text-[#64748B]">{sub.subject_code} · {sub.category}</p>
              </div>
              <ChevronRight size={18} className="text-[#64748B] group-hover:text-[#22C55E] transition-colors shrink-0" />
            </div>
          ))}

          {filteredSubjects.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <p className="text-[#94A3B8] text-[13px]">No subjects found</p>
              <p className="text-[#64748B] text-[12px] mt-1">Try 'Physics' or '0780'</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
