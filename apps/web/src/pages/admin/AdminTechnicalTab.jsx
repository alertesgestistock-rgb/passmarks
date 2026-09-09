import React, { useEffect, useState } from 'react';
import { Activity, Loader2, Server } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { SortableTableHeader, useAdminTableSort } from '@/components/admin/SortableTableHeader';

// -----------------------------------------------------------------------------
// Onglet Technique & infrastructure — branché sur la vraie table (2026-08-09).
//
// Source : public.admin_operational_snapshots (migration 20260808000008),
// lue en direct (policy RLS "Admins can view operational snapshots", pas de
// RPC dédiée nécessaire ici — le SELECT est déjà gardé côté serveur par
// is_admin()). La table existe en base mais est VIDE : aucun collecteur
// serveur n'écrit encore dedans (egress Supabase, invocations Edge Functions,
// incidents — voir commentaire de la migration : "écriture future par
// collecteur serveur audité uniquement, jamais depuis le navigateur"). Donc
// cet onglet affiche un état vide honnête plutôt que les graphiques/tableaux
// de démonstration précédents.
// -----------------------------------------------------------------------------

export default function AdminTechnicalTab() {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { sortedRows: sortedSnapshots, sort, toggleSort } = useAdminTableSort(snapshots, 'captured_at', 'desc');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    supabase
      .from('admin_operational_snapshots')
      .select('*')
      .order('captured_at', { ascending: false })
      .limit(100)
      .then(({ data, error: queryError }) => {
        if (cancelled) return;
        if (queryError) {
          setError(queryError.message);
        } else {
          setSnapshots(data || []);
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Technique & infrastructure</h2>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Santé des services, egress, stockage, fonctions</p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">Erreur de chargement : {error}</p>}

      {!loading && snapshots.length === 0 && !error && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" /> Pas encore de données
              <Badge variant="outline">Collecteur non branché</Badge>
            </CardTitle>
            <CardDescription>
              La table `admin_operational_snapshots` est prête et sécurisée en base, mais rien n'écrit
              encore dedans. Ces métriques (egress, quotas Supabase, invocations Edge Functions,
              incidents) doivent venir d'un collecteur serveur — jamais directement du navigateur, pour
              des raisons de fiabilité et de sécurité (voir migration 20260808000008). Ce collecteur
              reste à construire.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {snapshots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Derniers snapshots</CardTitle>
            <CardDescription>{snapshots.length} enregistrement{snapshots.length > 1 ? 's' : ''}</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  {[['Capturé le','captured_at','left'],['Source','source','left'],['Service','service','left'],['Métrique','metric_name','left'],['Valeur','value','right'],['Confiance','confidence','left']].map(([label,key,align]) => <th key={key} className={`pb-2 ${align === 'right' ? 'text-right pr-4' : 'pr-4'}`}><SortableTableHeader label={label} sortKey={key} sort={sort} onSort={toggleSort} align={align} /></th>)}
                </tr>
              </thead>
              <tbody>
                {sortedSnapshots.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 text-muted-foreground">{new Date(s.captured_at).toLocaleString('fr-FR')}</td>
                    <td className="py-3 pr-4">{s.source}</td>
                    <td className="py-3 pr-4">{s.service}</td>
                    <td className="py-3 pr-4">{s.metric_name}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{s.value} {s.unit}</td>
                    <td className="py-3"><Badge variant="outline">{s.confidence}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
