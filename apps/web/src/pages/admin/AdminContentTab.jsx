import React, { useEffect, useState } from 'react';
import { BookOpen, Calendar, Coins, FileText, Loader2, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { adminDateRangeToRpc } from '@/lib/adminDateRange';

// Source: public.admin_content_totals(p_from, p_to) and
// public.admin_recent_activity(p_from, p_to, p_limit) — see
// supabase/migrations/20260910120000_016_admin_dashboard_rpcs.sql.
// PassMark has no "projects"/video generation — this tracks real study
// activity (AI Tutor conversations, quizzes, past papers, calendar).

function TotalCard({ icon: Icon, label, value }) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold mt-1">{value}</p>
        </div>
        <div className="shrink-0 rounded-md bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
}

const KIND_LABEL = { conversation: 'AI Tutor chat', paper_view: 'Past paper opened' };
const KIND_ICON = { conversation: MessageSquare, paper_view: FileText };

export default function AdminContentTab({ dateFilter }) {
  const [totals, setTotals] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const range = adminDateRangeToRpc(dateFilter);

    (async () => {
      const [{ data: totalsData, error: totalsError }, { data: activityData, error: activityError }] = await Promise.all([
        supabase.rpc('admin_content_totals', range),
        supabase.rpc('admin_recent_activity', { ...range, p_limit: 30 }),
      ]);

      if (cancelled) return;

      if (totalsError || activityError) {
        setError((totalsError || activityError).message);
      } else {
        setTotals(totalsData);
        setActivity(activityData || []);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [dateFilter]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground px-1">Period: {dateFilter?.label || 'Last 7 days'}</p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <TotalCard icon={MessageSquare} label="AI Tutor chats started" value={totals?.conversations_started ?? (loading ? '…' : 0)} />
        <TotalCard icon={BookOpen} label="Quizzes completed" value={totals?.quizzes_completed ?? (loading ? '…' : 0)} />
        <TotalCard icon={FileText} label="Past papers viewed" value={totals?.papers_viewed ?? (loading ? '…' : 0)} />
        <TotalCard icon={Calendar} label="Calendar events created" value={totals?.calendar_events_created ?? (loading ? '…' : 0)} />
        <TotalCard icon={Coins} label="Tokens spent on AI Tutor" value={totals?.ai_tokens_spent ?? (loading ? '…' : 0)} />
        <TotalCard icon={MessageSquare} label="Messages sent" value={totals?.messages_sent ?? (loading ? '…' : 0)} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Recent activity</CardTitle>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>
          <CardDescription>Latest {activity.length} events on this period, across all users</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {error && <p className="px-6 py-4 text-sm text-destructive">Couldn't load activity: {error}</p>}
          <div className="divide-y">
            {activity.map((row, index) => {
              const Icon = KIND_ICON[row.kind] || MessageSquare;
              return (
                <div key={index} className="flex items-center justify-between gap-3 px-6 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 rounded-md bg-primary/10 p-1.5 text-primary"><Icon className="h-4 w-4" /></div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{row.detail || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{row.email}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="outline" className="mb-1">{KIND_LABEL[row.kind] || row.kind}</Badge>
                    <p className="text-xs text-muted-foreground">{formatDate(row.created_at)}</p>
                  </div>
                </div>
              );
            })}
            {!loading && activity.length === 0 && (
              <p className="text-center text-muted-foreground py-10">No activity on this period.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
