import type { PrismaClient } from "@prisma/client";

// Returning-user verification (verify-by-challenge).
//
// Principle: the AI reveals NOTHING about an existing lead until the person
// proves who they are. Multi-factor from day one: they must produce their name
// AND at least one corroborating prior detail (phone, email, or a property/area
// they previously discussed). Two failed attempts -> stop challenging, treat as
// a fresh inquiry, and flag the record for agent cleanup. Failures are logged
// on the record via failedVerifications; the AI stays neutral on failure.

export type VerifyOutcome =
  | { status: "no_match" }
  | { status: "verified"; personId: string }
  | { status: "challenge"; personId: string }
  | { status: "failed_open"; personId: string }; // exhausted attempts -> treat as fresh

type Claim = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  detail?: string | null; // a prior area/property/budget they claim to have discussed
};

const norm = (v?: string | null) =>
  (v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Find a candidate existing lead by a strong identifier (phone or email),
// excluding the current conversation's own record.
export async function findReturningCandidate(
  prisma: PrismaClient,
  agencyId: string,
  conversationId: string,
  claim: Claim
): Promise<{ id: string } | null> {
  const phone = norm(claim.phone);
  const email = norm(claim.email);
  if (!phone && !email) return null;

  const people = await prisma.person.findMany({
    where: { agencyId, NOT: { conversationId } },
    take: 500,
  });

  for (const p of people) {
    if (phone && norm(p.phone) && norm(p.phone) === phone) return { id: p.id };
    if (email && norm(p.email) && norm(p.email) === email) return { id: p.id };
  }
  return null;
}

// Given a candidate and the person's claimed identity, decide the outcome.
// Verification requires name match AND one corroborating detail.
export async function verifyClaim(
  prisma: PrismaClient,
  candidateId: string,
  claim: Claim
): Promise<VerifyOutcome> {
  const person = await prisma.person.findUnique({ where: { id: candidateId } });
  if (!person) return { status: "no_match" };

  const nameOk =
    !!norm(claim.name) &&
    !!norm(person.name) &&
    norm(person.name).includes(norm(claim.name).slice(0, Math.max(3, norm(claim.name).length - 1)));

  // Corroborating detail: matches a prior area, property type, budget, or a
  // strong identifier they didn't lead with.
  const detail = norm(claim.detail);
  const detailOk =
    !!detail &&
    [person.location, person.propertyType, person.budget]
      .map(norm)
      .some((v) => v && (v.includes(detail) || detail.includes(v)));

  if (nameOk && (detailOk || claim.phone || claim.email)) {
    await prisma.person.update({
      where: { id: person.id },
      data: { verificationState: "VERIFIED" },
    });
    return { status: "verified", personId: person.id };
  }

  // Failed attempt.
  const failed = (person.failedVerifications ?? 0) + 1;
  if (failed >= 2) {
    await prisma.person.update({
      where: { id: person.id },
      data: { failedVerifications: failed, verificationState: "FLAGGED" },
    });
    return { status: "failed_open", personId: person.id };
  }

  await prisma.person.update({
    where: { id: person.id },
    data: { failedVerifications: failed },
  });
  return { status: "challenge", personId: person.id };
}
