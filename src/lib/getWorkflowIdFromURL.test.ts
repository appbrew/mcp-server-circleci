import { describe, expect, it } from 'vitest';
import { getWorkflowIdFromURL } from './getWorkflowIdFromURL.js';

describe('getWorkflowIdFromURL', () => {
  it('should return the workflow ID from a workflow URL', () => {
    const url = 'https://app.circleci.com/pipelines/gh/organization/project/1/workflows/123-abc';
    const result = getWorkflowIdFromURL(url);
    expect(result).toBe('123-abc');
  });
  it('should return the workflow ID from a job URL', () => {
    const url =
      'https://app.circleci.com/pipelines/gh/organization/project/1/workflows/123-abc/jobs/456';
    const result = getWorkflowIdFromURL(url);
    expect(result).toBe('123-abc');
  });
});
