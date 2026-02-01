const express = require("express");
const app = express();
app.use(express.urlencoded({ extended: false }));

const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const randToken = require("rand-token");
const nodemailer = require("nodemailer")
//const bcrypt = require("bcrypt");

const session = require("express-session");
const passport = require("passport");
//const passportLocalMongoose = require("passport-local-mongoose");

const User = require("./models/user")
const Reset = require("./models/reset")

app.use(session({
    secret: "mysecret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://axpierrelim_db_user:mango@cluster0.lrrdd5t.mongodb.net/maxpierrelim_db_user?appName=Cluster0");

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.set("view engine", "ejs");

//app.use(express.static("public"));


const methodOverride = require("method-override");
const flash = require("connect-flash");
app.use(flash());
app.use(function(req,res,next){
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success")
    next();
})


const reset = require("./models/reset");

app.get("/", function(req, res){
    res.render("Page_accueil");
});

app.get("/inscription", function(req, res){
    res.render("inscription")
});

app.post("/inscription", function(req, res){
    const newUser = new User({
        username: req.body.username
    });
    User.register(newUser, req.body.password, function(err,user){
        if (err){
            console.log(err);
            return res.render("inscription");
        }else{
            passport.authenticate("local")(req, res,function(){
                res.render("inscription");
            });
        }
    });
});
    
app.get("/connexion", function(req, res){
    res.render("connexion")
});

app.post("/connexion", function(req, res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("inscription");
            })
        }
    })
});

app.get("/deconnexion", function(req, res){
    req.logout(function(err) {
        if (err) {
            console.log("Erreur déconnexion:", err);
            return res.redirect("/");
        }
        req.flash("success","Tu es maintenant déconnecter");
        res.redirect("/connexion");
    });
});

app.get("/oublie_password", function(req, res){
    res.render("password_oublier")
});

app.post("/oublie_password", async function(req, res){
    try {
        const userFound = await User.findOne({username: req.body.username});
        
        if (!userFound) {
            return res.redirect("/connexion");
        }
        const token = randToken.generate(16);
        await Reset.create({
            username: userFound.username,
            resetPasswordToken: token,
            resetPasswordExpires: Date.now() + 3600000
        });
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'code36093@gmail.com',
                pass: '1234'
            }
        });
        
        const mailOptions = {
            from: 'code36093@gmail.com',
            to: req.body.username,
            subject: 'Link to reset your password',
            text: 'Click on this link to reset your password: http://localhost:3000/renitialiser/' + token
        };
        
        console.log("Le mail est prêt à être envoyé");
        
        await transporter.sendMail(mailOptions);
        
        console.log("Email envoyé avec succès");
        res.redirect("/connexion");
        
    } catch(err) {
        console.log("Erreur:", err);
        res.redirect("/connexion");
    }
});

app.get("/renitialiser/:token", async (req, res) => {
    try {
        const resetObj = await Reset.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        
        if (!resetObj) {
            console.log("Token invalide/expiré");
            return res.redirect('/connexion');
        }
        res.render('renitialiser', { token: req.params.token });
    } catch(err) {
        console.error(err);
        res.redirect('/connexion');
    }
});

app.post("/renitialiser/:token", async function(req, res) {
    try {
        const resetObj = await Reset.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        if (!resetObj) {
            console.log("Token expiré ou invalide");
            return res.redirect('/connexion');
        }
        if (req.body.password !== req.body.password2) {
            console.log("Mots de passe ne correspondent pas");
            return res.render('renitialiser', {
                token: req.params.token,
                error: "Les mots de passe ne correspondent pas"
            });
        }
        const user = await User.findOne({ username: resetObj.username });
        if (!user) {
            console.log("Utilisateur non trouvé");
            return res.redirect('/connexion');
        }
        await new Promise((resolve, reject) => {
            user.setPassword(req.body.password, function(err) {
                if (err) reject(err);
                else resolve();
            });
        });
        await user.save();
        await Reset.findOneAndUpdate(
            { resetPasswordToken: req.params.token },
            { 
                resetPasswordToken: null,
                resetPasswordExpires: null 
            }
        );
        console.log("Mot de passe changé pour:", user.username);
        res.redirect("/connexion");
    } catch(err) {
        console.error("Erreur:", err);
        res.redirect('/connexion');
    }
});

function isLoggedIn(req, res,next){
    if(req.isAuthenticated()){
        return next();
    }else{
        res.redirect("/connexion")
    }
}


app.listen(3000, function(req, res){
    console.log("tout marche bien!");
})

