import { z } from 'zod';
import { workflowUrlDescription } from '../shared/constants.js';

export const rerunWorkflowInputSchema = z.object({
  workflowId: z
    .string()
    .describe(
      'This should be the workflowId of the workflow that need rerun. The workflowId is an UUID. An example workflowId is a12145c5-90f8-4cc9-98f2-36cb85db9e4b'
    )
    .optional(),
  fromFailed: z
    .boolean()
    .describe(
      'If true, reruns the workflow from failed. If false, reruns the workflow from the start. If omitted, the rerun behavior is based on the workflow status.'
    )
    .optional(),
  workflowURL: z.string().describe(workflowUrlDescription).optional(),
});
