import { body, validationResult } from "express-validator";

const loginValidationRules = () => {
  return [
    body("email").isEmail().bail().notEmpty(),
    body("password").isLength({ min: 8 }),
  ];
};

const signUpValidationRules = () => {
  return [
    body("email").isEmail(),
    body("password").isLength({ min: 8 }),
    // .isStrongPassword() join this with the above password validation for strong Password Check
    body("phoneNumber").notEmpty().bail().isMobilePhone(),
    body("role")
      .isString()
      .bail()
      .notEmpty()
      .isIn(["Startup Owner", "Freelancer"]),
  ];
};


const signUporLoginMobileGoogleRules = () => {
  return[
    body("tokenId").isString().bail().notEmpty(),
    body("role").optional().isString().bail().notEmpty().isIn(["Startup Owner", "Freelancer"])
  ]
}

const signUporLoginMobileFacebookRules = () => {
  return[
    body("id").isString().bail().notEmpty(),
    body("role").optional().isString().bail().notEmpty().isIn(["Startup Owner", "Freelancer"]),
    body("email").optional().isEmail(),
    body("name").optional().isString().bail().notEmpty(),
  ]
}


const setRoles = () => {
  return [
    body("role")
      .isString()
      .bail()
      .notEmpty()
      .isIn(["Startup Owner", "Freelancer"]),
  ];
};

const freelancersValidationRules = () => {
  return [
    body('name').isString().isLength({min:3}),
    body("gender").isString().bail().notEmpty(),
    body("country").isString().bail().notEmpty(),
    body("city").isString().bail().notEmpty(),
    body("language").isString().bail().notEmpty(),
    body("skills").isArray({ min: 1 }),
    body("workPreference")
      .isString()
      .bail()
      .notEmpty()
      .bail()
      .isIn(["Equity", "Freelance", "Both"])
      .withMessage("Choose Equity, Freelance or Both"),
    body("availibilityPerWeek").isNumeric(),
    body("jobTitle").isString().bail().notEmpty(),
    body("hourlyRate").isNumeric().bail().notEmpty(),
    body("description").isString().bail().notEmpty(),
    body("image").isString(),
  ];
};

const editProfileServicesRules = () => {
  return [
    body("description")
      .optional({ nullable: true })
      .isString()
      .bail()
      .isLength({ min: 1 }),
    body("skills").optional({ nullable: true }).isArray({ min: 1 }),
    body("hourlyRate").optional({ nullable: true }).isNumeric(),
  ];
};

const portfolioAddRules = () => {
  return [
    body("title")
      .isString()
      .bail()
      .notEmpty()
      .bail()
      .withMessage("Project title is a must field"),
    body("description")
      .isString()
      .bail()
      .notEmpty()
      .bail()
      .withMessage("description is a must field"),
    body("attachments")
      .isArray({ min: 1 })
      .bail()
      .withMessage("Attach atleast one file"),
  ];
};




const deletePortfolioRules = () => {
  return [body("portfolioId").isString().bail().notEmpty()];
}

const editProfileAboutMeRules = () => {
  return [
    body("name").isString().bail().notEmpty(),
    body("jobTitle").isString().bail().notEmpty(),
    body("city").isString().bail().notEmpty(),
    body("country").isString().bail().notEmpty(),
    body("language").isString().bail().notEmpty(),
    body("hoursPerWeek").isNumeric().bail().notEmpty(),
    body("hourlyRate").isNumeric().bail().notEmpty(),
    body("aboutMe").isString().bail().notEmpty(),
    body("avatar").isString().bail().notEmpty(),
  ];
};

const OneTimeOrderCreationRules = () => {
  return [
    body("clientId").isString().bail().notEmpty(),
    body("jobTitle").isString().bail().notEmpty(),
    body("attachments").optional().isArray(),
    body("description").isString().bail().notEmpty(),
    body("totalPrice").isNumeric().bail().notEmpty(),
    body("deliveryTime").isDate().bail().notEmpty(),
  ];
};

const equityOrdereCreationRules = () => {
  return [
    body("clientId").isString().bail().notEmpty(),
    body("jobTitle").isString().bail().notEmpty(),
    body("description").isString().bail().notEmpty(),
    body("equity").isNumeric().bail().notEmpty(),
    body("partnershipAgreement").isString().bail().notEmpty(),
  ];
};

const cancelOneTimeOrderRules = () => {
  return [
    body("orderId").isString().bail().notEmpty(),
    body("reason").isString().bail().notEmpty(),
  ];
};

const deliverOneTimeOrderRules = () => {
  return [
    body("orderId").isString().bail().notEmpty(),
    body("comment").isString().bail().notEmpty(),
    body("attachments")
      .isArray({ min: 1 })
      .withMessage("Attach atleast one file"),
  ];
};

const orderOfferStatusRules = () => {
  return [
    body("orderId").isString().bail().notEmpty(),
    body("OfferStatus")
      .isString()
      .bail()
      .notEmpty()
      .bail()
      .isIn(["Accepted", "Rejected", "Withdrawn"])
      .withMessage("Choose Accepted or Rejected or Withdrawn"),
  ];
};

const reviewRules = () => {
  return [
    body("orderId").isString().bail().notEmpty(),
    body("rating").isNumeric().bail().notEmpty(),
    body("review").isString().bail().notEmpty(),
  ];
};

const getSpecificWarning = () => {
  return [
    body("warningId").isString().bail().notEmpty(),
    body("startupId").isString().bail().notEmpty(),
  ];
};


const startupUpdateNameOrAvatarRules = () => {
  return [
    body("name").isString().bail().notEmpty(),
    body("avatar").isString().bail().notEmpty(),
  ];
}

const acceptWarningRequestRules = () => {
  return [
    body("warningId").isString().bail().notEmpty(),
    body("startupId").isString().bail().notEmpty(),
    body("status")
      .isString()
      .bail()
      .notEmpty()
      .isIn(["Approved", "Rejected"])
      .withMessage("Choose Accepted or Rejected"),
  ];
};



const updateEmailRules = () => {
  return [body("email").isEmail().bail().notEmpty()];
};

const updatePasswordRules = () => {
  return [
    body("newPassword").isLength({min:8}).bail().notEmpty(),
    body("oldPassword").isString().bail().notEmpty(),
  ];
};

const modifyNotification = () => {
  return [body("notification").isBoolean().bail().notEmpty()];
};

const updatePhoneRules = () => {
  return [body("phoneNumber").isString().bail().notEmpty()];
};

const deleteUserRules = () => {
  return [
    body("password").isString().bail().notEmpty(),
    body("confirmPassword").isString().bail().notEmpty(),
  ];
};

const payOutrules = () => {
  return [
    body("amount").isNumeric().bail().notEmpty(),
  ];
}

const suspendStatusRules = () => {
  return [
    body("userId").isString().bail().notEmpty(),
    body("status")
      .isString()
      .bail()
      .notEmpty()
      .bail()
      .isIn(["Suspend", "Unsuspend"]),
  ];
};


const deleteUser = ()=>{
  return [
    body("userId").isString().bail().notEmpty(),
  ]
}

const requestWarning = () => {
  return [
    body("startupId").isString().bail().notEmpty(),
    body("warningTo").isString().bail().notEmpty(),
    body("reason").isString().bail().notEmpty(),
  ];
};

const getPortfolioByIdRules = () => {
  return [body("portfolioId").isString().bail().notEmpty()];
};

const orderStatusUpdate = () => {
  return [
    body("orderId").isString().bail().notEmpty(),
    body("status")
      .isString()
      .bail()
      .notEmpty()
      .bail()
      .isIn(["Completed", "Revision"])
      .withMessage("Choose Revision or Completed"),
  ];
};

const updateEquityOrderStatus = () => {
  return [
    body("orderId").isString().bail().notEmpty(),
    body("startupId").optional().isString().bail().notEmpty(),
    body("position").optional().isString().bail().notEmpty(),
    body("offerStatus")
      .isString()
      .bail()
      .notEmpty()
      .bail()
      .isIn(["Accepted", "Rejected", "Withdrawn"])
      .withMessage("Choose Revision or Completed"),
  ];
};

const addWalletPaymentMethodRules = () => {
  return [
    body("method")
      .isString()
      .bail()
      .notEmpty()
      .isIn(["paypal", "stripe", "masterCard"])
      .withMessage("Choose paypal or stripe or masterCard"),
    body("firstName").isString().bail().notEmpty(),
    body("lastName").isString().bail().notEmpty(),
    body("country").isString().bail().notEmpty(),
    body("city").isString().bail().notEmpty(),
    body("address").isString().bail().notEmpty(),
    body("postalCode").isString().bail().notEmpty(),
    body("accountNumber").isString().bail().notEmpty(),
    body("expiryDate").isDate().bail().notEmpty(),
    body("cvc").isString().bail().notEmpty(),
  ];
};


const UpdateCancelRequestStatusOfOneTimeOrder = () => {
  return [
    body("orderId").isString().bail().notEmpty(),
    body("status")
      .isString()
      .bail()
      .notEmpty()
      .bail()
      .isIn(["Accept", "Reject"])
      .withMessage("Choose Accept or Reject"),
  ];
}

const relaseTransactionRules = () => {
  return [
    body('amount').isInt({gt:0,allow_leading_zeroes:false,min:1}).bail().notEmpty(),
    body('transactionId').isString().bail().notEmpty(),
    body('userId').isString().bail().notEmpty(),
  ];
}


const pauseTransactionRules = () => {
  return [
    body('transactionId').isString().bail().notEmpty(),
  ];
}



const skillRules = () => {
  return [
    body("skill").isString().bail().notEmpty(),
  ]
}


const forgotPasswordRules = () => {
  return [
    body("email").isEmail().bail().notEmpty(),
    body("newPassword").isString().bail().notEmpty(),
    body("confirmPassword").isString().bail().notEmpty(),
  ]
}


// Validate the RULES and returns ERROR response in case of errors and pass to next() in case of correct
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  const extractedError = [];
  errors.array().map((err) => extractedError.push({ [err.param]: err.msg }));
  return res.status(422).json({
    status: "ERROR",
    errors: extractedError,
  });
};




export {
  loginValidationRules,
  signUpValidationRules,
  freelancersValidationRules,
  editProfileServicesRules,
  portfolioAddRules,
  editProfileAboutMeRules,
  OneTimeOrderCreationRules,
  equityOrdereCreationRules,
  deliverOneTimeOrderRules,
  cancelOneTimeOrderRules,
  reviewRules,
  getSpecificWarning,
  requestWarning,
  updateEmailRules,
  updatePasswordRules,
  modifyNotification,
  deleteUserRules,
  getPortfolioByIdRules,
  orderOfferStatusRules,
  acceptWarningRequestRules,
  orderStatusUpdate,
  suspendStatusRules,
  updatePhoneRules,
  addWalletPaymentMethodRules,
  updateEquityOrderStatus,
  deletePortfolioRules,
  UpdateCancelRequestStatusOfOneTimeOrder,
  setRoles,
  deleteUser,
  signUporLoginMobileGoogleRules,
  signUporLoginMobileFacebookRules,
  relaseTransactionRules,
  pauseTransactionRules,
  skillRules,
  forgotPasswordRules,
  startupUpdateNameOrAvatarRules,
  payOutrules,
  validate,
};
