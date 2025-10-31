import { DrizzleD1Database } from "drizzle-orm/d1";
import { contacts, Contact } from "@/db/schema";
import { and, isNull, or, eq, inArray, asc } from "drizzle-orm";
import { ReconciliationResponse } from "../reconciliation.d";

/**
 * Find all contacts matching email or phone (excluding deleted)
 * This uses a single query with OR clause for optimal performance
 */
async function findMatchingContacts(
    db: DrizzleD1Database,
    email: string | null | undefined,
    phoneNumber: string | null | undefined
): Promise<Contact[]> {
    return db
        .select()
        .from(contacts)
        .where(
            and(
                isNull(contacts.deletedAt),
                or(
                    email ? eq(contacts.email, email) : undefined,
                    phoneNumber ? eq(contacts.phoneNumber, phoneNumber) : undefined
                )
            )
        )
        .all();
}

/**
 * Fetch entire chain for a given primary ID
 * Gets primary + all secondaries in one query
 */
async function fetchChain(
    db: DrizzleD1Database,
    primaryId: number
): Promise<Contact[]> {
    return db
        .select()
        .from(contacts)
        .where(
            and(
                isNull(contacts.deletedAt),
                or(
                    eq(contacts.id, primaryId),
                    eq(contacts.linkedId, primaryId)
                )
            )
        )
        .orderBy(asc(contacts.createdAt))
        .all();
}

/**
 * Check if the input contains new information not in existing contacts
 */
function hasNewInformation(
    matches: Contact[],
    email: string | null | undefined,
    phoneNumber: string | null | undefined
): boolean {
    if (email && !matches.some(c => c.email === email)) {
        return true;
    }
    if (phoneNumber && !matches.some(c => c.phoneNumber === phoneNumber)) {
        return true;
    }
    return false;
}

/**
 * Build response from a list of contacts (primary + secondaries)
 */
function buildResponse(allContacts: Contact[]): ReconciliationResponse {
    const primary = allContacts.find(c => c.linkPrecedence === 'primary');
    const secondaries = allContacts.filter(c => c.linkPrecedence === 'secondary');

    if (!primary) {
        throw new Error('No primary contact found in chain');
    }

    // Collect all emails and phone numbers
    const emails = allContacts
        .map(c => c.email)
        .filter((e): e is string => Boolean(e));

    const phoneNumbers = allContacts
        .map(c => c.phoneNumber)
        .filter((p): p is string => Boolean(p));

    // Ensure primary's info comes first, then deduplicate
    const orderedEmails: string[] = [];
    const orderedPhones: string[] = [];

    if (primary.email) orderedEmails.push(primary.email);
    if (primary.phoneNumber) orderedPhones.push(primary.phoneNumber);

    // Add remaining unique values
    for (const email of emails) {
        if (!orderedEmails.includes(email)) {
            orderedEmails.push(email);
        }
    }
    for (const phone of phoneNumbers) {
        if (!orderedPhones.includes(phone)) {
            orderedPhones.push(phone);
        }
    }

    return {
        contact: {
            primaryContatctId: primary.id,
            emails: orderedEmails,
            phoneNumbers: orderedPhones,
            secondaryContactIds: secondaries
                .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
                .map(s => s.id)
        }
    };
}

/**
 * Merge multiple primary chains into one
 * Keeps the oldest primary and converts others to secondary
 */
async function mergeChains(
    db: DrizzleD1Database,
    primaryIds: Set<number>,
    email: string | null | undefined,
    phoneNumber: string | null | undefined
): Promise<ReconciliationResponse> {
    // Find the oldest primary
    const [oldestPrimary] = await db
        .select()
        .from(contacts)
        .where(
            and(
                isNull(contacts.deletedAt),
                inArray(contacts.id, Array.from(primaryIds))
            )
        )
        .orderBy(asc(contacts.createdAt))
        .limit(1);

    if (!oldestPrimary) {
        throw new Error('No primary contact found during merge');
    }

    const otherPrimaryIds = Array.from(primaryIds).filter(id => id !== oldestPrimary.id);

    // Use batch operations for merge
    if (otherPrimaryIds.length > 0) {
        await db.batch([
            // Convert other primaries to secondary
            db.update(contacts)
                .set({
                    linkedId: oldestPrimary.id,
                    linkPrecedence: 'secondary',
                    updatedAt: new Date()
                })
                .where(
                    and(
                        inArray(contacts.id, otherPrimaryIds),
                        eq(contacts.linkPrecedence, 'primary')
                    )
                ),
            // Update children of other primaries to point to oldest
            db.update(contacts)
                .set({
                    linkedId: oldestPrimary.id,
                    updatedAt: new Date()
                })
                .where(inArray(contacts.linkedId, otherPrimaryIds))
        ]);
    }

    // Check if we need to create a new contact with the combination
    const allChainContacts = await fetchChain(db, oldestPrimary.id);

    if (hasNewInformation(allChainContacts, email, phoneNumber)) {
        const [newContact] = await db
            .insert(contacts)
            .values({
                email: email || null,
                phoneNumber: phoneNumber || null,
                linkPrecedence: 'secondary',
                linkedId: oldestPrimary.id
            })
            .returning();

        allChainContacts.push(newContact);
    }

    return buildResponse(allChainContacts);
}

export {
    findMatchingContacts,
    fetchChain,
    hasNewInformation,
    buildResponse,
    mergeChains
};