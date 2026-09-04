import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /api/requesters/active (Issue 3 - AC 1)", () => {
  it("should return HTTP 200 with list of active requesters and exclude inactive ones", async () => {
    const response = await request(app).get("/api/requesters/active");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);

    // Verify properties
    for (const requester of response.body) {
      expect(requester).toHaveProperty("id");
      expect(requester).toHaveProperty("name");
      expect(requester).toHaveProperty("email");
      expect(requester).toHaveProperty("department");
      // Ensure internal fields are not exposed or inactive requesters are excluded
      expect(requester).not.toHaveProperty("isActive");
    }

    // Robert Taylor is seeded with isActive = false, so he must NOT be present
    const inactiveUser = response.body.find(
      (r: { email: string }) => r.email === "robert.taylor@kmutt.ac.th"
    );
    expect(inactiveUser).toBeUndefined();

    // Verify ordering by name ascending
    const names = response.body.map((r: { name: string }) => r.name);
    const sortedNames = [...names].sort();
    expect(names).toEqual(sortedNames);
  });
});
