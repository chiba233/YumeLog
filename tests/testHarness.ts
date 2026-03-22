export interface GoldenCase {
  name: string;
  run: () => Promise<void> | void;
}

const CLEAR_SCREEN = "\u001bc";

const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.stack || `${error.name}: ${error.message}`;
  }

  return String(error);
};

export const runGoldenCases = async (
  suiteName: string,
  summaryLabel: string,
  cases: GoldenCase[],
): Promise<void> => {
  const passLines: string[] = [];

  for (const testCase of cases) {
    try {
      await testCase.run();
      passLines.push(`PASS ${testCase.name}`);
    } catch (error) {
      process.stdout.write(CLEAR_SCREEN);
      console.error(`FAIL ${suiteName}`);
      console.error(`FAIL ${testCase.name}`);
      console.error(formatError(error));
      process.exitCode = 1;
      throw error;
    }
  }

  for (const line of passLines) {
    console.log(line);
  }

  console.log(`PASS ${cases.length} 个${summaryLabel}`);
};
