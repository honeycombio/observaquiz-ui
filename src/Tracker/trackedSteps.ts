export type TrackedStep = {
  id: string;
  name: string; // could be duplicated
  substeps?: TrackedStep[];
  completionResults?: object;
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

export const initialTrackedSteps: TrackedSteps = {
  steps: [
    {
      id: TopLevelSteps.BEGIN,
      name: "Begin",
      substeps: [
        { id: "begin-email", name: "Identify Yourself" },
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

export function advance(trackedSteps: TrackedSteps, completionResults?: object) {
  // complete the current step
  const currentStep = findCurrentStep(trackedSteps);
  currentStep.completionResults = { complete: true, ...completionResults };

  // now move
  const indexesToCurrentStep = indexToCurrentStep(trackedSteps);
  const lengthsOfArrays = findLengthsOfArrays(trackedSteps, indexesToCurrentStep);

  const indexesToNextStep = advanceIndex(indexToCurrentStep(trackedSteps), lengthsOfArrays);
  const newCurrentPath = findPathFromIndexes(trackedSteps, indexesToNextStep);

  trackedSteps.currentStepPath = newCurrentPath;
}

/**
 *
 * @param trackedSteps
 * @returns a path to the current step, as indexes into 'steps' and then 'substeps' arrays
 */
export function indexToCurrentStep(trackedSteps: TrackedSteps): number[] {
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

function chatGPTfindCurrentStep(trackedSteps: TrackedSteps): {
  step: TrackedStep;
  substep: TrackedStep | null;
  stepIndex: number;
  substepIndex: number | null;
} {
  const pathParts = trackedSteps.currentStepPath.split("/");
  const currentStepId = pathParts[0];
  const currentSubStepId = pathParts.length > 1 ? pathParts[1] : null;

  const stepIndex = trackedSteps.steps.findIndex((step) => step.id === currentStepId);
  if (stepIndex === -1) throw new Error("Current step not found");

  const currentStep = trackedSteps.steps[stepIndex];
  let substep: TrackedStep | null = null;
  let substepIndex: number | null = null;

  if (currentSubStepId && currentStep.substeps) {
    substepIndex = currentStep.substeps.findIndex((substep) => substep.id === currentSubStepId);
    if (substepIndex === -1) throw new Error("Current substep not found");
    substep = currentStep.substeps[substepIndex];
  }

  return { step: currentStep, substep, stepIndex, substepIndex };
}

export function advance1(trackedSteps: TrackedSteps): void {
  const { step, substep, stepIndex, substepIndex } = chatGPTfindCurrentStep(trackedSteps);

  if (substep && substepIndex !== null) {
    if (step.substeps && substepIndex < step.substeps.length - 1) {
      trackedSteps.currentStepPath = `${step.id}/${step.substeps[substepIndex + 1].id}`;
    } else {
      if (stepIndex < trackedSteps.steps.length - 1) {
        trackedSteps.currentStepPath = trackedSteps.steps[stepIndex + 1].id;
      } else {
        throw new Error("No more steps");
      }
    }
  } else {
    if (step.substeps && step.substeps.length > 0) {
      trackedSteps.currentStepPath = `${step.id}/${step.substeps[0].id}`;
    } else if (stepIndex < trackedSteps.steps.length - 1) {
      trackedSteps.currentStepPath = trackedSteps.steps[stepIndex + 1].id;
    } else {
      throw new Error("No more steps or substeps");
    }
  }
}

export function advance2(trackedSteps: TrackedSteps): void {
  const indices = indexToCurrentStep(trackedSteps);
  let currentContext = trackedSteps.steps;

  // Navigate to the current step/substep based on indices
  for (let i = 0; i < indices.length - 1; i++) {
    if (!currentContext[indices[i]].substeps) {
      throw new Error("Invalid step path");
    }
    currentContext = currentContext[indices[i]].substeps!;
  }

  const currentStepIndex = indices[indices.length - 1];

  // If there's a next substep in the current step
  if (currentContext[currentStepIndex].substeps && currentContext[currentStepIndex].substeps!.length > 0) {
    trackedSteps.currentStepPath += `/${currentContext[currentStepIndex].substeps![0].id}`;
  } else {
    // Move up the hierarchy to find the next step/substep
    while (indices.length > 0) {
      const lastIndex = indices.pop()!;
      const parentContext = indices.reduce((acc, curr) => acc[curr].substeps!, trackedSteps.steps);
      if (lastIndex + 1 < parentContext.length) {
        // Found the next step/substep
        const nextStep = parentContext[lastIndex + 1];
        const newPathParts = indices.concat(lastIndex + 1).map((idx) => parentContext[idx].id);
        trackedSteps.currentStepPath = newPathParts.join("/");
        return;
      }
    }

    // If the loop completes without finding a next step, there are no more steps
    throw new Error("No more steps");
  }
}
