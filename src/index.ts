import { promises as fs } from 'fs';
import { loadEnv } from './env.config';
import { logMessage, pingToHealthCheck, PING_TYPES } from './helpers';
import {
  getAgentDownloadDir,
  checkApiToGetVersionToInstallForThisMerchant,
} from './updater';

const main = async () => {
  await loadEnv();
  logMessage('--------------- Start ---------------');
  // Create path if doesn't exists
  await fs.mkdir(getAgentDownloadDir(), { recursive: true });

  try {
    await checkApiToGetVersionToInstallForThisMerchant();
    pingToHealthCheck({ type: PING_TYPES.SUCCESS });
  } catch (error) {
    pingToHealthCheck({ type: PING_TYPES.FAIL, data: error });
  } finally {
    logMessage('--------------- End ---------------');
  }
};
main();
