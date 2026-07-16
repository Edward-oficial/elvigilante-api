<p align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&pause=1000&color=00FF00&center=true&vCenter=true&width=435&lines=¡Hola!+👋;Bienvenido+a+ElVigilante-API" alt="Animación de saludo" />
</p>

<h1 align="center">
  <img src="https://img.shields.io/badge/ElVigilante-API-00ff00?style=for-the-badge&logo=ghost&logoColor=white" alt="ElVigilante API" />
</h1>

<h3 align="center">Multi-tool REST API para descargas y utilidades</h3>

---

## 📖 Sobre el Proyecto

**ElVigilante-API** es una API REST potente hecha en **Node.js + Express** enfocada en:

- Descargas de redes sociales (YouTube, TikTok, Instagram, Facebook, etc.)
- Herramientas útiles (QR, TTS, Screenshot, etc.)
- Contenido de anime y diversión
- Integración con Gemini AI
- Búsquedas y más

---

## 🚀 Instalación

```bash
git clone https://github.com/ElvigilanteDv/elvigilante-api.git
cd elvigilante-api
bash install.sh```

---

## ⚙️ Configuración (.env)

Copia `.env.example` a `.env` y completa tus propios valores (Mongo URI, admin, etc). El servidor ya no arranca con credenciales hardcodeadas de ejemplo.

```bash
cp .env.example .env
```

---

## 🆕 Endpoints agregados

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/api/status` | Health check (uptime, estado de DB, memoria) | No |
| GET | `/api/tools/base64` | Codifica/decodifica texto en Base64 (`?text=&action=encode\|decode`) | Sí |
| GET | `/api/tools/shorturl` | Acorta una URL (`?url=`) | Sí |
| GET | `/api/tools/translate` | Traduce texto (`?text=&to=&from=`) | Sí |
| GET | `/api/anime/hug` | GIF aleatorio de abrazo (nekos.best) | Sí |
| GET | `/api/anime/pat` | GIF aleatorio de pat (nekos.best) | Sí |
| GET | `/api/anime/slap` | GIF aleatorio de slap (nekos.best) | Sí |
| POST | `/api/auth/change-password` | Cambia la contraseña verificando la actual | Sí |
| GET | `/api/auth/admin/all` | Ahora soporta `?page=&limit=` | Admin |
| GET | `/api/search/wikipedia` | Busca artículos en Wikipedia (`?query=&lang=`) | Sí |
| GET | `/api/search/anime` | Busca anime en MyAnimeList vía Jikan (`?query=`) | Sí |
| GET | `/api/search/lyrics` | Letra de una canción (`?artist=&title=`) | Sí |
| GET | `/api/search/github` | Busca repositorios en GitHub (`?query=`) | Sí |
| GET | `/api/download/mediafire` | Link directo de descarga de MediaFire (`?url=`) | Sí |
| GET | `/api/download/reddit` | Descarga video/imagen de un post de Reddit (`?url=`) | Sí |

## 🔒 Mejoras de seguridad

- Las contraseñas ya no se guardan en texto plano: se hashean con **bcrypt**. Las cuentas antiguas se migran automáticamente al hash en su próximo login exitoso.
- Se eliminaron las credenciales de MongoDB que estaban hardcodeadas en `index.js`; ahora son obligatorias vía `.env` y el servidor no arranca sin ellas.
- Se agregó **rate limiting**: un límite general por IP para toda la API y uno más estricto para `/api/auth/login` y `/api/auth/register` (anti fuerza-bruta).
- Se agregó **Helmet** (cabeceras HTTP seguras) y **Morgan** (logging de requests).
- `admin/all` ya no expone el hash de la contraseña y ahora pagina resultados.
- Manejo de errores centralizado: cualquier ruta puede hacer `next(err)` y responde en formato JSON consistente; los endpoints `/api/*` inexistentes devuelven un 404 JSON en vez del HTML genérico.

> ⚠️ Si este proyecto tuvo alguna vez credenciales reales (usuario/contraseña de Mongo) escritas directamente en el código y subidas a un repositorio, rótalas cuanto antes desde MongoDB Atlas — ya circularon en el historial de git aunque se borren ahora del archivo.

## 🖥️ Panel web (`/public`)

Se actualizaron las 4 páginas de endpoints para reflejar todo lo agregado:
- `search.html`: + Wikipedia, Anime (MAL), Letras, GitHub
- `download.html`: + MediaFire, Reddit — y de paso Twitter/X, Pinterest y Mega, que ya existían en el backend pero nunca se habían agregado a esta página
- `tools.html`: + Base64, Acortador de URLs, Traductor
- `anime.html`: + Hug, Pat, Slap

`mega` abre la descarga en una pestaña nueva porque ese endpoint transmite el archivo directamente en vez de responder JSON.
