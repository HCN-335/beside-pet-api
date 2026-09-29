import { describe, expect, it } from 'vitest';
import { matchesCrisis } from './crisis-pattern';

describe('crisis keyword screen', () => {
  it('detects direct self-harm language regardless of case', () => {
    expect(matchesCrisis('I WANT TO DIE')).toBe(true);
    expect(matchesCrisis('thinking about self-harm')).toBe(true);
  });

  it('does not classify an ordinary grief statement as a crisis', () => {
    expect(matchesCrisis('I miss my dog so much')).toBe(false);
  });
});
