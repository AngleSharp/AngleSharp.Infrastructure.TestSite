# AngleSharp.TestSite

The webpage to run reliable online integration tests against.

This is the site exercised by the AngleSharp integration tests (e.g. the `FormSubmitTests` and `ContextLoading` fixtures in AngleSharp.Core). It exposes a handful of endpoints that echo requests, validate form submissions, stream a chunked response, and serve a page with (deliberately partly-broken) resources.

Originally an ASP.NET MVC application, it has been ported to a Node.js [Fastify](https://fastify.dev) app written in TypeScript. The behavior — the HTML produced and the way requests are validated — is preserved. The original sources are kept for reference under [`legacy/`](legacy/).

## Getting started

```bash
npm install
npm run dev      # start with live reload on http://localhost:8080
```

For a production-style run:

```bash
npm run build    # compile TypeScript into dist/
npm start        # run the compiled server
```

The listen port and host can be overridden with the `PORT` (default `8080`) and `HOST` (default `0.0.0.0`) environment variables.

## Endpoints

| Route | Method | Purpose |
| --- | --- | --- |
| `/` | GET | Overview page linking to every GET test page. |
| `/PostUrlencodeNormal` | GET/POST | `application/x-www-form-urlencoded` form; POST validates `Name`/`Number`/`IsActive`. |
| `/PostUrlencodeFile` | GET/POST | Urlencoded form with a file field; POST checks the submitted file name. |
| `/PostMultipartNormal` | GET/POST | `multipart/form-data` form; POST validates the fields. |
| `/PostMultipartFile` | GET/POST | Multipart form; POST validates one uploaded file's name, type, and bytes. |
| `/PostMultipartFiles` | GET/POST | Multipart form; POST validates five uploaded files. |
| `/PostAnything` | GET/POST | Echoes any posted key/value pairs into the page. |
| `/Echo` | POST | Renders a table of the parsed form fields plus the raw request body. |
| `/Header/:id?` | GET | Returns the value of the named request header (default `referer`). |
| `/Chunked` | GET | Streams an HTML document using chunked transfer encoding with delays. |
| `/Page` | GET | Resource-loading test page (references some missing resources on purpose). |
| `/static/Css/:id` | GET | Returns randomized `text/css` content. |
| `/Content/*` | GET | Static assets (`style.css`, `jquery.js`, `200w.gif`). |

Routing is case-insensitive, matching the original ASP.NET behavior.

## Docker

A multi-stage [`Dockerfile`](Dockerfile) builds a small production image:

```bash
docker build -t anglesharp-testsite .
docker run --rm -p 8080:8080 anglesharp-testsite
```

## Continuous delivery

The [`Build and publish Docker image`](.github/workflows/docker.yml) GitHub Actions workflow type-checks and builds the app, then builds a Docker image and publishes it to the GitHub Container Registry (GHCR) as `ghcr.io/anglesharp/anglesharp.infrastructure.testsite` on pushes to `main`.
