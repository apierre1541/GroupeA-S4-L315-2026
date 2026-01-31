const express = require("express");
const app = express();

const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');

mongoose.connect("mongodb+srv://axpierrelim_db_user:mango@cluster0.lrrdd5t.mongodb.net/maxpierrelim_db_user?appName=Cluster0");
app.set("view engine", "ejs");

//app.use(express.static("public"));

app.use(bodyParser.urlencoded({extended:false}));

const User = require("./models/user")

const methodOverride = require("method-override");
const flash = require("connect-flash");

app.get("/", function(req, res){
    res.render("Page_accueil");
});

app.get("/inscription", function(req, res){
    res.render("inscription")
});

app.listen(3000, function(req, res){
    console.log("tout marche bien!");
})

