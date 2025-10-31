import { DrizzleD1Database } from "drizzle-orm/d1";

export type ReconciliationParams = {
    db: DrizzleD1Database;
    email: string | null | undefined;
    intPhoneNumber: number | null | undefined;
};

export type ReconciliationResponse = {
    contact: {
        primaryContatctId: number;
        emails: string[];
        phoneNumbers: string[];
        secondaryContactIds: number[];
    };
};