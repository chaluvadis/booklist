import dao from "./node-dest/dataAccess/dao";

import express from "express";
const app = express();
import path from "path";
import bodyParser from "body-parser";
import session from "express-session";
import cookieParser from "cookie-parser";
import fs from "fs";
import mkdirp from "mkdirp";
import Jimp from "jimp";
import compression from "compression";

const hour = 3600000;
const rememberMeExpiration = 2 * 365 * 24 * hour; //2 years

import multer from "multer";

if (!process.env.IS_DEV) {
  app.use(function ensureSec(request, response, next) {
    let proto = request.header("x-forwarded-proto") || request.header("X-Forwarded-Proto") || request.get("X-Forwarded-Proto"),
      secure = proto == "https";
    if (secure) {
      return next();
    } else {
      response.redirect("https://" + request.headers.host + request.url);
    }
  });
}

app.use(compression());
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(
  bodyParser.urlencoded({
    // to support URL-encoded bodies
    extended: true
  })
);
app.use(cookieParser());
app.use(session({ secret: "adam_booklist", saveUninitialized: true, resave: true }));

import expressWsImport from "express-ws";
const expressWs = expressWsImport(app);

app.use("/static/", express.static(__dirname + "/static/"));
app.use("/node_modules/", express.static(__dirname + "/node_modules/"));
app.use("/react-redux/", express.static(__dirname + "/react-redux/"));
app.use("/utils/", express.static(__dirname + "/utils/"));
app.use("/uploads/", express.static(__dirname + "/uploads/"));

import { easyControllers } from "easy-express-controllers";
easyControllers.createAllControllers(app, { fileTest: f => !/-es6.js$/.test(f) }, { __dirname: "./node-dest" });

app.get("/", browseToReactRedux);
app.get("/books", browseToReactRedux);
app.get("/login", browseToReactRedux);
app.get("/subjects", browseToReactRedux);
app.get("/settings", browseToReactRedux);
app.get("/scan", browseToReactRedux);
app.get("/home", browseToReactRedux);
app.get("/view", browseToReactRedux);
app.get("/react-redux", browseToReactRedux);
app.get("/service-worker.js", (request, response) => {
  response.sendFile(path.join(__dirname + "/react-redux/dist/service-worker.js"));
});

function browseToReactRedux(request, response) {
  if (!!request.user) {
  } else {
    response.clearCookie("logged_in");
    response.clearCookie("remember_me");
    response.clearCookie("userId");
  }
  response.sendFile(path.join(__dirname + "/react-redux/default.htm"));
}

app.get("/favicon.ico", function(request, response) {
  response.sendFile(path.join(__dirname + "/favicon.ico"));
});

const multerBookCoverUploadStorage = multer.diskStorage({
  destination(req, file, cb) {
    if (!req.user.id) {
      cb("Not logged in");
    } else {
      let path = `./uploads/${req.user.id}/coverUpload`;

      fs.stat(path, function(err) {
        if (err) {
          mkdirp(path, (err, res) => cb(err, path));
        } else {
          cb(null, path);
        }
      });
    }
  },
  filename(req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: multerBookCoverUploadStorage });

//TODO: refactor to be a controller action - will require middleware in easy-express-controllers which doesn't currently exist
app.post("/react-redux/upload", upload.single("fileUploaded"), function(req, response) {
  //req.body.___ still has manual fields sent over
  if (req.file.size > 900000) {
    return response.send({ success: false, error: "Max size is 500K" });
  }

  let pathResult = path.normalize(req.file.destination).replace(/\\/g, "/"),
    pathToFileUploaded = `${pathResult}/${req.file.originalname}`,
    ext = (path.extname(pathToFileUploaded) || "").toLowerCase();

  try {
    Jimp.read(pathToFileUploaded, function(err, image) {
      if (err) {
        return response.send({ success: false, error: "Error opening file. Is it a valid image?" });
      }
      image.exifRotate();

      processImageAsNeeded(image);
    });
  } catch (err) {
    return response.send({ success: false, error: "Error opening file. Is it a valid image?" });
  }

  function processImageAsNeeded(image) {
    if (image.bitmap.width > 55) {
      let width = image.bitmap.width,
        height = image.bitmap.height,
        newWidth = height * 50 / width;

      image.resize(50, newWidth);
      let resizedDestination = `${pathResult}/resized_${req.file.originalname}`;

      image.write(resizedDestination, err => {
        response.send({ success: true, smallImagePath: "/" + resizedDestination }); //absolute for client, since it'll be react-redux base (or something else someday, perhaps)
      });
    } else {
      response.send({ success: true, smallImagePath: `/${pathResult}/${req.file.originalname}` }); //absolute for client, since it'll be react-redux base (or something else someday, perhaps)
    }
  }
});

app.get("/activate", browseToReactRedux);

export default null;
