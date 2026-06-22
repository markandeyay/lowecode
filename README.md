


 @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
 @                                                                             @
 @    __    _       __  _    _      _ __        _   _     _               _    @
 @   / /   (_)___ _/ /_(_)  /_\  __| / /_   _  _| | | |_ _| |_ ___ _ __ | |   @
 @  / /   / / __ `/ __/ /  / _ \/ _` / /| | | |/ __| __/ _` | __/ _ \ '_ \| |   @
 @ / /___/ / /_/ / /_/ /  / ___/ (_/ / / | |_| | (__| || (_| | ||  __/ | | | |   @
 @/_____/_/\__,_/\__/_/  \/    \__,_/_/  \__,_|\___|\__\__,_|\__\___|_| |_|_|   @
 @                                                                             @
 @                     T E R M I N A L   C O D I N G   A G E N T               @
 @                                                                             @
 @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@


LOWECODE is a terminal AI coding agent forked from Opencode (MIT).
It routes model calls through a local OpenAI-compatible adapter
backed by Lowe's Mylow.

> Not affiliated with, endorsed by, or sponsored by Lowe's.
> Experimental project. Do not distribute as an official Lowe's product.

---

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Bun](https://bun.sh/) 1.3+
- [Git](https://git-scm.com/)

## Install

```bash
git clone <repo-url> lowecode
cd lowecode

# install agent dependencies
bun install

# install adapter dependencies
npm --prefix lowes-llm-provider install
```

## Run

### Mock mode (no network, for testing)

```bash
LOWECODE_MOCK=1 ./start-lowecode.sh
LOWECODE_MOCK=1 ./start-lowecode.sh run "explain this repo"
```

### Authorized endpoint mode (live)

If you have an authorized OpenAI-compatible Mylow endpoint:

```bash
export LOWES_MYLOW_LIVE_ENDPOINT="https://<your-authorized-endpoint>/v1"
./start-lowecode.sh
./start-lowecode.sh run "hello"
```

### Browser mode (experimental)

Opens a visible browser at the Mylow page. You manually complete any
login or verification, then LOWECODE interacts with the chat UI via
normal DOM actions.

```bash
# install browser dependencies
npm --prefix lowes-llm-provider install playwright
npx --prefix lowes-llm-provider playwright install chromium

# run
LOWECODE_BROWSER_MODE=1 ./start-lowecode.sh
LOWECODE_BROWSER_MODE=1 ./start-lowecode.sh run "hello"
```

## Install the `lowecode` command globally

```bash
cd packages/opencode
bun link

# now you can run from anywhere
lowecode
lowecode run "explain this repo"
lowecode --help
```

## What if live Mylow routing is unavailable?

If no authorized endpoint is configured and browser mode cannot reach
the widget, LOWECODE fails with `LOWES_ENDPOINT_NOT_CONFIGURED` or
`LOWES_BROWSER_TRANSPORT_UNAVAILABLE`. It does **not** fall back to
OpenAI, Anthropic, Gemini, OpenRouter, Ollama, or any other personal
model provider.

To get started without live access, use mock mode:

```bash
LOWECODE_MOCK=1 ./start-lowecode.sh
```

## Configuration

| Field | Value |
|---|---|
| Provider | `lowes-mylow` |
| Model | `mylow-1` |
| Default model | `lowes-mylow/mylow-1` |
| Base URL | `LOWES_MYLOW_BASE_URL` or `http://localhost:3000/v1` |
| Theme | `lowecode-blue` (`#004990`) |

### Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `LOWECODE_MOCK` | `0` | Mock mode (no network) |
| `LOWES_MYLOW_LIVE_ENDPOINT` | unset | Authorized Mylow endpoint |
| `LOWES_MYLOW_BASE_URL` | `http://localhost:3000/v1` | Adapter URL |
| `LOWECODE_BROWSER_MODE` | `0` | Browser-mediated access |
| `LOWECODE_BROWSER_PROFILE_DIR` | `.lowecode-browser-profile` | Browser profile |
| `LOWECODE_MYLOW_URL` | `https://www.lowes.com/l/about/ai-at-lowes` | Mylow URL |
| `LOWECODE_ADAPTER_PORT` | `3000` | Adapter port |
| `LOWECODE_ALLOW_OTHER_PROVIDERS` | `0` | Allow non-Lowe's providers |

See `.env.example` for the full list.

## Repository Layout

```
lowecode/
  packages/opencode/        agent core (forked from Opencode)
  lowes-llm-provider/       OpenAI-compatible Lowe's adapter
  script/                   verification scripts
  start-lowecode.sh         startup launcher
  .env.example              environment template
```

## License

MIT (inherited from Opencode). See [LICENSE](LICENSE).
