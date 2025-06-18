import type { Workflow } from '../../clients/schemas.js';
import outputTextTruncated, { SEPARATOR } from '../outputTextTruncated.js';

export const formatLatestPipelineStatus = (workflows: Workflow[]) => {
  if (!workflows || workflows.length === 0) {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'No workflows found',
        },
      ],
    };
  }

  const outputText = workflows
    .map((workflow) => {
      let duration = 'unknown';

      // Calculate duration from timestamps if duration field is not available
      if (workflow.created_at && workflow.stopped_at) {
        const startTime = new Date(workflow.created_at).getTime();
        const endTime = new Date(workflow.stopped_at).getTime();
        const durationInMinutes = Math.round((endTime - startTime) / (1000 * 60));
        duration = `${durationInMinutes} minutes`;
      }

      const createdAt = new Date(workflow.created_at).toLocaleString();
      const stoppedAt = workflow.stopped_at
        ? new Date(workflow.stopped_at).toLocaleString()
        : 'in progress';

      const fields = [
        `Pipeline Number: ${workflow.pipeline_number}`,
        `Workflow: ${workflow.name}`,
        `Status: ${workflow.status}`,
        `Duration: ${duration}`,
        `Created: ${createdAt}`,
        `Stopped: ${stoppedAt}`,
      ].filter(Boolean);

      return `${SEPARATOR}${fields.join('\n')}`;
    })
    .join('\n');

  return outputTextTruncated(outputText);
};
