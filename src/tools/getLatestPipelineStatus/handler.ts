import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { formatLatestPipelineStatus } from '../../lib/latest-pipeline/formatLatestPipelineStatus.js';
import { getLatestPipelineWorkflows } from '../../lib/latest-pipeline/getLatestPipelineWorkflows.js';
import mcpErrorOutput from '../../lib/mcpErrorOutput.js';
import { getBranchFromURL, getProjectSlugFromURL } from '../../lib/project-detection/index.js';
import { identifyProjectSlug } from '../../lib/project-detection/index.js';
import type { getLatestPipelineStatusInputSchema } from './inputSchema.js';

export const getLatestPipelineStatus: ToolCallback<{
  params: typeof getLatestPipelineStatusInputSchema;
}> = async (args) => {
  const {
    workspaceRoot,
    gitRemoteURL,
    branch,
    projectURL,
    projectSlug: inputProjectSlug,
  } = args.params;

  let projectSlug: string | null | undefined;
  let branchFromURL: string | null | undefined;

  if (inputProjectSlug) {
    if (!branch) {
      return mcpErrorOutput(
        'Branch not provided. When using projectSlug, a branch must also be specified.'
      );
    }
    projectSlug = inputProjectSlug;
  } else if (projectURL) {
    projectSlug = getProjectSlugFromURL(projectURL);
    branchFromURL = getBranchFromURL(projectURL);
  } else if (workspaceRoot && gitRemoteURL) {
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

  const latestPipelineWorkflows = await getLatestPipelineWorkflows({
    projectSlug,
    branch: branchFromURL ?? branch,
  });

  return formatLatestPipelineStatus(latestPipelineWorkflows);
};
