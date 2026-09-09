import React, { useEffect, useState } from 'react';
import { ExternalLink, Facebook, Globe2, Instagram, Linkedin, Link2, Loader2, Mail, Megaphone, MessageSquare, Music2, Search, UserPlus, Users2, TrendingUp, Coins, Youtube } from 'lucide-react';
import { Cell, Pie, PieChart } from 'recharts';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { SortableTableHeader, useAdminTableSort } from '@/components/admin/SortableTableHeader';
import { adminDateRangeToRpc } from '@/lib/adminDateRange';

// -----------------------------------------------------------------------------
// Onglet Marketing — branché sur les vraies données (2026-08-09).
//
// Source : public.admin_utm_signups() et public.admin_referral_summary()
// (migration 20260808000006), réelles en base, gardées par is_admin().
//
// ⚠️ La version précédente de cet onglet (Codex) affichait un tableau détaillé
// "rentabilité par contenu/vidéo" (vues, clics, ROAS par vidéo) — c'était
// explicitement labellisé "Données de démonstration" par son auteur, et ça le
// reste forcément : les tables qui alimenteraient ce niveau de détail
// (marketing_contents, marketing_content_daily_metrics, marketing_link_clicks
// — migration 20260808000009) existent en base mais sont VIDES, aucun
// collecteur ne les alimente encore (pas d'import des stats YouTube/TikTok,
// pas de lien de tracking par vidéo). Plutôt que de garder un tableau détaillé
// avec de fausses données, on remplace par ce qui EST réel aujourd'hui :
// inscriptions par source UTM (first-touch, capturé à l'inscription) et
// résumé du programme de parrainage. Le détail par contenu reviendra quand le
// pipeline d'import sera construit — voir cartographie §7.1/§8.1.
// -----------------------------------------------------------------------------

const fmt = new Intl.NumberFormat('fr-FR');
const SOURCE_STYLES = {
  whatsapp: { label: 'WhatsApp', color: '#25D366', icon: MessageLogo },
  facebook: { label: 'Facebook', color: '#1877F2', icon: Facebook },
  instagram: { label: 'Instagram', color: '#E4405F', icon: Instagram },
  tiktok: { label: 'TikTok', color: '#111827', icon: Music2 },
  youtube: { label: 'YouTube', color: '#FF0000', icon: Youtube },
  linkedin: { label: 'LinkedIn', color: '#0A66C2', icon: Linkedin },
  google: { label: 'Google', color: '#4285F4', icon: Search },
  email: { label: 'Email', color: '#EA4335', icon: Mail },
  sms: { label: 'SMS', color: '#16A34A', icon: MessageSquare },
  twitter: { label: 'X / Twitter', color: '#111827', icon: XLogo },
  x: { label: 'X / Twitter', color: '#111827', icon: XLogo },
  direct: { label: 'Direct', color: '#94A3B8', icon: Globe2 },
};

function MessageLogo({ className }) {
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true"><path d="M12 2a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l5.3-1.4A9.5 9.5 0 1 0 12 2Zm0 17.2a7.7 7.7 0 0 1-3.9-1.1l-.3-.2-3.1.8.8-3-.2-.3A7.7 7.7 0 1 1 12 19.2Zm4.2-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1-1.4-.7-2.3-1.3-3.2-2.9-.2-.3.2-.3.6-1.1.1-.2 0-.4 0-.5l-.7-1.7c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.8.9-1.1 2.2-.4 3.4.8 1.7 2.3 3.3 4 4.2 1.5.7 2.8 1.2 4.3.7 1-.3 1.7-1.2 1.9-2.1.1-.3.1-.6-.1-.7-.1-.1-.3-.2-.5-.3Z" /></svg>;
}

function XLogo({ className }) {
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23.2 22H17l-4.8-6.3L6.7 22H3.6l7.1-8.2L3 2h6.4l4.4 5.8L18.9 2Zm-1.1 17.8h1.7L8.5 4.1H6.7l11.1 15.7Z" /></svg>;
}

function SourceIdentity({ source, compact = false }) {
  const key = String(source || 'direct').toLowerCase();
  const config = SOURCE_STYLES[key] || { label: source || 'Direct', color: '#64748B', icon: Globe2 };
  const Icon = config.icon;
  return <span className="inline-flex items-center gap-2 whitespace-nowrap"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted" style={{ color: config.color }}><Icon className="h-4 w-4" /></span>{!compact && <span>{config.label}</span>}</span>;
}

function MetricCard({ icon: Icon, label, value, detail }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-semibold">{value}</p>
          {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
        </div>
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminMarketingTab({ dateFilter }) {
  const [utmRows, setUtmRows] = useState([]);
  const [referral, setReferral] = useState(null);
  const [attributionRows, setAttributionRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { sortedRows: sortedUtmRows, sort, toggleSort } = useAdminTableSort(utmRows, 'signups', 'desc');
  const { sortedRows: sortedAttributionRows, sort: attributionSort, toggleSort: toggleAttributionSort } = useAdminTableSort(attributionRows, 'signups', 'desc');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const { p_from, p_to } = adminDateRangeToRpc(dateFilter);

    (async () => {
      const [{ data: utmData, error: utmError }, { data: referralData, error: referralError }, { data: attributionData, error: attributionError }] = await Promise.all([
        supabase.rpc('admin_utm_signups', { p_from, p_to }),
        supabase.rpc('admin_referral_summary', { p_from, p_to }),
        supabase.rpc('admin_signup_attribution_detail', { p_from, p_to }),
      ]);

      if (cancelled) return;

      if (utmError || referralError || attributionError) {
        setError((utmError || referralError || attributionError).message);
      } else {
        setUtmRows(utmData || []);
        setReferral(Array.isArray(referralData) ? referralData[0] : referralData);
        setAttributionRows(attributionData || []);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [dateFilter]);

  const totalSignups = utmRows.reduce((sum, r) => sum + r.signups, 0);
  const attributedSignups = utmRows.reduce((sum, r) => (
    r.utm_source && r.utm_source !== 'direct' ? sum + r.signups : sum
  ), 0);
  const directSignups = totalSignups - attributedSignups;
  const attributionRate = totalSignups ? Math.round((attributedSignups / totalSignups) * 100) : 0;
  const chartData = Object.values(utmRows.reduce((sources, row) => {
    const source = String(row.utm_source || 'direct').toLowerCase();
    sources[source] = sources[source] || { source, signups: 0 };
    sources[source].signups += Number(row.signups || 0);
    return sources;
  }, {})).sort((a, b) => b.signups - a.signups).slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Marketing & acquisition</h2>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Inscriptions par source (UTM first-touch) et programme de parrainage
            {dateFilter?.label ? ` · ${dateFilter.label}` : ''}
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">Erreur de chargement : {error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={UserPlus} label="Inscriptions (toutes sources)" value={fmt.format(totalSignups)} />
        <MetricCard icon={Users2} label="Parrains actifs" value={fmt.format(referral?.active_referrers ?? 0)} />
        <MetricCard icon={TrendingUp} label="Parrainages convertis" value={`${fmt.format(referral?.converted_referrals ?? 0)} / ${fmt.format(referral?.total_referrals ?? 0)}`} />
        <MetricCard icon={Coins} label="Tokens versés (parrainage)" value={fmt.format(referral?.tokens_paid ?? 0)} />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-primary/10 p-2 text-primary"><Link2 className="h-4 w-4" /></div>
            <div>
              <p className="font-medium">Générateur de liens UTM Raconty</p>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Crée les liens de campagne pour WhatsApp, Facebook, TikTok, YouTube, email et influenceurs.
                Les liens générés restent dans le navigateur; ce tableau mesure les inscriptions réellement
                attribuées après utilisation du lien, pas le nombre de liens copiés.
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                <span><strong className="text-foreground">{fmt.format(attributedSignups)}</strong> attribuées UTM</span>
                <span><strong className="text-foreground">{fmt.format(directSignups)}</strong> directes/non attribuées</span>
                <span><strong className="text-foreground">{attributionRate}%</strong> de couverture</span>
              </div>
            </div>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <a href="/tools/utm-builder" target="_blank" rel="noreferrer">
              Ouvrir le générateur <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Répartition des inscriptions par source</CardTitle>
            <CardDescription>Donut first-touch et logos des dix principales sources</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
              <ChartContainer config={{ signups: { label: 'Inscriptions' } }} className="h-[280px] w-full">
                <PieChart><ChartTooltip content={<ChartTooltipContent nameKey="source" />} /><Pie data={chartData} dataKey="signups" nameKey="source" innerRadius={66} outerRadius={104} paddingAngle={2} strokeWidth={2}>{chartData.map((entry) => <Cell key={entry.source} fill={(SOURCE_STYLES[entry.source] || {}).color || '#64748B'} />)}</Pie></PieChart>
              </ChartContainer>
              <div className="space-y-2">{chartData.map((entry) => <div key={entry.source} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"><SourceIdentity source={entry.source} /><strong className="tabular-nums">{fmt.format(entry.signups)}</strong></div>)}{!chartData.length && <p className="text-sm text-muted-foreground">Aucune source.</p>}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Détail par source</CardTitle>
            <CardDescription>Source / medium / campagne</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {[['Source','utm_source','left'],['Medium','utm_medium','left'],['Campagne','utm_campaign','left'],['Inscrits','signups','right']].map(([label,key,align]) => <TableHead key={key} className={align === 'right' ? 'text-right' : ''}><SortableTableHeader label={label} sortKey={key} sort={sort} onSort={toggleSort} align={align} /></TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUtmRows.map((r, i) => (
                  <TableRow key={`${r.utm_source}-${r.utm_medium}-${r.utm_campaign}-${i}`}>
                    <TableCell className="font-medium"><SourceIdentity source={r.utm_source} /></TableCell>
                    <TableCell className="text-muted-foreground">{r.utm_medium}</TableCell>
                    <TableCell className="text-muted-foreground">{r.utm_campaign}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.signups}</TableCell>
                  </TableRow>
                ))}
                {!loading && utmRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                      Aucune inscription trouvée.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attribution complète des inscriptions</CardTitle>
          <CardDescription>UTM first-touch, fournisseur d’inscription, parrainage et présence des identifiants publicitaires — les identifiants bruts ne sont jamais affichés.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[1500px]">
            <TableHeader><TableRow>{[
              ['Source','utm_source','left'],['Medium','utm_medium','left'],['Campagne','utm_campaign','left'],
              ['Contenu','utm_content','left'],['Terme','utm_term','left'],['Inscription','signup_provider','left'],
              ['Inscrits','signups','right'],['Parrainés','referrals','right'],['Google Ads','gclid_signups','right'],
              ['Meta','fbclid_signups','right'],['TikTok','ttclid_signups','right'],['Microsoft','msclkid_signups','right'],
              ['Acheteurs tokens','token_buyers','right'],['CA tokens','token_revenue_xaf','right'],['Abonnés','subscribers','right'],
            ].map(([label,key,align]) => <TableHead key={key} className={align === 'right' ? 'text-right' : ''}><SortableTableHeader label={label} sortKey={key} sort={attributionSort} onSort={toggleAttributionSort} align={align} /></TableHead>)}</TableRow></TableHeader>
            <TableBody>{sortedAttributionRows.map((row, index) => <TableRow key={`${row.utm_source}-${row.utm_campaign}-${row.signup_provider}-${index}`}>
              <TableCell className="font-medium"><SourceIdentity source={row.utm_source} /></TableCell><TableCell>{row.utm_medium}</TableCell><TableCell>{row.utm_campaign}</TableCell>
              <TableCell>{row.utm_content}</TableCell><TableCell>{row.utm_term}</TableCell><TableCell>{row.signup_provider}</TableCell>
              <TableCell className="text-right">{row.signups}</TableCell><TableCell className="text-right">{row.referrals}</TableCell>
              <TableCell className="text-right">{row.gclid_signups}</TableCell><TableCell className="text-right">{row.fbclid_signups}</TableCell>
              <TableCell className="text-right">{row.ttclid_signups}</TableCell><TableCell className="text-right">{row.msclkid_signups}</TableCell>
              <TableCell className="text-right">{row.token_buyers}</TableCell><TableCell className="text-right">{fmt.format(row.token_revenue_xaf || 0)} FCFA</TableCell>
              <TableCell className="text-right">{row.subscribers}</TableCell>
            </TableRow>)}{!loading && !sortedAttributionRows.length && <TableRow><TableCell colSpan={15} className="py-10 text-center text-muted-foreground">Aucune attribution trouvée.</TableCell></TableRow>}</TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Rentabilité par contenu/vidéo
            <Badge variant="outline">Pas encore disponible</Badge>
          </CardTitle>
          <CardDescription>
            Nécessite un pipeline d'import (métriques natives YouTube/TikTok/Meta + liens de tracking par
            vidéo) qui n'existe pas encore. Les tables prévues (marketing_contents,
            marketing_content_daily_metrics, marketing_link_clicks) sont en place en base mais vides —
            voir cartographie §7.1.
          </CardDescription>
        </CardHeader>
      </Card>

      <p className="text-xs text-muted-foreground">
        Une source « direct » signifie que profiles.utm_source est vide. Les inscriptions email et Google utilisent
        désormais la même finalisation first-touch après authentification.
        Les acheteurs de tokens, le revenu FCFA confirmé et les abonnés sont rapprochés par source côté serveur.
        referral_tracking.status observé en base : voir commentaire de
        admin_referral_summary() si de nouvelles valeurs de statut apparaissent.
      </p>
    </div>
  );
}
