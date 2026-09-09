import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Sun, Moon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import AdminOverviewTab from '@/pages/admin/AdminOverviewTab';
import AdminUsersTab from '@/pages/admin/AdminUsersTab';
import AdminAiCostsTab from '@/pages/admin/AdminAiCostsTab';
import AdminContentTab from '@/pages/admin/AdminContentTab';
import AdminPricingTab from '@/pages/admin/AdminPricingTab';
import AdminPromoTab from '@/pages/admin/AdminPromoTab';
import AdminMarketingTab from '@/pages/admin/AdminMarketingTab';
import AdminTechnicalTab from '@/pages/admin/AdminTechnicalTab';
import AdminGlobalDateFilter from '@/pages/admin/AdminGlobalDateFilter';
import AdminInfluencersTab from '@/pages/admin/AdminInfluencersTab';
import AdminTrackingTab from '@/pages/admin/AdminTrackingTab';
import AdminTokensTab from '@/pages/admin/AdminTokensTab';
import AdminFirstStoryToggle from '@/pages/admin/AdminFirstStoryToggle';
import AdminModelsTab from '@/pages/admin/AdminModelsTab';
import AdminGammesTab from '@/pages/admin/AdminGammesTab';

const TABS = [
  { value: 'overview', label: 'Tableau de bord' },
  { value: 'users', label: 'Utilisateurs' },
  { value: 'tokens', label: 'Tokens' },
  { value: 'content', label: 'Contenus' },
  { value: 'pricing', label: 'Tarification' },
  { value: 'promo', label: 'Promo' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'ai-costs', label: 'IA & coûts' },
  { value: 'ai-models', label: 'Modèles IA' },
  { value: 'ai-gammes', label: 'Gammes IA' },
  { value: 'technical', label: 'Technique' },
  { value: 'influencers', label: 'Influenceurs' },
  { value: 'tracking', label: 'Tracking' },
];

export default function AdminPage() {
  const [tab, setTab] = useState('overview');
  const [dateFilter, setDateFilter] = useState({ label: '7 derniers jours', preset: '7 derniers jours', range: undefined });
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Administration — Raconty</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Administration</h1>
            <p className="text-sm text-muted-foreground">Gérez votre plateforme Raconty</p>
          </div>
          <div className="flex items-center gap-3">
            <AdminFirstStoryToggle />
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Changer de thème"
              aria-label="Changer de thème clair/sombre"
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

          <TabsContent value="ai-costs" className="mt-6">
            <AdminAiCostsTab dateFilter={dateFilter} />
          </TabsContent>

          <TabsContent value="ai-models" className="mt-6">
            <AdminModelsTab />
          </TabsContent>

          <TabsContent value="ai-gammes" className="mt-6">
            <AdminGammesTab />
          </TabsContent>

          <TabsContent value="content" className="mt-6">
            <AdminContentTab dateFilter={dateFilter} />
          </TabsContent>

          <TabsContent value="pricing" className="mt-6">
            <AdminPricingTab dateFilter={dateFilter} />
          </TabsContent>

          <TabsContent value="promo" className="mt-6">
            <AdminPromoTab dateFilter={dateFilter} />
          </TabsContent>

          <TabsContent value="marketing" className="mt-6">
            <AdminMarketingTab dateFilter={dateFilter} />
          </TabsContent>

          <TabsContent value="technical" className="mt-6">
            <AdminTechnicalTab dateFilter={dateFilter} />
          </TabsContent>

          <TabsContent value="influencers" className="mt-6">
            <AdminInfluencersTab dateFilter={dateFilter} />
          </TabsContent>

          <TabsContent value="tracking" className="mt-6">
            <AdminTrackingTab dateFilter={dateFilter} />
          </TabsContent>

          {TABS.filter((t) => !['overview', 'users', 'tokens', 'ai-costs', 'ai-models', 'ai-gammes', 'content', 'pricing', 'promo', 'marketing', 'technical', 'influencers', 'tracking'].includes(t.value)).map((t) => (
            <TabsContent key={t.value} value={t.value} className="mt-6">
              <Card>
                <CardContent className="p-10 text-center text-muted-foreground">
                  Section « {t.label} » — à construire (données factices pour l'instant).
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
