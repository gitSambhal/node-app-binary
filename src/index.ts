// This is the agent functionality
import { loadEnv } from './env.config';

async function main() {
  console.log('Inside main');
  await loadEnv();
  // Do your work here.
}
main();
