/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from 'chai';
import {
  classification,
  defined_relationship,
  HQDMModel,
  HQDM_NS,
  individual,
  kind_of_relationship_with_signature,
  MEMBER_OF_KIND,
  role,
} from '../src/HQDM';

const BASE = 'https://www.test.co.uk/test#';

//
// Define the IRI prefixes to use in the output TTL
//
export const n3Options = {
  prefixes: {
    hqdm: HQDM_NS,
    test: BASE,
    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  },
};

describe('KindOfRelationshipWithSignature', () => {
  it('Can create a KindOfRelationshipWithSignature', () => {
    //
    // Create an instance of the HQDM model
    // and add a KindOfRelationshipWithSignature
    // with two roles
    //
    const m = new HQDMModel();
    const beforeAfterRelationship = m.createThing(
      kind_of_relationship_with_signature,
      BASE + 'korws1'
    );
    const before = m.createThing(role, BASE + 'before');
    const after = m.createThing(role, BASE + 'after');
    m.relate(HQDM_NS + 'roles', beforeAfterRelationship, before);
    m.relate(HQDM_NS + 'roles', beforeAfterRelationship, after);

    //
    // Create a DefinedRelationship that uses the
    // KindOfRelationshipWithSignature
    // and add two classifications to it
    // that relate to the two roles
    //
    const aBeforeB = m.createThing(defined_relationship, BASE + 'aBeforeB');
    m.relate(MEMBER_OF_KIND, aBeforeB, beforeAfterRelationship);

    // Create two individuals
    const a = m.createThing(individual, BASE + 'a');
    const b = m.createThing(individual, BASE + 'b');

    // Create two classifications that define the roles played
    // by the individuals in the DefinedRelationship
    //
    const aComesBefore = m.createThing(classification, BASE + 'aComesBefore');
    const bComesAfter = m.createThing(classification, BASE + 'bComesAfter');

    m.relate(HQDM_NS + 'classifier', aComesBefore, before);
    m.relate(HQDM_NS + 'member', aComesBefore, a);
    m.relate(HQDM_NS + 'classifier', bComesAfter, after);
    m.relate(HQDM_NS + 'member', bComesAfter, b);

    // Add the classifications to the DefinedRelationship
    m.relate(HQDM_NS + 'involves', aBeforeB, aComesBefore);
    m.relate(HQDM_NS + 'involves', aBeforeB, bComesAfter);

    // Dump the model as Turtle for inspection and graphing
    const ttl = m.save(n3Options);
    expect(ttl).not.to.be.null;
  });
});
