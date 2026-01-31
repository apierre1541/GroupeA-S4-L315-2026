const express = require("express");
const app = express();
app.use(express.urlencoded({ extended: true }));

const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const bcrypt = require("bcrypt");

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

app.post("/inscription", async function(req, res){
    try {
        const saltRounds = 10;
        const hash = await bcrypt.hash(req.body.password, saltRounds);
        const newUser = await User.create({
            username: req.body.username,
            password: hash
        });
        console.log("Utilisateur créé:", newUser.username);
        res.render("Page_accueil")
        
    } catch(err) {
        console.error("Erreur lors de l'inscription:", err);
        res.status(500).send("Erreur lors de l'inscription: " + err.message);
    }
});

app.get("/connexion", function(req, res){
    res.render("connexion")
});

app.post("/connexion", async function(req, res){
    try {
        console.log("Tentative de connexion avec:", req.body.username);
        const foundUser = await User.findOne({ 
            username: req.body.username 
        });
        if (!foundUser) {
            console.log("Utilisateur non trouvé:", req.body.username);
            return res.status(401).send("Utilisateur non trouvé");
        }
        const passwordMatch = await bcrypt.compare(
            req.body.password, 
            foundUser.password
        );
        if (passwordMatch) {
            console.log("Connexion réussie pour:", foundUser.username);
            res.render("Page_accueil");
        } else {
            console.log("Mot de passe incorrect pour:", foundUser.username);
            res.status(401).send("Mot de passe incorrect");
        }
        
    } catch(err) {
        console.error("Erreur lors de la connexion:", err);
        res.status(500).send("Erreur serveur");
    }
});

app.listen(3000, function(req, res){
    console.log("tout marche bien!");
})

