Voici un exemple de README pour votre projet Angular/Node.js de gestion des items et des runes pour optimiser le brisage dans Dofus.

---

# Easy Breaking - Optimisation du Brisage pour Dofus

## Description

**Easy Breaking** est un outil interactif développé en Angular avec un backend en Node.js permettant aux joueurs de **Dofus** de choisir un item, de renseigner le taux de brisage souhaité, et d'obtenir toutes les informations nécessaires pour maximiser la rentabilité de leur brisage. L'application aide les utilisateurs à évaluer le **coût des items** et les statistiques nécessaires pour optimiser la rentabilité de leur brisage, en prenant en compte les prix spécifiques aux serveurs de Dofus.

## Fonctionnalités

- **Sélection d’items** : Choisissez un item parmi une liste d'armes et d'équipements disponibles et renseignez le taux de brisage.
- **Calcul des bénéfices** : Affichage des Kamas potentiels gagnés en fonction des runes générées, avec des indicateurs visuels de rentabilité.
- **Mise à jour des prix des runes** : Enregistrez les prix actuels des runes Pa, Ra et standard pour correspondre aux tarifs spécifiques du serveur de jeu.
- **Copie rapide d’ingrédients** : Cliquez sur les ingrédients pour copier leur nom dans le presse-papiers.
- **Estimation de la rentabilité et des seuils de profit** : Définissez un seuil de rentabilité et découvrez jusqu’à quel taux de brisage il reste rentable de briser l’item.
- **Stockage en local** : Les données des runes sont stockées localement pour un chargement rapide sans recharger le serveur à chaque consultation.

## Structure du Projet

### Frontend (Angular)

1. **Page d'accueil (home.component.html et home.component.ts)**
   - Permet de sélectionner un item et de renseigner les informations nécessaires, notamment le taux de brisage, le coût de production et le taux de rentabilité visé.
   - Affiche les détails de rentabilité, les effets de l'item sélectionné, et les statistiques calculées, telles que les Kamas obtenus, le coût de production, et les runes fusionnées.

2. **Page de gestion des runes (runes-manager.component.html et runes-manager.component.ts)**
   - Interface pour saisir et mettre à jour les prix des runes pour le serveur Dofus actuel.
   - Affiche une liste des runes, chacune ayant des champs de saisie pour les prix des runes standard, Pa, et Ra.
   - Bouton d’enregistrement pour sauvegarder les changements.

### Backend (Node.js)
   - Le backend gère le serveur de l’application, stocke les fichiers JSON des items et des runes, et s’assure que l’interface client peut charger ces données.
   - API exposées pour récupérer et mettre à jour les données stockées sur le serveur.

## Prérequis

- **Node.js** et **npm**
- **Angular CLI** (pour le frontend)

## Installation

1. Clonez le dépôt :

   ```bash
   git clone https://github.com/yourusername/easy-breaking.git
   cd easy-breaking
   ```

2. Installez les dépendances :

   ```bash
   npm install
   ```

3. Lancez le backend Node.js :

   ```bash
   node server.js
   ```

4. Dans un autre terminal, lancez l’application Angular :

   ```bash
   ng serve
   ```

5. Accédez à l'application dans votre navigateur via `http://localhost:4200`.

## Utilisation

### Page d'accueil - Sélection de l'item et du taux de brisage

1. Dans la barre de recherche, entrez le nom de l’item que vous souhaitez briser.
2. Renseignez le **taux de brisage** souhaité et, si nécessaire, le **prix du craft** et le **taux de rentabilité visé**.
3. L'application affiche :
   - Les **détails des runes obtenues**, leurs quantités et les Kamas potentiels gagnés.
   - Le taux de rentabilité en fonction des valeurs fournies.
   - La **fusion de runes** si applicable, et le type de rune à fusionner (Pa, Ra) pour optimiser le brisage.

### Page de gestion des prix des runes

1. Accédez à la page de gestion des runes via l'icône dans le coin de l'interface.
2. Saisissez les prix des runes standard, Pa, et Ra selon les tarifs de votre serveur.
3. Cliquez sur **Enregistrer** pour sauvegarder les changements.

## Exemples de Calcul de Rentabilité

### Détermination des Couleurs d’Indicateurs
Les cellules de l'interface changent de couleur selon la rentabilité :
- **Vert** : Rentabilité supérieure au taux visé.
- **Jaune** : Rentabilité inférieure au taux visé, mais toujours rentable.
- **Rouge** : Non rentable.

## Structure des Données

Les données des items et des runes sont stockées sous forme de fichiers JSON localisés dans `assets/jsons/`. Le projet charge ces données au démarrage et stocke en local les informations sur les runes.