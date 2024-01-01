/* I read the docs on getting started with Jest and TypeScript, and fuck it, I just want to run some code */

import { context, Context, propagation, Baggage, BaggageEntry } from "@opentelemetry/api";

// I don't feel like getting TypeScript to realize it has the Node assert method in scope
function assert(test: boolean) {
  if (!test) {
    throw new Error();
  }
}

/**
 * Step 0: there is no baggage
 */
const outermostContext = context.active();
const emptyBaggage = propagation.getBaggage(outermostContext);

assert(emptyBaggage === undefined);

/**
 * Step 1: put something in baggage
 */
const contextWithFirstBaggage = propagation.setBaggage(
  outermostContext,
  propagation.createBaggage({ "app.username": { value: "whatever" } })
);

const firstBaggage = propagation.getBaggage(contextWithFirstBaggage);

console.log("first baggage: " + JSON.stringify(firstBaggage?.getAllEntries()));
assert(firstBaggage?.getAllEntries().length === 1);

/**
 * Step 2: add something to the baggage... no actually, this replaces the baggage.
 */
const contextWithAdditionalBaggate = propagation.setBaggage(
  contextWithFirstBaggage,
  propagation.createBaggage({ "app.team": { value: "DrawerOfScrewdrivers" } })
);

const secondBaggage = propagation.getBaggage(contextWithAdditionalBaggate);

console.log("second baggage: " + JSON.stringify(secondBaggage?.getAllEntries()));
assert(secondBaggage?.getAllEntries().length === 1); // It loses the first baggage, it is overwritten!

/**
 * Step 3: add something to the baggage, for realz
 * Look at this mess, this is not easy
 */
function addBaggageToContext(
  entries: Record<string, BaggageEntry>,
  contextToAddBaggageTo: Context = context.active()
): Context {
  const existingBaggage = propagation.getBaggage(contextToAddBaggageTo);
  var newBaggage: Baggage;
  if (existingBaggage) {
    newBaggage = existingBaggage;
    Object.entries(entries).forEach(([key, value]) => {
      newBaggage = newBaggage.setEntry(key, value);
    });
  } else {
    newBaggage = propagation.createBaggage(entries);
  }
  return propagation.setBaggage(contextToAddBaggageTo, newBaggage);
}

const contextWithBothBaggage = addBaggageToContext(
  { "app.team": { value: "DrawerOfScrewdrivers" } },
  contextWithFirstBaggage
);

const thirdBaggage = propagation.getBaggage(contextWithBothBaggage);

console.log("third baggage: " + JSON.stringify(thirdBaggage?.getAllEntries()));
assert(thirdBaggage?.getAllEntries().length === 2);
