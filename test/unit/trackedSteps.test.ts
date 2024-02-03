import { advance, TrackedSteps } from '../../src/Tracker/trackedSteps';

describe('advance function', () => {
  it('should advance to the next substep', () => {
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

    advance(trackedSteps);
    expect(trackedSteps.currentStepPath).toBe("initialstep-letsgo/begin-apikey");
  });

  it('should advance to the next step after the last substep', () => {
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

    advance(trackedSteps);
    expect(trackedSteps.currentStepPath).toBe("initialstep-play");
  });

  it('should throw an error if there are no more steps', () => {
    const trackedSteps: TrackedSteps = {
      steps: [
        { id: "initialstep-play", name: "Play" },
      ],
      currentStepPath: "initialstep-play",
    };

    expect(() => advance(trackedSteps)).toThrow("No more steps");
  });

  // Add more tests as needed for edge cases and other scenarios
});
