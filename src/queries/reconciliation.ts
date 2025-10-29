import { contacts } from "@/db/schema";
import { DrizzleD1Database } from "drizzle-orm/d1";
import { eq, or } from "drizzle-orm";

type ReconciliationParams = {
    db: DrizzleD1Database;
    email: string | undefined;
    phoneNumber: number | undefined;
};

export const reconcilation = async ({ db, email, phoneNumber }: ReconciliationParams) => {

    // Phase 1: Check if email or phoneNumber exists in the database
    const existingContacts = await db
        .select()
        .from(contacts)
        .where(
            or(
                email ? eq(contacts.email, email) : undefined,
                phoneNumber ? eq(contacts.phoneNumber, phoneNumber.toString()) : undefined
            )
        )
        .all();

    // If no existing contacts found, create a new primary contact
    if (existingContacts.length === 0) {
        const [newContact] = await db
            .insert(contacts)
            .values({
                email: email || null,
                phoneNumber: phoneNumber ? phoneNumber.toString() : null,
                linkPrecedence: 'primary',
                linkedId: null
            })
            .returning();

        const result = {
            contact: {
                primaryContatctId: newContact.id,
                emails: email ? [email] : [],
                phoneNumbers: phoneNumber ? [phoneNumber.toString()] : [],
                secondaryContactIds: []
            }
        };

        return result;
    }


    // Placeholder for future phases
    const result = {
        contact: {
            primaryContatctId: 1,
            emails: email ? [email] : [],
            phoneNumbers: phoneNumber ? [phoneNumber.toString()] : [],
            secondaryContactIds: []
        }
    };

    return result;
};

