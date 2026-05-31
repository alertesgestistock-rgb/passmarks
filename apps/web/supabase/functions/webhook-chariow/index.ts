import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const urlObj = new URL(req.url)

    // Sécurité : secret dans le header ou le query param
    const secretParam =
      req.headers.get('Authorization')?.replace('Bearer ', '') ||
      req.headers.get('x-chariow-secret') ||
      urlObj.searchParams.get('secret')
    const expectedSecret = Deno.env.get('WEBHOOK_SECRET')

    if (!expectedSecret || secretParam !== expectedSecret) {
      console.warn("Webhook rejeté : secret invalide ou manquant")
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    const payload = await req.json()
    console.log("Webhook event received:", payload?.event)
    console.log("FULL PAYLOAD:", JSON.stringify(payload))

    const event = payload.event
    const data = payload.sale || payload.data || {}
    const metadata = data.custom_metadata || {}

    if (event === 'successful.sale') {
      // 1. Extraire les metadata du checkout
      const userId     = metadata.userId
      const purchaseId = metadata.purchaseId
      const tokens     = Number(metadata.tokens)
      const packageName = metadata.packageName

      if (!userId || !tokens) {
        console.error("Webhook error: userId ou tokens manquant dans custom_metadata", metadata)
        return new Response(JSON.stringify({ error: "Missing metadata" }), { status: 400 })
      }

      // 2. Anti-doublon : ignorer si ce sale_id a déjà été traité
      const saleId = data.id || data.sale_id || null
      if (saleId) {
        const { data: existing } = await supabase
          .from('token_purchases')
          .select('id')
          .eq('chariow_sale_id', String(saleId))
          .maybeSingle()

        if (existing) {
          console.log(`Duplicate webhook ignoré pour sale_id: ${saleId}`)
          return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 })
        }
      }

      // 3. Confirmer l'achat en attente
      if (purchaseId) {
        await supabase
          .from('token_purchases')
          .update({
            status: 'confirmed',
            chariow_sale_id: saleId ? String(saleId) : null,
            confirmed_at: new Date().toISOString(),
          })
          .eq('id', purchaseId)
      } else {
        // Pas de pending record : insérer directement
        const { data: pkg } = await supabase
          .from('token_packages')
          .select('id, price_xaf')
          .eq('name', packageName)
          .maybeSingle()

        await supabase.from('token_purchases').insert({
          user_id: userId,
          package_id: pkg?.id || null,
          tokens_granted: tokens,
          amount_paid: pkg?.price_xaf || 0,
          payment_method: 'chariow',
          chariow_sale_id: saleId ? String(saleId) : null,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
      }

      // 4. Créditer les tokens atomiquement via RPC
      const { data: newBalance, error: creditError } = await supabase.rpc('credit_tokens', {
        p_user_id: userId,
        p_amount: tokens,
        p_purchase_id: purchaseId || null,
      })

      if (creditError) {
        console.error("Erreur credit_tokens:", creditError)
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
      }

      console.log(`✓ ${tokens} tokens crédités à ${userId}. Nouveau solde: ${newBalance}`)
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })

  } catch (error) {
    console.error("Webhook unexpected error:", error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 400 })
  }
})
