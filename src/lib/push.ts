import webpush from "web-push";

/* Web Push over VAPID.
 *
 * Requires three env vars. Without them push is silently inert rather than
 * throwing: a missing key must never take the app down, it just means nobody
 * gets a notification.
 *
 *   VAPID_PUBLIC_KEY   also exposed to the browser via /api/push/key
 *   VAPID_PRIVATE_KEY
 *   VAPID_SUBJECT      mailto: or https: contact, required by the spec
 *
 * Generate a pair with:  npx web-push generate-vapid-keys
 */

const PUBLIC = process.env.VAPID_PUBLIC_KEY ?? "";
const PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:hello@morris.is";

let ready = false;
if (PUBLIC && PRIVATE) {
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
  ready = true;
}

export const pushEnabled = () => ready;
export const publicKey = () => PUBLIC;

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

type Target = { id: string; endpoint: string; p256dh: string; auth: string };

/* Sends to every supplied subscription. Dead endpoints (404/410) are pruned,
 * because a stale endpoint retried forever is how you get rate limited by the
 * push service. Returns what happened; callers log it and move on. */
export async function sendPush(targets: Target[], payload: PushPayload) {
  if (!ready || targets.length === 0) return { sent: 0, pruned: 0, failed: 0 };

  const { prisma } = await import("@/lib/db");
  const body = JSON.stringify(payload);
  let sent = 0;
  let pruned = 0;
  let failed = 0;

  await Promise.all(
    targets.map(async (t) => {
      try {
        await webpush.sendNotification(
          { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
          body,
          { TTL: 60 * 60 * 6, urgency: "high" },
        );
        sent++;
        await prisma.pushSubscription
          .update({ where: { id: t.id }, data: { lastUsedAt: new Date() } })
          .catch(() => undefined);
      } catch (err: unknown) {
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          pruned++;
          await prisma.pushSubscription.delete({ where: { id: t.id } }).catch(() => undefined);
        } else {
          failed++;
          console.error("[push] send failed", code ?? err);
        }
      }
    }),
  );

  return { sent, pruned, failed };
}

/* Convenience: everyone in the agency. Push is agency-wide by design, since
 * the pilot is a single small team and a hot lead is the whole desk's problem. */
export async function pushToAgency(agencyId: string, payload: PushPayload) {
  if (!ready) return { sent: 0, pruned: 0, failed: 0 };
  const { prisma } = await import("@/lib/db");
  const subs = await prisma.pushSubscription.findMany({
    where: { agencyId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  return sendPush(subs as Target[], payload);
}
