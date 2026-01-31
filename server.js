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
app.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Page actuelle (par défaut 1)
        const limit = 20; // Nombre de publications par page
        const skip = (page - 1) * limit; // Nombre à sauter
        
       
        
        // Récupération du texte recherché
const q = req.query.q;

// Filtre MongoDB
let filter = {};

if (q && q.trim() !== "") {
    filter = {
        $or: [
            { title: { $regex: q, $options: "i" } },
            { authors: { $regex: q, $options: "i" } },
            { year: { $regex: q, $options: "i" } }
        ]
    };
}

// Compter total avec filtre
const totalPublications = await db.collection("publications").countDocuments(filter);
const totalPages = Math.ceil(totalPublications / limit);

// Récupérer publications filtrées
const publications = await db.collection("publications")
    .find(filter)
    .skip(skip)
    .limit(limit)
    .toArray();

        const searchParam = q ? `&q=${encodeURIComponent(q)}` : "";

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
                <a href="/stats" class="btn-pagination">📊 Voir les statistiques</a>
<br><br>

                <p>Total : ${totalPublications} publications | Page ${page} sur ${totalPages}</p>
                <form method="GET" action="/" class="search-form">
    <input 
        type="text" 
        name="q" 
        placeholder="Rechercher un titre ou un auteur..."
        value="${req.query.q || ""}"
    >
    <button type="submit">🔍 Rechercher</button>
</form>
<br>

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
        ? `<a href="?page=${page - 1}${searchParam}" class="btn-pagination">← Précédent</a>` 
        : '<span class="btn-pagination disabled">← Précédent</span>'
    }
    
    <span class="page-info">Page ${page} / ${totalPages}</span>
    
    ${page < totalPages 
        ? `<a href="?page=${page + 1}${searchParam}" class="btn-pagination">Suivant →</a>` 
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

// Route Statistiques
app.get("/stats", async (req, res) => {
    try {
        const total = await db.collection("publications").countDocuments();

        const empruntes = await db.collection("publications").countDocuments({
            FIELD9: { $exists: true }
        });

        const disponibles = total - empruntes;

        const pourcentage = total > 0
            ? Math.round((empruntes / total) * 100)
            : 0;

        // Statistiques par type de document
        const typesAgg = await db.collection("publications").aggregate([
            { $group: { _id: "$booktitle", count: { $sum: 1 } } }
        ]).toArray();

        const typesLabels = typesAgg.map(t => t._id || 'Non spécifié');
        const typesCounts = typesAgg.map(t => t.count);

        const html = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Statistiques Médiathèque</title>
            <link rel="stylesheet" href="/style.css">
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        </head>
        <body>
            <div class="container">
                <h1>📊 Statistiques de la médiathèque</h1>

                <hr>
                <h2>📈 Documents empruntés vs disponibles</h2>
                <canvas id="statsChart" width="400" height="400"></canvas>

                <ul style="font-size:18px;">
                    <li>Total documents : <strong>${total}</strong></li>
                    <li>Documents empruntés : <strong>${empruntes}</strong></li>
                    <li>Documents disponibles : <strong>${disponibles}</strong></li>
                    <li>Pourcentage emprunté : <strong>${pourcentage}%</strong></li>
                </ul>

                <hr>
                <h2>📊 Répartition par type de document</h2>
                <canvas id="typeChart" width="400" height="400"></canvas>

                <a href="/" class="btn-pagination">⬅ Retour au catalogue</a>
            </div>

            <script>

                // Camembert empruntés vs disponibles
                const ctx = document.getElementById('statsChart').getContext('2d');
                new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Disponibles', 'Empruntés'],
                        datasets: [{
                            data: [${disponibles}, ${empruntes}],
                            backgroundColor: ['#4CAF50', '#FF9800'],
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { position: 'bottom' } }
                    }
                });

                // Diagramme par type de document
                const ctx2 = document.getElementById('typeChart').getContext('2d');
                new Chart(ctx2, {
                    type: 'bar',
                    data: {
                        labels: ${JSON.stringify(typesLabels)},
                        datasets: [{
                            label: 'Nombre de documents',
                            data: ${JSON.stringify(typesCounts)},
                            backgroundColor: '#2196F3'
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true } }
                    }
                });
            </script>
        </body>
        </html>
        `;

        res.send(html);
    } catch (error) {
        res.status(500).send("Erreur stats : " + error.message);
    }
});

// Démarrage
connectDB().then(() => {
    app.listen(port, () => {
        console.log(`🚀 Serveur démarré sur http://localhost:${port}`);
    });
});