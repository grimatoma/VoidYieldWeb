import { describe, it, expect } from 'vitest';
import { getQualityGrade } from '@data/types';

describe('getQualityGrade', () => {
  it('returns F for OQ < 200', () => { expect(getQualityGrade(100)).toBe('F'); });
  it('returns D for OQ 200-399', () => { expect(getQualityGrade(300)).toBe('D'); });
  it('returns C for OQ 400-599', () => { expect(getQualityGrade(500)).toBe('C'); });
  it('returns B for OQ 600-799', () => { expect(getQualityGrade(680)).toBe('B'); });
  it('returns A for OQ 800-949', () => { expect(getQualityGrade(850)).toBe('A'); });
  it('returns S for OQ >= 950', () => { expect(getQualityGrade(980)).toBe('S'); });
});
