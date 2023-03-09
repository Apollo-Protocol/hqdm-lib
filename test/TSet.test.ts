/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from 'chai';
import { Pair, Thing } from '../src/HQDM';
import { TSet } from '../src/TSet';

describe('TSet', () => {
  it('Can behave as a Set of Things', () => {
    const s = new TSet<Thing>([]);

    const t1 = new Thing('same');
    const t2 = new Thing('same');
    const t3 = new Thing('different');

    s.add(t1);
    s.add(t2);
    s.add(t3);

    expect(s.has(t1)).to.be.true;
    expect(s.has(t2)).to.be.true;
    expect(s.has(t3)).to.be.true;
    expect(s.size).to.equal(2);
  });

  it('Can map a set of things to a set of other things', () => {
    const s = new TSet<Thing>([]);

    const t1 = new Thing('same');
    const t2 = new Thing('same');
    const t3 = new Thing('different');

    s.add(t1);
    s.add(t2);
    s.add(t3);

    const m = s.map((t) => new Pair(t, t));

    expect(m.has(new Pair(t1, t1))).to.be.true;
    expect(m.has(new Pair(t2, t2))).to.be.true;
    expect(m.has(new Pair(t3, t3))).to.be.true;
    expect(m.size).to.equal(2);
  });

  it('Can fmap a set of things to a set of sets of other things and flatten it', () => {
    const s = new TSet<Thing>([]);

    const t1 = new Thing('t1');
    const t2 = new Thing('t2');
    const t3 = new Thing('t3');

    s.add(t1);
    s.add(t2);
    s.add(t3);

    const m = s.fmap(
      (t) => new TSet([new Thing(t.id + '_1'), new Thing(t.id + '_2')])
    );

    expect(m.has(new Thing('t1_1'))).to.be.true;
    expect(m.has(new Thing('t1_2'))).to.be.true;
    expect(m.has(new Thing('t2_1'))).to.be.true;
    expect(m.has(new Thing('t2_2'))).to.be.true;
    expect(m.has(new Thing('t3_1'))).to.be.true;
    expect(m.has(new Thing('t3_2'))).to.be.true;
    expect(m.size).to.equal(6);
  });

  // Items can be removed from a TSet
  it('Can remove items from a TSet', () => {
    const s = new TSet<Thing>([]);

    const t1 = new Thing('one');
    const t2 = new Thing('two');
    const t3 = new Thing('three');

    s.add(t1);
    s.add(t2);
    s.add(t3);

    s.remove(t2);

    expect(s.has(t1)).to.be.true;
    expect(s.has(t2)).to.be.false;
    expect(s.has(t3)).to.be.true;
    expect(s.size).to.equal(2);
  });
});
