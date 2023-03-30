# The High Quality Data Model Library for TypeScript

Looking for a way of achieving seamless data exchange? Methods of trying to achieve this have been attempted by many but few solutions have scaled beyond initial pilots. That isn't surprising considering supporting digital representations of whatever is of interest in a dynamic environment is non-trivial to say the least. We live in a world where we constantly consume data for decision making and this project offers one way of articulating data by providing a foundation for any data implementation in any domain.

This package contains a partial replication of an openly available data model based on key ontological foundations to enable the integration of data, sometimes called interoperability or a lingua franca for data, by addressing consistency of representation no matter the application*. This comprises a set of TypeScript data structures to replicate the entity-relationship model published by Dr Matthew West as the [High Quality Data Model Framework](https://github.com/hqdmTop/hqdmFramework/wiki), but at the current time not the type hierarchy of the HQDM relations. This implementation model can be used to create extensions of the entity types, based on the founding ontological commitments and logical restrictions (such as cardinalities), and instances of those types through this TypeScript library.

This package is aware of the [MagmaCore](https://github.com/gchq/MagmaCore) solution, which is also a more complete implementation of HQDM in Java with a database storage implementation using Apache Jena. This package is independent of MagmaCore, with this TypeScript solution differing partially in both its structure and implementation, but there is a strong correspondence between the entity types and most of the key predicates being supported.

\* _This is a significant simplification and only meant to highlight some characteristics of the underlying model(HQDM).  Managing information is hard, but not managing it well costs more. At the time of publishing, the UK's National Digital Twin programme and other organisations are developing future models to address this goal with even more rigour.  A UK initiative to create a Foundation Data Model (FDM), building on theoretical work on a Core Constructional Ontology (CCO) and the work of a team of modelling experts led by Dr West, is under way. Information can be found about this by searching online, however the main concepts can also be read about here in [The Pathway Towards an Information Management Framework](https://digitaltwinhub.co.uk/files/file/85-the-pathway-towards-an-information-management-framework/), at the [Digital Twin Hub](https://digitaltwinhub.co.uk/) and through the [Apollo Protocol](https://www.theiet.org/impact-society/factfiles/built-environment-factfiles/the-apollo-protocol-unifying-digital-twins-across-sectors/). Data created using HQDM is likely to be mappable to the FDM with low effort (due to similar ontological commitments)._

## Getting Started

Install can be done through npm or use a local clone from github for the latest copy.

`npm i @apollo-protocol/hqdm-lib`

## Contributing

Contributions to the project are welcome. Please follow the contribution guidelines found [here](CONTRIBUTING.md).

In brief:
- Check for existing issues or create an issue describing the enhancement you wish to make enabling any feedback / discussion before starting.
- Fork the repo to your account.
- Push all your changes to the new fork.
- Submit a pull request from the fork back to this main repo.

## Licence

HQDM-lib is released under the terms of the  Apache 2.0 Licence [license](LICENCE.md).
