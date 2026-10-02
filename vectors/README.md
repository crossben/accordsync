# Golden test vectors

JSON files describing a set of operations, several delivery orders, and the one state every
replica must reach. The TypeScript test suite reads them; any future port (Dart first) must pass
the same files, so implementations can never disagree.

The file format is documented here once the first vectors land.
