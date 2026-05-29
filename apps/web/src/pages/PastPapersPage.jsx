
import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';

const ALL_SUBJECTS = [
  { id: 'p0770', name: 'Physics', code: '0770', level: 'A Level', category: 'Sciences', papers: 24 },
  { id: 'c0745', name: 'Chemistry', code: '0745', level: 'A Level', category: 'Sciences', papers: 22 },
  { id: 'm0765', name: 'Mathematics', code: '0765', level: 'A Level', category: 'Sciences', papers: 31 },
  { id: 'b0740', name: 'Biology', code: '0740', level: 'A Level', category: 'Sciences', papers: 20 },
  { id: 'fm0775', name: 'Further Mathematics', code: '0775', level: 'A Level', category: 'Sciences', papers: 18 },
  { id: 'cs0795', name: 'Computer Science', code: '0795', level: 'A Level', category: 'Sciences', papers: 15 },
  { id: 'm0580', name: 'Mathematics', code: '0580', level: 'O Level', category: 'Sciences', papers: 40 },
  { id: 'p0625', name: 'Physics', code: '0625', level: 'O Level', category: 'Sciences', papers: 35 },
  { id: 'h0760', name: 'History', code: '0760', level: 'A Level', category: 'Arts', papers: 25 },
  { id: 'e0755', name: 'Economics', code: '0755', level: 'A Level', category: 'Arts', papers: 28 },
  { id: 'f0730', name: 'French', code: '0730', level: 'A Level', category: 'Arts', papers: 15 },
];

export default function PastPapersPage() {
  const { user, updateUser, addRecentActivity, isLoading } = useUser();
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);

  const availableFilters = ['A Level', 'O Level', 'Sciences', 'Arts'];

  const toggleFilter = (filter) => {
    setActiveFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  const filteredSubjects = useMemo(() => {
    return ALL_SUBJECTS.filter(sub => {
      const matchesSearch = sub.name.toLowerCase().includes(search.toLowerCase()) || 
                            sub.code.includes(search);
      
      if (!matchesSearch) return false;
      if (activeFilters.length === 0) return true;

      const isALevel = activeFilters.includes('A Level');
      const isOLevel = activeFilters.includes('O Level');
      const isSci = activeFilters.includes('Sciences');
      const isArts = activeFilters.includes('Arts');

      const matchesLevel = (!isALevel && !isOLevel) || 
                           (isALevel && sub.level === 'A Level') || 
                           (isOLevel && sub.level === 'O Level');
                           
      const matchesCategory = (!isSci && !isArts) ||
                              (isSci && sub.category === 'Sciences') ||
                              (isArts && sub.category === 'Arts');

      return matchesLevel && matchesCategory;
    });
  }, [search, activeFilters]);

  const handleOpenSubject = (sub) => {
    if (user) {
      updateUser({ stats: { ...user.stats, papersRead: (user.stats?.papersRead || 0) + 1 } });
      addRecentActivity({ type: 'paper', subject: sub.name, paper: '2023 Paper 1', date: new Date().toISOString() });
    }
    // In a real app, this would navigate to the PDF reader
    alert(`Opening ${sub.name} papers...`);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse flex flex-col gap-4">
        <div className="h-12 bg-[#1E293B] rounded-2xl"></div>
        <div className="h-24 bg-[#1E293B] rounded-2xl"></div>
        <div className="h-24 bg-[#1E293B] rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" size={18} />
          <input 
            type="text" 
            placeholder="Search subjects..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1E293B] text-[#F1F5F9] rounded-2xl py-3.5 pl-11 pr-4 text-[14px] outline-none border border-[#334155]/50 focus:border-[#22C55E] transition-all shadow-sm"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar shrink-0 items-center">
          {availableFilters.map(filter => (
            <button
              key={filter}
              onClick={() => toggleFilter(filter)}
              className={cn(
                "whitespace-nowrap px-4 py-2 rounded-full text-[13px] font-medium border transition-all scale-on-click h-[44px]",
                activeFilters.includes(filter)
                  ? "bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/50"
                  : "bg-[#1E293B] text-[#94A3B8] border-transparent hover:border-[#334155]"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => setActiveFilters([])} className="text-[#EF4444] text-[11px] hover:underline">
            Clear filters
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSubjects.map(sub => (
          <div 
            key={sub.id} 
            onClick={() => handleOpenSubject(sub)}
            className="bg-[#1E293B] border border-[#334155]/50 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-[#22C55E]/50 hover:-translate-y-0.5 transition-all group"
          >
            <div className="w-[44px] h-[44px] rounded-xl bg-[#0F172A] flex items-center justify-center shrink-0 text-[#F1F5F9]">
              <span className="font-medium text-[16px] uppercase">{sub.name.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <div className="flex-1 truncate">
                <h3 className="text-[14px] font-medium text-[#F1F5F9] truncate">{sub.name}</h3>
                <p className="text-[12px] text-[#64748B]">{sub.level} · {sub.code}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="bg-[#0F172A] text-[#94A3B8] text-[11px] px-2.5 py-0.5 rounded-full font-medium">
                {sub.papers}
              </span>
              <ChevronRight size={18} className="text-[#64748B] group-hover:text-[#22C55E] transition-colors" />
            </div>
          </div>
        ))}
        {filteredSubjects.length === 0 && (
          <div className="col-span-full py-12 text-center flex flex-col items-center gap-1">
            <p className="text-[#94A3B8] text-[12px]">No subjects found for '{search}'</p>
            <p className="text-[#64748B] text-[12px]">Try 'Physics' or 'Economics'</p>
          </div>
        )}
      </div>
    </div>
  );
}
