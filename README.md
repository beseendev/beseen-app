# BeSeen App - Guia de Execução

Este projeto utiliza Ionic + Angular + Capacitor e possui configurações separadas para Desenvolvimento (Local) e Produção.

## 🚀 Como Rodar o App

### 1. Web (Local.)
Para rodar no navegador usando a API local e configurações de teste:
```bash
npm start
```

---

### 2. Android (Ambiente Local)
Para rodar no emulador ou dispositivo físico usando as chaves de teste e API local:

```bash
# 1. Prepara o build e injeta as chaves de DEV
./scripts/prepare-mobile.sh dev

# 2. Abre o Android Studio
npx cap open android
```
*No Android Studio, basta clicar em "Run".*

---

### 3. Android (Ambiente de Produção)
**⚠️ Atenção:** Use este comando apenas quando for gerar a versão final para a loja ou testar com a infraestrutura oficial.

```bash
# 1. Prepara o build e injeta as chaves de PROD
./scripts/prepare-mobile.sh prod

# 2. Abre o Android Studio
npx cap open android
```
*O script irá trocar automaticamente o Package ID para `com.beseen.app.official` e injetar o Firebase de produção.*

---

## 🛠 Scripts Úteis

- `./scripts/prepare-mobile.sh [prod|dev]`: Limpa o build, compila o Angular e sincroniza os arquivos do Firebase corretos.
- `npx cap sync`: Sincroniza plugins do Capacitor (já incluso no script acima).

---

## 📌 Checklist de Lançamento (Versionamento Manual)

Sempre que for gerar uma nova build para as lojas ou para o GitHub Actions, certifique-se de atualizar as versões nos seguintes arquivos:

### 1. Geral (NPM)
- **Arquivo:** `package.json`
- **Campo:** `"version"` (Ex: `1.0.2`)

### 2. Android
- **Arquivo:** `android/app/build.gradle`
- **Campos:** 
  - `versionCode`: Deve ser um número inteiro que **sempre aumenta** (Ex: `24` -> `25`). O Google Play não aceita números repetidos.
  - `versionName`: A versão visível para o usuário (Ex: `"1.0.2"`).

### 3. iOS
- **Arquivo:** `ios/App/App.xcodeproj/project.pbxproj`
- **Campos para buscar e alterar:**
  - `CURRENT_PROJECT_VERSION`: É o número da **Build** (Ex: `1`, `2`...). Deve **sempre aumentar** a cada novo envio.
  - `MARKETING_VERSION`: É a versão visível na loja (Ex: `1.0.2`).
- **Dica:** Como esse arquivo é grande, use o comando `Ctrl+F` para localizar esses termos. Eles aparecem em mais de um lugar, certifique-se de atualizar em todos os blocos de configuração (`Debug` e `Release`).


