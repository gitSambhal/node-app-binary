// This is the agent functionality
import { loadEnv } from '../env.config';

async function main() {
  console.log('Inside main from index');
  await loadEnv();
  console.log('Loaded env', process.env);

  // Do your work here.
}
main();
