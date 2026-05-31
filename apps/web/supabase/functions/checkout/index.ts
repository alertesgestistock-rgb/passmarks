import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getCorsHeaders } from "./cors.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { CHARIOW_PRODUCT_IDS, COUNTRY_MAP } from "./tokenConfig.ts"

serve(async (req) => {
  const dynamicCors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: dynamicCors })

  try {
    // 1. Vérifier le JWT envoyé par le navigateur
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const token = authHeader.replace('Bearer ', '')
    const supabaseCheck = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { data: { user }, error: authError } = await supabaseCheck.auth.getUser(token)
    if (authError || !user) throw new Error('Unauthorized')

    const secureUserId = user.id

    const { packageId, customerPhone, customerCountry, userId } = await req.json()

    // Vérification anti-usurpation
    if (userId !== secureUserId) {
      throw new Error('Tentative de fraude détectée : usurpation d\'identité')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 🔒 Trouver le package directement en BDD (prix et tokens viennent de la DB)
    const { data: pkg, error: pkgError } = await supabase
      .from('token_packages')
      .select('id, name, tokens, price_xaf')
      .eq('id', packageId)
      .eq('is_active', true)
      .single()

    if (pkgError || !pkg) {
      return new Response(JSON.stringify({ success: false, error: "Package invalide." }), {
        headers: { ...dynamicCors, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Trouver l'ID Chariow correspondant au package
    const chariowProductId = CHARIOW_PRODUCT_IDS[pkg.name]
    if (!chariowProductId) {
      return new Response(JSON.stringify({ success: false, error: "Produit Chariow non configuré." }), {
        headers: { ...dynamicCors, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    // Rate limiting — max 5 checkouts par minute par utilisateur
    const since = new Date(Date.now() - 60_000).toISOString()
    const { count } = await supabase
      .from('token_purchases')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', secureUserId)
      .gte('created_at', since)

    if ((count ?? 0) >= 5) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        headers: { ...dynamicCors, 'Content-Type': 'application/json' },
        status: 429
      })
    }

    // Récupérer le nom depuis le profil
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', secureUserId)
      .maybeSingle()

    const parts = (profile?.name || '').trim().split(' ')
    const firstName = parts[0] || 'Eleve'
    const lastName = parts.slice(1).join(' ') || 'PassMark'

    const isoCountry = COUNTRY_MAP[customerCountry] || COUNTRY_MAP[`+${customerCountry}`] || 'CM'
    const cleanPhone = (customerPhone || '').replace(/\D/g, '').replace(/^(237|225|221|241|242|243|233|234|33|1)/, '')

    // Enregistrer l'achat en attente
    const { data: purchase } = await supabase
      .from('token_purchases')
      .insert({
        user_id: secureUserId,
        package_id: pkg.id,
        tokens_granted: pkg.tokens,
        amount_paid: pkg.price_xaf,
        payment_method: 'chariow',
        status: 'pending',
      })
      .select()
      .single()

    const CHARIOW_API_KEY = Deno.env.get('CHARIOW_API_KEY')
    const APP_URL = Deno.env.get('APP_URL') || 'https://passmarks.vercel.app'

    const body = {
      product_id: chariowProductId,
      email: user.email,
      first_name: firstName,
      last_name: lastName,
      phone: {
        number: cleanPhone,
        country_code: isoCountry,
      },
      // 🔒 Injection sécurisée côté serveur
      custom_metadata: {
        userId: secureUserId,
        purchaseId: purchase?.id,
        tokens: pkg.tokens,
        packageName: pkg.name,
      },
      redirect_url: `${APP_URL}?payment=success`,
    }

    const response = await fetch('https://api.chariow.com/v1/checkout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CHARIOW_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    console.log('Chariow raw response:', JSON.stringify(data))

    if (!response.ok) {
      return new Response(JSON.stringify({ success: false, error: data.message || 'Chariow API Error' }), {
        headers: { ...dynamicCors, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const checkoutUrl = data.data?.payment?.checkout_url || data.checkout_url || data.url

    return new Response(JSON.stringify({
      success: true,
      checkout_url: checkoutUrl,
    }), {
      headers: { ...dynamicCors, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...dynamicCors, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
