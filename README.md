# BeSeen App - Guia de Execução

Este projeto utiliza Ionic + Angular + Capacitor e possui configurações separadas para Desenvolvimento (Local) e Produção.

## 🚀 Como Rodar o App

### 1. Web (Local)
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

## 📌 Pendências de Produção
As seguintes configurações devem ser feitas após a ativação da Google Play Console:
- Gerar SHA-1 da chave de assinatura e adicionar no Firebase.
- Configurar API Keys reais do RevenueCat no `environment.prod.ts`.
