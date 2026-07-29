# BeSeen Search/Scouting API

## Athlete Gender

Novo campo:

`gender`

Valores:

- `MALE`
- `FEMALE`

Necessario futuramente em:

- criacao do perfil de jogador: `POST /profile/player`
- edicao do perfil de jogador: `PUT /profile/player`
- full-profile proprio: `GET /profile/me/full-profile`
- full-profile publico: `GET /profile/player/full-profile/{profileId}`
- pesquisa: `GET /profile/search`

## Skills

Estrutura conceitual:

`Skill`

- `id`
- `code`
- `name`
- `type`

`SkillType`:

- `OFFENSIVE`
- `DEFENSIVE`

## Catalogo

Futuro endpoint:

`GET /skills`

## Video

Associacao N:N:

- `Video`
- `VideoSkill`
- `Skill`

## Criacao de post

Endpoint atual identificado:

`POST /posts`

Payload atual aceito pelo frontend:

```json
{
  "fileId": 123,
  "caption": "Descricao do video"
}
```

Futuramente devera aceitar:

```json
{
  "fileId": 123,
  "caption": "Descricao do video",
  "skillIds": ["FINISHING", "DRIBBLING"]
}
```

## Compatibilidade

Perfis antigos:

`gender` pode ser `null`.

Videos antigos:

`skills` pode ser `[]`.

## Pesquisa de videos para olheiro

Funcionalidade exclusiva para usuarios `CLUBE`/olheiro.

O frontend deve mostrar a experiencia apenas no ambiente do olheiro, mas o backend tambem devera validar autorizacao. Nao confiar somente na ausencia de tela para `JOGADOR`.

Endpoint futuro sugerido:

- `GET /posts/search`
- alternativa aceitavel: `GET /search/videos`

Como o dominio atual de videos/feed usa `/posts`, `GET /posts/search` tende a ser o contrato mais coerente, mas o frontend deve manter essa dependencia isolada no service de scouting.

### Origem dos filtros

ATHLETE/PROFILE:

- `gender`
- `dateOfBirth` -> idade calculada por `minAge`/`maxAge`
- `dominantFoot`
- `position`
- `estado`
- `cidade`
- `height` -> `minHeight`/`maxHeight`

VIDEO:

- `skills`

### Parametros esperados

- `gender`
- `minAge`
- `maxAge`
- `dominantFoot`
- `positions`
- `estado`
- `cidade`
- `minHeight`
- `maxHeight`
- `offensiveSkillIds`
- `defensiveSkillIds`
- `skillMatchMode`
- `page`
- `size`

`skillMatchMode`:

- `ANY`: video atende se possuir pelo menos uma habilidade selecionada.
- `ALL`: video atende se possuir todas as habilidades selecionadas.

Para o MVP, usar `ANY`.

### Exemplo conceitual de request

```text
GET /posts/search?gender=FEMALE&minAge=16&maxAge=20&positions=Atacante&estado=SC&offensiveSkillIds=DRIBBLING&defensiveSkillIds=PRESSING&skillMatchMode=ANY&page=0&size=20
```

### Response esperado

Usar o mesmo padrao de paginacao ja existente no backend para buscas paginadas de perfil:

```json
{
  "content": [
    {
      "id": 123,
      "user": {
        "id": 456,
        "username": "Nome do atleta",
        "urlPerfil": "https://..."
      },
      "mediaUrl": "https://...",
      "mediaType": "VIDEO",
      "caption": "Descricao do video",
      "likesCount": 10,
      "commentsCount": 0,
      "isLiked": false,
      "createdAt": "2026-07-28T00:00:00Z",
      "skills": []
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "size": 20,
  "number": 0,
  "first": true,
  "last": true,
  "empty": false
}
```

Enquanto o endpoint real nao existir, o frontend usa um fallback temporario isolado em `ScoutSearchService`, sem escrever resultados filtrados em `PostService.homePosts$`.
