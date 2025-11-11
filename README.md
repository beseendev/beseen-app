# Beseen App

Beseen é uma plataforma de rede social projetada para conectar atletas a olheiros, criando um espaço onde talentos podem ser descobertos e oportunidades podem surgir.

## ✨ Funcionalidades

*   **Autenticação de Usuários:**
    *   Login com Email e Senha.
    *   Login social com Google (via Firebase).
*   **Proteção de Rotas:** Acesso seguro às páginas da aplicação, redirecionando usuários não autenticados para a página de login.
*   **Comunicação com Backend:** Arquitetura de serviços para se comunicar com uma API externa para validação de credenciais e outras operações.
*   **Pronto para Mobile:** Construído com Capacitor para ser executado nativamente em dispositivos Android e iOS.

## 🚀 Tecnologias Utilizadas

*   **[Ionic/Angular](https://ionicframework.com/docs/angular/overview):** Framework principal para a construção da interface e da lógica do aplicativo.
*   **[Capacitor](https://capacitorjs.com/):** Ferramenta para executar o aplicativo web como um aplicativo nativo em diferentes plataformas.
*   **[Firebase](https://firebase.google.com/):** Utilizado para o serviço de autenticação com Google.
*   **[TypeScript](https://www.typescriptlang.org/):** Linguagem principal do projeto.
*   **[RxJS](https://rxjs.dev/):** Usado para lidar com operações assíncronas e gerenciamento de estado.

## 📂 Estrutura do Projeto

O projeto segue a estrutura padrão de um aplicativo Angular, com algumas pastas chave:

```
src/
├── app/
│   ├── guards/         # Guardas de rota (ex: auth.guard.ts)
│   ├── home/           # Página principal da aplicação
│   ├── interceptors/   # Interceptadores HTTP (ex: auth.interceptor.ts)
│   ├── login/          # Página de login
│   └── services/       # Serviços de lógica de negócio (auth.service.ts, api.service.ts)
├── assets/             # Arquivos estáticos como imagens e ícones
└── environments/       # Arquivos de configuração de ambiente (dev, prod)
```

## ⚙️ Configuração de Ambiente

O projeto utiliza arquivos de ambiente (`src/environments/environment.ts` para desenvolvimento e `src/environments/environment.prod.ts` para produção) para gerenciar configurações como a URL da API e credenciais do Firebase.

### URL da API (`apiUrl`)

A `apiUrl` precisa ser ajustada dependendo de onde você está executando o aplicativo:

*   **Para Emuladores Android:** A URL `http://10.0.2.2:8080/beseen/api` (ou similar) é usada para que o emulador possa acessar o `localhost` da sua máquina de desenvolvimento.
*   **Para Navegador (Desenvolvimento Web):** Ao rodar o projeto no navegador (`npm start`), você deve alterar a `apiUrl` em `src/environments/environment.ts` para apontar diretamente para o seu `localhost` ou para a URL da sua API de desenvolvimento. Por exemplo:
    ```typescript
    export const environment = {
      production: false,
      apiUrl: 'http://localhost:8080/beseen/api', // Ou a URL correta da sua API
      // ...
    };
    ```
*   **Para Produção:** A `apiUrl` em `src/environments/environment.prod.ts` deve ser a URL da sua API em produção.

Certifique-se de que a `apiUrl` esteja configurada corretamente no arquivo de ambiente apropriado antes de compilar ou executar o projeto.

## 🏁 Como Executar o Projeto

Siga os passos abaixo para configurar e executar o projeto em seu ambiente local.

### Pré-requisitos

*   [Node.js](https://nodejs.org/en/) (versão LTS recomendada)
*   NPM (geralmente instalado com o Node.js)
*   [Android Studio](https://developer.android.com/studio) para desenvolvimento Android.

### 1. Instalação

Clone o repositório e instale as dependências do projeto:

```bash
npm install
```

### 2. Executando em Desenvolvimento (Web)

Para iniciar o servidor de desenvolvimento e abrir o aplicativo em seu navegador:

```bash
npm start
```

O aplicativo estará disponível em `http://localhost:4200`.

### 3. Build para Produção

Para compilar o aplicativo para produção, execute:

```bash
npm run build
```

Os arquivos otimizados serão gerados no diretório `www/`.

### 4. Configurando a Plataforma Android (Primeira Vez)

Se esta é a primeira vez que você está configurando o projeto para Android, siga estes passos para garantir que a plataforma seja criada e configurada corretamente com as dependências do Firebase.

1.  **Instale as dependências do Node.js:**
    ```bash
    npm install
    ```

2.  **Adicione a plataforma Android:**
    *(Este comando cria a pasta `android`. Se ela já existir de um setup anterior, remova-a para garantir uma configuração limpa).*
    ```bash
    npx cap add android
    ```

3.  **Execute o script de configuração do Android:**
    *(Este comando copia os arquivos de configuração do Firebase e ajusta as configurações do projeto nativo).*
    ```bash
    npm run android:setup
    ```

4.  **Sincronize o projeto:**
    *(Copia os arquivos da sua aplicação web para o projeto Android).*
    ```bash
    npx cap sync
    ```

### 5. Executando em Dispositivos Nativos (Desenvolvimento Diário)

Após a configuração inicial, você tem algumas opções para executar o aplicativo em um dispositivo ou emulador Android:

#### Opção 1: Usando o Ionic CLI (com Live Reload)

Esta é a forma recomendada para desenvolvimento, pois inclui live reload e permite acesso externo.

1.  **Sincronize suas alterações:**
    *(Após qualquer mudança no código da aplicação web, execute este comando para atualizar o projeto nativo).*
    ```bash
    npx cap sync
    ```

2.  **Execute o aplicativo com live reload:**
    ```bash
    ionic capacitor run android -l --external
    ```

#### Opção 2: Via Android Studio

Você também pode executar o aplicativo diretamente pelo Android Studio.

1.  **Sincronize suas alterações:**
    *(Após qualquer mudança no código da aplicação web, execute este comando para atualizar o projeto nativo).*
    ```bash
    npx cap sync
    ```

2.  **Abra o projeto no Android Studio:**
    *Você pode abrir a pasta `android` diretamente no Android Studio ou usar o comando:*
    ```bash
    npx cap open android
    ```

3.  Dentro do Android Studio, selecione o dispositivo/emulador e execute o aplicativo.
