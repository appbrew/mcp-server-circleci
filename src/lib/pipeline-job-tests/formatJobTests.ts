import type { Test } from '../../clients/schemas.js';
import outputTextTruncated, { SEPARATOR } from '../outputTextTruncated.js';

/**
 * Formats test results into a readable format
 * @param tests - Array of test results
 * @returns MCP output object with formatted test results
 */
export const formatJobTests = (tests: Test[]) => {
  if (tests.length === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `No test results found. 
          
Possible reasons:
1. The selected job doesn't have test results reported
2. Tests might be reported in a different job in the workflow
3. The project may not be configured to collect test metadata

Try looking at a different job, pipeline, or branch. You can also check the project's CircleCI configuration to verify test reporting is set up correctly.

Note: Not all CircleCI jobs collect test metadata. This requires specific configuration in the .circleci/config.yml file using the store_test_results step.

For more information on how to configure test metadata collection, see the CircleCI documentation:
https://circleci.com/docs/collect-test-data/`,
        },
      ],
    };
  }

  const outputText = tests
    .map((test) => {
      const fields = [
        test.file && `File Name: ${test.file}`,
        test.classname && `Classname: ${test.classname}`,
        test.name && `Test name: ${test.name}`,
        test.result && `Result: ${test.result}`,
        test.run_time && `Run time: ${test.run_time}`,
        test.message && `Message: ${test.message}`,
      ].filter(Boolean);
      return `${SEPARATOR}${fields.join('\n')}`;
    })
    .join('\n');

  return outputTextTruncated(outputText);
};
