import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");

app.get("/", (req, res) => res.render("home"));
app.use("/public", express.static(__dirname + "/public"));

const hadleListen = () => {
  console.log("working!");
};
app.listen(3000, hadleListen);
