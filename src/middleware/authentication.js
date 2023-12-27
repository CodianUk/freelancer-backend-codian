import jwt from "jsonwebtoken";
import ValidationError from "../errors/validationError.js";
import passport from "passport";
import GoogleStrategyPassport from "passport-google-oauth2";
const GoogleStrategy = GoogleStrategyPassport.Strategy;
import FacebookStrategyPassport from "passport-facebook";
const FacebookStrategy = FacebookStrategyPassport.Strategy;

import { User } from "../models/user.js";

import UnAuthorized from "../errors/unAuthorized.js";

// Google Strategy
const google = passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      passReqToCallback: true,
      accessType: "offline",
    },
    async (request, accessToken, refreshToken, profile, done) => {
      try {
        let foundUser = await User.findOne({ googleId: profile.id });
        if (!foundUser) {
          let createdUser = await User.create(
            new User({
              googleId: profile.id,
              name: profile.displayName,
              email: profile.email,
              avatar: profile.picture,
              emailVerified: profile.email_verified,
              authType: "google",
            })
          );
          if (!createdUser) {
            let err = new Error("Something went Wrong");
            return done(err, false);
          }
          await Wallet.create({ userId: createdUser._id });
          //  Creating our backend logic acces token not using googles access token
          // let accessToken = accessTokenGenerator(createdUser);
          return done(null, createdUser);
        }
        //  Creating our backend logic acces token not using googles access token
        // let accessToken = accessTokenGenerator(foundUser);
        if (foundUser.status === "Suspended") {
          let err = new UnAuthorized("You are suspended Contact Admin");
          return next(err);
        }
        if (foundUser.isDeleted) {
          let err = new UnAuthorized("Your account has been deleted");
          return next(err);
        }
        return done(null, foundUser);
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

//facebook oauth strategy
// const facebook = passport.use(new FacebookStrategy({
// clientID: process.env.FACEBOOK_APP_ID,
// clientSecret: process.env.FACEBOOK_APP_SECRET,
//   callbackURL: process.env.FACEBOOK_CALLBACK_URL,
//   profileFields: ['id', 'displayName', 'photos', 'emails']

// },
// async function(accessToken, refreshToken, profile, cb) {
//   try {
//     let foundUser = await User.findOne({ facebookId: profile.id });
//     if (!foundUser) {
//       let createdUser = await User.create(
//         new User({
//           facebookId: profile.id,
//           name: profile.displayName,
//           email: profile.emails !== undefined && profile.emails[0].value,
//           avatar: profile.picture,
//           emailVerified: profile.email_verified,
//           authType: "facebook",
//         })
//       );
//       if (!createdUser) {
//         let err = new Error("Something went Wrong");
//         return done(err, false);
//       }
//       await Wallet.create({userId: createdUser._id});
//       //  Creating our backend logic acces token not using googles access token
//       // let accessToken = accessTokenGenerator(createdUser);
//       return done(null, createdUser);
//     }
//     //  Creating our backend logic acces token not using googles access token
//     // let accessToken = accessTokenGenerator(foundUser);
//     if(foundUser.status === "Suspended"){
//       let err = new UnAuthorized("You are suspended Contact Admin");
//       return next(err);
//     }
//     if(foundUser.isDeleted){
//       let err = new UnAuthorized("Your account has been deleted");
//       return next(err);
//     }
//     return done(null, foundUser);
//   } catch (err) {
//     return done(err, false);
//   }
// }
// ));

// Serialize and deserialize user
passport.serializeUser((user, cb) => {
  cb(null, user._id);
});
passport.deserializeUser((id, cb) => {
  User.findById(id, (err, user) => {
    if (err) {
      return cb(err);
    }
    cb(null, user);
  });
});

const accessTokenGenerator = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      role: user.role,
      email: user.email,
      // admin: user.admin,
    },
    process.env.ACCESS_TOKEN_SECRET_KEY,
    {
      // expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

const refreshTokenGenerator = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      role: user.role,
      email: user.email,
    },
    process.env.REFRESH_TOKEN_SECRET_KEY
  );
};

const accessTokenVerify = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return next(new ValidationError("Access token is required"));
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return next(new ValidationError("Access token is required"));
  } else {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET_KEY, (err, user) => {
      if (err) {
        return next(new UnAuthorized("You are not authorized"));
      } else if (user) {
        req.user = user;
        return next();
      }
      return next(new Error("Something went wrong"));
    });
  }
};

const optionalAccessTokenVerify = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return next();
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return next();
  } else {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET_KEY, (err, user) => {
      if (err) {
        return next();
      } else if (user) {
        req.user = user;
        return next();
      }
      return next(new Error("Something went wrong"));
    });
  }
};

const startup = (req, res, next) => {
  if (req.user.role === "Startup Owner") {
    return next();
  }
  return next(new UnAuthorized("You are not authorized to access this route"));
};

const freelancer = (req, res, next) => {
  if (req.user.role === "Freelancer") {
    return next();
  }
  return next(new UnAuthorized("You are not authorized to access this route"));
};

const admin = (req, res, next) => {
  if (req.user.role === "Admin") {
    return next();
  }
  return next(new UnAuthorized("You are not authorized to access this route"));
};

export {
  accessTokenGenerator,
  refreshTokenGenerator,
  accessTokenVerify,
  optionalAccessTokenVerify,
  startup,
  freelancer,
  admin,
  google,
  // facebook
};
