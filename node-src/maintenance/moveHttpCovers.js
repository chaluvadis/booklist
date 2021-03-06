import AWS from "aws-sdk";

AWS.config.region = "us-east-1";

import fs from "fs";
import path from "path";
import request from "request";
import http from "http";
import DAO from "../dataAccess/dao";
import del from "del";
import { ObjectId } from "mongodb";

let dao = new DAO();

//convertAllManual();
convertAllAmazon();

async function convertAllManual() {
  let db = await DAO.init();
  let toConvert = await db
    .collection("books")
    .find({ smallImage: { $regex: /http:\/\/my-library-cover-uploads/ } })
    .toArray();

  for (let book of toConvert) {
    let namePart = book.smallImage
      .toLowerCase()
      .replace("http://my-library-cover-uploads.s3-website-us-east-1.amazonaws.com/", "")
      .replace(/\.jpg$/, "")
      .replace(/\.jpeg$/, "")
      .replace(/\.png$/, "");

    if (namePart.indexOf(".") >= 0 || namePart.indexOf(",") >= 0) {
      let newURL = await convertFile(book.smallImage, book.userId, book._id);
      await db.collection("books").update({ _id: ObjectId(book._id) }, { $set: { smallImage: newURL } });
      console.log(book.title, "Converted", "\n");
    }
  }

  DAO.shutdown();
}

async function convertAllAmazon() {
  let db = await DAO.init();
  let toConvert = await db
    .collection("books")
    .find({ smallImage: { $regex: /http:\/\/ecx/ } })
    .toArray();

  for (let book of toConvert) {
    let newURL = await convertFile(book.smallImage, book.userId, book._id);
    await db.collection("books").update({ _id: ObjectId(book._id) }, { $set: { smallImage: newURL } });
    console.log(book.title, "Converted", "\n");
  }

  DAO.shutdown();
}

/*
convertFile("http://ecx.images-amazon.com/images/I/513GMmespwL._SL75_.jpg", "1123", "556")
  .then(path => console.log("SUCCEED", path))
  .catch(err => console.log("ERR", err));
*/

let i = 1;
function convertFile(url, userId, _id) {
  return new Promise((res, rej) => {
    let s3bucket = new AWS.S3({ params: { Bucket: "my-library-cover-uploads" } });
    let ext = path.extname(url);
    let fileName = "junk-" + i++ + ext;
    let file = fs.createWriteStream(fileName);

    request(url)
      .pipe(file)
      .on("finish", () => {
        file.close();

        fs.readFile("./" + fileName, (err, data) => {
          if (err) {
            return rej(err);
          }
          let params = {
            Key: `bookCovers/${userId}/converted-cover-${_id}${ext}`,
            Body: data
          };

          s3bucket.upload(params, function(err) {
            if (err) rej(err);
            else res(`http://my-library-cover-uploads.s3-website-us-east-1.amazonaws.com/${params.Key}`);
          });
        });
      });
  });
}
