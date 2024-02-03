export type TrackedStep = {
  id: string;
  name: string; // could be duplicated
};

export type TrackedSteps = {
  steps: TrackedStep[]; // in order, each with a unique ID
  currentStep: string; // it is an ID
};

export const initialTrackedSteps: TrackedSteps = {
  steps: [
    { id: "initialstep-letsgo", name: "Begin" },
    { id: "initialstep-play", name: "Play" },
    { id: "initialstep-analyze", name: "Learn" },
    { id: "initialstep-winwin", name: "Win" },
  ],
  currentStep: "initialstep-letsgo",
};

export function advance(trackedSteps: TrackedSteps): TrackedSteps {
  const { steps, currentStep } = trackedSteps;
  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const nextStepIndex = currentStepIndex == steps.length - 1 ? currentStepIndex : currentStepIndex + 1;
  return {
    ...trackedSteps,
    currentStep: steps[nextStepIndex].id,
  };
}
