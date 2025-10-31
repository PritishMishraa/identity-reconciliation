import { z } from 'zod';

export const identifyRequestZodSchema = z.object({
    email: z.email().nullable(),
    phoneNumber: z.number().nullable()
}).refine(
    (data) => data.email !== null || data.phoneNumber !== null,
    { message: "At least one of email or phoneNumber must be provided" }
);

export const identifyResponseZodSchema = z.object({
    contact: z.object({
        primaryContatctId: z.number(),
        emails: z.array(z.string()),
        phoneNumbers: z.array(z.string()),
        secondaryContactIds: z.array(z.number())
    })
});