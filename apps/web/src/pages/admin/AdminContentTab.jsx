import React, { useEffect, useState } from 'react';
import { BookOpen, Clapperboard, Coins, Film, HardDrive, Image as ImageIcon, Layers, Loader2, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { adminDateRangeToRpc } from '@/lib/adminDateRange';
import { SortableTableHeader, useAdminTableSort } from '@/components/admin/SortableTableHeader';

// -----------------------------------------------------------------------------
// Onglet Contenus — branché sur les vraies données (2026-08-09).
//
// Source : public.admin_content_totals() et public.admin_recent_projects()
// (migration 20260808000004), réelles en base, gardées par is_admin().
//
// "Images générées" vient maintenant de generation_jobs (job_type='image',
// status='done', somme de completed_items) — ajouté le 2026-08-09 dans
// admin_content_totals() (migration 20260809000004).
// -----------------------------------------------------------------------------

const STATUS_STYLE = {
  draft: 'border-transparent bg-muted text-muted-foreground',
  in_progress: 'border-transparent bg-sky-500/15 text-sky-600 dark:text-sky-400',
  generating: 'border-transparent bg-sky-500/15 text-sky-600 dark:text-sky-400',
  partial: 'border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400',
  done: 'border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  error: 'border-transparent bg-destructive/15 text-destructive',
  completed: 'border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  archived: 'border-transparent bg-muted text-muted-foreground',
};

const STATUS_LABEL = {
  draft: 'Brouillon',
  in_progress: 'En cours',
  generating: 'Génération',
  partial: 'Partiel',
  done: 'Terminé',
  error: 'Échec',
  completed: 'Terminé',
  archived: 'Archivé',
};

async function loadRecentProjects(params) {
  const current = await supabase.rpc('admin_recent_projects_v2', params);
  if (!current.error) return current;
  const missingFunction = current.error.code === 'PGRST202'
    || current.error.code === '42883'
    || current.error.message?.includes('admin_recent_projects_v2');
  return missingFunction ? supabase.rpc('admin_recent_projects', params) : current;
}

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
  return new Date(iso).toLocaleDateString('fr-FR');
}

function formatBytes(value) {
  const bytes = Number(value || 0); if (!bytes) return '0 octet';
  const units = ['o', 'Ko', 'Mo', 'Go', 'To']; const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** index)).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ${units[index]}`;
}

export default function AdminContentTab({ dateFilter }) {
  const [totals, setTotals] = useState(null);
  const [projects, setProjects] = useState([]);
  const [videoTotals, setVideoTotals] = useState(null);
  const [videoBreakdown, setVideoBreakdown] = useState([]);
  const [recentVideos, setRecentVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { sortedRows: sortedProjects, sort, toggleSort } = useAdminTableSort(projects, 'created_at', 'desc');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const { p_from, p_to } = adminDateRangeToRpc(dateFilter);

    (async () => {
      const [{ data: totalsData, error: totalsError }, { data: projectsData, error: projectsError }, { data: videoTotalsData, error: videoTotalsError }, { data: breakdownData, error: breakdownError }, { data: recentVideosData, error: recentVideosError }] = await Promise.all([
        supabase.rpc('admin_content_totals', { p_from, p_to }),
        loadRecentProjects({ p_limit: 20, p_from, p_to }),
        supabase.rpc('admin_video_tracking_totals', { p_from, p_to }),
        supabase.rpc('admin_video_generation_breakdown', { p_from, p_to }),
        supabase.rpc('admin_recent_video_generations', { p_limit: 30, p_from, p_to }),
      ]);

      if (cancelled) return;

      if (totalsError || projectsError || videoTotalsError || breakdownError || recentVideosError) {
        setError((totalsError || projectsError || videoTotalsError || breakdownError || recentVideosError).message);
      } else {
        setTotals(Array.isArray(totalsData) ? totalsData[0] : totalsData);
        setProjects(projectsData || []);
        setVideoTotals(Array.isArray(videoTotalsData) ? videoTotalsData[0] : videoTotalsData);
        setVideoBreakdown(breakdownData || []);
        setRecentVideos(recentVideosData || []);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [dateFilter]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground px-1">Période : {dateFilter?.label || 'Total'}</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <TotalCard icon={Layers} label="Projets" value={totals?.projects_count ?? (loading ? '…' : 0)} />
        <TotalCard icon={BookOpen} label="Scènes" value={totals?.scenes_count ?? (loading ? '…' : 0)} />
        <TotalCard icon={ImageIcon} label="Images générées" value={totals?.images_count ?? (loading ? '…' : 0)} />
        <TotalCard icon={Clapperboard} label="Montages créés" value={totals?.videos_count ?? (loading ? '…' : 0)} />
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Film className="h-4 w-4 text-primary" /> Production vidéo</CardTitle><CardDescription>Générations IA, fichiers enregistrés et montage · {dateFilter?.label || 'Total'}</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <TotalCard icon={Film} label="Clips IA créés" value={videoTotals?.ai_clips_created ?? (loading ? '…' : 0)} />
            <TotalCard icon={Clapperboard} label="Jobs vidéo" value={videoTotals?.ai_jobs_count ?? (loading ? '…' : 0)} />
            <TotalCard icon={Users} label="Créateurs vidéo" value={videoTotals?.unique_video_users ?? (loading ? '…' : 0)} />
            <TotalCard icon={Coins} label="Tokens vidéo nets" value={videoTotals?.tokens_net ?? (loading ? '…' : 0)} />
            <TotalCard icon={Film} label="Jobs réussis" value={videoTotals?.ai_jobs_succeeded ?? (loading ? '…' : 0)} />
            <TotalCard icon={Film} label="Échecs / annulations" value={videoTotals ? Number(videoTotals.ai_jobs_failed || 0) + Number(videoTotals.ai_jobs_cancelled || 0) : (loading ? '…' : 0)} />
            <TotalCard icon={HardDrive} label="Fichiers vidéo stockés" value={videoTotals ? `${videoTotals.stored_video_files} · ${formatBytes(videoTotals.stored_video_bytes)}` : (loading ? '…' : '0')} />
            <TotalCard icon={Clapperboard} label="Rendus terminés" value={videoTotals?.render_completed ?? (loading ? '…' : 0)} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4"><div className="rounded-lg border p-3"><p className="text-muted-foreground">Clips demandés</p><strong>{videoTotals?.ai_clips_requested ?? 0}</strong></div><div className="rounded-lg border p-3"><p className="text-muted-foreground">Clips échoués</p><strong>{videoTotals?.ai_clips_failed ?? 0}</strong></div><div className="rounded-lg border p-3"><p className="text-muted-foreground">Montages terminés</p><strong>{videoTotals?.montage_completed ?? 0}</strong></div><div className="rounded-lg border p-3"><p className="text-muted-foreground">Clips en timeline</p><strong>{videoTotals?.timeline_clips ?? 0}</strong></div></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Répartition des générations vidéo</CardTitle><CardDescription>Modèle, mode, résolution, statut, volumes et tokens nets</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-2">Modèle</th><th className="pb-2">Mode</th><th className="pb-2">Résolution</th><th className="pb-2">Durée</th><th className="pb-2">Statut</th><th className="pb-2 text-right">Jobs</th><th className="pb-2 text-right">Clips créés</th><th className="pb-2 text-right">Échecs</th><th className="pb-2 text-right">Tokens nets</th></tr></thead><tbody>{videoBreakdown.map((row, index) => <tr key={`${row.model_key}-${row.generation_mode}-${row.resolution}-${row.status}-${index}`} className="border-b last:border-0"><td className="py-3 font-medium">{row.model_key}</td><td className="py-3">{row.generation_mode}</td><td className="py-3">{row.resolution}</td><td className="py-3">{row.duration_seconds ? `${row.duration_seconds} s` : '—'}</td><td className="py-3"><Badge variant="outline">{row.status}</Badge></td><td className="py-3 text-right">{row.jobs_count}</td><td className="py-3 text-right">{row.clips_created}</td><td className="py-3 text-right">{row.clips_failed}</td><td className="py-3 text-right">{row.tokens_net}</td></tr>)}{!loading && videoBreakdown.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-muted-foreground">Aucune génération vidéo sur cette période.</td></tr>}</tbody></table></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Générations vidéo récentes</CardTitle><CardDescription>Les {recentVideos.length} derniers jobs vidéo de la période</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto"><table className="w-full min-w-[1000px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-2">Date</th><th className="pb-2">Utilisateur</th><th className="pb-2">Projet / vague</th><th className="pb-2">Modèle</th><th className="pb-2">Mode</th><th className="pb-2">Statut</th><th className="pb-2 text-right">Créés</th><th className="pb-2 text-right">Échecs</th><th className="pb-2 text-right">Tokens nets</th></tr></thead><tbody>{recentVideos.map(row => <tr key={row.job_id} className="border-b last:border-0"><td className="py-3 text-muted-foreground">{new Date(row.created_at).toLocaleString('fr-FR')}</td><td className="py-3">{row.owner_email}</td><td className="py-3"><span className="block font-medium">{row.project_title}</span><span className="text-xs text-muted-foreground">{row.wave_title || 'Sans titre'}</span></td><td className="py-3">{row.model_key}<span className="block text-xs text-muted-foreground">{row.resolution}{row.duration_seconds ? ` · ${row.duration_seconds} s` : ''}</span></td><td className="py-3">{row.generation_mode}</td><td className="py-3"><Badge variant="outline">{row.status}</Badge></td><td className="py-3 text-right">{row.created}/{row.requested}</td><td className="py-3 text-right">{row.failed}</td><td className="py-3 text-right">{row.tokens_net}</td></tr>)}{!loading && recentVideos.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-muted-foreground">Aucun job vidéo récent.</td></tr>}</tbody></table></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Projets récents</CardTitle>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>
          <CardDescription>Les {projects.length} derniers projets créés sur la période, tous auteurs confondus</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <p className="px-6 py-4 text-sm text-destructive">Erreur de chargement : {error}</p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                {[['Projet','title','left'],['Auteur','owner_email','left'],['Type','content_type','left'],['Plateforme','target_platform','left'],['Statut','generation_status','left'],['Scènes','scenes_completed','right'],['Créé le','created_at','left']].map(([label,key,align]) => <TableHead key={key} className={align === 'right' ? 'text-right' : ''}><SortableTableHeader label={label} sortKey={key} sort={sort} onSort={toggleSort} align={align} /></TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProjects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{p.owner_email}</TableCell>
                  <TableCell>{p.content_type || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{p.target_platform || '—'}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_STYLE[p.generation_status || p.status] ?? ''}>{STATUS_LABEL[p.generation_status || p.status] ?? p.generation_status ?? p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.latest_job_id ? `${p.scenes_completed ?? 0}/${p.scenes_requested ?? 0}` : (p.scene_count ?? 0)}
                    {Number(p.scenes_failed || 0) > 0 && <span className="block text-xs text-destructive">{p.scenes_failed} échec{Number(p.scenes_failed) > 1 ? 's' : ''}</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(p.created_at)}</TableCell>
                </TableRow>
              ))}
              {!loading && projects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    Aucun projet trouvé.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground px-1">Les compteurs distinguent les clips IA, les fichiers MP4 stockés, les projets de montage et les rendus terminés. L’egress exact reste volontairement hors de ce suivi.</p>
    </div>
  );
}
