import { Router, type IRouter } from "express";
import healthRouter     from "./health";
import onboardingRouter from "./onboarding";
import dashboardRouter  from "./dashboard";
import clientsRouter    from "./clients";
import vehiclesRouter   from "./vehicles";
import jobsRouter       from "./jobs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(onboardingRouter);
router.use(dashboardRouter);
router.use(clientsRouter);
router.use(vehiclesRouter);
router.use("/jobs", jobsRouter);

export default router;
