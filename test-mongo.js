require('dotenv').config();
const mongoose = require('mongoose');

console.log('═══════════════════════════════════════');
console.log('🔍 TEST DE CONNEXION MONGODB');
console.log('═══════════════════════════════════════');

// Afficher la variable (masquer le mot de passe)
const uri = process.env.MONGO_URI;
if (!uri) {
  console.log('❌ MONGO_URI est UNDEFINED');
  console.log('💡 Vérifie que la variable existe dans Railway ou .env');
  process.exit(1);
}

// Masquer le mot de passe pour le log
const maskedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
console.log('📍 URI:', maskedUri);
console.log('📏 Longueur:', uri.length, 'caractères');

// Vérifier le format
if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
  console.log('❌ L\'URI doit commencer par mongodb:// ou mongodb+srv://');
  process.exit(1);
}

console.log('🔄 Tentative de connexion...');

mongoose.connect(uri)
  .then(() => {
    console.log('✅✅✅ CONNEXION RÉUSSIE ! ✅✅✅');
    console.log('📊 Base de données connectée:', mongoose.connection.name);
    process.exit(0);
  })
  .catch((err) => {
    console.log('❌❌❌ CONNEXION ÉCHOUÉE ❌❌❌');
    console.log('🔴 Erreur:', err.message);
    
    if (err.message.includes('bad auth')) {
      console.log('💡 MOT DE PASSE INCORRECT ou caractères spéciaux non encodés');
      console.log('💡 Si ton mot de passe contient @ : %40');
      console.log('💡 Si ton mot de passe contient / : %2F');
      console.log('💡 Si ton mot de passe contient : : %3A');
    } else if (err.message.includes('getaddrinfo')) {
      console.log('💡 Nom de cluster incorrect ou problème DNS');
    } else if (err.message.includes('connection timeout')) {
      console.log('💡 IP non autorisée dans MongoDB Atlas');
      console.log('💡 Ajoute 0.0.0.0/0 dans Network Access');
    }
    
    process.exit(1);
  });
