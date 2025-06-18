import { getCircleCIClient } from '../../clients/client.js';
import type { Pipeline } from '../../clients/schemas.js';
import { rateLimitedRequests } from '../rateLimitedRequests/index.js';

/**
 * Retrieves test metadata for a specific job or all jobs in the latest pipeline
 *
 * @param {Object} params - The parameters for the job tests retrieval
 * @param {string} params.projectSlug - The slug of the CircleCI project
 * @param {number} [params.pipelineNumber] - The pipeline number to fetch tests for
 * @param {number} [params.jobNumber] - The job number to fetch tests for
 * @param {string} [params.branch] - The branch to fetch tests for
 * @param {string} [params.filterByTestsResult] - The result of the tests to filter by
 */
export const getJobTests = async ({
  projectSlug,
  pipelineNumber,
  jobNumber,
  branch,
  filterByTestsResult,
}: {
  projectSlug: string;
  pipelineNumber?: number;
  jobNumber?: number;
  branch?: string;
  filterByTestsResult?: 'failure' | 'success';
}) => {
  const circleci = getCircleCIClient();
  let pipeline: Pipeline | undefined;

  // If jobNumber is provided, fetch the tests for the specific job
  if (jobNumber) {
    const tests = await circleci.tests.getJobTests({
      projectSlug,
      jobNumber,
    });

    if (!filterByTestsResult) {
      return tests;
    }

    return tests.filter((test) => test.result === filterByTestsResult);
  }

  if (pipelineNumber) {
    pipeline = await circleci.pipelines.getPipelineByNumber({
      projectSlug,
      pipelineNumber,
    });
  }

  // If pipelineNumber is not provided, fetch the tests for the latest pipeline
  if (!pipeline) {
    const pipelines = await circleci.pipelines.getPipelines({
      projectSlug,
      branch,
    });

    pipeline = pipelines?.[0];
    if (!pipeline) {
      throw new Error('Pipeline not found');
    }
  }

  const workflows = await circleci.workflows.getPipelineWorkflows({
    pipelineId: pipeline.id,
  });

  const jobs = (
    await Promise.all(
      workflows.map(async (workflow) => {
        return await circleci.jobs.getWorkflowJobs({
          workflowId: workflow.id,
        });
      })
    )
  ).flat();

  const testsArrays = await rateLimitedRequests(
    jobs.map((job) => async () => {
      if (!job.job_number) {
        console.error(`Job ${job.id} has no job number`);
        return [];
      }

      try {
        const tests = await circleci.tests.getJobTests({
          projectSlug,
          jobNumber: job.job_number,
        });
        return tests;
      } catch (error) {
        if (error instanceof Error && error.message.includes('404')) {
          console.error(`Job ${job.job_number} not found:`, error);
          return [];
        }
        if (error instanceof Error && error.message.includes('429')) {
          console.error(`Rate limited for job request ${job.job_number}:`, error);
          return [];
        }
        throw error;
      }
    })
  );

  const tests = testsArrays.flat();

  if (!filterByTestsResult) {
    return tests;
  }

  return tests.filter((test) => test.result === filterByTestsResult);
};
