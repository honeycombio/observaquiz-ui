# frontend for now

This is the frontend for Observaquiz, a fun app that gets data into Honeycomb.

## How to run

The `run` script will build and run the app; it starts up a fake backend app, so that you can test even without internet.
It expects a Honeycomb API key in $HONEYCOMB_API_KEY.

```sh
export HONEYCOMB_API_KEY=<your-key>
./run
```

This will also run a collector on port 4318 that will forward everything to Honeycomb. The fake backend serves the static app, andwill forward /v1/traces and /v1/logs to the collector.

Access the app:

[http://localhost:4000]()

To continue work:

- make changes
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
