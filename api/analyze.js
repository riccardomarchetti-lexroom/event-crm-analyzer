// Vercel Serverless Function — POST /api/analyze
// Receives a list of emails, looks them up in HubSpot CRM, returns enriched contact data.

const HUBSPOT_BASE = "https://api.hubspot.com/crm/v3";

const CONTACT_PROPERTIES = [
  "email",
  "firstname",
  "lastname",
  "hs_lead_status",
  "num_associated_deals",
  "hubspot_owner_id",
  "inbound___outbound",
  "num_contacted_notes",
  "aircall_last_call_at",
  "lastmodifieddate",
];

// In-memory owner cache — lives for the duration of the function invocation.
// Avoids redundant API calls when multiple contacts share an owner.
const ownerCache = {};

/**
 * Pause execution for `ms` milliseconds.
 * Used between search batches to stay comfortably within HubSpot rate limits.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build the Authorization header from the env var.
 * Throws early (before any network call) if the key is missing.
 */
function authHeader() {
  const key = process.env.HUBSPOT_API_KEY;
  if (!key) throw new Error("HUBSPOT_API_KEY env var is not set");
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

/**
 * Parse a HubSpot timestamp (ms since epoch or ISO string) into YYYY-MM-DD.
 * Returns null if the value is falsy or unparseable.
 */
function parseDate(value) {
  if (!value) return null;
  const d = new Date(typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // "2026-06-15"
}

/**
 * Resolve a HubSpot owner ID to a human-readable full name.
 * Results are cached in `ownerCache` for the lifetime of this invocation.
 */
async function resolveOwner(ownerId) {
  if (!ownerId) return null;
  if (ownerCache[ownerId]) return ownerCache[ownerId];

  const res = await fetch(`${HUBSPOT_BASE}/owners/${ownerId}`, {
    headers: authHeader(),
  });

  if (!res.ok) {
    // Non-fatal: we just won't have a name for this owner.
    console.warn(`[analyze] Failed to fetch owner ${ownerId}: ${res.status}`);
    return null;
  }

  const data = await res.json();
  const name = [data.firstName, data.lastName].filter(Boolean).join(" ") || null;
  ownerCache[ownerId] = name;
  return name;
}

/**
 * Fetch all deal IDs associated with a given contact ID,
 * then batch-read full deal details in a single call.
 *
 * Returns an array of deal objects shaped for our output schema.
 */
async function fetchDealsForContact(contactId) {
  const headers = authHeader();

  // Step A: get the list of associated deal IDs
  const assocRes = await fetch(
    `${HUBSPOT_BASE}/objects/contacts/${contactId}/associations/deals`,
    { headers }
  );

  if (!assocRes.ok) {
    console.warn(`[analyze] Association fetch failed for contact ${contactId}: ${assocRes.status}`);
    return [];
  }

  const assocData = await assocRes.json();
  const dealIds = (assocData.results || []).map((r) => r.toObjectId);

  if (dealIds.length === 0) return [];

  // Step B: batch-read deal properties
  const batchRes = await fetch(`${HUBSPOT_BASE}/objects/deals/batch/read`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      inputs: dealIds.map((id) => ({ id })),
      properties: ["dealname", "dealstage", "pipeline", "amount", "closedate"],
    }),
  });

  if (!batchRes.ok) {
    console.warn(`[analyze] Deal batch/read failed for contact ${contactId}: ${batchRes.status}`);
    return [];
  }

  const batchData = await batchRes.json();
  return (batchData.results || []).map((deal) => ({
    id: deal.id,
    name: deal.properties?.dealname ?? null,
    stage: deal.properties?.dealstage ?? null,
    pipeline: deal.properties?.pipeline ?? null,
    amount: deal.properties?.amount ?? null,
    closedate: parseDate(deal.properties?.closedate),
  }));
}

/**
 * Search HubSpot for a batch of up to 50 emails using the Contacts Search API.
 * Returns the raw HubSpot results array.
 */
async function searchBatch(emails) {
  const res = await fetch(`${HUBSPOT_BASE}/objects/contacts/search`, {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "email",
              operator: "IN",
              values: emails,
            },
          ],
        },
      ],
      properties: CONTACT_PROPERTIES,
      limit: 100,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot search returned ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.results || [];
}

/**
 * Main Vercel handler.
 *
 * Expects:  POST /api/analyze
 * Body:     { emails: string[], names?: Record<string, string> }
 * Returns:  { contacts: Contact[], not_found: string[], errors?: string[] }
 */
export default async function handler(req, res) {
  // CORS headers — required for requests from the Vite dev server and Vercel preview URLs.
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { emails = [] } = req.body || {};

  if (!Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({ error: "emails must be a non-empty array" });
  }

  // Normalise to lowercase to match HubSpot's internal storage
  const normalisedEmails = emails.map((e) => e.toLowerCase().trim());

  // Track which emails were actually found in HubSpot
  const foundEmails = new Set();
  const contacts = [];
  const errors = [];

  // Split into batches of 50 (HubSpot IN filter limit)
  const BATCH_SIZE = 50;
  for (let i = 0; i < normalisedEmails.length; i += BATCH_SIZE) {
    const batch = normalisedEmails.slice(i, i + BATCH_SIZE);

    try {
      const results = await searchBatch(batch);

      // For contacts that have deals, fetch deal details concurrently within this batch.
      // We do NOT await them one-by-one (that would be a synchronous cascade).
      const enrichmentPromises = results.map(async (contact) => {
        const props = contact.properties || {};
        const email = (props.email || "").toLowerCase();
        foundEmails.add(email);

        const numDeals = parseInt(props.num_associated_deals || "0", 10);

        // Resolve owner name and deal list in parallel — both are independent I/O calls.
        const [ownerName, deals] = await Promise.all([
          resolveOwner(props.hubspot_owner_id),
          numDeals > 0 ? fetchDealsForContact(contact.id) : Promise.resolve([]),
        ]);

        return {
          email,
          in_crm: true,
          hs_id: contact.id,
          firstname: props.firstname ?? null,
          lastname: props.lastname ?? null,
          lead_status: props.hs_lead_status ?? null,
          num_deals: numDeals,
          owner_name: ownerName,
          // "channel" maps to the inbound___outbound custom property
          channel: props.inbound___outbound ?? null,
          // "num_contacts" maps to num_contacted_notes (HubSpot activity count)
          num_contacts: props.num_contacted_notes ? parseInt(props.num_contacted_notes, 10) : 0,
          last_call: parseDate(props.aircall_last_call_at),
          last_modified: parseDate(props.lastmodifieddate),
          deals,
        };
      });

      // Wait for all contacts in this batch to be fully enriched before moving on
      const enriched = await Promise.all(enrichmentPromises);
      contacts.push(...enriched);
    } catch (err) {
      // A batch failure is non-fatal — we log it and continue with the remaining batches.
      const msg = `Batch ${i / BATCH_SIZE + 1} failed: ${err.message}`;
      console.warn(`[analyze] ${msg}`);
      errors.push(msg);
    }

    // Rate-limit guard: wait 150 ms before firing the next search batch
    if (i + BATCH_SIZE < normalisedEmails.length) {
      await sleep(150);
    }
  }

  // Emails that were submitted but returned no HubSpot contact
  const not_found = normalisedEmails.filter((e) => !foundEmails.has(e));

  return res.status(200).json({ contacts, not_found, errors });
}
