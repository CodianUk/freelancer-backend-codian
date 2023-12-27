// @import Packages
import express from "express";

// @import Controllers
import startupController from "../controllers/startupController.js";

// @import Middleware
import {
  accessTokenVerify,
  optionalAccessTokenVerify,
} from "../middleware/authentication.js";
// import { getImageFile, getPdfFile } from "../middleware/uploadfiles.js";

const router = express.Router();

// @Route   POST/startup/addProjectRole
// @desc    Add a new role
router.post(
  "/addProjectRole",
  accessTokenVerify,
  startupController.addProjectRole
);

//@Route GET/startup/byUrl/:id
//@desc Get startup by url
router.get("/byUrl/:id", startupController.getStartupbyUrl);

// @Route   POST/startup/getstartupRoles
// @desc    Get Startup Roles
router.post(
  "/getstartupRoles",
  accessTokenVerify,
  startupController.getAllRoles
);

// @Route   POST/startup/deletestartupRole
// @desc    Delete Startup Role
router.delete(
  "/deletestartupRoles",
  accessTokenVerify,
  startupController.deleteRole
);

// @Route   POST/startup/updatestartupRole
// @desc    Update Startup Role
router.put(
  "/updatestartupRoles",
  accessTokenVerify,
  startupController.updateRole
);

router.put('/todos/updateStatusOfContributor', startupController.updateContributorStatus);

router.put('/todos/updatetodoteammember', startupController.updateTeamMemberStatus);

// @Route   POST/startup/addtodo
// @desc    Add a new todo
router.post("/addtodo", accessTokenVerify, startupController.addTodo);

// @Route   POST/startup/gettodos
// @desc    Get Startup Todos
router.post("/gettodos", accessTokenVerify, startupController.getTodos);

// @Route   POST/startup/deletetodo
// @desc    Delete Startup Todo
router.delete("/deletetodo", accessTokenVerify, startupController.deleteTodo);

// @Route   POST/startup/updatetodo
// @desc    Update Startup Todo
router.put("/updatetodo", accessTokenVerify, startupController.updateTodo);

// @Route  POST/startup/addmember
// @desc    Add a new member
router.post("/addmember", accessTokenVerify, startupController.addMember);

// @Route   POST/startup/getmembers
// @desc    Get Startup Members
router.post("/getmembers", accessTokenVerify, startupController.getMembers);

// @Route  GET/startup/getallmembers
// @desc    Get all Startup Members
router.get(
  "/getallmembers",
  accessTokenVerify,
  startupController.getAllStartupMembers
);

router.post(
  "/remove-member",
  accessTokenVerify,
  startupController.removeStartupMember
);

// @Route   POST/startup/deletemember
// @desc    Request Startup Member Removal
router.post(
  "/removeMemberRequest",
  // accessTokenVerify,
  startupController.requestMemberRemoval
);

// @Route   POST/startup/updatemember
// @desc    Update Startup Member
router.put("/updatemember", accessTokenVerify, startupController.updateMember);

// @Route   POST/startup/addMilestone
// @desc    Add a new milestone
router.post("/addmilestone", accessTokenVerify, startupController.addMilestone);

// @Route   POST/startup/updateMilestone
// @desc    Update a milestone
router.put(
  "/updatemilestone",
  accessTokenVerify,
  startupController.updateMilestone
);

// @Route   POST/startup/removeMilestone
// @desc    Remove a milestone
router.delete(
  "/removemilestone",
  accessTokenVerify,
  startupController.removeMilestone
);

// @Route   POST /startup/saveOnboarding
// @desc    Save Startup Onboarding
router.post(
  "/saveOnboarding",
  accessTokenVerify,
  startupController.startupOnboarding
);

// deleteStartupById
router.delete(
  "/deleteStartup/:startupid",
  accessTokenVerify,
  startupController.deleteStartupById
);

// @Route   POST /startup/records
// @desc    Save Records against startup
router.post(
  "/saveRecords",
  accessTokenVerify,
  startupController.addRecord
);


// @Route   POST /startup/publishStartup
// @desc    Publish Startup
router.post(
  "/publishStartup",
  accessTokenVerify,
  startupController.publishStartup
);

// @Route   POST /startup/getStartup
// @desc    Get Startup
router.post(
  "/getStarupbyId",
  optionalAccessTokenVerify,
  startupController.getStartupbyId
);

// @Route   GET /startup/startupNames
// @desc    Get Startup Names
router.get(
  "/startupNames",
  accessTokenVerify,
  startupController.getClientStartupsNames
);

router.post(
  "/getStartupsByUserId",
  accessTokenVerify,
  startupController.getAllStartupsbyUserId
);


router.get(
  "/getclientStartups",
  accessTokenVerify,
  startupController.getAllStartups
);

// @Route   POST /startup/warnmember
// @desc    Warn a member
router.post("/warnmember", accessTokenVerify, startupController.warnMember);

// @Route   POST /startup/getwarningsrequest
// @desc    Get warnings request
router.post(
  "/getwarningsrequest",
  accessTokenVerify,
  startupController.getWarningsRequests
);

// @Route   POST /startup/approvewarning
// @desc    Approve/Reject a warning
router.post(
  "/approvewarning",
  accessTokenVerify,
  startupController.acceptrejectWarning
);

// @Route   POST /startup/getallwarnings
// @desc    Get all warnings
router.post(
  "/getallwarnings",
  accessTokenVerify,
  startupController.getStartupWarnings
);

// @Route   GET /startup/allStartups
// @desc    Get all startups
router.get("/allStartups", startupController.AllStartups);

// @Route   POST /startup/cancelOrder
// @desc    Cancel Order
router.post(
  "/requestcancelOrder",
  accessTokenVerify,
  startupController.requestCancelOrder
);

// @Route   POST /startup/updatePitchDeck
// @desc    Update Pitch Deck
router.put(
  "/updatePitchDeck",
  accessTokenVerify,
  startupController.updatePitchDeck
);

// @Route   POST /startup/deletePitchDeck
// @desc    Delete Pitch Deck
router.delete(
  "/deletePitchDeck",
  accessTokenVerify,
  startupController.deletePitchDeck
);

// @Route   PUT/startup/updateStartup
// @desc    Update Startup
router.put(
  "/updateStartup",
  accessTokenVerify,
  startupController.updateStartup
);

// @Route   GET/startup/allCatergories
// @desc    Get all catergories
router.get("/allCatergories", startupController.getAllCategories);
router.get("/allSubCategories/:categoryId", startupController.getAllSubcategoriesByCategory);
router.post("/searchcampaigns", startupController.searchcampaigns)

export default router;
