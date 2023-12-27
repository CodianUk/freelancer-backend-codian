import { Router } from "express";

import Controller from "../controllers/freelancerController.js";
import { accessTokenVerify, freelancer, optionalAccessTokenVerify } from "../middleware/authentication.js";
import {
  freelancersValidationRules,
  editProfileServicesRules,
  portfolioAddRules,
  validate,
  editProfileAboutMeRules,
  getPortfolioByIdRules,
  deletePortfolioRules,
} from "../middleware/validator.js";

const router = Router();


// @Route   POST /freelancer/onboarding
// @desc    takes complete onboarding data of all steps and create a freelancer's profile
// router.route('/onboarding')
//     .post(accessTokenVerify, freelancer, freelancersValidationRules(), validate, Controller.onboarding);

router.route('/onboarding')
.post(accessTokenVerify, Controller.onboarding);

// @Route   GET /freelancer/profile
// @desc    returns the services,portfolio,aboutMe,reviews
// router.route('/profile')
//     .get(accessTokenVerify, freelancer, Controller.getFreelancersProfile)

router.route('/profile')
    .get(accessTokenVerify, Controller.getFreelancersProfile)


// @Route   PUT /freelancer/profile/services
// @desc    edits the services information (rates,description,skills) it could be one or all 3 of these
router.route('/profile/services')
    .put(accessTokenVerify,freelancer, editProfileServicesRules(),validate,Controller.editProfileServices)


// @Route   POST /freelancer/profile/portfolio
// @desc    Add a new Portfolio to freelancers profile
router.route('/profile/portfolio')
    .post(accessTokenVerify,freelancer,portfolioAddRules(),validate,Controller.addProfilePortfolio)


// @Route   GET /freelancer/profile/protfolioId
// @desc    takes the portfolioId and returns its data
router.route('/profile/get/portfolio')
    .post(accessTokenVerify,freelancer,getPortfolioByIdRules(),validate, Controller.getPortfolioById)


// @Route   PUT /freelancer/profile/portfolio/update
// @desc    takes the portfolioId and data(updated) in body and updates it
router.route('/profile/portfolio/update')
    .put(accessTokenVerify,freelancer,portfolioAddRules(),validate,Controller.editPortfolioById)

// @Route   DELETE /freelancer/profile/portfolio/delete
// @desc    takes the portfolioId in body and delete it
router.route('/profile/portfolio/delete')
    .delete(accessTokenVerify,deletePortfolioRules(),validate ,Controller.deletePortfolioById)


// @Route   GET /freelancer/profile/reviews
// @desc    returns all reviews given to a freelancer
// router.route('/profile/reviews')
//     .get()


// @Route   PUT /freelancer/profile/aboutMe
// @desc    takes all data(updated) and updates it in freelancers profile
router.route('/profile/aboutMe/update')
    .put(accessTokenVerify,editProfileAboutMeRules(),validate, Controller.editProfileAboutMe)
// router.route('/profile/aboutMe/update')
//     .put(accessTokenVerify,freelancer,editProfileAboutMeRules(),validate, Controller.editProfileAboutMe)


// @Route   GET /freelancer/fundsCleared
// @desc    returns all funds cleared of a freelancer
router.route('/fundsCleared')
.post(accessTokenVerify,freelancer,Controller.getFundsCleared)



// @Route   GET /freelancer/by url
// @desc    returns freelancer by url
router. route('/byUrl/:id').get(Controller.getFreelancerByURL)



// FOR ONE WHO IS NOT LOGGED IN AND STARTUP TO SEE ALL FREELANCERS
router.route('/all')
    .post(optionalAccessTokenVerify,Controller.viewAllFreelancers)


router.route('/category')
    .post(optionalAccessTokenVerify,Controller.viewAllFreelancers)


router.route('/getByid')
    .post(optionalAccessTokenVerify,Controller.getFreelancerById)

router.route('/findByName').post(optionalAccessTokenVerify,Controller.findFreelancerByName)


export default router;
