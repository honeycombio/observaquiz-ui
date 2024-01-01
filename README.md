# frontend for now

## reference

[Otel API docs](https://open-telemetry.github.io/opentelemetry-js/)

## one-time setup

`aws ecr create-repository --repository-name quiz-booth-game`

make a namespace, that's in `infra/terraform/quiz.tf`

`k apply -f service.yaml`

## iterating

Change something in 'src'

`npm run build`

`./deploy`

## Running Locally

Install http-server

```sh
npm install -g http-server
```

```sh
export HONEYCOMB_API_KEY=<your-key>
./run
```

This will run a collector on port 4318 that will forward everything to honeycomb and a webserver that serves the connect and forwards any non-static requests to the collector.

this will make builds happen whenever you make ts changes:

`npx parcel serve src/index.tsx`

To continue work.:

- make changes
- npm run builr
- in the browser, cmd-shift-R for "no really, refresh all the things"

To stop:

- ^C to stop the http-server
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
