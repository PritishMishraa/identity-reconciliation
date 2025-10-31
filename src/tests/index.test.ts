import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import app from "../index";
import { contacts } from "../db/schema";
import { applyMigrations } from "./utils";

declare module "cloudflare:test" {
    interface ProvidedEnv {
        DB: D1Database;
    }
}

type IdentifyResponse = {
    contact: {
        primaryContatctId: number;
        emails: string[];
        phoneNumbers: string[];
        secondaryContactIds: number[];
    };
};

describe("Identity Reconciliation - /identify endpoint", () => {
    beforeAll(async () => {
        await applyMigrations(env.DB);
    });

    beforeEach(async () => {
        const db = drizzle(env.DB);
        await db.delete(contacts);
    });

    describe("Basic Functionality", () => {
        it("should create a new primary contact when no existing contacts", async () => {
            const response = await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "doc@hillvalley.edu",
                        phoneNumber: 123456,
                    }),
                },
                env
            );

            const data = await response.json() as IdentifyResponse;

            expect(response.status).toBe(200);
            expect(data.contact.primaryContatctId).toBeDefined();
            expect(data.contact.emails).toEqual(["doc@hillvalley.edu"]);
            expect(data.contact.phoneNumbers).toEqual(["123456"]);
            expect(data.contact.secondaryContactIds).toEqual([]);
        });

        it("should create primary contact with only email", async () => {
            const response = await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "doc@hillvalley.edu",
                        phoneNumber: null,
                    }),
                },
                env
            );

            const data = await response.json() as IdentifyResponse;
            expect(data.contact.emails).toEqual(["doc@hillvalley.edu"]);
            expect(data.contact.phoneNumbers).toEqual([]);
        });

        it("should create primary contact with only phone", async () => {
            const response = await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: null,
                        phoneNumber: 123456,
                    }),
                },
                env
            );

            const data = await response.json() as IdentifyResponse;
            expect(data.contact.emails).toEqual([]);
            expect(data.contact.phoneNumbers).toEqual(["123456"]);
        });
    });

    describe("Secondary Contact Creation", () => {
        it("should create secondary contact when new email with existing phone", async () => {
            // First request - creates primary
            await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "lorraine@hillvalley.edu",
                        phoneNumber: 123456,
                    }),
                },
                env
            );

            // Second request - creates secondary
            const response = await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "mcfly@hillvalley.edu",
                        phoneNumber: 123456,
                    }),
                },
                env
            );

            const data = await response.json() as IdentifyResponse;
            expect(data.contact.emails).toContain("lorraine@hillvalley.edu");
            expect(data.contact.emails).toContain("mcfly@hillvalley.edu");
            expect(data.contact.phoneNumbers).toEqual(["123456"]);
            expect(data.contact.secondaryContactIds.length).toBe(1);
        });

        it("should create secondary contact when new phone with existing email", async () => {
            await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "doc@hillvalley.edu",
                        phoneNumber: 123456,
                    }),
                },
                env
            );

            const response = await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "doc@hillvalley.edu",
                        phoneNumber: 789012,
                    }),
                },
                env
            );

            const data = await response.json() as IdentifyResponse;
            expect(data.contact.emails).toEqual(["doc@hillvalley.edu"]);
            expect(data.contact.phoneNumbers).toContain("123456");
            expect(data.contact.phoneNumbers).toContain("789012");
            expect(data.contact.secondaryContactIds.length).toBe(1);
        });

        it("should create secondary when both email and phone are new but one matches", async () => {
            await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "doc@hillvalley.edu",
                        phoneNumber: 123456,
                    }),
                },
                env
            );

            const response = await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "emmett@hillvalley.edu",
                        phoneNumber: 123456,
                    }),
                },
                env
            );

            const data = await response.json() as IdentifyResponse;
            expect(data.contact.secondaryContactIds.length).toBe(1);
        });
    });

    describe("Duplicate Detection", () => {
        it("should NOT create new contact for exact match", async () => {
            const first = await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "doc@hillvalley.edu",
                        phoneNumber: 123456,
                    }),
                },
                env
            );
            const firstData = await first.json() as IdentifyResponse;

            const second = await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "doc@hillvalley.edu",
                        phoneNumber: 123456,
                    }),
                },
                env
            );
            const secondData = await second.json() as IdentifyResponse;

            expect(firstData.contact.primaryContatctId).toBe(
                secondData.contact.primaryContatctId
            );
            expect(secondData.contact.secondaryContactIds).toEqual([]);
        });

        it("should NOT create duplicate when querying with only email that exists", async () => {
            await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "doc@hillvalley.edu",
                        phoneNumber: "123456",
                    }),
                },
                env
            );

            const response = await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "doc@hillvalley.edu",
                        phoneNumber: null,
                    }),
                },
                env
            );

            const data = await response.json() as IdentifyResponse;
            expect(data.contact.secondaryContactIds.length).toBe(0);
        });

        it("should NOT create duplicate when querying with only phone that exists", async () => {
            await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "doc@hillvalley.edu",
                        phoneNumber: 123456,
                    }),
                },
                env
            );

            const response = await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: null,
                        phoneNumber: 123456,
                    }),
                },
                env
            );

            const data = await response.json() as IdentifyResponse;
            expect(data.contact.secondaryContactIds.length).toBe(0);
        });
    });

    describe("Primary Contact Merging", () => {
        it("should merge two separate primary contacts when linked", async () => {
            // Create first primary
            await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "george@hillvalley.edu",
                        phoneNumber: 919191,
                    }),
                },
                env
            );

            // Create second primary
            await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "biffsucks@hillvalley.edu",
                        phoneNumber: 717171,
                    }),
                },
                env
            );

            // Link them
            const response = await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "george@hillvalley.edu",
                        phoneNumber: 717171,
                    }),
                },
                env
            );

            const data = await response.json() as IdentifyResponse;

            // Older primary should remain primary
            expect(data.contact.emails).toContain("george@hillvalley.edu");
            expect(data.contact.emails).toContain("biffsucks@hillvalley.edu");
            expect(data.contact.phoneNumbers).toContain("919191");
            expect(data.contact.phoneNumbers).toContain("717171");
            expect(data.contact.secondaryContactIds.length).toBeGreaterThan(0);
        });

        it("should keep oldest contact as primary when merging", async () => {
            // Create older primary
            const first = await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "old@hillvalley.edu",
                        phoneNumber: 111111,
                    }),
                },
                env
            );
            const firstData = await first.json() as IdentifyResponse;

            // Wait a bit to ensure different timestamp
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Create newer primary
            await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "new@hillvalley.edu",
                        phoneNumber: 222222,
                    }),
                },
                env
            );

            // Link them
            const response = await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "old@hillvalley.edu",
                        phoneNumber: 222222,
                    }),
                },
                env
            );

            const data = await response.json() as IdentifyResponse;
            expect(data.contact.primaryContatctId).toBe(
                firstData.contact.primaryContatctId
            );
        });

        it("should handle complex chain merging (3+ separate chains)", async () => {
            // Create chain 1
            await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: "a@test.com", phoneNumber: 111 }),
                },
                env
            );
            await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: "b@test.com", phoneNumber: 111 }),
                },
                env
            );

            // Create chain 2
            await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: "c@test.com", phoneNumber: 222 }),
                },
                env
            );

            // Create chain 3
            await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: "d@test.com", phoneNumber: 333 }),
                },
                env
            );

            // Merge chain 2 and 3
            await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: "c@test.com", phoneNumber: 333 }),
                },
                env
            );

            // Merge all chains
            const response = await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: "a@test.com", phoneNumber: 222 }),
                },
                env
            );

            const data = await response.json() as IdentifyResponse;
            expect(data.contact.emails.length).toBe(4);
            expect(data.contact.phoneNumbers.length).toBe(3);
        });
    });

    describe("Data Ordering", () => {
        it("should return primary contact details first in arrays", async () => {
            await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "primary@test.com",
                        phoneNumber: 111111,
                    }),
                },
                env
            );

            await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "secondary@test.com",
                        phoneNumber: 111111,
                    }),
                },
                env
            );

            const response = await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "secondary@test.com",
                        phoneNumber: 222222,
                    }),
                },
                env
            );

            const data = await response.json() as IdentifyResponse;
            expect(data.contact.emails[0]).toBe("primary@test.com");
            expect(data.contact.phoneNumbers[0]).toBe("111111");
        });
    });

    describe("Edge Cases", () => {
        it("should handle null email gracefully", async () => {
            const response = await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: null,
                        phoneNumber: 123456,
                    }),
                },
                env
            );

            expect(response.status).toBe(200);
        });

        it("should handle null phoneNumber gracefully", async () => {
            const response = await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "test@test.com",
                        phoneNumber: null,
                    }),
                },
                env
            );

            expect(response.status).toBe(200);
        });

        it("should reject when both email and phone are null", async () => {
            const response = await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: null,
                        phoneNumber: null,
                    }),
                },
                env
            );

            expect(response.status).toBe(400);
        });

        it("should handle very long chains efficiently", async () => {
            // Create a chain of 50 contacts
            await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: "base@test.com", phoneNumber: 111 }),
                },
                env
            );

            for (let i = 0; i < 49; i++) {
                await app.request(
                    "/identify",
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            email: `test${i}@test.com`,
                            phoneNumber: 111,
                        }),
                    },
                    env
                );
            }

            const start = Date.now();
            const response = await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: null, phoneNumber: 111 }),
                },
                env
            );
            const duration = Date.now() - start;

            expect(response.status).toBe(200);
            expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
        });

        it("should handle concurrent requests without creating duplicates", async () => {
            // Simulate race condition
            const requests = Array(10)
                .fill(null)
                .map(() =>
                    app.request(
                        "/identify",
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                email: "concurrent@test.com",
                                phoneNumber: 999999,
                            }),
                        },
                        env
                    )
                );

            await Promise.all(requests);

            // Query to check final state
            const response = await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "concurrent@test.com",
                        phoneNumber: 999999,
                    }),
                },
                env
            );

            const data = await response.json() as IdentifyResponse;
            // Should have only created contacts once, not 10 times
            expect(
                data.contact.emails.filter((e: string) => e === "concurrent@test.com")
                    .length
            ).toBe(1);
        });
    });

    describe("Query Variations", () => {
        it("should return same result regardless of query order", async () => {
            // Setup
            await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: "a@test.com", phoneNumber: 111 }),
                },
                env
            );
            await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: "b@test.com", phoneNumber: 111 }),
                },
                env
            );

            // Query with email
            const r1 = await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: "a@test.com", phoneNumber: null }),
                },
                env
            );
            const d1 = await r1.json() as IdentifyResponse;

            // Query with phone
            const r2 = await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: null, phoneNumber: 111 }),
                },
                env
            );
            const d2 = await r2.json() as IdentifyResponse;

            // Query with both
            const r3 = await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: "b@test.com", phoneNumber: 111 }),
                },
                env
            );
            const d3 = await r3.json() as IdentifyResponse;

            // All should return the same contact group
            expect(d1.contact.primaryContatctId).toBe(d2.contact.primaryContatctId);
            expect(d2.contact.primaryContatctId).toBe(d3.contact.primaryContatctId);
        });
    });

    describe("Deleted Records", () => {
        it("should ignore deleted contacts", async () => {
            const response = await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "deleted@test.com",
                        phoneNumber: 123456,
                    }),
                },
                env
            );

            const data = await response.json() as IdentifyResponse;
            const contactId = data.contact.primaryContatctId;

            // Soft delete the contact
            const db = drizzle(env.DB);
            await db
                .update(contacts)
                .set({ deletedAt: new Date() })
                .where(eq(contacts.id, contactId))
                .execute();

            // Query again - should create new primary
            const response2 = await app.request(
                "/identify",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: "deleted@test.com",
                        phoneNumber: 123456,
                    }),
                },
                env
            );

            const data2 = await response2.json() as IdentifyResponse;
            expect(data2.contact.secondaryContactIds).toEqual([]);
            expect(data2.contact.primaryContatctId).not.toBe(contactId);
        });
    });
});

