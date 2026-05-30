import { describe, expect, it } from 'vitest';
import { splitMessageBlocks } from './ChatPanel';

describe('splitMessageBlocks', () => {
  it('splits prose and fenced code blocks for the chat renderer', () => {
    const blocks = splitMessageBlocks('## Build\n- create canvas\n\n```ts\nconst score = 7;\n```\nDone.');

    expect(blocks).toEqual([
      {
        id: 'text-0',
        kind: 'text',
        lines: ['## Build', '- create canvas', '']
      },
      {
        id: 'code-1',
        kind: 'code',
        language: 'ts',
        text: 'const score = 7;'
      },
      {
        id: 'text-2',
        kind: 'text',
        lines: ['Done.']
      }
    ]);
  });

  it('keeps unfinished fenced output readable instead of dropping it', () => {
    expect(splitMessageBlocks('```html\n<div>partial')).toEqual([
      {
        id: 'code-0',
        kind: 'code',
        language: 'html',
        text: '<div>partial'
      }
    ]);
  });
});
