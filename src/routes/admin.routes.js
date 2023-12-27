import { Router } from "express";

import adminController from "../controllers/adminController.js";
import { accessTokenVerify, admin } from "../middleware/authentication.js";
import {
  deleteUser,
  pauseTransactionRules,
  skillRules,
  suspendStatusRules,
  validate,
} from "../middleware/validator.js";

const router = Router();

router.get(
  "/getDashboard",
  accessTokenVerify,
  admin,
  adminController.getAdminDashboard
);

router.post("/getUsers", accessTokenVerify, admin, adminController.getAllUsers);

router.post(
  "/getStartups",
  accessTokenVerify,
  admin,
  adminController.getAllStartups
);

router.post(
  "/changeStartupStatus",
  accessTokenVerify,
  admin,
  adminController.changeStartupStatus
);
router.post(
  "/getStartupStatus",
  accessTokenVerify,
  admin,
  adminController.getStartupStatus
);

router.delete(
  "/deleteStartup",
  accessTokenVerify,
  admin,
  adminController.deleteStartup
);

// @Route:    /admin/getAllRemovalRequests
// @desc:     GET all request from Startups to remove members
router.get(
  "/getAllRemovalRequests",
  accessTokenVerify,
  admin,
  adminController.getAllRemovalRequests
);

// @Route:    /admin/removeMember
// @desc:     remove member from Startup
router.delete(
  "/removeMember",
  accessTokenVerify,
  admin,
  adminController.removeMember
);

// @Route:    /admin/RejectRemovalRequest
// @desc:     Reject request to remove member from Startup
router.delete(
  "/rejectRemovalRequest",
  accessTokenVerify,
  admin,
  adminController.RejectRemovalRequest
);

// @Route: /admin/wallet
// @DESC: Get admins wallet details
router
  .route("/wallet")
  .get(accessTokenVerify, admin, adminController.adminWallet);

// @Route: /admin/withdrawlRequests
// @DESC: Get all freelancers withdrawl requests
router
  .route("/withdrawlRequests")
  .post(accessTokenVerify, admin, adminController.getWithdrawlRequests);

//@ROUTE: /admin/appEarnings
//@DESC: Get all app earnings
router
  .route("/appEarnings")
  .post(accessTokenVerify, admin, adminController.getAllAppEarnings);

// @Route: /admin/withdrawlHistory
// @DESC: Get admins withdrawl history
router
  .route("/withdrawlHistory")
  .post(accessTokenVerify, admin, adminController.getWithdrawlHistory);

// @Route: /admin/freelancerProfile/data
// @DESC: Get freelancer profile data'
router
  .route("/freelancerProfile/data")
  .post(accessTokenVerify, admin, adminController.freelancerProfileData);
// @Route: /admin/freelancerProfile/campaigns
// @DESC: Get freelancer profile campaigns'
router
  .route("/freelancerProfile/campaigns")
  .post(
    accessTokenVerify,
    admin,
    adminController.getFreelancerProfileCampaigns
  );

router.route(
  "/withdraw/pause"
).post(
  accessTokenVerify,
  admin,
  pauseTransactionRules(),
  validate,
  adminController.changTransactionStatus
)

// @Route: /admin/freelancerProfile/warnings
// @DESC: Get freelancer profile warnings'
router
  .route("/freelancerProfile/warnings")
  .post(accessTokenVerify, admin, adminController.getFreelancerProfileWarnings);
// @Route: /admin/freelancerProfile/earnings
// @DESC: Get freelancer profile earnings'
router
  .route("/freelancerProfile/earnings")
  .post(accessTokenVerify, admin, adminController.getFreelancerProfileEarnings);

// @Route   PUT /admin/suspend/user/status
// @Desc    update user suspend status by taking a boolean "suspendStatus" for admin only
router
  .route("/suspend/user")
  .post(
    accessTokenVerify,
    admin,
    suspendStatusRules(),
    validate,
    adminController.suspendUser
  );

router
  .route("/user/delete")
  .delete(
    accessTokenVerify,
    admin,
    deleteUser(),
    validate,
    adminController.deleteUser
  );

router
  .route("/getallsskills")
  .get(accessTokenVerify, admin, adminController.getAllSkills);
router
  .route("/addskill")
  .post(
    accessTokenVerify,
    admin,
    skillRules(),
    validate,
    adminController.addSkill
  );
router
  .route("/updateskill")
  .put(
    accessTokenVerify,
    admin,
    skillRules(),
    validate,
    adminController.updateSkill
  );
router
  .route("/deleteskill")
  .delete(
    accessTokenVerify,
    admin,
    validate,
    adminController.deleteSkill
  );

router.get(
  "/getAllCategories",
  accessTokenVerify,
  admin,
  adminController.getAllCategory
);

router.put(
  "/updateCategory",
  accessTokenVerify,
  admin,
  adminController.updateCategory
);

router.delete(
  "/deleteCategory",
  accessTokenVerify,
  admin,
  adminController.deleteCategory
);

router.post(
  "/addCategory",
  accessTokenVerify,
  admin,
  adminController.addCategory
);


router.post(
  "/addSubCategory",
  accessTokenVerify,
  admin,
  adminController.addSubcategory
);

router.get(
  "/getSubCategories/:categoryId",
  accessTokenVerify,
  admin,
  adminController.getAllSubcategoriesByCategory
);

export default router;
