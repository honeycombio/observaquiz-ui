export type TrackedStep = {
  id: string;
  name: string; // could be duplicated
};

export type TrackedSteps = {
  steps: TrackedStep[]; // in order, each with a unique ID
  currentStep: string; // it is an ID
};

export const TopLevelSteps = {
  BEGIN: "initialstep-letsgo",
  PLAY: "initialstep-play",
  LEARN: "initialstep-analyze",
  WIN: "initialstep-winwin",
};

export const initialTrackedSteps: TrackedSteps = {
  steps: [
    { id: TopLevelSteps.BEGIN, name: "Begin" },
    { id: TopLevelSteps.PLAY, name: "Play" },
    { id: TopLevelSteps.LEARN, name: "Learn" },
    { id: TopLevelSteps.WIN, name: "Win" },
  ],
  currentStep: "initialstep-letsgo",
};

export function findCurrentStep(trackedSteps: TrackedSteps): TrackedStep {
  const result = trackedSteps.steps.find((s) => s.id === trackedSteps.currentStep);
  if (!result) throw new Error(`TrackedSteps is invalid! What is this step? ${trackedSteps.currentStep}`);
  return result;
}

export function advance(trackedSteps: TrackedSteps): TrackedSteps {
  const { steps, currentStep } = trackedSteps;
  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const nextStepIndex = currentStepIndex == steps.length - 1 ? currentStepIndex : currentStepIndex + 1;
  return {
    ...trackedSteps,
    currentStep: steps[nextStepIndex].id,
  };
}
