import React, { useEffect, useMemo, useState } from 'react';
import { Coins, Star, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { PRODUCT_IDS, PLANS } from '@/lib/config';
import { SortableTableHeader, useAdminTableSort } from '@/components/admin/SortableTableHeader';
import { adminDateRangeToRpc } from '@/lib/adminDateRange';

// -----------------------------------------------------------------------------
// Onglet Tarification — branché sur les vraies données (2026-08-09).
//
// Section abonnements : `PRODUCT_IDS` est le catalogue réel déjà codé dans
// `lib/config.js` (Existant). Le prix réellement facturé vient de Chariow au
// moment du paiement, ce tableau affiche seulement le catalogue tel que codé
// côté Raconty (voir cartographie §6.1, contrôle de cohérence recommandé).
//
// Section packs de tokens : public.admin_token_packages_with_sales()
// (migration 20260808000005), réel en base, gardé par is_admin() — inclut le
// nombre de ventes confirmées par pack.
// -----------------------------------------------------------------------------

const PLAN_LABEL = { [PLANS.STARTER]: 'Starter', [PLANS.PRO]: 'Pro', [PLANS.ENTERPRISE]: 'Enterprise' };
const PERIOD_LABEL = { mensuel: 'Mensuel', semestre: 'Semestre (6 mois)', annuel: 'Annuel' };

const SUBSCRIPTIONS = Object.values(PRODUCT_IDS);

function formatXaf(n) {
  return `${n.toLocaleString('fr-FR')} FCFA`;
}

export default function AdminPricingTab({ dateFilter }) {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const subscriptionRows = useMemo(() => SUBSCRIPTIONS.map((row) => ({ ...row, plan_label: PLAN_LABEL[row.plan] ?? row.plan, period_label: PERIOD_LABEL[row.period] ?? row.period })), []);
  const packRows = useMemo(() => packs.map((row) => ({ ...row, unit_price: row.tokens ? row.price_xaf / row.tokens : null })), [packs]);
  const { sortedRows: sortedSubscriptions, sort: subscriptionSort, toggleSort: toggleSubscriptionSort } = useAdminTableSort(subscriptionRows, 'price', 'desc');
  const { sortedRows: sortedPacks, sort: packSort, toggleSort: togglePackSort } = useAdminTableSort(packRows, 'confirmed_sales', 'desc');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const { p_from, p_to } = adminDateRangeToRpc(dateFilter);
    supabase.rpc('admin_token_packages_with_sales', { p_from, p_to }).then(({ data, error: rpcError }) => {
      if (cancelled) return;
      if (rpcError) {
        setError(rpcError.message);
      } else {
        setPacks(data || []);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [dateFilter]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Abonnements</CardTitle>
          <CardDescription>
            Catalogue réel codé dans `lib/config.js` — le prix réellement encaissé passe par Chariow
            (commission 15 %/10 % selon palier, voir cartographie §6.1.1).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {[['Formule','plan_label','left'],['Période','period_label','left'],['Prix','price','right'],['Économie','savings','right'],['ID produit Chariow','id','left']].map(([label,key,align]) => <TableHead key={key} className={align === 'right' ? 'text-right' : ''}><SortableTableHeader label={label} sortKey={key} sort={subscriptionSort} onSort={toggleSubscriptionSort} align={align} /></TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSubscriptions.map((prod) => (
                <TableRow key={prod.id}>
                  <TableCell className="font-medium">{PLAN_LABEL[prod.plan] ?? prod.plan}</TableCell>
                  <TableCell>{PERIOD_LABEL[prod.period] ?? prod.period}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatXaf(prod.price)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {prod.savings > 0 ? `-${formatXaf(prod.savings)}` : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">{prod.id}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" /> Packs de tokens
            </CardTitle>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>
          <CardDescription>Catalogue réel + ventes confirmées sur la période · {dateFilter?.label || 'Total'}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <p className="px-6 py-4 text-sm text-destructive">Erreur de chargement : {error}</p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                {[['Pack','name','left'],['Tokens','tokens','right'],['Prix','price_xaf','right'],['FCFA / token','unit_price','right'],['Ventes confirmées','confirmed_sales','right'],['Statut','is_active','left']].map(([label,key,align]) => <TableHead key={key} className={align === 'right' ? 'text-right' : ''}><SortableTableHeader label={label} sortKey={key} sort={packSort} onSort={togglePackSort} align={align} /></TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPacks.map((pack) => (
                <TableRow key={pack.id}>
                  <TableCell className="font-medium flex items-center gap-1.5">
                    {pack.name}
                    {pack.is_popular && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{pack.tokens.toLocaleString('fr-FR')}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatXaf(pack.price_xaf)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {(pack.price_xaf / pack.tokens).toFixed(1)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{pack.confirmed_sales}</TableCell>
                  <TableCell>
                    <Badge variant={pack.is_active ? 'default' : 'secondary'}>
                      {pack.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && packs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    Aucun pack de tokens trouvé.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground px-1">
        Contrôle de cohérence à ajouter plus tard : prix frontend vs `token_packages` vs produit
        Chariow réel — voir cartographie §6.1. Le tableau abonnements utilise le catalogue déjà codé
        dans `lib/config.js` (pas une lecture Supabase, c'est la source réelle de vérité côté app).
      </p>
    </div>
  );
}
