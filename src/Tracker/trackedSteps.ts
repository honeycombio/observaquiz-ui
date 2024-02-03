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

// export function advance(trackedSteps: TrackedSteps, completionResults: object): TrackedSteps {
//   const currentStep = findCurrentStep(trackedSteps);
//   currentStep.completionResults = { completed: true, ...completionResults }; // if it's done, I always want something in there, so it's truthy.

//   const { steps, currentStepPath } = trackedSteps;
//   const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
//   const nextStepIndex = currentStepIndex == steps.length - 1 ? currentStepIndex : currentStepIndex + 1;
//   return {
//     ...trackedSteps,
//     currentStep: steps[nextStepIndex].id,
//   };
// }

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

export function advance(trackedSteps: TrackedSteps): void {
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
