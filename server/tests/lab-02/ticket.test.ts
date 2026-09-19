import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

let activeRequesterId: number;
let inactiveRequesterId: number;
let activeToken: string;

describe("POST /api/tickets (Issue 4 - AC 1)", () => {
  beforeAll(async () => {
    const active = await getPrisma().user.findFirst({
      where: { isActive: true, role: "REQUESTER", email: "jennifer.anderson@kmutt.ac.th" },
    });
    const inactive = await getPrisma().user.findFirst({
      where: { isActive: false, role: "REQUESTER", email: "robert.taylor@kmutt.ac.th" },
    });
    activeRequesterId = active!.id;
    inactiveRequesterId = inactive!.id;

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: active!.email, password: "Password123!" });
    activeToken = loginRes.body.token;
  });

  it("should create a ticket with status NEW and TKT-YYYY-XXXXXX number", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${activeToken}`)
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "MEDIUM",
        summary: "My laptop is not working properly",
        description: "The screen flickers when I open multiple applications simultaneously.",
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("ticketNumber");
    expect(response.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{5,}$/);
    expect(response.body.currentStatus).toBe("NEW");
    expect(response.body).toHaveProperty("category");
    expect(response.body).toHaveProperty("related_system");
    expect(response.body.requestedPriority).toBe("MEDIUM");
  });

  it("should return 400 if summary is too short", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${activeToken}`)
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
      .set("Authorization", `Bearer ${activeToken}`)
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

  it("should return 401 if authentication session is missing (AC-4.1)", async () => {
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

  it("should return 401 if unauthenticated X-Requester-Id header is supplied without session (AC-4.1)", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(inactiveRequesterId))
      .send({
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "MEDIUM",
        summary: "Valid summary text here",
        description: "Valid description that is long enough for testing.",
      });

    expect(response.status).toBe(401);
  });

  it("should return 400 if categoryId does not exist", async () => {
    const response = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${activeToken}`)
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
      .set("Authorization", `Bearer ${activeToken}`)
      .send({
        categoryId: 2,
        relatedSystemId: 2,
        requestedPriority: "HIGH",
        summary: "First ticket for uniqueness test",
        description: "Testing that ticket numbers are unique and sequential.",
      });

    const ticket2 = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${activeToken}`)
      .send({
        categoryId: 2,
        relatedSystemId: 2,
        requestedPriority: "LOW",
        summary: "Second ticket for uniqueness test",
        description: "Testing that ticket numbers are unique and sequential.",
      });

    expect(ticket1.status).toBe(201);
    expect(ticket2.status).toBe(201);
    expect(ticket1.body.ticketNumber).not.toBe(ticket2.body.ticketNumber);
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
