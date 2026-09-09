import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Sun, Moon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import AdminOverviewTab from '@/pages/admin/AdminOverviewTab';
import AdminUsersTab from '@/pages/admin/AdminUsersTab';
import AdminTokensTab from '@/pages/admin/AdminTokensTab';
import AdminContentTab from '@/pages/admin/AdminContentTab';
import AdminMarketingTab from '@/pages/admin/AdminMarketingTab';
import AdminReferralsTab from '@/pages/admin/AdminReferralsTab';
import AdminBroadcastTab from '@/pages/admin/AdminBroadcastTab';
import AdminGlobalDateFilter from '@/pages/admin/AdminGlobalDateFilter';

// AdminFirstStoryToggle / AdminModelsTab / AdminGammesTab / AdminPricingTab
// removed earlier: Raconty-only video/story "model gammes" and subscription
// catalog, no equivalent in PassMark's schema.
//
// AdminAiCostsTab / AdminTechnicalTab / AdminInfluencersTab / AdminTrackingTab
// / AdminPromoTab removed 2026-09-10: every one of them only calls Raconty
// RPCs/tables (video & image "economics", admin_operational_snapshots,
// influencer program, First Story funnel, promo codes) that don't exist in
// PassMark and have no PassMark equivalent to build yet. Overview, Users,
// Tokens, Content and Marketing were rewritten against PassMark's real schema
// instead — see supabase/migrations/20260910120000_016_admin_dashboard_rpcs.sql.
// Referral-program reporting (the one part of "Promo" PassMark actually has)
// now lives inside AdminMarketingTab.

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'users', label: 'Users' },
  { value: 'tokens', label: 'Tokens' },
  { value: 'content', label: 'Content' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'referrals', label: 'Referrals' },
  { value: 'broadcast', label: 'Broadcast' },
];

export default function AdminPage() {
  const [tab, setTab] = useState('overview');
  const [dateFilter, setDateFilter] = useState({ label: 'Last 7 days', preset: 'Last 7 days', range: undefined });
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Administration — PassMark</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Administration</h1>
            <p className="text-sm text-muted-foreground">Manage the PassMark platform</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle theme"
              aria-label="Toggle light/dark theme"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <Badge variant="outline" className="text-primary border-primary/30">Admin</Badge>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
            ))}
          </TabsList>

          <AdminGlobalDateFilter value={dateFilter} onChange={setDateFilter} />

          <TabsContent value="overview" className="space-y-6 mt-6">
            <AdminOverviewTab dateFilter={dateFilter} />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <AdminUsersTab dateFilter={dateFilter} />
          </TabsContent>

          <TabsContent value="tokens" className="mt-6">
            <AdminTokensTab dateFilter={dateFilter} />
          </TabsContent>

          <TabsContent value="content" className="mt-6">
            <AdminContentTab dateFilter={dateFilter} />
          </TabsContent>

          <TabsContent value="marketing" className="mt-6">
            <AdminMarketingTab dateFilter={dateFilter} />
          </TabsContent>

          <TabsContent value="referrals" className="mt-6">
            <AdminReferralsTab dateFilter={dateFilter} />
          </TabsContent>

          <TabsContent value="broadcast" className="mt-6">
            <AdminBroadcastTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
