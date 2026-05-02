import { Router, type IRouter } from "express";
import healthRouter      from "./health";
import onboardingRouter  from "./onboarding";
import dashboardRouter   from "./dashboard";
import clientsRouter     from "./clients";
import vehiclesRouter    from "./vehicles";
import bookingsRouter    from "./bookings";
import quotationsRouter  from "./quotations";
import jobsRouter        from "./jobs";
import invoicesRouter    from "./invoices";
import teamRouter        from "./team";
import settingsRouter    from "./settings";
import adminRouter       from "./admin";
import authRouter        from "./auth";
import storageRouter     from "./storage";
import supportRouter     from "./support";

const router: IRouter = Router();

router.use(healthRouter);
router.use(onboardingRouter);
router.use(dashboardRouter);
router.use(clientsRouter);
router.use(vehiclesRouter);
router.use("/bookings",   bookingsRouter);
router.use("/quotations", quotationsRouter);
router.use("/jobs",       jobsRouter);
router.use("/invoices",   invoicesRouter);
router.use("/team",       teamRouter);
router.use(settingsRouter);
router.use(adminRouter);
router.use(supportRouter);
router.use(authRouter);
router.use(storageRouter);

export default router;
