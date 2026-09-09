import React from 'react';
import { useUser } from '@/contexts/UserContext.jsx';
import AdminStepUpGate from '@/components/AdminStepUpGate';

// Garde d'accès pour les routes admin.
//
// Le contrôle "est-ce un admin ?" ne se fait plus côté frontend (ancienne
// allowlist locale, voir lib/adminAccess.js — conservée dans le repo comme
// trace historique mais plus utilisée ici) : il se fait maintenant côté
// SERVEUR, à l'intérieur d'AdminStepUpGate, via la fonction is_admin(uuid)
// qui lit profiles.role (réel en base depuis le 2026-08-08).
//
// AdminStepUpGate gère donc tout le flux à lui seul : email + mot de passe
// → vérification du rôle admin en base → code de confirmation envoyé par
// email → accès. Rien de tout ça (ni le chunk JS d'AdminPage) n'est chargé
// avant que les trois étapes soient passées.
export default function AdminRoute({ children }) {
  const { isLoading: loading } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <AdminStepUpGate>{children}</AdminStepUpGate>;
}
