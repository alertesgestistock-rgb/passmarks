// Maps token_packages.name → Chariow product ID
// Prices and tokens come from the DB (token_packages table)
export const CHARIOW_PRODUCT_IDS: Record<string, string> = {
  'Mini':      'prd_gtb491ym',
  'Starter':   'prd_bshwvbhv',
  'Standard':  'prd_ms38i0pm',
  'Intensif':  'prd_if0k9j9i',
  'Exam Mode': 'prd_iqi1c2o5',
}

export const COUNTRY_MAP: Record<string, string> = {
  '+237': 'CM', '237': 'CM',
  '+225': 'CI', '225': 'CI',
  '+221': 'SN', '221': 'SN',
  '+241': 'GA', '241': 'GA',
  '+242': 'CG', '242': 'CG',
  '+243': 'CD', '243': 'CD',
  '+233': 'GH', '233': 'GH',
  '+234': 'NG', '234': 'NG',
  '+33':  'FR', '33':  'FR',
  '+1':   'US', '1':   'US',
}
