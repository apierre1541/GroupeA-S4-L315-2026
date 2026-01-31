const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const methodOverride = require("method-override");
const flash = require("connect-flash");

app.set("view engine", "ejs");
//app.use(express.static("public"));

app.get("/", function(req, res){
    res.render("Page_accueil");
})
app.listen(3000, function(req, res){
    console.log("tout marche bien!");
})