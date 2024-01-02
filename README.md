# frontend for now

## reference

[Otel API docs](https://open-telemetry.github.io/opentelemetry-js/)

## Running Locally

```sh
export HONEYCOMB_API_KEY=<your-key>
./run
```

This will run a collector on port 4318 that will forward everything to honeycomb and a webserver that serves the app plus a fake backend, and forwards /v1/traces and /v1/logs to the collector.

this will make builds happen whenever you make ts changes:

`npm run serve-js`

and this will make copies happen whenever you make html or css changes:

`npm run serve-static`

To continue work:

- make changes
- npm run build (if you don't have 'serve-js'/'serve-static' running)
- in the browser, cmd-shift-R for "no really, refresh all the things"

To stop:

- ^C to stop the fake
- `./stop` to shut down the collector

## Deploying

Login to pulumi via the CLI

```sh
pulumi login
```

Follow the prompts to login

```sh
npm run build
cd infra
pulumi stack select honeycomb-devrel/booth-game-frontend
pulumi up
```
