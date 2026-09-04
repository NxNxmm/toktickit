import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("POST /api/tickets (Issue 4 - AC 1)", () => {
  it("should create a ticket with status NEW and TKT-YYYY-XXXXXX number", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", "1")
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "MEDIUM",
        summary: "My laptop is not working properly",
        description: "The screen flickers when I open multiple applications simultaneously.",
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("ticketNo");
    expect(response.body.ticketNo).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(response.body.currentStatus).toBe("NEW");
    expect(response.body).toHaveProperty("category");
    expect(response.body).toHaveProperty("relatedSystem");
    expect(response.body.requestedPriority).toBe("MEDIUM");
  });

  it("should return 400 if summary is too short", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", "1")
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "LOW",
        summary: "Hi",
        description: "This is a valid description for testing purposes.",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/summary/i);
  });

  it("should return 400 if description is too short", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", "1")
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "HIGH",
        summary: "Valid summary text here",
        description: "Short",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/description/i);
  });

  it("should return 401 if X-Requester-Id header is missing", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        summary: "Valid summary text here",
        description: "Valid description that is long enough for testing.",
      });

    expect(response.status).toBe(401);
  });

  it("should return 403 if requester is inactive", async () => {
    // Robert Taylor (id=5) is seeded as isActive=false
    const response = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", "5")
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "MEDIUM",
        summary: "Valid summary text here",
        description: "Valid description that is long enough for testing.",
      });

    expect(response.status).toBe(403);
  });

  it("should return 400 if categoryId does not exist", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", "1")
      .send({
        categoryId: 9999,
        relatedSystemId: 1,
        requestedPriority: "MEDIUM",
        summary: "Valid summary text here",
        description: "Valid description that is long enough for testing.",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/category/i);
  });

  it("should generate unique ticket numbers for consecutive tickets", async () => {
    const ticket1 = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", "1")
      .send({
        categoryId: 2,
        relatedSystemId: 2,
        requestedPriority: "HIGH",
        summary: "First ticket for uniqueness test",
        description: "Testing that ticket numbers are unique and sequential.",
      });

    const ticket2 = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", "1")
      .send({
        categoryId: 2,
        relatedSystemId: 2,
        requestedPriority: "LOW",
        summary: "Second ticket for uniqueness test",
        description: "Testing that ticket numbers are unique and sequential.",
      });

    expect(ticket1.status).toBe(201);
    expect(ticket2.status).toBe(201);
    expect(ticket1.body.ticketNo).not.toBe(ticket2.body.ticketNo);
  });
});

describe("GET /api/related-systems (Issue 4)", () => {
  it("should return a list of related systems", async () => {
    const response = await request(app).get("/api/related-systems");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);

    for (const system of response.body) {
      expect(system).toHaveProperty("id");
      expect(system).toHaveProperty("name");
    }
  });
});
