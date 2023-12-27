import CustomError from "../errors/cutomError.js";

const errorHandler = (err, req, res, next) => {
  if (err instanceof CustomError) {
    return res.status(err.statusCode).json({ status: "ERROR", error: err });
  }
  res.status(500 || err.statusCode).json({
    status: "ERROR",
    error: { message: err.message || "Some error occured!" },
  });
};

export default errorHandler;
