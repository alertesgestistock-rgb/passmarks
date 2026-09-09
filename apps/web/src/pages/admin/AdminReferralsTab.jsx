import React, { useEffect, useState } from 'react';
import { Gift, Loader2, ShoppingBag, UserPlus, Users2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { adminDateRangeToRpc } from '@/lib/adminDateRange';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';

// Source: public.admin_referral_details(p_from, p_to) — see
// supabase/migrations/20260910130000_017_admin_referral_details.sql.
// Row-by-row view of the referral program (who invited whom, when, whether
// the invited friend converted, tokens each side earned) — the detailed
// counterpart to AdminMarketingTab's aggregate summary.

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function PersonCell({ name, email, telegramLinked }) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{initials(name)}</AvatarFallback></Avatar>
      <div className="min-w-0">
        <p className="font-medium truncate">{name || 'Student'}</p>
        <div className="flex items-center gap-1.5">
          <p className="text-xs text-muted-foreground truncate">{email || '—'}</p>
          {telegramLinked && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-[#229ED9]/40 text-[#229ED9]">Telegram</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

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

export default function AdminReferralsTab({ dateFilter }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    supabase.rpc('admin_referral_details', adminDateRangeToRpc(dateFilter)).then(({ data, error: rpcError }) => {
      if (cancelled) return;
      if (rpcError) setError(rpcError.message); else setRows(data || []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [dateFilter]);

  const convertedCount = rows.filter((r) => r.converted).length;
  const tokensToReferrers = rows.reduce((sum, r) => sum + (r.tokens_to_referrer || 0), 0);
  const tokensToReferred = rows.reduce((sum, r) => sum + (r.tokens_to_referred || 0), 0);

  return (
    <div className="space-y-4">
      {loading && <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading…</div>}
      {error && <Card className="border-destructive/40"><CardContent className="p-4 text-sm text-destructive">Couldn't load referrals: {error}</CardContent></Card>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <TotalCard icon={Users2} label="Referrals in period" value={rows.length} />
            <TotalCard icon={ShoppingBag} label="Converted (bought tokens)" value={convertedCount} />
            <TotalCard icon={Gift} label="Tokens paid to referrers" value={tokensToReferrers} />
            <TotalCard icon={UserPlus} label="Tokens paid to new friends" value={tokensToReferred} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">All referrals</CardTitle>
              <CardDescription>Every friend invited through PassMark's referral program (web link or Telegram), most recent first</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referrer</TableHead>
                      <TableHead>Invited friend</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Referrer earned</TableHead>
                      <TableHead className="text-right">Friend earned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={`${r.referrer_id}-${r.referred_id}`}>
                        <TableCell>
                          <PersonCell name={r.referrer_name} email={r.referrer_email} telegramLinked={r.referrer_telegram_linked} />
                        </TableCell>
                        <TableCell>
                          <PersonCell name={r.referred_name} email={r.referred_email} telegramLinked={r.referred_telegram_linked} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(r.referred_at)}</TableCell>
                        <TableCell>
                          {r.converted ? (
                            <Badge className="bg-[#22C55E]/10 text-[#22C55E] border-0 gap-1"><ShoppingBag className="h-3 w-3" />Purchased</Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1"><UserPlus className="h-3 w-3" />Signed up</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold text-primary">+{r.tokens_to_referrer}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold text-primary">+{r.tokens_to_referred}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {rows.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No referral in this period.</p>}
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground px-1">
            Reward amounts are fixed by the referral program (+10 tokens to the referrer, +5 to the invited friend, both credited the moment the friend signs up) — not derived from individual transaction records.
          </p>
        </>
      )}
    </div>
  );
}
