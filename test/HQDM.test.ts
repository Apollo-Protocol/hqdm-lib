/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from 'chai';
import {
  activity,
  classs,
  ENTITY_NAME,
  HQDM,
  HQDMModel,
  HQDM_NS,
  kind_of_activity,
  participant,
  person,
  point_in_time,
  role,
  spatio_temporal_extent,
  state_of_person,
  Thing,
  utcMillisecondsClass,
  utcPointInTimeIri,
} from '../src/HQDM';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';

const BASE = 'test:';
const TEST_UUID_NS = '65866c43-03f7-4397-9649-7ac2ab132df4';

describe('HQDMModel', () => {
  it('Can create a simple Model', () => {
    const model = new TestHQDMModel();

    const somePeople = model.createThing(
      classs,
      BASE + uuidv5('SomePeople', TEST_UUID_NS)
    );
    const person1 = model.createThing(
      person,
      BASE + uuidv5('Person1', TEST_UUID_NS)
    );
    const person2 = model.createThing(
      person,
      BASE + uuidv5('Person2', TEST_UUID_NS)
    );
    [person1, person2].forEach((p) => model.addMemberOf(p, somePeople));

    expect(person1).not.to.be.null;
    expect(model.isKindOf(person1, person)).to.be.true;
    expect(model.isMemberOf(person1, somePeople)).to.be.true;
    expect(model.isMemberOf(person2, somePeople)).to.be.true;
    expect(model.isKindOf(person1, somePeople)).to.be.false;
    expect(model.isKindOf(person2, somePeople)).to.be.false;
    model.checkIndexes();
  });

  it('Can create an activity', () => {
    const model = new TestHQDMModel();
    const activityFrom = model.createThing(
      point_in_time,
      utcPointInTimeIri(Date.UTC(2023, 2, 1, 12, 0, 0))
    );
    const activityTo = model.createThing(
      point_in_time,
      utcPointInTimeIri(Date.UTC(2023, 2, 1, 13, 0, 0))
    );

    const teacherFrom = model.createThing(
      point_in_time,
      utcPointInTimeIri(Date.UTC(1995, 11, 17, 3, 24, 0))
    );
    const teacherTo = model.createThing(
      point_in_time,
      utcPointInTimeIri(Date.UTC(10000, 1, 1, 0, 0, 0))
    );

    const studentFrom = model.createThing(
      point_in_time,
      utcPointInTimeIri(Date.UTC(2005, 4, 4, 12, 20, 0))
    );
    const studentTo = model.createThing(
      point_in_time,
      utcPointInTimeIri(Date.UTC(10000, 1, 1, 0, 0, 0))
    );

    [
      activityFrom,
      activityTo,
      teacherFrom,
      teacherTo,
      studentFrom,
      studentTo,
    ].forEach((p) => model.addMemberOf(p, utcMillisecondsClass));

    const teaching = model.createThing(
      kind_of_activity,
      BASE + uuidv5('Teaching', TEST_UUID_NS)
    );
    const teacherRole = model.createThing(
      role,
      BASE + uuidv5('Teacher', TEST_UUID_NS)
    );
    const studentRole = model.createThing(
      role,
      BASE + uuidv5('Student', TEST_UUID_NS)
    );
    const teacher = model.createThing(person, BASE + uuidv4());
    const student = model.createThing(person, BASE + uuidv4());
    const stateOfTeacher = model.createThing(state_of_person, BASE + uuidv4());
    const stateOfStudent = model.createThing(state_of_person, BASE + uuidv4());
    [participant, teacherRole].forEach((r) =>
      model.addMemberOfKind(stateOfTeacher, r)
    );
    [participant, studentRole].forEach((r) =>
      model.addMemberOfKind(stateOfStudent, r)
    );

    model.addAsTemporalPartOf(stateOfTeacher, teacher);
    model.addAsTemporalPartOf(stateOfStudent, student);

    const teachingHQDM = model.createThing(activity, BASE + uuidv4());
    model.addMemberOfKind(teachingHQDM, teaching);

    [stateOfStudent, stateOfTeacher].forEach((s) =>
      model.addParticipant(s, teachingHQDM)
    );
    model.beginning(teacher, teacherFrom);
    model.ending(teacher, teacherTo);
    model.beginning(student, studentFrom);
    model.ending(student, studentTo);

    const things = [stateOfTeacher, stateOfStudent, teachingHQDM];
    things.forEach((s) => {
      model.beginning(s, activityFrom);
      model.ending(s, activityTo);
    });

    expect(model.memberOfKind(stateOfTeacher).size).to.equal(3);
    expect(model.memberOfKind(stateOfStudent).size).to.equal(3);

    const ttl = model.save({
      hqdm: 'http://hqdm.com/',
      test: 'http://test.com/',
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    });

    expect(ttl).to.not.be.null;
    model.checkIndexes();
    const dump = model.dump();
    expect(dump).to.not.be.null;
    expect(dump).to.not.be.undefined;
    expect(dump.length).to.be.greaterThan(0);
  });

  it('Can add two models to create a third model', () => {
    const m1 = new HQDMModel();
    const m2 = new HQDMModel();

    const t1 = m1.createThing(
      spatio_temporal_extent,
      uuidv5('STE1', TEST_UUID_NS)
    );
    const t2 = m2.createThing(
      spatio_temporal_extent,
      uuidv5('STE2', TEST_UUID_NS)
    );
    const t3 = m1.createThing(classs, uuidv5('CLASS1', TEST_UUID_NS));
    const t4 = m2.createThing(classs, uuidv5('CLASS2', TEST_UUID_NS));

    m1.addMemberOf(t1, t3);
    m1.addMemberOf(t2, t4);

    const m3 = HQDMModel.addModels(m1, m2);

    expect(m1.isKindOf(t1, spatio_temporal_extent)).to.be.true;
    expect(m1.isKindOf(t2, spatio_temporal_extent)).to.be.false;
    expect(m1.isKindOf(t3, classs)).to.be.true;
    expect(m1.isKindOf(t4, classs)).to.be.false;

    expect(m2.isKindOf(t1, spatio_temporal_extent)).to.be.false;
    expect(m2.isKindOf(t2, spatio_temporal_extent)).to.be.true;
    expect(m2.isKindOf(t3, classs)).to.be.false;
    expect(m2.isKindOf(t4, classs)).to.be.true;

    expect(m3.isKindOf(t1, spatio_temporal_extent)).to.be.true;
    expect(m3.isKindOf(t2, spatio_temporal_extent)).to.be.true;
    expect(m3.isKindOf(t3, classs)).to.be.true;
    expect(m3.isKindOf(t4, classs)).to.be.true;
    expect(m3.isMemberOf(t1, t3)).to.be.true;
    expect(m3.isMemberOf(t2, t4)).to.be.true;
  });

  it('Can add entity names to things', () => {
    const model = HQDMModel.addModels(HQDM);
    const person1 = model.createThing(
      person,
      BASE + uuidv5('Person1', TEST_UUID_NS)
    );
    const person2 = model.createThing(
      person,
      BASE + uuidv5('Person2', TEST_UUID_NS)
    );

    const p1EntityName = new Thing('Person One');
    const p2EntityName = new Thing('Person Two');

    model.relate(ENTITY_NAME, person1, p1EntityName);
    model.relate(ENTITY_NAME, person2, p2EntityName);

    expect(model.related(ENTITY_NAME, person1, p1EntityName)).to.be.true;
    expect(model.related(ENTITY_NAME, person2, p2EntityName)).to.be.true;
    expect(model.related(ENTITY_NAME, person1, p2EntityName)).to.be.false;
    expect(model.related(ENTITY_NAME, person2, p1EntityName)).to.be.false;
  });

  it('Can convert a model to basic TTL', () => {
    const model = new HQDMModel();
    const person1 = model.createThing(
      person,
      BASE + uuidv5('Person1', TEST_UUID_NS)
    );
    const person2 = model.createThing(
      person,
      BASE + uuidv5('Person2', TEST_UUID_NS)
    );

    const p1EntityName = new Thing('Person One');
    const p2EntityName = new Thing('Person Two');

    model.relate(ENTITY_NAME, person1, p1EntityName);
    model.relate(ENTITY_NAME, person2, p2EntityName);
  });

  it('Can convert a model from basic TTL', () => {
    const ttl =
      'prefix hqdm: <http://hqdm.com/hqdm#>\nprefix test: <http://test.com/test#>\ntest:thing a hqdm:Thing .';
    const hqdm = HQDMModel.load(ttl);
    expect(hqdm).to.not.be.null;
    expect(hqdm).to.be.instanceof(HQDMModel);
  });

  it('Can create repeatable UTC timestamp IRIs', () => {
    [-100, -1, 0, 1, 100].forEach((n) => {
      const t1 = utcPointInTimeIri(n);
      const t2 = utcPointInTimeIri(n);
      expect(t1).to.equal(t2);
      expect(t1.length).to.equal(HQDM_NS.length + 36);
      expect(t2.length).to.equal(HQDM_NS.length + 36);
    });
  });

  // Test that it can add two HQDMModels together
  it('Can add two models together', () => {
    const m1 = new HQDMModel();
    const m2 = new HQDMModel();

    const t1 = m1.createThing(
      spatio_temporal_extent,
      uuidv5('STE1', TEST_UUID_NS)
    );
    const t2 = m2.createThing(
      spatio_temporal_extent,
      uuidv5('STE2', TEST_UUID_NS)
    );
    const t3 = m1.createThing(classs, uuidv5('CLASS1', TEST_UUID_NS));
    const t4 = m2.createThing(classs, uuidv5('CLASS2', TEST_UUID_NS));

    const m3 = HQDMModel.addModels(m1, m2);

    expect(m1.isKindOf(t1, spatio_temporal_extent)).to.be.true;
    expect(m1.isKindOf(t2, spatio_temporal_extent)).to.be.false;
    expect(m1.isKindOf(t3, classs)).to.be.true;
    expect(m1.isKindOf(t4, classs)).to.be.false;

    expect(m2.isKindOf(t1, spatio_temporal_extent)).to.be.false;
    expect(m2.isKindOf(t2, spatio_temporal_extent)).to.be.true;
    expect(m2.isKindOf(t3, classs)).to.be.false;
    expect(m2.isKindOf(t4, classs)).to.be.true;

    expect(m3.isKindOf(t1, spatio_temporal_extent)).to.be.true;
    expect(m3.isKindOf(t2, spatio_temporal_extent)).to.be.true;
    expect(m3.isKindOf(t3, classs)).to.be.true;
    expect(m3.isKindOf(t4, classs)).to.be.true;
  });
});

class TestHQDMModel extends HQDMModel {
  constructor() {
    super();
  }

  checkIndexes() {
    // Check that the predicates for each thing are all in the predicates index and that the things in the predicates index are all in the things index
    for (const [id1, thingPredicates] of this.things) {
      for (const [predicate, values] of thingPredicates) {
        values.forEach((value) => {
          expect(this.related(predicate, new Thing(id1), value)).to.be.true;
        });
      }
    }

    for (const [predicate, pairs] of this.relations) {
      if (predicate !== ENTITY_NAME) {
        pairs.forEach((p) => {
          expect(this.things.has(p.l.id)).to.be.true;
          // It's possible that the predicate is not in the thing's predicates - it could refer to something not in this model but in another one.
          // expect(this.things.has(p.r.id)).to.be.true;
          const predicates = this.things.get(p.l.id);
          expect(predicates).to.not.be.undefined;
          if (predicates) {
            expect(predicates.has(predicate)).to.be.true;
            const values = predicates.get(predicate);
            expect(values).to.not.be.undefined;
            if (values) {
              expect(values.has(p.r)).to.be.true;
            }
          }
        });
      }
    }
  }
}
