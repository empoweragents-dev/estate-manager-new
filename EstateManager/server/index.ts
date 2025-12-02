import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// Auto-generate monthly rent invoices on the 1st of each month
async function generateMonthlyInvoices() {
  try {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const dayOfMonth = today.getDate();
    
    // Only generate on the 1st of the month
    if (dayOfMonth !== 1) return;
    
    const { storage } = await import("./storage");
    const allLeases = await storage.getLeases();
    let generatedCount = 0;
    
    for (const lease of allLeases) {
      if (lease.status === 'terminated') continue;
      
      const startDate = new Date(lease.startDate);
      const endDate = new Date(lease.endDate);
      
      // Check if current month falls within lease period
      if (startDate.getFullYear() > currentYear || 
          (startDate.getFullYear() === currentYear && startDate.getMonth() + 1 > currentMonth)) {
        continue; // Lease hasn't started yet
      }
      
      if (endDate.getFullYear() < currentYear || 
          (endDate.getFullYear() === currentYear && endDate.getMonth() + 1 < currentMonth)) {
        continue; // Lease has ended
      }
      
      // Check if invoice already exists for this month
      const existingInvoices = await storage.getRentInvoicesByTenant(lease.tenantId);
      const invoiceExists = existingInvoices.some(inv => inv.month === currentMonth && inv.year === currentYear && inv.leaseId === lease.id);
      
      if (!invoiceExists) {
        const dueDate = new Date(currentYear, currentMonth - 1, 1);
        await storage.createRentInvoice({
          leaseId: lease.id,
          tenantId: lease.tenantId,
          amount: lease.monthlyRent,
          dueDate: dueDate.toISOString().split('T')[0],
          month: currentMonth,
          year: currentYear,
          isPaid: false,
        });
        generatedCount++;
      }
    }
    
    if (generatedCount > 0) {
      log(`Generated ${generatedCount} monthly invoices for ${currentMonth}/${currentYear}`, "invoices");
    }
  } catch (error) {
    console.error("Error generating monthly invoices:", error);
  }
}

(async () => {
  // Generate monthly invoices on app startup (if it's the 1st of month)
  generateMonthlyInvoices();
  
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
