import { contacts } from "@/db/schema";
import { ReconciliationParams, ReconciliationResponse } from "@/queries/reconciliation.d";
import { findMatchingContacts, fetchChain, hasNewInformation, buildResponse, mergeChains } from "@/queries/helpers";


/**
 * Reconciliation function
 * An optimized algorithm that takes at most 3 queries to resolve the reconciliation
 */
export const reconcilation = async ({
    db,
    email,
    intPhoneNumber
}: ReconciliationParams): Promise<ReconciliationResponse> => {
    // Step 0: Convert phoneNumber to string
    const phoneNumber = intPhoneNumber ? intPhoneNumber.toString() : undefined;

    // Step 1: Find ALL potentially related contacts (1 query)
    const matches = await findMatchingContacts(db, email, phoneNumber);

    // Step 2a: No matches - create new primary contact
    if (matches.length === 0) {
        const [newContact] = await db
            .insert(contacts)
            .values({
                email: email || null,
                phoneNumber: phoneNumber || null,
                linkPrecedence: 'primary',
                linkedId: null
            })
            .returning();

        return {
            contact: {
                primaryContatctId: newContact.id,
                emails: email ? [email] : [],
                phoneNumbers: phoneNumber ? [phoneNumber] : [],
                secondaryContactIds: []
            }
        };
    }

    // Step 2b: Resolve to primary contacts (in-memory operation)
    const primaryIds = new Set<number>();
    for (const match of matches) {
        primaryIds.add(match.linkedId ?? match.id);
    }

    // Step 3a: Single chain - check if new info needed
    if (primaryIds.size === 1) {
        const primaryId = Array.from(primaryIds)[0];
        const allChainContacts = await fetchChain(db, primaryId);

        if (hasNewInformation(allChainContacts, email, phoneNumber)) {
            const [newContact] = await db
                .insert(contacts)
                .values({
                    email: email || null,
                    phoneNumber: phoneNumber || null,
                    linkPrecedence: 'secondary',
                    linkedId: primaryId
                })
                .returning();

            allChainContacts.push(newContact);
        }

        return buildResponse(allChainContacts);
    }

    // Step 3b: Multiple chains - need to merge
    return mergeChains(db, primaryIds, email, phoneNumber);
};
