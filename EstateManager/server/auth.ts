import session from "express-session";
import type { Express, Request, Response, NextFunction } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { storage } from "./storage";

declare module "express-session" {
  interface SessionData {
    userId: string;
    role: 'super_admin' | 'owner';
    ownerId?: number;
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Initialize Super Admin on startup
  await storage.initSuperAdmin();

  // Login endpoint
  app.post("/api/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session
      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.ownerId = user.ownerId ?? undefined;

      // Return user info (without password)
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout endpoint - handle both GET and POST for browser navigation
  const handleLogout = (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      // Redirect to login page after logout
      res.redirect("/");
    });
  };
  
  app.get("/api/logout", handleLogout);
  app.post("/api/logout", handleLogout);

  // Get current user
  app.get("/api/auth/user", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Get owner details if linked
      let ownerDetails = null;
      if (user.ownerId) {
        ownerDetails = await storage.getOwner(user.ownerId);
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({ ...userWithoutPassword, ownerDetails });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}

// Middleware to check if user is authenticated
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

// Middleware to check if user is Super Admin
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.session.role !== 'super_admin') {
    return res.status(403).json({ message: "Super Admin access required" });
  }
  next();
};

// Middleware to check if user is Owner or Admin
export const requireOwnerOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.session.role !== 'super_admin' && req.session.role !== 'owner') {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};
