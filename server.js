require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

// Servir les fichiers statiques
app.use(express.static('public'));

// Configuration MongoDB
const client = new MongoClient(process.env.MONGODB_URI);
let db;

// Connexion à MongoDB
async function connectDB() {
    try {
        await client.connect();
        db = client.db(); // Utilise la base spécifiée dans l'URI
        console.log('✅ Connecté à MongoDB');
    } catch (error) {
        console.error('❌ Erreur de connexion MongoDB:', error);
        process.exit(1);
    }
}

// Route de test
app.get('/', async (req, res) => {
    try {
        const count = await db.collection('publications').countDocuments();
        const html = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Médiathèque</title>
            <link rel="stylesheet" href="/style.css">
        </head>
        <body>
            <div class="container">
                <h1>Médiathèque</h1>
                <p>✅ Connexion réussie !</p>
                <p>Nombre de publications dans la base : <strong>${count}</strong></p>
            </div>
        </body>
        </html>
        `;
        res.send(html);
    } catch (error) {
        res.status(500).send('Erreur serveur: ' + error.message);
    }
});

// Démarrage
connectDB().then(() => {
    app.listen(port, () => {
        console.log(`🚀 Serveur démarré sur http://localhost:${port}`);
    });
});