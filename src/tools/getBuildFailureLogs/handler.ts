import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import mcpErrorOutput from '../../lib/mcpErrorOutput.js';
import { formatJobLogs } from '../../lib/pipeline-job-logs/getJobLogs.js';
import getPipelineJobLogs from '../../lib/pipeline-job-logs/getPipelineJobLogs.js';
import {
  getBranchFromURL,
  getJobNumberFromURL,
  getPipelineNumberFromURL,
  getProjectSlugFromURL,
  identifyProjectSlug,
} from '../../lib/project-detection/index.js';
import type { getBuildFailureOutputInputSchema } from './inputSchema.js';
export const getBuildFailureLogs: ToolCallback<{
  params: typeof getBuildFailureOutputInputSchema;
}> = async (args) => {
  const {
    workspaceRoot,
    gitRemoteURL,
    branch,
    projectURL,
    projectSlug: inputProjectSlug,
  } = args.params;

  let projectSlug: string | undefined;
  let pipelineNumber: number | undefined;
  let branchFromURL: string | undefined;
  let jobNumber: number | undefined;

  if (inputProjectSlug) {
    if (!branch) {
      return mcpErrorOutput(
        'Branch not provided. When using projectSlug, a branch must also be specified.'
      );
    }
    projectSlug = inputProjectSlug;
  } else if (projectURL) {
    projectSlug = getProjectSlugFromURL(projectURL);
    pipelineNumber = getPipelineNumberFromURL(projectURL);
    branchFromURL = getBranchFromURL(projectURL);
    jobNumber = getJobNumberFromURL(projectURL);
  } else if (workspaceRoot && gitRemoteURL && branch) {
    projectSlug = await identifyProjectSlug({
      gitRemoteURL,
    });
  } else {
    return mcpErrorOutput(
      'Missing required inputs. Please provide either: 1) projectSlug with branch, 2) projectURL, or 3) workspaceRoot with gitRemoteURL and branch.'
    );
  }

  if (!projectSlug) {
    return mcpErrorOutput(`
          Project not found. Ask the user to provide the inputs user can provide based on the tool description.

          Project slug: ${projectSlug}
          Git remote URL: ${gitRemoteURL}
          Branch: ${branch}
          `);
  }

  const logs = await getPipelineJobLogs({
    projectSlug,
    branch: branchFromURL || branch,
    pipelineNumber,
    jobNumber,
  });

  return formatJobLogs(logs);
};
