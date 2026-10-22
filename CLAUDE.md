@AGENTS.md

## Server Actions: revalidatePath vs redirect

**Rule:** Never call `redirect(X)` immediately after `revalidatePath(X)` when X is the same path the user is already on.

`revalidatePath` patches the RSC tree in place — the component rerenders without navigation. Adding `redirect` to the same path forces a second round-trip (navigation away + back), making mutations feel slow.

**Same-page mutation (inline form, toggle button):**
```ts
// correct — one round-trip, RSC tree updates in place
revalidatePath('/settings/cash-registers')
// no redirect
```

**Cross-page navigation (create → list, or need a query param for a toast):**
```ts
// correct — different destination, so redirect is intentional
revalidatePath('/appointments')
redirect('/appointments') // navigating FROM /appointments/new TO /appointments

// also correct — query param carries state (success banner)
revalidatePath('/settings/users')
redirect('/settings/users?success=invited')
```

Files already fixed: `work-orders/[id]/quotation/actions.ts`, `work-orders/[id]/actions.ts`, `settings/cash-registers/actions.ts`, `settings/payment-methods/actions.ts`, `settings/services/actions.ts`, `settings/taxes/actions.ts`, `billing/[id]/actions.ts`, `settings/integrations/actions.ts`, `appointments/actions.ts` (`updateAppointmentStatus`), `settings/users/actions.ts` (`revokeInvite`).
