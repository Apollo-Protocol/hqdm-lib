/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from 'chai';
import { Pair, Thing } from '../src/HQDM';

describe('Pair', () => {
  it('Can compare two pairs for equality', () => {
    const t1 = new Thing('t1');
    const t2 = new Thing('t2');
    const t3 = new Thing('t1');
    const t4 = new Thing('t2');

    const p1 = new Pair(t1, t2);
    const p2 = new Pair(t3, t4);

    expect(p1.equal(p2)).to.be.true;
    expect(p1.equal(p2)).to.be.true;
  });
});
