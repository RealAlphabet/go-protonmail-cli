#!/bin/bash

set -e

# Vérifie si les fichiers de configuration existent, sinon les copie depuis les exemples
if [ ! -f bin/config.json ]; then
    echo "Copie du fichier de configuration exemple..."
    cp bin/config.json.example bin/config.json
    echo "⚠️  N'oubliez pas de configurer bin/config.json avec vos identifiants"
fi

# Vérifie si le fichier cookies.json existe, sinon le copie depuis l'exemple
if [ ! -f bin/cookies.json ]; then
    echo "Copie du fichier cookies exemple..."
    cp bin/cookies.json.example bin/cookies.json
fi

# Installation des dépendances
echo "Installation des dépendances..."
go mod download
go mod tidy

# Build du binaire
echo "Build du client ProtonMail..."
go build -trimpath -ldflags="-s -w" -o bin/protonmail ./cmd/protonmail

echo "✅ Build terminé avec succès !"
echo "Le binaire est disponible dans: bin/protonmail"
