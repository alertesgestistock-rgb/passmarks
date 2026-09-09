import React, { useState } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const PERIODS = ['Today', '24h', 'Yesterday', 'Last 7 days', 'Last 30 days', 'This month', 'Total'];

export default function AdminGlobalDateFilter({ value, onChange }) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [draftRange, setDraftRange] = useState(value.range);

  const selectPreset = (label) => onChange({ label, range: undefined, preset: label });
  const applyRange = () => {
    if (!draftRange?.from) return;
    const endDate = draftRange.to || draftRange.from;
    const start = draftRange.from.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const end = endDate.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
    onChange({ label: `${start} → ${end}`, range: { from: draftRange.from, to: endDate }, preset: 'custom' });
    setCalendarOpen(false);
  };

  return <>
    <div className="mt-4 flex items-center rounded-xl border bg-card p-3 shadow-sm">
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="outline" className="max-w-full gap-2 rounded-full border-primary/20 bg-primary/5"><CalendarDays className="h-4 w-4 text-primary" /><span className="truncate">{value.label}</span><ChevronDown className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {PERIODS.map((item) => <DropdownMenuItem key={item} onSelect={() => selectPreset(item)}>{item}</DropdownMenuItem>)}
          <DropdownMenuItem onSelect={() => { setDraftRange(value.range); setCalendarOpen(true); }}><CalendarDays className="mr-2 h-4 w-4" />Custom range</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="ml-3 hidden text-xs text-muted-foreground sm:inline">Period applied to every tab</span>
    </div>

    <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
      <DialogContent className="w-auto max-w-[95vw]">
        <DialogHeader><DialogTitle>Pick a date range</DialogTitle></DialogHeader>
        <Calendar mode="range" selected={draftRange} onSelect={setDraftRange} numberOfMonths={1} />
        <DialogFooter><Button variant="ghost" onClick={() => setCalendarOpen(false)}>Cancel</Button><Button onClick={applyRange} disabled={!draftRange?.from}>Apply</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
