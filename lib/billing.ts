export type BillablePlan = {
  price_per_user:         number | null
  min_monthly:            number | null
  price_per_extra_branch: number | null
}

export type BillingBreakdown = {
  users:          number
  branches:       number
  rawLicense:     number
  licenseTotal:   number
  extraBranches:  number
  branchTotal:    number
  total:          number
  minApplied:     boolean
}

export function calculateMonthly(
  plan: BillablePlan,
  users: number,
  branches: number
): BillingBreakdown {
  const pricePerUser = plan.price_per_user ?? 0
  const minMonthly   = plan.min_monthly ?? 0
  const perBranch    = plan.price_per_extra_branch ?? 0

  const rawLicense   = users * pricePerUser
  const licenseTotal = Math.max(rawLicense, minMonthly)
  const minApplied   = minMonthly > 0 && rawLicense < minMonthly

  const extraBranches = Math.max(0, branches - 1)
  const branchTotal   = extraBranches * perBranch

  return {
    users,
    branches,
    rawLicense,
    licenseTotal,
    extraBranches,
    branchTotal,
    total: licenseTotal + branchTotal,
    minApplied,
  }
}

export function formatUSD(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount)
}

export function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount)
}
