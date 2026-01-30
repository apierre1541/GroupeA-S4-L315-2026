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

// Route principale - Liste des publications avec pagination
// Route principale - Liste des publications avec pagination
app.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Page actuelle (par défaut 1)
        const limit = 20; // Nombre de publications par page
        const skip = (page - 1) * limit; // Nombre à sauter
        
        // Compter le total de publications
        const totalPublications = await db.collection('publications').countDocuments();
        const totalPages = Math.ceil(totalPublications / limit);
        
        // Récupérer les publications de la page actuelle
        const publications = await db.collection('publications')
            .find()
            .skip(skip)
            .limit(limit)
            .toArray();
        
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
                <h1>📚 Médiathèque</h1>
                <p>Total : ${totalPublications} publications | Page ${page} sur ${totalPages}</p>
                
                <div class="publications-list">
                    ${publications.map(pub => `
                        <div class="document-card">
                            <h3>${pub.title || 'Sans titre'}</h3>
                            <p><strong>Auteur(s) :</strong> ${
                                pub.authors && pub.authors.length > 0 
                                    ? pub.authors.join(', ') 
                                    : 'Inconnu'
                            }</p>
                            <p><strong>Type :</strong> ${pub.booktitle || 'Non spécifié'}</p>
                            <p><strong>Année :</strong> ${pub.year || 'N/A'}</p>
                            <p><strong>URL :</strong> ${
                                pub.url 
                                    ? `<a href="https://dblp.org/${pub.url}" target="_blank">Voir sur DBLP</a>` 
                                    : 'N/A'
                            }</p>
                            <p><strong>Statut :</strong> 
                                ${pub.FIELD9 ? '<span style="color: orange;">Emprunté</span>' : '<span style="color: green;">Disponible</span>'}
                            </p>
                            ${pub.FIELD9 
                            ? `<button class="retour" onclick="retourner('${pub._id.replace(/'/g, "\\'")}')">📥 Retourner</button>`
                            : `<button onclick="emprunter('${pub._id.replace(/'/g, "\\'")}')">📤 Emprunter</button>`
                        }
                        </div>
                    `).join('')}
                </div>
                
                <!-- Pagination -->
                <div class="pagination">
                    ${page > 1 
                        ? `<a href="?page=${page - 1}" class="btn-pagination">← Précédent</a>` 
                        : '<span class="btn-pagination disabled">← Précédent</span>'
                    }
                    
                    <span class="page-info">Page ${page} / ${totalPages}</span>
                    
                    ${page < totalPages 
                        ? `<a href="?page=${page + 1}" class="btn-pagination">Suivant →</a>` 
                        : '<span class="btn-pagination disabled">Suivant →</span>'
                    }
                </div>
            </div>
            
            <script>
                function emprunter(id) {
    if (confirm('Emprunter ce document ?')) {
        fetch('/emprunter/' + encodeURIComponent(id), { method: 'POST' })
                            .then(() => location.reload());
                    }
                }
                
                function retourner(id) {
    if (confirm('Retourner ce document ?')) {
        fetch('/retourner/' + encodeURIComponent(id), { method: 'POST' })
                            .then(() => location.reload());
                    }
                }
            </script>
        </body>
        </html>
        `;
        res.send(html);
    } catch (error) {
        res.status(500).send('Erreur serveur: ' + error.message);
    }
});
// Middleware pour parser les données POST
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route pour emprunter un document
app.post('/emprunter/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Mettre à jour le document avec FIELD9 = "emprunté"
        await db.collection('publications').updateOne(
            { _id: id },
            { $set: { FIELD9: 'emprunté' } }
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur emprunter:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Route pour retourner un document
app.post('/retourner/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Mettre à jour le document avec FIELD9 = null (ou supprimer le champ)
        await db.collection('publications').updateOne(
            { _id: id },
            { $unset: { FIELD9: '' } }  // Supprime le champ FIELD9
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erreur retourner:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// Démarrage
connectDB().then(() => {
    app.listen(port, () => {
        console.log(`🚀 Serveur démarré sur http://localhost:${port}`);
    });
});