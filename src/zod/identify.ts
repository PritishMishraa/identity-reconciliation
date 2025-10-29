import { z } from 'zod';

export const identifyRequestZodSchema = z.object({
    email: z.email().optional(),
    phoneNumber: z.number().optional()
}).refine(
    (data) => data.email !== undefined || data.phoneNumber !== undefined,
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