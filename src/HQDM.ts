/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable max-classes-per-file */
import { Eq, TSet } from './TSet.js';
import * as N3 from 'n3';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import { Readable } from 'readable-stream';
import SerializerJsonld from '@rdfjs/serializer-jsonld';

const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;

/**
 * Thing is a class that represents the HQDM ontology.
 * I use thing for every object in the ontology, including string values for ENTITY_NAME and patterns.
 */
export class Thing implements Eq<Thing> {
  constructor(readonly id: string) {}
  equal(other: Thing): boolean {
    return this.id === other.id;
  }
}

/**
 * In some cases methods need to return the temporal boundaries of a thing as well as it's id.
 */
export class SpatioTemporalExtent extends Thing {
  constructor(id: string, readonly beginning?: Thing, readonly ending?: Thing) {
    super(id);
  }
}

// v5 UUIDs are namespaced, so this defines a unique namespace for these UUIDs to prevent clashes.
export const HQDM_UUID_NS = '5f971111-985b-49c6-83b7-d9f9bf660301';
export const HQDM_UTC_MS_CLASS_NAME = 'utc_milliseconds';
export const HQDM_UTC_POINT_IN_TIME_NS = uuidv5(
  HQDM_UTC_MS_CLASS_NAME,
  HQDM_UUID_NS
);
// Used when there is nothing to return rather than using null or undefined. Has to be cloned since TSet is mutable.
export const EMPTY: TSet<Thing> = new TSet([]);

/**
 * This is a class that represents a pair of things, with well defined equality semantics.
 */
export class Pair<L extends Eq<L>, R extends Eq<R>> implements Eq<Pair<L, R>> {
  constructor(readonly l: L, readonly r: R) {}
  equal(other: Pair<L, R>): boolean {
    return this.l.equal(other.l) && this.r.equal(other.r);
  }
}

// Usefule constants for the HQDM ontology.
export const HQDM_NS = 'https://hqdmtop.github.io/hqdm#';
export const ENTITY_NAME = HQDM_NS + 'data_EntityName';
export const CONSISTS_OF = HQDM_NS + 'consists_of';
export const CONSISTS_OF_ = HQDM_NS + 'consists_of_';
export const PART_OF_BY_CLASS = HQDM_NS + 'part_of_by_class';
export const REPRESENTS = HQDM_NS + 'represents';
export const CONSISTS_OF_BY_CLASS = HQDM_NS + 'consists_of_by_class';
export const CONSISTS_OF_IN_MEMBERS = HQDM_NS + 'consists_of_in_members';
export const REPRESENTED = HQDM_NS + 'represented';
export const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
export const MEMBER_OF = HQDM_NS + 'member_of';
export const MEMBER_OF_ = HQDM_NS + 'member_of_';
export const MEMBER_OF_KIND = HQDM_NS + 'member_of_kind';
export const PART_OF_POSSIBLE_WORLD = HQDM_NS + 'part_of_possible_world';
export const TEMPORAL_PART_OF = HQDM_NS + 'temporal_part_of';
export const PARTICIPANT_IN = HQDM_NS + 'participant_in';
export const BEGINNING = HQDM_NS + 'beginning';
export const ENDING = HQDM_NS + 'ending';

/**
 * This is a class that represents the HQDM ontology and provides methods to access and update it.
 * Both the internal indexes should be updated to keep them in sync.
 */
export class HQDMModel {
  // These are the things in the ontology indexed by ID. The internal Map links predicates to the values of the predicate for the thing.
  protected things: Map<string, Map<string, TSet<Thing>>>;
  // A second index by predicate name, linking pairs of things to the predicate.
  protected relations: Map<string, TSet<Pair<Thing, Thing>>>;

  constructor() {
    this.things = new Map();
    this.relations = new Map();
  }

  /**
   * Check if there is a thing with the given id.
   *
   * @id the id of the thing to check.
   * @returns true if the thing exists, false otherwise.
   */
  exists(id: string): boolean {
    return this.things.has(id);
  }

  /**
   * Find an object by it's well-known name if it has one.
   *
   * @name the name of the object.
   * @kind the type of object to find.
   * @returns the object if found, undefined otherwise.
   */
  findByEntityName(name: string, kind: Thing): Thing | undefined {
    return this.relations
      .get(ENTITY_NAME)
      ?.filter((p) => this.isKindOf(p.l, kind))
      ?.first((p) => p.r.id === name)?.l;
  }

  /**
   * Find objects by type.
   *
   * @kind the type of object to find.
   * @returns the objects if found, an empty array otherwise.
   */
  findByType(kind: Thing): TSet<Thing> {
    const result: Thing[] = [];
    this.relations.get(RDF_TYPE)?.forEach((p) => {
      if (p.r.equal(kind)) {
        result.push(p.l);
      }
    });
    return new TSet(result);
  }

  /**
   * Get the ENTITY_NAME for a thing.
   *
   * @param t the thing to get the name for.
   * @returns the name of the thing or 'Missing Entity Name' if it has no name.
   */
  getEntityName(t: Thing): string {
    return (
      this.relations.get(ENTITY_NAME)?.first((p) => p.l.equal(t))?.r.id ||
      'Missing Entity Name'
    );
  }

  /**
   * Get the identification signs for a thing that are recognised by the specified community.
   *
   * @param t the thing to get the signs for.
   * @param communityName the community to get the signs for.
   * @returns the signs for the thing.
   */
  getIdentifications(t: Thing, communityName: Thing): TSet<SpatioTemporalExtent> {
    return this.getSignsOfKind(t, communityName, identification);
  }

  /**
   * Get the participants for an activity.
   *
   * @param t should be an activity Thing.
   * @returns the participants for the activity.
   */
  getParticipants(t: Thing): TSet<Thing> {
    const result: Thing[] = [];
    this.relations
      .get(PARTICIPANT_IN)
      ?.filter((p) => p.r.equal(t))
      ?.map((p) => p.l)
      ?.forEach((p) => result.push(p));
    return new TSet(result);
  }

  /**
   * If the thing is a temporal part, get the whole.
   *
   * @param t the thing to get the whole for.
   * @returns the whole if the thing is a temporal part, undefined otherwise.
   */
  getTemporalWhole(t: Thing): Thing | undefined {
    return this.relations.get(TEMPORAL_PART_OF)?.first((p) => p.l.equal(t))?.r;
  }

  /**
   * Get the descriptions for a thing that are recognised by the specified community.
   *
   * @param t the thing to get the descriptions for.
   * @param communityName the community to get the descriptions for.
   * @returns the descriptions for the thing.
   */
  getDescriptions(t: Thing, communityName: Thing): TSet<SpatioTemporalExtent> {
    return this.getSignsOfKind(t, communityName, description);
  }

  /**
   * Get the roles for a thing.
   *
   * @param t the thing to get the roles for.
   * @returns the roles for the thing.
   */
  getRole(t: Thing): TSet<Thing> {
    const result: Thing[] = [];
    this.relations
      .get(MEMBER_OF_KIND)
      ?.filter((p) => p.l.equal(t))
      ?.filter((p) => this.isKindOf(p.r, role))
      ?.map((p) => p.r)
      ?.forEach((p) => result.push(p));
    return new TSet(result);
  }

  /**
   * Get signs of a specified kind for a thing that are recognised by the specified community.
   *
   * @param t the thing to get the signs for.
   * @param communityName the community to get the signs for.
   * @param kind the kind of sign to get.
   */
  getSignsOfKind(
    t: Thing,
    communityName: Thing,
    kind: Thing
  ): TSet<SpatioTemporalExtent> {
    const result: Thing[] = [];

    // Find the community.
    const comm = this.findByEntityName(
      communityName.id,
      recognizing_language_community
    );
    if (comm) {
      // Find all of the representation_by_signs and filter them by the kind.
      const repBySigns = this.relations
        .get(REPRESENTS)
        ?.filter((p) => p.r.equal(t))
        ?.filter((p) =>
          this.things
            .get(p.l.id)
            ?.get(MEMBER_OF_)
            ?.first((q) => this.isKindOf(q, kind))
            ? true
            : false
        )
        ?.map((p) => p.l);

      if (repBySigns) {
        repBySigns.forEach((rbs) => {
          // Find the community for the representation_by_signs and check whether it corresponds to the community we are looking for.
          const comm2 = this.things
            .get(rbs.id)
            ?.get(CONSISTS_OF_)
            ?.first((p) => this.isKindOf(p, recognizing_language_community));

          if (comm2 && comm2.equal(comm)) {
            // If the community matches, find the from and to times and the sign.
            const from = this.things
              .get(rbs.id)
              ?.get(BEGINNING)
              ?.first((x) => (x ? true : false));
            const to = this.things
              .get(rbs.id)
              ?.get(ENDING)
              ?.first((x) => (x ? true : false));

            // Find the first sign of the right kind.
            const sgn = this.things
              ?.get(rbs.id)
              ?.get(CONSISTS_OF)
              ?.first((p) => this.isKindOf(p, sign));

            if (sgn) {
              const idents = this.things.get(sgn.id)?.get(MEMBER_OF_);
              if (idents) {
                // Get all of the sign values.
                idents.forEach((i) => {
                  this.things
                    .get(i.id)
                    ?.get(ENTITY_NAME)
                    ?.forEach((e) => {
                      result.push(new SpatioTemporalExtent(e.id, from, to));
                    });
                });
              }
            }
          }
        });
      }
    }

    return new TSet(result);
  }

  /**
   * Add a thing to a possible world.
   *
   * @param t the thing to add.
   * @param pw the possible world to add the thing to.
   */
  addToPossibleWorld(t: Thing, pw: Thing): void {
    this.relate(PART_OF_POSSIBLE_WORLD, t, pw);
  }

  /**
   * Add a name as an identification for a thing.
   *
   * @param namespace the namespace of the name.
   * @param pw the possible world to add the thing to.
   * @param t the thing to add the name to.
   * @param ident the name to add.
   * @param communityName the community that recognises the name.
   * @param from the beginning of the time the name is recognised.
   * @param to the end of the time the name is recognised.
   */
  addIdentification(
    namespace: string,
    pw: Thing,
    t: Thing,
    ident: Thing,
    communityName: Thing,
    from: Thing,
    to: Thing
  ): void {
    this.addSign(
      namespace,
      pw,
      t,
      ident,
      communityName,
      identification,
      from,
      to
    );
  }

  /**
   * Add a description for a thing.
   *
   * @param namespace the namespace of the description.
   * @param pw the possible world to add the thing to.
   * @param t the thing to add the description to.
   * @param desc the description to add.
   * @param communityName the community that recognises the description.
   * @param from the beginning of the time the description is recognised.
   * @param to the end of the time the description is recognised.
   */
  addDescription(
    namespace: string,
    pw: Thing,
    t: Thing,
    desc: Thing,
    communityName: Thing,
    from: Thing,
    to: Thing
  ): void {
    this.addSign(namespace, pw, t, desc, communityName, description, from, to);
  }

  /**
   * Add a sign for a thing.
   *
   * @param namespace the namespace of the sign.
   * @param pw the possible world to add the thing to.
   * @param t the thing to add the sign to.
   * @param ident the sign to add.
   * @param communityName the community that recognises the sign.
   * @param repByPattern the pattern that the sign represents.
   * @param from the beginning of the time the sign is recognised.
   * @param to the end of the time the sign is recognised.
   */
  addSign(
    namespace: string,
    pw: Thing,
    t: Thing,
    ident: Thing,
    communityName: Thing,
    repByPattern: Thing,
    from: Thing,
    to: Thing
  ): void {
    // Find or create pattern for the ident.
    let patt = this.findByEntityName(ident.id, pattern);
    if (!patt) {
      patt = this.createThing(pattern, namespace + uuidv4());
      this.relate(ENTITY_NAME, patt, ident);
    }
    // Find or create the community.
    let comm = this.findByEntityName(
      communityName.id,
      recognizing_language_community
    );
    if (!comm) {
      comm = this.createThing(
        recognizing_language_community,
        namespace + uuidv4()
      );
      this.relate(ENTITY_NAME, comm, communityName);
      this.addToPossibleWorld(comm, pw);
    }
    // Create a sign of the pattern.
    const sgn = this.createThing(sign, namespace + uuidv4());
    this.addToPossibleWorld(sgn, pw);
    this.relate(MEMBER_OF_, sgn, patt);
    // Create Identification RepresentationByPattern.
    const irbp = this.createThing(repByPattern, namespace + uuidv4());
    this.relate(CONSISTS_OF_BY_CLASS, irbp, patt);
    this.relate(CONSISTS_OF_IN_MEMBERS, irbp, comm);
    this.relate(REPRESENTED, irbp, t);
    // Create RepresentationBySign.
    const rbs = this.createThing(representation_by_sign, namespace + uuidv4());
    this.addToPossibleWorld(rbs, pw);
    this.relate(PARTICIPANT_IN, sgn, rbs);
    this.relate(PARTICIPANT_IN, comm, rbs);
    this.relate(CONSISTS_OF, rbs, sgn);
    this.relate(CONSISTS_OF_, rbs, comm);
    this.relate(MEMBER_OF_, rbs, irbp);
    this.relate(REPRESENTS, rbs, t);
    this.beginning(rbs, from);
    this.ending(rbs, to);
  }

  /**
   * Save the model to a string in the format defined by the n3Options, defaults to TTL.
   *
   * @param n3Options the options for the N3 writer.
   * @returns the model as a string.
   */
  save(n3Options: object): string {
    const writer = new N3.Writer(n3Options);

    this.relations.forEach((pairs, predicate) => {
      // Store ENTITY_NAME values as literals and everything else as named nodes.
      if (predicate === ENTITY_NAME) {
        pairs.forEach((p) =>
          writer.addQuad(
            quad(
              namedNode(p.l.id),
              namedNode(predicate),
              literal(p.r.id),
              defaultGraph()
            )
          )
        );
      } else {
        pairs.forEach((p) => {
          writer.addQuad(
            quad(
              namedNode(p.l.id),
              namedNode(predicate),
              namedNode(p.r.id),
              defaultGraph()
            )
          );
        });
      }
    });
    let result = '';
    writer.end((_error, res) => (result = res as string));
    return result;
  }

  /**
   * Save as JSON-LD - Experimental.
   */
  saveJSONLD(f: (...args: any[]) => void): void {
    const serializerJsonld = new SerializerJsonld();
    const input = new Readable({
      objectMode: true,
      read: () => {
        this.relations.forEach((pairs, predicate) => {
          // Store ENTITY_NAME values as literals and everything else as named nodes.
          if (predicate === ENTITY_NAME) {
            pairs.forEach((p) =>
              input.push(
                quad(
                  namedNode(p.l.id),
                  namedNode(predicate),
                  literal(p.r.id),
                  defaultGraph()
                )
              )
            );
          } else {
            pairs.forEach((p) => {
              input.push(
                quad(
                  namedNode(p.l.id),
                  namedNode(predicate),
                  namedNode(p.r.id),
                  defaultGraph()
                )
              );
            });
          }
        });
        input.push(null);
      },
    });
    const output = serializerJsonld.import(input);

    output.on('data', f);
  }

  /**
   * Dump the model to the console for debugging.
   */
  dump(): string {
    const result: string[] = [];
    result.push(
      '---------------------------------------------------------------------'
    );
    result.push('Things:');
    this.things.forEach((predicates, t) => {
      result.push(`  ${t}:`);
      predicates.forEach((relations, predicate) => {
        result.push(`    ${predicate}`);
        relations.forEach((r) => result.push(`      ${r.id}`));
      });
    });
    result.push('Relations:');
    this.relations.forEach((pairs, predicate) => {
      result.push(`  ${predicate}`);
      pairs.forEach((p) => result.push(`    ${p.l.id} ${p.r.id}`));
    });
    result.push(
      '---------------------------------------------------------------------'
    );
    return result.join('\n');
  }

  /**
   * Find the classes that a thing is a member of.
   *
   * @param t the thing to find the classes for.
   * @returns the classes that the thing is a member of.
   */
  memberOf(t: Thing): TSet<Thing> {
    return this.getRelated(t, MEMBER_OF);
  }

  /**
   * Find the kinds that a thing is a member of.
   *
   * @param t the thing to find the kinds for.
   * @returns the kinds that the thing is a member of.
   */
  memberOfKind(t: Thing): TSet<Thing> {
    return this.getRelated(t, MEMBER_OF_KIND);
  }

  /**
   * Check if a thing is a member of a kind.
   *
   * @param t the thing to check.
   * @param k the kind to check for.
   * @returns true if the thing is a member of the kind.
   */
  isKindOf(t: Thing, k: Thing): boolean {
    return this._getRelated(t, MEMBER_OF_KIND).has(k);
  }

  /**
   * Check if a thing is a member of a class.
   *
   * @param t the thing to check.
   * @param c the class to check for.
   * @returns true if the thing is a member of the class.
   */
  isMemberOf(t: Thing, c: Thing): boolean {
    return this._getRelated(t, MEMBER_OF).has(c);
  }

  /**
   * Add a relationship between two things.
   *
   * @param predicate the predicate of the relationship.
   * @param first the first thing in the relationship.
   * @param second the second thing in the relationship.
   */
  relate(predicate: string, first: Thing, second: Thing): void {
    // Find the predicates for the thing or create a new map if it doesn't exist.
    let predicates = this.things.get(first.id);
    if (!predicates) {
      predicates = new Map();
      this.things.set(first.id, predicates);
    }

    // Find the relations for the predicate or create a new set if it doesn't exist and add 'second' to it.
    let relations = predicates?.get(predicate);
    if (!relations) {
      relations = new TSet<Thing>([second]);
      predicates?.set(predicate, relations);
    } else {
      relations.add(second);
    }

    // Find the pairs for the predicate or create a new set if it doesn't exist and add a new pair to it.
    let pairs = this.relations.get(predicate);
    if (!pairs) {
      pairs = new TSet([]);
      this.relations.set(predicate, pairs);
    }
    pairs?.add(new Pair(first, second));
  }

  /**
   * Check if two things are related by a predicate.
   *
   * @param predicate the predicate to check.
   * @param first the first thing in the relationship.
   * @param second the second thing in the relationship.
   * @returns true if the two things are related by the predicate.
   */
  related(predicate: string, first: Thing, second: Thing): boolean {
    const pairs = this.relations.get(predicate);
    return !pairs ? false : pairs.has(new Pair(first, second));
  }

  /**
   * Fetch all the Things related to this Thing by a predicate.
   * This private method returns a TSet so that we can use the TSet.has() method elsewhere.
   *
   * @param t the first thing in the relationship.
   * @param predicate the predicate to search for.
   * @returns a TSet of the results.
   */
  private _getRelated(t: Thing, predicate: string): TSet<Thing> {
    return this.things.get(t.id)?.get(predicate) ?? EMPTY;
  }

  /**
   * Fetch all the Things related to this Thing by a predicate.
   *
   * @param t the first thing in the relationship.
   * @param predicate the predicate to search for.
   * @returns a TSet of the results.
   */
  getRelated(t: Thing, predicate: string): TSet<Thing> {
    return this.things.get(t.id)
      ?.get(predicate)
      ?.clone() ?? EMPTY.clone();
  }

  /**
   * Create a new thing of a specified kind.
   *
   * @param kind the kind of thing to create.
   * @param id the id of the thing to create.
   * @returns the new thing.
   */
  createThing(kind: Thing, id: string): Thing {
    const t = new Thing(id);
    let predicates = this.things.get(id);
    if (!predicates) {
      predicates = new Map();
      this.things.set(id, predicates);
    }
    this.relate(RDF_TYPE, t, kind);
    this.addMemberOfKind(t, kind);

    return t;
  }

  /**
   * Add a thing to a kind.
   *
   * @param t the thing to add to the kind.
   * @param kind the kind to add the thing to.
   * @returns the thing.
   */
  addMemberOfKind(t: Thing, kind: Thing): Thing {
    let kinds = this.things.get(t.id)?.get(MEMBER_OF_KIND);
    if (!kinds) {
      kinds = new TSet([kind]);
      this.things.get(t.id)?.set(MEMBER_OF_KIND, kinds);
    }
    kinds?.add(kind);

    let mok = this.relations.get(MEMBER_OF_KIND);
    if (!mok) {
      mok = new TSet([]);
      this.relations.set(MEMBER_OF_KIND, mok);
    }
    mok?.add(new Pair(t, kind));

    return t;
  }

  /**
   * Add a temporal part to a whole.
   *
   * @param part the temporal part to add.
   * @param whole the whole to add the temporal part to.
   */
  addAsTemporalPartOf(part: Thing, whole: Thing): void {
    this.relate(TEMPORAL_PART_OF, part, whole);
  }

  /**
   * Add a thing to a class.
   *
   * @param t the thing to add to the class.
   * @param c the class to add the thing to.
   */
  addMemberOf(t: Thing, c: Thing): void {
    this.relate(MEMBER_OF, t, c);
  }

  /**
   * Add a participant to a thing.
   *
   * @param p the participant to add.
   * @param t the thing to add the participant to.
   */
  addParticipant(p: Thing, t: Thing): void {
    this.relate(PARTICIPANT_IN, p, t);
  }

  /**
   * Set the ending of a thing.
   *
   * @param t the thing to set the ending of.
   * @param ev the ending event.
   */
  ending(t: Thing, ev: Thing): void {
    this.relate(ENDING, t, ev);
  }

  /**
   * Set the beginning of a thing.
   *
   * @param t the thing to set the beginning of.
   * @param ev the beginning event.
   */
  beginning(t: Thing, ev: Thing): void {
    this.relate(BEGINNING, t, ev);
  }

  /**
   * Get the beginning event of a thing.
   *
   * @param t the thing to get the beginning event of.
   * @returns the beginning event or undefined.
   */
  getBeginning(t: Thing): Thing | undefined {
    return this.things
      .get(t.id)
      ?.get(BEGINNING)
      ?.first((x) => (x ? true : false));
  }

  /**
   * Get the ending event of a thing.
   *
   * @param t the thing to get the ending event of.
   * @returns the ending event or undefined.
   */
  getEnding(t: Thing): Thing | undefined {
    return this.things
      .get(t.id)
      ?.get(ENDING)
      ?.first((x) => (x ? true : false));
  }

  /**
   * Create a new HQDMModel by combining the specified models.
   *
   * @param models the models to combine.
   * @returns the new HQDMModel.
   */
  static addModels(...models: HQDMModel[]): HQDMModel {
    const result = new HQDMModel();

    models.forEach((m) => {
      m.relations.forEach((pairs, predicate) => {
        pairs.forEach((p) => result.relate(predicate, p.l, p.r));
      });
    });
    return result;
  }

  /**
   * Create a new HQDMModel by loading the specified Turtle.
   *
   * @param ttl the Turtle to load.
   * @returns the new HQDMModel or an Error.
   */
  static load(ttl: string): HQDMModel | Error {
    const parser = new N3.Parser();
    const result = new HQDMModel();

    try {
      const quads = parser.parse(ttl);

      quads.forEach((q) => {
        const s = new Thing(q.subject.id);
        const p = q.predicate.id;
        const o =
          q.object.termType === 'Literal'
            ? new Thing(q.object.value)
            : new Thing(q.object.id);
        result.relate(p, s, o);
      });
    } catch (e) {
      console.error(e);
      return e as Error;
    }

    return result;
  }
}

export const utcPointInTimeIri = (value: number): string =>
  HQDM_NS + uuidv5(value.toString(), HQDM_UTC_POINT_IN_TIME_NS);

//
// Create a new HQDMModel to contain the HQDM entity types and add all of the types.
// TODO: The full HQDM hierarchy is not represented in this model.
//
export const HQDM = new HQDMModel();

export const thing = new Thing(HQDM_NS + 'thing');
export const abstract_object = HQDM.createThing(
  thing,
  HQDM_NS + 'abstract_object'
);
export const acceptance_of_offer = HQDM.createThing(
  thing,
  HQDM_NS + 'acceptance_of_offer'
);
export const acceptance_of_offer_for_goods = HQDM.createThing(
  thing,
  HQDM_NS + 'acceptance_of_offer_for_goods'
);
export const activity = HQDM.createThing(thing, HQDM_NS + 'activity');
export const aggregation = HQDM.createThing(thing, HQDM_NS + 'aggregation');
export const agree_contract = HQDM.createThing(
  thing,
  HQDM_NS + 'agree_contract'
);
export const agreement_execution = HQDM.createThing(
  thing,
  HQDM_NS + 'agreement_execution'
);
export const agreement_process = HQDM.createThing(
  thing,
  HQDM_NS + 'agreement_process'
);
export const amount_of_money = HQDM.createThing(
  thing,
  HQDM_NS + 'amount_of_money'
);
export const asset = HQDM.createThing(thing, HQDM_NS + 'asset');
export const association = HQDM.createThing(thing, HQDM_NS + 'association');
export const beginning_of_ownership = HQDM.createThing(
  thing,
  HQDM_NS + 'beginning_of_ownership'
);
export const biological_object = HQDM.createThing(
  thing,
  HQDM_NS + 'biological_object'
);
export const biological_system = HQDM.createThing(
  thing,
  HQDM_NS + 'biological_system'
);
export const biological_system_component = HQDM.createThing(
  thing,
  HQDM_NS + 'biological_system_component'
);
export const classs = HQDM.createThing(thing, HQDM_NS + 'class');
export const class_of_abstract_object = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_abstract_object'
);
export const class_of_activity = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_activity'
);
export const class_of_agree_contract = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_agree_contract'
);
export const class_of_agreement_execution = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_agreement_execution'
);
export const class_of_agreement_process = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_agreement_process'
);
export const class_of_amount_of_money = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_amount_of_money'
);
export const class_of_association = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_association'
);
export const class_of_biological_object = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_biological_object'
);
export const class_of_biological_system = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_biological_system'
);
export const class_of_biological_system_component = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_biological_system_component'
);
export const class_of_class = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_class'
);
export const class_of_class_of_spatio_temporal_extent = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_class_of_spatio_temporal_extent'
);
export const class_of_contract_execution = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_contract_execution'
);
export const class_of_contract_process = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_contract_process'
);
export const class_of_event = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_event'
);
export const class_of_functional_object = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_functional_object'
);
export const class_of_functional_system = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_functional_system'
);
export const class_of_functional_system_component = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_functional_system_component'
);
export const class_of_in_place_biological_component = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_in_place_biological_component'
);
export const class_of_individual = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_individual'
);
export const class_of_installed_functional_system_component = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_installed_functional_system_component'
);
export const class_of_installed_object = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_installed_object'
);
export const class_of_intentionally_constructed_object = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_intentionally_constructed_object'
);
export const class_of_offer = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_offer'
);
export const class_of_ordinary_biological_object = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_ordinary_biological_object'
);
export const class_of_ordinary_functional_object = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_ordinary_functional_object'
);
export const class_of_ordinary_physical_object = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_ordinary_physical_object'
);
export const class_of_organization = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_organization'
);
export const class_of_organization_component = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_organization_component'
);
export const class_of_participant = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_participant'
);
export const class_of_party = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_party'
);
export const class_of_period_of_time = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_period_of_time'
);
export const class_of_person = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_person'
);
export const class_of_person_in_position = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_person_in_position'
);
export const class_of_physical_object = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_physical_object'
);
export const class_of_physical_property = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_physical_property'
);
export const class_of_physical_quantity = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_physical_quantity'
);
export const class_of_point_in_time = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_point_in_time'
);
export const class_of_position = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_position'
);
export const class_of_possible_world = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_possible_world'
);
export const class_of_reaching_agreement = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_reaching_agreement'
);
export const class_of_relationship = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_relationship'
);
export const class_of_representation = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_representation'
);
export const class_of_sales_product_instance = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_sales_product_instance'
);
export const class_of_sign = HQDM.createThing(thing, HQDM_NS + 'class_of_sign');
export const class_of_socially_contructed_activity = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_socially_contructed_activity'
);
export const class_of_socially_contructed_object = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_socially_contructed_object'
);
export const class_of_spatio_temporal_extent = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_spatio_temporal_extent'
);
export const class_of_state = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_state'
);
export const class_of_state_of_activity = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_state_of_activity'
);
export const class_of_state_of_amount_of_money = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_state_of_amount_of_money'
);
export const class_of_state_of_association = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_state_of_association'
);
export const class_of_state_of_biological_object = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_state_of_biological_object'
);
export const class_of_state_of_biological_system = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_state_of_biological_system'
);
export const class_of_state_of_biological_system_component = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_state_of_biological_system_component'
);
export const class_of_state_of_functional_object = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_state_of_functional_object'
);
export const class_of_state_of_functional_system = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_state_of_functional_system'
);
export const class_of_state_of_functional_system_component = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_state_of_functional_system_component'
);
export const class_of_state_of_intentionally_constructed_object =
  HQDM.createThing(
    thing,
    HQDM_NS + 'class_of_state_of_intentionally_constructed_object'
  );
export const class_of_state_of_ordinary_biological_object = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_state_of_ordinary_biological_object'
);
export const class_of_state_of_ordinary_functional_object = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_state_of_ordinary_functional_object'
);
export const class_of_state_of_ordinary_physical_object = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_state_of_ordinary_physical_object'
);
export const class_of_state_of_organization = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_state_of_organization'
);
export const class_of_state_of_organization_component = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_state_of_organization_component'
);
export const class_of_state_of_party = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_state_of_party'
);
export const class_of_state_of_person = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_state_of_person'
);
export const class_of_state_of_physical_object = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_state_of_physical_object'
);
export const class_of_state_of_position = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_state_of_position'
);
export const class_of_state_of_sales_product_instance = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_state_of_sales_product_instance'
);
export const class_of_state_of_sign = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_state_of_sign'
);
export const class_of_state_of_socially_constructed_activity = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_state_of_socially_constructed_activity'
);
export const class_of_state_of_socially_constructed_object = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_state_of_socially_constructed_object'
);
export const class_of_state_of_system = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_state_of_system'
);
export const class_of_state_of_system_component = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_state_of_system_component'
);
export const class_of_system = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_system'
);
export const class_of_system_component = HQDM.createThing(
  thing,
  HQDM_NS + 'class_of_system_component'
);
export const classification = HQDM.createThing(
  thing,
  HQDM_NS + 'classification'
);
export const composition = HQDM.createThing(thing, HQDM_NS + 'composition');
export const contract_execution = HQDM.createThing(
  thing,
  HQDM_NS + 'contract_execution'
);
export const contract_process = HQDM.createThing(
  thing,
  HQDM_NS + 'contract_process'
);
export const currency = HQDM.createThing(thing, HQDM_NS + 'currency');
export const defined_relationship = HQDM.createThing(
  thing,
  HQDM_NS + 'defined_relationship'
);
export const definition = HQDM.createThing(thing, HQDM_NS + 'definition');
export const description = HQDM.createThing(thing, HQDM_NS + 'description');
export const employee = HQDM.createThing(thing, HQDM_NS + 'employee');
export const employer = HQDM.createThing(thing, HQDM_NS + 'employer');
export const employment = HQDM.createThing(thing, HQDM_NS + 'employment');
export const ending_of_ownership = HQDM.createThing(
  thing,
  HQDM_NS + 'ending_of_ownership'
);
export const enumerated_class = HQDM.createThing(
  thing,
  HQDM_NS + 'enumerated_class'
);
export const event = HQDM.createThing(thing, HQDM_NS + 'event');
export const exchange_of_goods_and_money = HQDM.createThing(
  thing,
  HQDM_NS + 'exchange_of_goods_and_money'
);
export const function_ = HQDM.createThing(thing, HQDM_NS + 'function_');
export const functional_object = HQDM.createThing(
  thing,
  HQDM_NS + 'functional_object'
);
export const functional_system = HQDM.createThing(
  thing,
  HQDM_NS + 'functional_system'
);
export const functional_system_component = HQDM.createThing(
  thing,
  HQDM_NS + 'functional_system_component'
);
export const identification = HQDM.createThing(
  thing,
  HQDM_NS + 'identification'
);
export const identification_of_physical_quantity = HQDM.createThing(
  thing,
  HQDM_NS + 'identification_of_physical_quantity'
);
export const in_place_biological_component = HQDM.createThing(
  thing,
  HQDM_NS + 'in_place_biological_component'
);
export const individual = HQDM.createThing(thing, HQDM_NS + 'individual');
export const installed_functional_system_component = HQDM.createThing(
  thing,
  HQDM_NS + 'installed_functional_system_component'
);
export const installed_object = HQDM.createThing(
  thing,
  HQDM_NS + 'installed_object'
);
export const intentionally_constructed_object = HQDM.createThing(
  thing,
  HQDM_NS + 'intentionally_constructed_object'
);
export const kind_of_activity = HQDM.createThing(
  thing,
  HQDM_NS + 'kind_of_activity'
);
export const kind_of_association = HQDM.createThing(
  thing,
  HQDM_NS + 'kind_of_association'
);
export const kind_of_biological_object = HQDM.createThing(
  thing,
  HQDM_NS + 'kind_of_biological_object'
);
export const kind_of_biological_system = HQDM.createThing(
  thing,
  HQDM_NS + 'kind_of_biological_system'
);
export const kind_of_biological_system_component = HQDM.createThing(
  thing,
  HQDM_NS + 'kind_of_biological_system_component'
);
export const kind_of_functional_object = HQDM.createThing(
  thing,
  HQDM_NS + 'kind_of_functional_object'
);
export const kind_of_functional_system = HQDM.createThing(
  thing,
  HQDM_NS + 'kind_of_functional_system'
);
export const kind_of_functional_system_component = HQDM.createThing(
  thing,
  HQDM_NS + 'kind_of_functional_system_component'
);
export const kind_of_individual = HQDM.createThing(
  thing,
  HQDM_NS + 'kind_of_individual'
);
export const kind_of_intentionally_constructed_object = HQDM.createThing(
  thing,
  HQDM_NS + 'kind_of_intentionally_constructed_object'
);
export const kind_of_ordinary_biological_object = HQDM.createThing(
  thing,
  HQDM_NS + 'kind_of_ordinary_biological_object'
);
export const kind_of_ordinary_functional_object = HQDM.createThing(
  thing,
  HQDM_NS + 'kind_of_ordinary_functional_object'
);
export const kind_of_ordinary_physical_object = HQDM.createThing(
  thing,
  HQDM_NS + 'kind_of_ordinary_physical_object'
);
export const kind_of_organization = HQDM.createThing(
  thing,
  HQDM_NS + 'kind_of_organization'
);
export const kind_of_organization_component = HQDM.createThing(
  thing,
  HQDM_NS + 'kind_of_organization_component'
);
export const kind_of_party = HQDM.createThing(thing, HQDM_NS + 'kind_of_party');
export const kind_of_person = HQDM.createThing(
  thing,
  HQDM_NS + 'kind_of_person'
);
export const kind_of_physical_object = HQDM.createThing(
  thing,
  HQDM_NS + 'kind_of_physical_object'
);
export const kind_of_physical_property = HQDM.createThing(
  thing,
  HQDM_NS + 'kind_of_physical_property'
);
export const kind_of_physical_quantity = HQDM.createThing(
  thing,
  HQDM_NS + 'kind_of_physical_quantity'
);
export const kind_of_position = HQDM.createThing(
  thing,
  HQDM_NS + 'kind_of_position'
);
export const kind_of_relationship_with_restriction = HQDM.createThing(
  thing,
  HQDM_NS + 'kind_of_relationship_with_restriction'
);
export const kind_of_relationship_with_signature = HQDM.createThing(
  thing,
  HQDM_NS + 'kind_of_relationship_with_signature'
);
export const kind_of_socially_constructed_object = HQDM.createThing(
  thing,
  HQDM_NS + 'kind_of_socially_constructed_object'
);
export const kind_of_system = HQDM.createThing(
  thing,
  HQDM_NS + 'kind_of_system'
);
export const kind_of_system_component = HQDM.createThing(
  thing,
  HQDM_NS + 'kind_of_system_component'
);
export const language_community = HQDM.createThing(
  thing,
  HQDM_NS + 'language_community'
);
export const money_asset = HQDM.createThing(thing, HQDM_NS + 'money_asset');
export const offer = HQDM.createThing(thing, HQDM_NS + 'offer');
export const offer_and_acceptance_for_goods = HQDM.createThing(
  thing,
  HQDM_NS + 'offer_and_acceptance_for_goods'
);
export const offer_for_goods = HQDM.createThing(
  thing,
  HQDM_NS + 'offer_for_goods'
);
export const offering = HQDM.createThing(thing, HQDM_NS + 'offering');
export const ordinary_biological_object = HQDM.createThing(
  thing,
  HQDM_NS + 'ordinary_biological_object'
);
export const ordinary_functional_object = HQDM.createThing(
  thing,
  HQDM_NS + 'ordinary_functional_object'
);
export const ordinary_physical_object = HQDM.createThing(
  thing,
  HQDM_NS + 'ordinary_physical_object'
);
export const organization = HQDM.createThing(thing, HQDM_NS + 'organization');
export const organization_component = HQDM.createThing(
  thing,
  HQDM_NS + 'organization_component'
);
export const owner = HQDM.createThing(thing, HQDM_NS + 'owner');
export const ownership = HQDM.createThing(thing, HQDM_NS + 'ownership');
export const participant = HQDM.createThing(thing, HQDM_NS + 'participant');
export const party = HQDM.createThing(thing, HQDM_NS + 'party');
export const pattern = HQDM.createThing(thing, HQDM_NS + 'pattern');
export const period_of_time = HQDM.createThing(
  thing,
  HQDM_NS + 'period_of_time'
);
export const person = HQDM.createThing(thing, HQDM_NS + 'person');
export const person_in_position = HQDM.createThing(
  thing,
  HQDM_NS + 'person_in_position'
);
export const physical_object = HQDM.createThing(
  thing,
  HQDM_NS + 'physical_object'
);
export const physical_property = HQDM.createThing(
  thing,
  HQDM_NS + 'physical_property'
);
export const physical_property_range = HQDM.createThing(
  thing,
  HQDM_NS + 'physical_property_range'
);
export const physical_quantity = HQDM.createThing(
  thing,
  HQDM_NS + 'physical_quantity'
);
export const physical_quantity_range = HQDM.createThing(
  thing,
  HQDM_NS + 'physical_quantity_range'
);
export const plan = HQDM.createThing(thing, HQDM_NS + 'plan');
export const point_in_time = HQDM.createThing(thing, HQDM_NS + 'point_in_time');
export const position = HQDM.createThing(thing, HQDM_NS + 'position');
export const possible_world = HQDM.createThing(
  thing,
  HQDM_NS + 'possible_world'
);
export const price = HQDM.createThing(thing, HQDM_NS + 'price');
export const product_brand = HQDM.createThing(thing, HQDM_NS + 'product_brand');
export const product_offering = HQDM.createThing(
  thing,
  HQDM_NS + 'product_offering'
);
export const reaching_agreement = HQDM.createThing(
  thing,
  HQDM_NS + 'reaching_agreement'
);
export const recognizing_language_community = HQDM.createThing(
  thing,
  HQDM_NS + 'recognizing_language_community'
);
export const relationship = HQDM.createThing(thing, HQDM_NS + 'relationship');
export const representation_by_sign = HQDM.createThing(
  thing,
  HQDM_NS + 'representation_by_sign'
);
export const representation_by_pattern = HQDM.createThing(
  thing,
  HQDM_NS + 'representation_by_pattern'
);
export const requirement = HQDM.createThing(thing, HQDM_NS + 'requirement');
export const requirement_specification = HQDM.createThing(
  thing,
  HQDM_NS + 'requirement_specification'
);
export const role = HQDM.createThing(thing, HQDM_NS + 'role');
export const sale_of_goods = HQDM.createThing(thing, HQDM_NS + 'sale_of_goods');
export const sales_product = HQDM.createThing(thing, HQDM_NS + 'sales_product');
export const sales_product_instance = HQDM.createThing(
  thing,
  HQDM_NS + 'sales_product_instance'
);
export const sales_product_version = HQDM.createThing(
  thing,
  HQDM_NS + 'sales_product_version'
);
export const scale = HQDM.createThing(thing, HQDM_NS + 'scale');
export const sign = HQDM.createThing(thing, HQDM_NS + 'sign');
export const socially_constructed_activity = HQDM.createThing(
  thing,
  HQDM_NS + 'socially_constructed_activity'
);
export const socially_constructed_object = HQDM.createThing(
  thing,
  HQDM_NS + 'socially_constructed_object'
);
export const spatio_temporal_extent = HQDM.createThing(
  thing,
  HQDM_NS + 'spatio_temporal_extent'
);
export const specialization = HQDM.createThing(
  thing,
  HQDM_NS + 'specialization'
);
export const state = HQDM.createThing(thing, HQDM_NS + 'state');
export const state_of_activity = HQDM.createThing(
  thing,
  HQDM_NS + 'state_of_activity'
);
export const state_of_amount_of_money = HQDM.createThing(
  thing,
  HQDM_NS + 'state_of_amount_of_money'
);
export const state_of_association = HQDM.createThing(
  thing,
  HQDM_NS + 'state_of_association'
);
export const state_of_biological_object = HQDM.createThing(
  thing,
  HQDM_NS + 'state_of_biological_object'
);
export const state_of_biological_system = HQDM.createThing(
  thing,
  HQDM_NS + 'state_of_biological_system'
);
export const state_of_biological_system_component = HQDM.createThing(
  thing,
  HQDM_NS + 'state_of_biological_system_component'
);
export const state_of_functional_object = HQDM.createThing(
  thing,
  HQDM_NS + 'state_of_functional_object'
);
export const state_of_functional_system = HQDM.createThing(
  thing,
  HQDM_NS + 'state_of_functional_system'
);
export const state_of_functional_system_component = HQDM.createThing(
  thing,
  HQDM_NS + 'state_of_functional_system_component'
);
export const state_of_intentionally_constructed_object = HQDM.createThing(
  thing,
  HQDM_NS + 'state_of_intentionally_constructed_object'
);
export const state_of_language_community = HQDM.createThing(
  thing,
  HQDM_NS + 'state_of_language_community'
);
export const state_of_ordinary_biological_object = HQDM.createThing(
  thing,
  HQDM_NS + 'state_of_ordinary_biological_object'
);
export const state_of_ordinary_functional_object = HQDM.createThing(
  thing,
  HQDM_NS + 'state_of_ordinary_functional_object'
);
export const state_of_ordinary_physical_object = HQDM.createThing(
  thing,
  HQDM_NS + 'state_of_ordinary_physical_object'
);
export const state_of_organization = HQDM.createThing(
  thing,
  HQDM_NS + 'state_of_organization'
);
export const state_of_organization_component = HQDM.createThing(
  thing,
  HQDM_NS + 'state_of_organization_component'
);
export const state_of_party = HQDM.createThing(
  thing,
  HQDM_NS + 'state_of_party'
);
export const state_of_person = HQDM.createThing(
  thing,
  HQDM_NS + 'state_of_person'
);
export const state_of_physical_object = HQDM.createThing(
  thing,
  HQDM_NS + 'state_of_physical_object'
);
export const state_of_position = HQDM.createThing(
  thing,
  HQDM_NS + 'state_of_position'
);
export const state_of_sales_product_instance = HQDM.createThing(
  thing,
  HQDM_NS + 'state_of_sales_product_instance'
);
export const state_of_sign = HQDM.createThing(thing, HQDM_NS + 'state_of_sign');
export const state_of_socially_constructed_activity = HQDM.createThing(
  thing,
  HQDM_NS + 'state_of_socially_constructed_activity'
);
export const state_of_socially_constructed_object = HQDM.createThing(
  thing,
  HQDM_NS + 'state_of_socially_constructed_object'
);
export const state_of_system = HQDM.createThing(
  thing,
  HQDM_NS + 'state_of_system'
);
export const state_of_system_component = HQDM.createThing(
  thing,
  HQDM_NS + 'state_of_system_component'
);
export const system = HQDM.createThing(thing, HQDM_NS + 'system');
export const system_component = HQDM.createThing(
  thing,
  HQDM_NS + 'system_component'
);
export const temporal_composition = HQDM.createThing(
  thing,
  HQDM_NS + 'temporal_composition'
);
export const transfer_of_ownership = HQDM.createThing(
  thing,
  HQDM_NS + 'transfer_of_ownership'
);
export const transfer_of_ownership_of_money = HQDM.createThing(
  thing,
  HQDM_NS + 'transfer_of_ownership_of_money'
);
export const transferee = HQDM.createThing(thing, HQDM_NS + 'transferee');
export const transferor = HQDM.createThing(thing, HQDM_NS + 'transferor');
export const unit_of_measure = HQDM.createThing(
  thing,
  HQDM_NS + 'unit_of_measure'
);

// This is not HQDM but is needed to identify the class of point in time that contains UTC time values as milliseconds since the epoch.
export const utcMillisecondsClass = HQDM.createThing(
  class_of_point_in_time,
  HQDM_NS + HQDM_UTC_POINT_IN_TIME_NS
);
HQDM.relate(
  ENTITY_NAME,
  utcMillisecondsClass,
  new Thing(HQDM_NS + HQDM_UTC_MS_CLASS_NAME)
);
