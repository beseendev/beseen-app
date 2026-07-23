# Contexto de bugs em andamento (vídeo na vitrine)

Este arquivo documenta os bugs relacionados a vídeo que foram investigados e ajustados nas últimas sessões, para dar continuidade ao trabalho em qualquer máquina.

## 1. iOS — vídeo trava com tela cinza + spinner após reabrir o app

**Sintoma:** ao matar o app pela central de tarefas do iPhone e reabrir (cold start), o primeiro vídeo da vitrine fica com tela cinza e o spinner de carregando girando pra sempre, mesmo estando visível na tela. Scrollar sozinho não resolve. Um toque real em qualquer lugar da tela destrava — depois disso, os vídeos seguintes tocam sozinhos normalmente ao scrollar.

**Causa raiz:** o WKWebView do iOS (motor usado pelo Capacitor, obrigatório por política da Apple — não dá pra trocar por outro motor num app híbrido) suspende o carregamento/renderização de vídeo até a página receber um gesto real do usuário. Scroll sozinho não conta como gesto pra esse fim. Isso não tem relação com o app estar em segundo plano — acontece mesmo em cold start puro.

**Diagnósticos que NÃO resolveram (evitar repetir):**
1. Listener de `document.visibilitychange` — não é confiável dentro do WKWebView.
2. Troca para `@capacitor/app` `appStateChange` — resolve caso de app voltar do background sem ser morto, mas não resolve cold start (não era o cenário real reportado).

**Fix atual, em `src/app/shared/directives/viewport-video-player.directive.ts`:**
- `acquireAppStateListener()` / `resume()`: reage a `appStateChange` do Capacitor pra retomar o vídeo ativo quando o app volta de segundo plano, forçando `video.load()` se o buffer decodificado foi descartado pelo iOS (`readyState < 2`).
- `registerGestureUnlock()`: escuta uma única vez, globalmente, o primeiro `touchstart`/`click` em qualquer lugar do app (não precisa ser no vídeo) e tenta tocar o vídeo ativo no momento. Usa `touchstart` (não `touchend`) porque, se o toque virar um gesto de scroll, o WebKit não conta o `touchend` resultante como gesto válido — mas o `touchstart` no início do toque, antes do gesto virar scroll, conta.

**Já tentado e descartado (não repetir sem necessidade):**
- Um overlay visual "Toque para assistir" (tap-gate) só no primeiro vídeo, só no iOS, para dar uma pista visual do toque necessário — chegou a ser implementado mas foi revertido no código atual. Se for reconsiderado, a ideia era: getter `showTapGate` na diretiva (`isFirstInstance` + `!gestureUnlocked` + `Capacitor.getPlatform() === 'ios'`).
- Migração pra um player de vídeo nativo (`capacitor-video-player` / `@capgo/capacitor-video-player`): **inviável** para a vitrine atual — essas libs só suportam modo "embedded" (inline, dentro do feed) em Web/Electron; em iOS/Android só existe modo fullscreen nativo, o que quebraria a experiência de feed contínuo estilo TikTok que a vitrine tem hoje. Só faria sentido com uma tela 100% nativa customizada (Swift + Kotlin, sem lib pronta), esforço desproporcional só pra esse bug.
- Simular um clique via JS (`dispatchEvent`) pra burlar a exigência de gesto: não funciona, navegadores ignoram eventos não confiáveis (`isTrusted: false`) pra esse fim.

**Status:** fix do `touchstart`/`appStateChange` implementado, aguardando confirmação em build real (TestFlight) se resolve completamente.

## 2. Android — botão de play gigante antes do vídeo começar

**Sintoma:** só no Android (não ocorre no iOS), antes do vídeo da vitrine começar a tocar, aparece um ícone de play enorme (praticamente do tamanho do vídeo) sobreposto à tela. Some quando o vídeo começa a tocar de fato.

**Causa raiz:** é um elemento nativo do Chromium/Android WebView, não algo do código do app. Existem *dois* pseudo-elementos diferentes do Chromium pra esse tipo de botão:
- `::-webkit-media-controls-overlay-play-button` — mais associado a desktop.
- `::-webkit-media-controls-start-playback-button` — específico de builds mobile do Chromium, usado pro botão "iniciar a primeira reprodução". **Era esse que faltava.**

**Fix, em `src/global.scss`** (perto de outras regras que já escondiam elementos nativos do player de vídeo):
```scss
video::-webkit-media-controls-overlay-play-button {
  display: none !important;
  -webkit-appearance: none;
}

video::-webkit-media-controls-start-playback-button {
  display: none !important;
  -webkit-appearance: none;
}
```

**Diagnóstico que não resolveu sozinho:** a primeira tentativa (só `-overlay-play-button`) foi confirmada presente tanto na branch `main` quanto no bundle de produção minificado (não foi problema de build/deploy) — o problema era mesmo o seletor errado, faltava o `-start-playback-button`.

**Status: fix escrito mas AINDA NÃO confirmado visualmente num device/emulador real.** Tentativa de testar via emulador Android local nesta máquina Linux não deu certo (ver seção 4). Teste será feito via emulador Android rodando numa máquina Windows separada.

## 3. "Tipo não informado" na home logo após criar o perfil

**Sintoma:** ao criar a conta e o perfil (jogador ou olheiro) e ser redirecionado pra home, o campo de "tipo" aparecia como "Tipo não informado", mesmo o perfil já tendo sido salvo no backend.

**Causa raiz:** o token JWT usado para decodificar `role`/`scoutType` na tela (via `authService.getDecodedToken()`, lido direto do `localStorage`) ainda era o token de *antes* do perfil existir. O fluxo de criação de perfil não pedia um token novo ao backend antes de navegar pra home.

**Fix:**
- `src/app/create-profile-player/create-profile-player.page.ts` (`submitForm()`): adicionado `switchMap(() => this.authService.refreshToken())` antes de `refreshCurrentUser()` e da navegação.
- `src/app/create-profile-scout/create-profile-scout.page.ts` (`saveProfile()`): mesma coisa — adicionado `refreshToken()` + `refreshCurrentUser()` no pipe antes do `window.location.href = '/scout-home'`.
- `AuthService.refreshToken()` (já existia em `src/app/services/auth.service.ts`) bate em `POST /auth/refresh-token` e atualiza `access_token`/`refresh_token` no `localStorage`. `refreshCurrentUser()` é só um alias de `GET /profile/me`, não emite token novo sozinho — por isso os dois precisam ser chamados em sequência.

**Status:** implementado, pendente de teste ponta a ponta nos dois fluxos (jogador e olheiro).

## 4. Emulador Android local (Linux) — não funciona nesta máquina

Tentativa de rodar o AVD `Medium_Phone_API_36.1` localmente esbarrou em:
- `/dev/kvm` com permissão errada (grupo `kvm` sem escrita) — regra de udev existente não estava sendo reaplicada ao device já criado.
- Depois de corrigir via `sudo chmod 660 /dev/kvm`, o erro mudou de "Permission denied" pra "No such device" — inclusive no terminal real do usuário, não só via ferramenta do Claude Code (então não é (só) sandboxing do IntelliJ/Snap). Causa raiz dessa parte não foi identificada.

**Decisão:** testes de Android vão ser feitos via emulador numa máquina Windows separada, não nesta máquina Linux. Não vale a pena tentar reabrir esse caminho sem necessidade.

## CI/CD

`.github/workflows/multi-platform-deploy.yml` builda automaticamente só em push pra `main`. Foi adicionado `workflow_dispatch:` no gatilho pra permitir rodar o pipeline manualmente contra qualquer branch (pela aba Actions do GitHub, botão "Run workflow"), útil pra testar mudanças arriscadas (como uma eventual migração de player de vídeo) sem precisar mergear na `main` primeiro. Esse ajuste em si precisa estar mergeado na `main` pra o botão manual aparecer.
