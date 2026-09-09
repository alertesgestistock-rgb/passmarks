import React, { useEffect, useState } from 'react';
import { Loader2, Send, Users2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Source: public.admin_broadcast_notification / admin_count_broadcast_recipients
// / admin_list_broadcasts — see
// supabase/migrations/20260910170000_021_admin_broadcast_notifications.sql.
// The actual send (DB write + optional Telegram relay) goes through the
// admin-broadcast edge function, not a direct RPC call, because the
// Telegram bot token must stay server-side.

const TRISTATE = { any: null, yes: true, no: false };

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function toApiFilters(f) {
  const out = {};
  if (f.hasPhone !== 'any') out.has_phone = TRISTATE[f.hasPhone];
  if (f.level !== 'any') out.level = f.level;
  if (f.telegramLinked !== 'any') out.telegram_linked = TRISTATE[f.telegramLinked];
  if (f.minTokens !== '') out.min_tokens = Number(f.minTokens);
  if (f.maxTokens !== '') out.max_tokens = Number(f.maxTokens);
  return out;
}

const EMPTY_FILTERS = { hasPhone: 'any', level: 'any', telegramLinked: 'any', minTokens: '', maxTokens: '' };

export default function AdminBroadcastTab() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sendTelegram, setSendTelegram] = useState(false);
  const [previewCount, setPreviewCount] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = async () => {
    setLoadingHistory(true);
    const { data } = await supabase.rpc('admin_list_broadcasts', { p_limit: 20 });
    setHistory(data || []);
    setLoadingHistory(false);
  };

  useEffect(() => { loadHistory(); }, []);

  // Recompute the audience preview whenever a filter changes.
  useEffect(() => {
    let cancelled = false;
    setPreviewing(true);
    const timer = setTimeout(async () => {
      const { data, error } = await supabase.rpc('admin_count_broadcast_recipients', { p_filters: toApiFilters(filters) });
      if (cancelled) return;
      if (!error) setPreviewCount(data);
      setPreviewing(false);
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [filters]);

  const updateFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  async function handleSend() {
    if (!title.trim() || !body.trim()) { toast.error('Title and message are both required.'); return; }
    if (!previewCount) { toast.error("No user matches this audience — nothing to send."); return; }
    setSending(true);
    try {
      const { data: json, error: invokeError } = await supabase.functions.invoke('admin-broadcast', {
        body: { title: title.trim(), body: body.trim(), filters: toApiFilters(filters), sendTelegram },
      });
      if (invokeError) throw new Error(json?.error || invokeError.message);
      toast.success(`Sent to ${json.recipient_count} user${json.recipient_count > 1 ? 's' : ''}${sendTelegram ? ` (${json.telegram_sent_count} via Telegram)` : ''}.`);
      setTitle(''); setBody(''); setFilters(EMPTY_FILTERS); setSendTelegram(false);
      await loadHistory();
    } catch (err) {
      toast.error(err.message || 'Could not send this broadcast.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">New broadcast</CardTitle><CardDescription>Write a message and target it — it lands in the recipients' in-app notification bell, and optionally on Telegram for linked accounts.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <Field label="Title *"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New past papers available" maxLength={100} /></Field>
          <Field label="Message *"><Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What do you want to tell them?" rows={3} maxLength={500} /></Field>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Phone number">
              <Select value={filters.hasPhone} onValueChange={(v) => updateFilter('hasPhone', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="any">Any</SelectItem><SelectItem value="yes">Has a phone</SelectItem><SelectItem value="no">No phone yet</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Level">
              <Select value={filters.level} onValueChange={(v) => updateFilter('level', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="any">Any</SelectItem><SelectItem value="O Level">O Level</SelectItem><SelectItem value="A Level">A Level</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Telegram">
              <Select value={filters.telegramLinked} onValueChange={(v) => updateFilter('telegramLinked', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="any">Any</SelectItem><SelectItem value="yes">Linked</SelectItem><SelectItem value="no">Not linked</SelectItem></SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Min tokens"><Input type="number" min="0" value={filters.minTokens} onChange={(e) => updateFilter('minTokens', e.target.value)} placeholder="0" /></Field>
              <Field label="Max tokens"><Input type="number" min="0" value={filters.maxTokens} onChange={(e) => updateFilter('maxTokens', e.target.value)} placeholder="∞" /></Field>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Switch checked={sendTelegram} onCheckedChange={setSendTelegram} id="send-telegram" />
              <Label htmlFor="send-telegram" className="cursor-pointer">Also send via Telegram to linked accounts among the audience</Label>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users2 className="h-4 w-4" />
              {previewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>Will notify <strong className="text-foreground">{previewCount ?? 0}</strong> user{previewCount === 1 ? '' : 's'}</span>}
            </div>
          </div>

          <Button onClick={handleSend} disabled={sending || !title.trim() || !body.trim()} className="w-full sm:w-auto">
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send broadcast
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">History</CardTitle><CardDescription>Last 20 broadcasts sent</CardDescription></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Message</TableHead><TableHead className="text-right">Recipients</TableHead><TableHead className="text-right">Via Telegram</TableHead><TableHead>Sent by</TableHead><TableHead>Sent at</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h) => (
                <TableRow key={h.id}>
                  <TableCell><p className="font-medium">{h.title}</p><p className="text-xs text-muted-foreground line-clamp-1">{h.body}</p></TableCell>
                  <TableCell className="text-right tabular-nums">{h.recipient_count}</TableCell>
                  <TableCell className="text-right tabular-nums">{h.telegram_sent_count}</TableCell>
                  <TableCell className="text-muted-foreground">{h.created_by_name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{new Date(h.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                </TableRow>
              ))}
              {!loadingHistory && history.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No broadcast sent yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
