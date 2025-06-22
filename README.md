# frontend for now

## reference

[Otel API docs](https://open-telemetry.github.io/opentelemetry-js/)

## Running Locally

```sh
export HONEYCOMB_API_KEY=<your-key>
./run
```

This will run a collector on port 4318 that will forward everything to honeycomb and a webserver that serves the app plus a fake backend, and forwards /v1/traces and /v1/logs to the collector.

And it will make builds happen whenever you make changes, with `npm run serve`

And it will start the fake-server, which serves the site, proxies to the local collector, and responds to the fake endpoints for when I am on an airplane.

[http://localhost:4000]()

To continue work:

- make changes
- npm run build (if you don't have 'npm run serve' running)
- in the browser, cmd-shift-R for "no really, refresh all the things"

To stop:

- ^C to stop the fake
- `./stop` to shut down the collector

## Deploying

Do this once: Login to pulumi via the CLI, and pick the stack

```sh
cd infra
pulumi login
pulumi stack select honeycomb-devrel/prod
pulumi install
```

Now, from the project root

```
./deploy
```
