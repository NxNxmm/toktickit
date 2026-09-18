import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import requesterRoutes from "./routes/requester.routes.js";
import ticketRoutes from "./routes/ticket.routes.js";
import authRoutes from "./routes/auth.routes.js";
import { authenticateSession, enforcePasswordChangePolicy } from "./middleware/auth.middleware.js";

void getPrisma;

export const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Global session authentication & first-login password change constraint
app.use(authenticateSession);
app.use(enforcePasswordChangePolicy);

app.use("/api", requesterRoutes);
app.use("/api", ticketRoutes);
app.use("/api", authRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "TokTickIT API",
  });
});

app.get("/api/categories", async (req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        id: "asc",
      },
    });
    res.status(200).json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Global error handling middleware (e.g. Multer file upload errors)
app.use((err: any, _req: Request, res: Response, next: express.NextFunction) => {
  if (err?.name === 'MulterError' || err?.message?.includes('Invalid file type') || err?.message?.includes('File too large')) {
    return res.status(400).json({
      statusCode: 400,
      error: 'Bad Request',
      message: err.message,
    });
  }
  next(err);
});

export default app;
