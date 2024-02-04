export type TrackedStep = {
  id: string; // must be unique, at least in this array
  name?: string; // could be duplicated
  invisible?: boolean; // if it's not a step that the user should see
  substeps?: TrackedStep[];
  completionResults?: object;
  parameters?: object;
};

export type TrackedSteps = {
  steps: TrackedStep[]; // in order, each with a unique ID
  currentStepPath: string; // it is an ID or a slash-deliminated path of IDs
};

export const TopLevelSteps = {
  BEGIN: "initialstep-letsgo",
  PLAY: "initialstep-play",
  LEARN: "initialstep-analyze",
  WIN: "initialstep-winwin",
};

/**
 * This describes the flow of the whole program
 */
export const initialTrackedSteps: TrackedSteps = {
  steps: [
    {
      id: TopLevelSteps.BEGIN,
      name: "Begin",
      substeps: [
        // we don't show substeps yet, so whatevs.
        { id: "begin-hello", name: "Hello" },
        //  { id: "begin-email", name: "Identify Yourself" },
        { id: "begin-apikey", name: "Start Tracing" },
      ],
    },
    { id: TopLevelSteps.PLAY, name: "Play" },
    { id: TopLevelSteps.LEARN, name: "Learn" },
    { id: TopLevelSteps.WIN, name: "Win" },
  ],
  currentStepPath: "initialstep-letsgo/begin-hello",
};

export function findCurrentStep(trackedSteps: TrackedSteps): TrackedStep {
  var steps = trackedSteps.steps;
  var currentStep: TrackedStep | undefined = undefined;
  for (const currentStepId of trackedSteps.currentStepPath.split("/")) {
    currentStep = steps.find((s) => s.id === currentStepId);
    if (!currentStep) throw new Error(`TrackedSteps is invalid! What is this step? ${trackedSteps.currentStepPath}`);
    steps = currentStep.substeps || [];
  }
  if (!currentStep) throw new Error(`TrackedSteps is invalid! What is this step? ${trackedSteps.currentStepPath}`);
  return currentStep;
}

export function isComplete(step: TrackedStep): boolean {
  return !!step.completionResults || (step.substeps && step.substeps.every(isComplete)) || false;
}

/**
 * The idea here is, when we retrieve the question set, suddenly we know how many substeps PLAY has.
 * We add one for the question set loading which is already complete; and then one for each question.
 * We can then proceed with the next incomplete substep, Question 1.
 * @param trackedSteps
 * @param newSubsteps
 * @returns
 */
export function advanceIntoNewSubsteps(trackedSteps: TrackedSteps, newSubsteps: TrackedStep[]): TrackedSteps {
  const currentStep = findCurrentStep(trackedSteps);
  currentStep.substeps = newSubsteps;

  const firstIncompleteSubstep = newSubsteps.findIndex((s) => !s.completionResults);
  return {
    ...trackedSteps,
    currentStepPath: `${trackedSteps.currentStepPath}/${newSubsteps[firstIncompleteSubstep].id}`,
  };
}

function findLengthsOfArrays(trackedSteps: TrackedSteps, indexes: number[]): number[] {
  var modifiableIndexes = indexes.slice();
  var steps = trackedSteps.steps;
  const lengthsOfArrays = [];
  while (modifiableIndexes.length > 0) {
    lengthsOfArrays.push(steps.length);
    steps = steps[modifiableIndexes[0]].substeps || [];
    modifiableIndexes.shift();
  }
  return lengthsOfArrays;
}

function advanceIndex(indexes: number[], lengthsOfArrays: number[]): number[] {
  const reversedLengthsOfArrays = lengthsOfArrays.slice().reverse();
  const reversedIndexes = indexes.slice().reverse();
  while (reversedIndexes.length > 0) {
    if (reversedIndexes[0] + 1 < reversedLengthsOfArrays[0]) {
      reversedIndexes[0] += 1;
      return reversedIndexes.reverse();
    }
    reversedIndexes.shift();
    reversedLengthsOfArrays.shift();
  }
  throw new Error(`No more steps. Indexes: ${JSON.stringify(indexes)}, Lengths: ${JSON.stringify(lengthsOfArrays)}`);
}

function findPathFromIndexes(trackedSteps: TrackedSteps, indexes: number[]): string {
  var steps = trackedSteps.steps;
  var currentPath = "";
  for (const index of indexes) {
    currentPath += `/${steps[index].id}`;
    steps = steps[index].substeps || [];
  }
  return currentPath.slice(1); // remove the leading slash
}

export function advance(trackedSteps: TrackedSteps, completionResults?: object): TrackedSteps {
  // complete the current step
  const currentStep = findCurrentStep(trackedSteps);
  currentStep.completionResults = { complete: true, ...completionResults };

  // now move
  const indexesToCurrentStep = indexToCurrentStep(trackedSteps);
  const lengthsOfArrays = findLengthsOfArrays(trackedSteps, indexesToCurrentStep);

  const indexesToNextStep = advanceIndex(indexToCurrentStep(trackedSteps), lengthsOfArrays);
  const newCurrentPath = findPathFromIndexes(trackedSteps, indexesToNextStep);

  return {
    ...trackedSteps,
    currentStepPath: newCurrentPath,
  };
}

/**
 *
 * @param trackedSteps
 * @returns a path to the current step, as indexes into 'steps' and then 'substeps' arrays
 */
function indexToCurrentStep(trackedSteps: TrackedSteps): number[] {
  var steps = trackedSteps.steps;
  var indexes = [];
  for (const currentStepId of trackedSteps.currentStepPath.split("/")) {
    const index = steps.findIndex((s) => s.id === currentStepId);
    if (index === -1) throw new Error(`TrackedSteps is invalid! What is this step? ${trackedSteps.currentStepPath}`);
    steps = steps[index].substeps || [];
    indexes.push(index);
  }
  return indexes;
}
