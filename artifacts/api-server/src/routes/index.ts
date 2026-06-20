import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import ownerRequestsRouter from "./owner-requests";
import hotelsRouter from "./hotels";
import roomsRouter from "./rooms";
import bookingsRouter from "./bookings";
import reviewsRouter from "./reviews";
import restaurantsRouter from "./restaurants";
import reservationsRouter from "./reservations";
import notificationsRouter from "./notifications";
import activityLogsRouter from "./activity-logs";
import platformSettingsRouter from "./platform-settings";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(ownerRequestsRouter);
router.use(hotelsRouter);
router.use(roomsRouter);
router.use(bookingsRouter);
router.use(reviewsRouter);
router.use(restaurantsRouter);
router.use(reservationsRouter);
router.use(notificationsRouter);
router.use(activityLogsRouter);
router.use(platformSettingsRouter);
router.use(dashboardRouter);

export default router;
