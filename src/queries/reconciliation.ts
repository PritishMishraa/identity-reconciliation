import { contacts } from "@/db/schema";
import { DrizzleD1Database } from "drizzle-orm/d1";

type ReconciliationParams = {
    db: DrizzleD1Database;
    email: string | undefined;
    phoneNumber: number | undefined;
};

export const reconcilation = async ({ db, email, phoneNumber }: ReconciliationParams) => {

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

