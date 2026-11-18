import { MongoBinary } from 'mongodb-memory-server';

/** Download the MongoDB binary once, before test files start in parallel workers. */
export default async function setup() {
  await MongoBinary.getPath();
}
