import { prisma } from "@/lib/db";

// Single source of the current tenant (agency) context.
//
// For the pilot there is one agency and no login yet, so we resolve the pilot
// agency here. When auth is added, ONLY this function changes — every query in
// the app already scopes by the agencyId it returns, so tenant isolation is
// enforced from day one and does not need retrofitting.
export const PILOT_AGENCY_ID = "pilot-agency";

export async function getCurrentAgencyId(): Promise<string> {
  // Ensure the pilot agency exists (covers first run before seed).
  await prisma.agency.upsert({
    where: { id: PILOT_AGENCY_ID },
    update: {},
    create: { id: PILOT_AGENCY_ID, name: "Pilot Agency" },
  });
  return PILOT_AGENCY_ID;
}
