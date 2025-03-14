import {
  advance,
  findCurrentStep,
  TrackedSteps,
} from "../../src/Tracker/trackedSteps";

describe("advance function", () => {
  it("should advance to the next substep", () => {
    const trackedSteps: TrackedSteps = {
      steps: [
        {
          id: "initialstep-letsgo",
          name: "Begin",
          substeps: [
            { id: "begin-email", name: "Identify Yourself" },
            { id: "begin-apikey", name: "Start Tracing" },
          ],
        },
        { id: "initialstep-play", name: "Play" },
      ],
      currentStepPath: "initialstep-letsgo/begin-email",
    };

    const newTrackedSteps = advance(trackedSteps);
    expect(newTrackedSteps.currentStepPath).toBe(
      "initialstep-letsgo/begin-apikey"
    );
  });

  it("should advance to the next step after the last substep", () => {
    const trackedSteps: TrackedSteps = {
      steps: [
        {
          id: "initialstep-letsgo",
          name: "Begin",
          substeps: [
            { id: "begin-email", name: "Identify Yourself" },
            { id: "begin-something", name: "Another thing" },
            { id: "begin-apikey", name: "Start Tracing" },
          ],
        },
        { id: "initialstep-play", name: "Play" },
      ],
      currentStepPath: "initialstep-letsgo/begin-apikey",
    };

    const newTrackedSteps = advance(trackedSteps);
    expect(newTrackedSteps.currentStepPath).toBe("initialstep-play");
  });

  it("should throw an error if there are no more steps", () => {
    const trackedSteps: TrackedSteps = {
      steps: [{ id: "initialstep-play", name: "Play" }],
      currentStepPath: "initialstep-play",
    };

    expect(() => advance(trackedSteps)).toThrow("No more steps");
  });

  // Add more tests as needed for edge cases and other scenarios
});

describe("Finding the current step", () => {
  it("should find the step", () => {
    const trackedSteps: TrackedSteps = {
      steps: [
        {
          id: "initialstep-letsgo",
          name: "Begin",
          substeps: [
            { id: "begin-email", name: "Identify Yourself" },
            { id: "begin-apikey", name: "Start Tracing" },
          ],
        },
        { id: "initialstep-play", name: "Play" },
      ],
      currentStepPath: "initialstep-letsgo/begin-apikey",
    };

    const result = findCurrentStep(trackedSteps);
    expect(result).toStrictEqual({ id: "begin-apikey", name: "Start Tracing" });
  });

  it("should find the step", () => {
    const trackedSteps: TrackedSteps = {
      steps: [
        {
          id: "initialstep-letsgo",
          name: "Begin",
          substeps: [
            { id: "begin-hello", name: "Hi there" },
            { id: "begin-email", name: "Identify Yourself" },
            { id: "begin-apikey", name: "Start Tracing" },
          ],
        },
        { id: "initialstep-play", name: "Play" },
      ],
      currentStepPath: "initialstep-letsgo/begin-hello",
    };

    const result = findCurrentStep(trackedSteps);
    expect(result).toStrictEqual({ id: "begin-hello", name: "Hi there" });
  });
});
