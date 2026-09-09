import React, { useEffect, useState } from 'react';
import { Coins, Loader2, Megaphone, Users2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { adminDateRangeToRpc } from '@/lib/adminDateRange';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Source: public.admin_referral_summary(p_from, p_to) — see
// supabase/migrations/20260910120000_016_admin_dashboard_rpcs.sql.
// PassMark has no UTM tracking and no promo-code system (no table backs
// either yet) — this tab covers what does exist: the referral program and
// self-reported "how did you hear about us" answers from onboarding.

const SOURCE_LABEL = {
  youtube: 'YouTube', google: 'Google', facebook_instagram: 'Facebook / Instagram',
  whatsapp_telegram: 'WhatsApp / Telegram', tiktok: 'TikTok', friend: 'Friend', other: 'Other', unknown: 'Not answered yet',
};

function TotalCard({ icon: Icon, label, value }) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center justify-between gap-4">
        <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-semibold mt-1">{value}</p></div>
        <div className="shrink-0 rounded-md bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></div>
      </CardContent>
    </Card>
  );
}

export default function AdminMarketingTab({ dateFilter }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    supabase.rpc('admin_referral_summary', adminDateRangeToRpc(dateFilter)).then(({ data: result, error: rpcError }) => {
      if (cancelled) return;
      if (rpcError) setError(rpcError.message); else setData(result);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [dateFilter]);

  const maxAcquisition = Math.max(1, ...(data?.acquisition_breakdown || []).map((r) => r.count));

  return (
    <div className="space-y-4">
      {loading && <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading…</div>}
      {error && <Card className="border-destructive/40"><CardContent className="p-4 text-sm text-destructive">Couldn't load marketing data: {error}</CardContent></Card>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TotalCard icon={Users2} label="Total referrals" value={data?.total_referrals ?? 0} />
            <TotalCard icon={Megaphone} label="New referrals" value={data?.new_referrals ?? 0} />
            <TotalCard icon={Coins} label="Tokens paid to referrers" value={data?.tokens_paid_to_referrers ?? 0} />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Top referrers</CardTitle><CardDescription>All-time, by number of friends referred</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {(data?.top_referrers || []).map((row, i) => (
                <div key={i} className="flex items-center justify-between border-b py-2 last:border-0">
                  <div><p className="font-medium">{row.name || '—'}</p><p className="text-xs text-muted-foreground">{row.email}</p></div>
                  <span className="tabular-nums font-semibold">{row.referred_count}</span>
                </div>
              ))}
              {!data?.top_referrers?.length && <p className="text-sm text-muted-foreground">No referral yet.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">How users found PassMark</CardTitle><CardDescription>Self-reported during onboarding, all-time</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {(data?.acquisition_breakdown || []).map((row, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{SOURCE_LABEL[row.source] || row.source}</span>
                    <span className="tabular-nums text-muted-foreground">{row.count}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(row.count / maxAcquisition) * 100}%` }} />
                  </div>
                </div>
              ))}
              {!data?.acquisition_breakdown?.length && <p className="text-sm text-muted-foreground">No answer recorded yet.</p>}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground px-1">No UTM tracking or promo-code system exists in PassMark yet — this tab covers the referral program and onboarding acquisition survey only.</p>
        </>
      )}
    </div>
  );
}
