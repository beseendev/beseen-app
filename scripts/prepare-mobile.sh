#!/bin/bash

# Script de Automação BeSeen - Preparação Mobile (Android & iOS)
# Uso: ./scripts/prepare-mobile.sh [prod|dev]

ENV=${1:-prod}

set -e

ENV_UPPER=$(echo "$ENV" | tr '[:lower:]' '[:upper:]')
echo "🚀 Iniciando preparação MOBILE para: $ENV_UPPER..."

# --- 1. LIMPEZA ---
echo "🧹 Limpando build antigo..."
rm -rf www/

# --- 2. BUILD ANGULAR ---
if [ "$ENV" == "prod" ]; then
    echo "📦 Executando Build Angular (Production)..."
    npm run build -- --configuration=production
else
    echo "📦 Executando Build Angular (Development)..."
    npm run build
fi

# --- 3. ANDROID CONFIG ---
if [ -d "android" ]; then
    echo "🤖 Configurando Android..."
    FIREBASE_SRC="firebase-config/google-services-${ENV}.json"
    FIREBASE_DEST="android/app/google-services.json"

    if [ -f "$FIREBASE_SRC" ]; then
        cp "$FIREBASE_SRC" "$FIREBASE_DEST"
        echo "✅ Firebase Android atualizado ($ENV)"
    else
        echo "⚠️  Aviso: $FIREBASE_SRC não encontrado"
    fi

    # Gera arquivo .env para o capacitor.config.ts
    if [ "$ENV" == "prod" ]; then
        echo "APP_ID=com.beseen.app.official" > .env
        echo "GOOGLE_WEB_CLIENT_ID=950779319104-1l56pob9dmnf2bkln5ap3ah961cemnrq.apps.googleusercontent.com" >> .env
        echo "✅ .env criado para PRODUÇÃO"
    else
        echo "APP_ID=io.ionic.starter" > .env
        echo "GOOGLE_WEB_CLIENT_ID=304753853961-jp8gqjgmtltheqn16nvell5i3os6k4aq.apps.googleusercontent.com" >> .env
        echo "✅ .env criado para DESENVOLVIMENTO"
    fi

    npx cap sync android

    # NOVO: GERAÇÃO AUTOMÁTICA DE ÍCONES E SPLASH DO ANDROID
    if [ -d "assets" ]; then
        echo "🎨 Gerando ícones e splash screen para Android..."
        npx capacitor-assets generate --android
        echo "✅ Recursos visuais do Android atualizados!"
    else
        echo "⚠️  Aviso: Pasta 'assets' raiz não encontrada. Pulando geração de ícones."
    fi
fi

# --- 4. iOS CONFIG ---
if [ -d "ios" ]; then
    echo "🍎 Configurando iOS..."
    FIREBASE_SRC="firebase-config/GoogleService-Info-${ENV}.plist"
    FIREBASE_DEST="ios/App/App/GoogleService-Info.plist"

    if [ -f "$FIREBASE_SRC" ]; then
        cp "$FIREBASE_SRC" "$FIREBASE_DEST"
        echo "✅ Firebase iOS atualizado ($ENV)"
    else
        echo "⚠️  Aviso: $FIREBASE_SRC não encontrado"
    fi

    # Gera arquivo .env para o capacitor.config.ts
    if [ "$ENV" == "prod" ]; then
        echo "APP_ID=com.beseen.app.official" > .env
        echo "GOOGLE_WEB_CLIENT_ID=950779319104-1l56pob9dmnf2bkln5ap3ah961cemnrq.apps.googleusercontent.com" >> .env
    else
        echo "APP_ID=io.ionic.starter" > .env
        echo "GOOGLE_WEB_CLIENT_ID=304753853961-jp8gqjgmtltheqn16nvell5i3os6k4aq.apps.googleusercontent.com" >> .env
    fi

    npx cap sync ios

    # NOVO: GERAÇÃO AUTOMÁTICA DE ÍCONES E SPLASH DO iOS (Para o futuro!)
    if [ -d "assets" ]; then
        echo "🎨 Gerando ícones e splash screen para iOS..."
        npx capacitor-assets generate --ios
        echo "✅ Recursos visuais do iOS atualizados!"
    fi
fi

echo ""
echo "=========================================================="
echo "✅ TUDO PRONTO PARA $ENV_UPPER!"
echo "Android: npx cap open android"
echo "iOS: npx cap open ios"
echo "=========================================================="
