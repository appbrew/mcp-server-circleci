import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as client from '../../clients/client.js';
import { rerunWorkflow } from './handler.js';

vi.mock('../../clients/client.js');

const failedWorkflowId = '00000000-0000-0000-0000-000000000000';
const successfulWorkflowId = '11111111-1111-1111-1111-111111111111';
const newWorkflowId = '11111111-1111-1111-1111-111111111111';

function setupMockClient(workflowStatus, rerunResult = { workflow_id: newWorkflowId }) {
  const mockCircleCIClient = {
    workflows: {
      getWorkflow: vi
        .fn()
        .mockResolvedValue(workflowStatus !== undefined ? { status: workflowStatus } : undefined),
      rerunWorkflow: vi.fn().mockResolvedValue(rerunResult),
    },
  };
  vi.spyOn(client, 'getCircleCIClient').mockReturnValue(mockCircleCIClient as any);
  return mockCircleCIClient;
}

describe('rerunWorkflow', () => {
  describe('when rerunning a failed workflow', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });
    it('should return the new workflowId and url to the user if requested to be rerun with a given workflowId', async () => {
      const mockCircleCIClient = setupMockClient('failed');
      const controller = new AbortController();
      const result = await rerunWorkflow(
        {
          params: {
            workflowId: failedWorkflowId,
          },
        },
        {
          signal: controller.signal,
        }
      );
      expect(mockCircleCIClient.workflows.rerunWorkflow).toHaveBeenCalledWith({
        workflowId: failedWorkflowId,
        fromFailed: true,
      });
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `New workflowId is ${newWorkflowId} and [View Workflow in CircleCI](https://app.circleci.com/pipelines/workflows/11111111-1111-1111-1111-111111111111)`,
          },
        ],
      });
    });

    it('should return the new workflowId and url to the user if requested to be rerun with a given workflowURL', async () => {
      const mockCircleCIClient = setupMockClient('failed');
      const controller = new AbortController();
      const result = await rerunWorkflow(
        {
          params: {
            workflowURL: `https://app.circleci.com/pipelines/workflows/${failedWorkflowId}`,
          },
        },
        {
          signal: controller.signal,
        }
      );
      expect(mockCircleCIClient.workflows.rerunWorkflow).toHaveBeenCalledWith({
        workflowId: failedWorkflowId,
        fromFailed: true,
      });
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `New workflowId is ${newWorkflowId} and [View Workflow in CircleCI](https://app.circleci.com/pipelines/workflows/11111111-1111-1111-1111-111111111111)`,
          },
        ],
      });
    });

    it('should return the new workflowId and url to the user if requested to be rerun from start with a given workflowId', async () => {
      const mockCircleCIClient = setupMockClient('failed');
      const controller = new AbortController();
      const result = await rerunWorkflow(
        {
          params: {
            workflowId: failedWorkflowId,
            fromFailed: false,
          },
        },
        {
          signal: controller.signal,
        }
      );
      expect(mockCircleCIClient.workflows.rerunWorkflow).toHaveBeenCalledWith({
        workflowId: failedWorkflowId,
        fromFailed: false,
      });
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: `New workflowId is ${newWorkflowId} and [View Workflow in CircleCI](https://app.circleci.com/pipelines/workflows/11111111-1111-1111-1111-111111111111)`,
          },
        ],
      });
    });
  });

  describe('when rerunning a successful workflow', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });
    it('should return an error if requested to be rerun from failed with a given workflowId', async () => {
      const mockCircleCIClient = setupMockClient('success');
      mockCircleCIClient.workflows.rerunWorkflow.mockResolvedValue(undefined);
      const controller = new AbortController();
      const response = await rerunWorkflow(
        {
          params: {
            workflowId: successfulWorkflowId,
            fromFailed: true,
          },
        },
        {
          signal: controller.signal,
        }
      );
      expect(mockCircleCIClient.workflows.rerunWorkflow).not.toHaveBeenCalled();
      expect(response).toEqual({
        isError: true,
        content: [
          {
            type: 'text',
            text: 'Workflow is not failed, cannot rerun from failed',
          },
        ],
      });
    });
    it('should return the new workflowId and url to the user if requested to be rerun from start with a given workflowId', async () => {
      const mockCircleCIClient = setupMockClient('success');
      const controller = new AbortController();
      const response = await rerunWorkflow(
        {
          params: {
            workflowId: successfulWorkflowId,
            fromFailed: false,
          },
        },
        {
          signal: controller.signal,
        }
      );
      expect(mockCircleCIClient.workflows.rerunWorkflow).toHaveBeenCalledWith({
        workflowId: successfulWorkflowId,
        fromFailed: false,
      });
      expect(response).toEqual({
        content: [
          {
            type: 'text',
            text: `New workflowId is ${newWorkflowId} and [View Workflow in CircleCI](https://app.circleci.com/pipelines/workflows/11111111-1111-1111-1111-111111111111)`,
          },
        ],
      });
    });
    it('should return the new workflowId and url to the user if requested to be rerun from start with a given workflowURL', async () => {
      const mockCircleCIClient = setupMockClient('success');
      const controller = new AbortController();
      const response = await rerunWorkflow(
        {
          params: {
            workflowURL: `https://app.circleci.com/pipelines/workflows/${successfulWorkflowId}`,
            fromFailed: false,
          },
        },
        {
          signal: controller.signal,
        }
      );
      expect(mockCircleCIClient.workflows.rerunWorkflow).toHaveBeenCalledWith({
        workflowId: successfulWorkflowId,
        fromFailed: false,
      });
      expect(response).toEqual({
        content: [
          {
            type: 'text',
            text: `New workflowId is ${newWorkflowId} and [View Workflow in CircleCI](https://app.circleci.com/pipelines/workflows/11111111-1111-1111-1111-111111111111)`,
          },
        ],
      });
    });
    it('should return the new workflowId and url to the user if requested to be rerun with a given workflowId and no explicit fromFailed', async () => {
      const mockCircleCIClient = setupMockClient('success');
      const controller = new AbortController();
      const response = await rerunWorkflow(
        {
          params: {
            workflowId: successfulWorkflowId,
          },
        },
        {
          signal: controller.signal,
        }
      );
      expect(mockCircleCIClient.workflows.rerunWorkflow).toHaveBeenCalledWith({
        workflowId: successfulWorkflowId,
        fromFailed: false,
      });
      expect(response).toEqual({
        content: [
          {
            type: 'text',
            text: `New workflowId is ${newWorkflowId} and [View Workflow in CircleCI](https://app.circleci.com/pipelines/workflows/11111111-1111-1111-1111-111111111111)`,
          },
        ],
      });
    });
    it('should return the new workflowId and url to the user if requested to be rerun from start with a given workflowURL and no explicit fromFailed', async () => {
      const mockCircleCIClient = setupMockClient('success');
      const controller = new AbortController();
      const response = await rerunWorkflow(
        {
          params: {
            workflowURL: `https://app.circleci.com/pipelines/workflows/${successfulWorkflowId}`,
          },
        },
        {
          signal: controller.signal,
        }
      );
      expect(mockCircleCIClient.workflows.rerunWorkflow).toHaveBeenCalledWith({
        workflowId: successfulWorkflowId,
        fromFailed: false,
      });
      expect(response).toEqual({
        content: [
          {
            type: 'text',
            text: `New workflowId is ${newWorkflowId} and [View Workflow in CircleCI](https://app.circleci.com/pipelines/workflows/11111111-1111-1111-1111-111111111111)`,
          },
        ],
      });
    });
    it('should return the new workflowId and url to the user if requested to be rerun with fromFailed: undefined with a given workflowId', async () => {
      const mockCircleCIClient = setupMockClient('success');
      const controller = new AbortController();
      const response = await rerunWorkflow(
        {
          params: {
            workflowId: successfulWorkflowId,
            fromFailed: undefined,
          },
        },
        {
          signal: controller.signal,
        }
      );
      expect(mockCircleCIClient.workflows.rerunWorkflow).toHaveBeenCalledWith({
        workflowId: successfulWorkflowId,
        fromFailed: false,
      });
      expect(response).toEqual({
        content: [
          {
            type: 'text',
            text: `New workflowId is ${newWorkflowId} and [View Workflow in CircleCI](https://app.circleci.com/pipelines/workflows/11111111-1111-1111-1111-111111111111)`,
          },
        ],
      });
    });
  });

  describe('edge cases and errors', () => {
    it('should return an error if both workflowId and workflowURL are missing', async () => {
      setupMockClient(undefined);
      const controller = new AbortController();
      const response = await rerunWorkflow({ params: {} }, { signal: controller.signal });
      expect(response).toEqual({
        isError: true,
        content: [
          {
            type: 'text',
            text: 'workflowId is required and could not be determined from workflowURL.',
          },
        ],
      });
    });

    it('should return an error if workflow is not found', async () => {
      setupMockClient(undefined);
      const controller = new AbortController();
      const response = await rerunWorkflow(
        { params: { workflowId: 'nonexistent-id' } },
        { signal: controller.signal }
      );
      expect(response).toEqual({
        isError: true,
        content: [
          {
            type: 'text',
            text: 'Workflow not found',
          },
        ],
      });
    });

    it('should return an error if workflowURL is invalid and cannot extract workflowId', async () => {
      const getWorkflowIdFromURL = await import('../../lib/getWorkflowIdFromURL.js');
      const spy = vi.spyOn(getWorkflowIdFromURL, 'getWorkflowIdFromURL').mockReturnValue(undefined);
      setupMockClient(undefined);
      const controller = new AbortController();
      const response = await rerunWorkflow(
        { params: { workflowURL: 'invalid-url' } },
        { signal: controller.signal }
      );
      expect(response).toEqual({
        isError: true,
        content: [
          {
            type: 'text',
            text: 'workflowId is required and could not be determined from workflowURL.',
          },
        ],
      });
      spy.mockRestore();
    });
  });
});
