const path = require("path");
const express = require("express");
const dotenv = require("dotenv");

dotenv.config({ path: "config.env" });
const morgan = require("morgan");
require("colors");
const compression = require("compression");
const cors = require("cors");
// const helmet = require("helmet");
// const bodyParser = require("body-parser");
// const cookieParser = require("cookie-parser");
// const proxy = require("http-proxy-middleware");

const ApiError = require("./utils/apiError");
const globalError = require("./middlewares/errorMiddleware");
const mountRoutes = require("./routes");
const { webhookCheckout } = require("./controllers/orderService");

const dbConnection = require("./config/database");

// DB Connection
dbConnection();

// Builtin Middleware
const app = express();
app.use(cors());
app.options("*", cors());
app.use(compression());
app.enable("trust proxy");

app.post(
  "/webhook-checkout",
  express.raw({ type: "application/json" }),
  // bodyParser.raw({ type: "application/json" }),
  webhookCheckout
);
app.use(express.static(path.join(__dirname, "uploads")));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(express.json({ limit: "20kb" }));

// app.use(express.static(path.join(__dirname, "uploads")));
// app.use(express.json({ limit: "20kb" }));
// app.use(helmet());
// app.use(express.json({ limit: "20kb" }));
mountRoutes(app);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
  console.log(`Mode : ${process.env.NODE_ENV}`.yellow);
}

app.all("*", (req, res, next) => {
  // 3) Use a generic api error
  next(new ApiError(`Can't find this route: ${req.originalUrl}`, 400));
});

// Global error handler to catch error from express error
// 2) with refactoring
app.use(globalError);

const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`.green);
});

// we are listening to this unhandled rejection event, which then allow us to handle all
// errors that occur in asynchronous code which were not previously handled
process.on("unhandledRejection", (err) => {
  console.log(err.name, err.message);
  server.close(() => {
    console.log("unhandledRejection!! shutting down...");
    process.exit(1);
  });
});
