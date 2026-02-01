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

app.get("/", async function(req, res){
    try {
        // Paramètres de recherche
        const searchQuery = req.query.q || '';
        const type = req.query.type || '';
        const statut = req.query.statut || '';
        const tri = req.query.tri || 'alphabetique';
        const page = parseInt(req.query.page) || 1;
        const action = req.query.action;
        const livreId = req.query.livreId;
        console.log("Paramètres:", { searchQuery, type, statut, tri, page, action, livreId });
        if (action && livreId) {
            try {
                const db = mongoose.connection.db;
                const ObjectId = require('mongodb').ObjectId;
                const queryId = livreId.match(/^[0-9a-fA-F]{24}$/) ? new ObjectId(livreId) : livreId;
                
                if (action === 'emprunter') {
                    await db.collection('Bibliotheque').updateOne(
                        { _id: queryId },
                        { $set: { FIELD9: 'emprunté' } }
                    );
                    console.log(`✅ Livre ${livreId} emprunté`);
                } else if (action === 'retourner') {
                    await db.collection('Bibliotheque').updateOne(
                        { _id: queryId },
                        { $set: { FIELD9: '' } }
                    );
                    console.log(`✅ Livre ${livreId} retourné`);
                }
                const redirectParams = new URLSearchParams({
                    q: searchQuery,
                    type: type,
                    statut: statut,
                    tri: tri,
                    page: page
                }).toString();
                
                return res.redirect(`/?${redirectParams}`);
                
            } catch (actionError) {
                console.error('Erreur action:', actionError);
            }
        }
        const limit = 9;
        const skip = (page - 1) * limit;
        let query = {};
        if (searchQuery) {
            query.$or = [
                { "fields.titre_avec_lien_vers_le_catalogue": { $regex: searchQuery, $options: 'i' } },
                { "fields.auteur": { $regex: searchQuery, $options: 'i' } }
            ];
        }
        if (type) {
            query["fields.type_de_document"] = type;
        }
        if (statut === 'disponible') {
            query.FIELD9 = { $ne: 'emprunté' };
        } else if (statut === 'emprunte') {
            query.FIELD9 = 'emprunté';
        }
        let sortOption = {};
        switch(tri) {
            case 'auteur':
                sortOption = { "fields.auteur": 1 };
                break;
            case 'reservations':
                sortOption = { "fields.nombre_de_reservations": -1 };
                break;
            case 'rang':
                sortOption = { "fields.rang": 1 };
                break;
            default:
                sortOption = { "fields.titre_avec_lien_vers_le_catalogue": 1 };
        }
        const total = await mongoose.connection.db
            .collection('Bibliotheque') 
            .countDocuments(query);
        
        console.log(`📚 ${total} documents trouvés avec les filtres`);
        const livres = await mongoose.connection.db
            .collection('Bibliotheque') 
            .find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(limit)
            .toArray();
        
        console.log(`${livres.length} livres récupérés pour la page ${page}`);
        const livresFormates = livres.map(livre => {
            const fields = livre.fields || {};
            return {
                _id: livre._id, 
                titre: fields.titre_avec_lien_vers_le_catalogue || 'Titre inconnu',
                auteur: fields.auteur || 'Auteur non spécifié',
                type: fields.type_de_document || 'Non spécifié',
                statut: livre.FIELD9 === 'emprunté' ? 'Emprunté' : 'Disponible',
                FIELD9: livre.FIELD9 || '',
                reservations: fields.nombre_de_reservations || 0,
                rang: fields.rang || 0
            };
        });
        const pages = Math.ceil(total / limit);
        res.render("Page_accueil", {
            livres: livresFormates,
            count: livresFormates.length,
            total: total,
            page: page,
            pages: pages,
            limit: limit,
            searchQuery: searchQuery,
            type: type,
            statut: statut,
            tri: tri,
            user: req.user || null
        });
    } catch (error) {
        console.error("Erreur:", error);
        res.render("Page_accueil", {
            livres: [],
            count: 0,
            total: 0,
            page: 1,
            pages: 1,
            limit: 9,
            searchQuery: "",
            type: "",
            statut: "",
            tri: "alphabetique",
            user: req.user || null
        });
    }
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

app.get("/stats", async (req, res) => {
    try {
        let total = 0;
        let empruntes = 0;
        
        try {
            const db = mongoose.connection.db || mongoose.connection;
            total = await db.collection("Bibliotheque").countDocuments();
            empruntes = await db.collection("Bibliotheque").countDocuments({
                FIELD9: { $exists: true, $ne: '' }
            });
        } catch (dbError) {
            console.log('Erreur base de données, utilisation des valeurs par défaut:', dbError.message);
            total = 0;
            empruntes = 0;
        }
        
        const disponibles = total - empruntes;
        const pourcentage = total > 0 ? Math.round((empruntes / total) * 100) : 0;
        const pourcentageDisponibles = 100 - pourcentage;

        console.log('📊 Données envoyées au template:', {
            total, empruntes, disponibles, pourcentage, pourcentageDisponibles
        });
        
        res.render("statistiques", {
            title: "Statistiques de la médiathèque", 
            total: total,
            empruntes: empruntes,
            disponibles: disponibles,
            pourcentage: pourcentage,
            pourcentageDisponibles: pourcentageDisponibles
        });
        
    } catch (error) {
        console.error('Erreur globale stats:', error);
        res.render("statistiques", {
            title: "Statistiques de la médiathèque", 
            total: 0,
            empruntes: 0,
            disponibles: 0,
            pourcentage: 0,
            pourcentageDisponibles: 100
        });
    }
});

app.listen(3000, function(req, res){
    console.log("tout marche bien!");
})

