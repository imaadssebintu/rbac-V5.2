import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import DashboardController from "../controllers/dashboard.js";
import AuditLog from '../models/auditLog.js';

const router = express.Router();

const logDashboardVisit = async (req, res, next) => {
  try {
    if (req.method === 'GET' && req.user) {
      await AuditLog.create({
        action: 'DASHBOARD_VISIT',
        details: JSON.stringify({
          user_id: req.user.id,
          user_name: req.user.name,
          user_email: req.user.email,
          role: req.user.Role?.name || null,
          endpoint: req.originalUrl,
          visited_at: new Date().toISOString()
        }),
        ip_address: req.ip,
        severity: 'info'
      });
    }
  } catch (error) {
    console.error('DASHBOARD VISIT LOG ERROR:', error?.message || error);
  }
  next();
};

router.use(authenticate, logDashboardVisit);

router.get("/admin", authorize(["Admin"]), DashboardController.getAdminDashboard);
router.get("/admin/logs", authorize(["Admin"]), DashboardController.getLogs);
router.get('/admin/backup', authorize(['Admin']), DashboardController.backupDatabase);
router.post("/admin/announcements", authorize(["Admin"]), DashboardController.createAnnouncement);
router.get("/admin/announcements", authorize(["Admin"]), DashboardController.getAnnouncements);
router.get('/announcements', DashboardController.getAnnouncementsForUser);

// Support both 'Walker' (legacy) and 'Guide' role names for the guide dashboard
router.get("/walker", authorize(["Walker", "Guide", "Admin"]), DashboardController.getWalkerDashboard);
router.get("/guide",  authorize(["Walker", "Guide", "Admin"]), DashboardController.getWalkerDashboard);

router.get("/walkee", authorize(["Walkee", "Traveller", "Admin"]), (req, res) => {
  res.json({ message: "Traveller Dashboard: request services and track progress." });
});

export default router;

