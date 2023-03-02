import { promises as fs } from 'fs';
import * as fS from 'fs';
import * as path from 'path';
import { dirname, join } from 'path';
import { default as axios } from 'axios';
import ProgressBar from 'progress';
import chalk from 'chalk';
import { getEnvVar } from './env.config';
import {
  logMessage,
  logError,
  isRunningAsTypescript,
  isRunningAsPackagedBinary,
  logSuccess,
} from './helpers';

// prettier-ignore
const currentDir = (isRunningAsPackagedBinary() ? dirname(process.execPath) : __dirname);
const versionPattern = '#VERSION#';
const latestVersion = 'latest';

const FILE_NAMES = {
  VERSION: 'version.txt',
};

const versionFilePath = join(
  currentDir,
  isRunningAsTypescript() ? '..' : '.',
  FILE_NAMES.VERSION,
);

const getJfrogApiHeaders = () => {
  const headers = {
    Authorization: `Bearer ${getEnvVar('JFROG_TOKEN')}`,
  };
  return headers;
};
const getApiUrlToCheckTheAgentVersion = () => {
  const apiUrlToCheckTheAgentVersion = getEnvVar('URL_API_TO_CHECK_VERSION');
  return apiUrlToCheckTheAgentVersion;
};

const getFilePathPatternInJfrog = () => {
  const filePathPattern = `${getEnvVar(
    'JFROG_URL_ARTIFACT_FOLDER',
  )}/agent-win-${versionPattern}`;
  return filePathPattern;
};

export const getAgentDownloadDir = () => {
  const dir = join(
    currentDir,
    isRunningAsTypescript() ? '..' : '.',
    getEnvVar('AGENT_DOWNLOAD_DIRECTORY'),
  );
  return dir;
};

const getDateTimeString = () => {
  const currentTime = new Date();
  const date = [
    currentTime.getDate(),
    currentTime.getMonth() + 1,
    currentTime.getFullYear(),
  ].join('-');
  const time = [
    currentTime.getHours(),
    currentTime.getMinutes(),
    currentTime.getSeconds(),
  ].join('');
  const str = `${date}_${time}`;
  return str;
};

const getFilePathToSaveDownloadedAgent = (version) => {
  const time = getDateTimeString();
  const filePath = join(
    getAgentDownloadDir(),
    'agent_' + version + '_' + time + '.exe',
  );
  return filePath;
};

const saveBinaryFile = (version): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      const filePathPatternInJfrog = getFilePathPatternInJfrog();
      const filePath = filePathPatternInJfrog.replace(versionPattern, version);
      logMessage(
        `Starting download of the version: ${chalk.green.bold(version)}`,
      );
      const res = await axios.get(filePath, {
        responseType: 'stream',
        headers: getJfrogApiHeaders(),
      });
      const totalLength = res.headers['content-length'];
      const progressBar = new ProgressBar(
        '-> Downloading [:bar] :percent :etas',
        {
          width: 40,
          complete: '=',
          incomplete: ' ',
          renderThrottle: 1,
          total: parseInt(totalLength),
        },
      );

      const filePathToSave = getFilePathToSaveDownloadedAgent(version);
      const writer = fS.createWriteStream(path.resolve(filePathToSave));

      res.data.on('data', (chunk) => progressBar.tick(chunk.length));
      res.data.on('end', async () => {
        logSuccess(
          `Version ${version} downloaded successfully, Updating the version info in the file`,
        );
        await fs.writeFile(versionFilePath, String(version));
        return resolve();
      });
      res.data.pipe(writer);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        let errorResp = error.message;
        if (error.response && error.response.data) {
          errorResp = error.response.data as any;
        }
        logError('Unable to download the file ' + errorResp);
      }
      logError('saveBinaryFile error: ' + error.message, error);
      return reject(error.message);
    }
  });
};

const getTheLatestVersionInfoInJfrog = async () => {
  const error = new Error('Version not found in jFrog');
  const filePathPatternInJfrog = getFilePathPatternInJfrog();
  const filePath = filePathPatternInJfrog.replace(
    versionPattern,
    latestVersion,
  );
  try {
    const res = await axios.get(filePath + '?properties', {
      headers: getJfrogApiHeaders(),
    });
    const version = res?.data?.properties?.version?.[0];
    if (!version) throw error;
    logMessage('Latest version in jfrog: ' + chalk.green.bold.bold(version));
    return version;
  } catch (error) {
    logError('getTheLatestVersionInfoInJfrog Error: ' + error.message, error);
    throw error;
  }
};

const getCurrentInstalledVersionNumber = () => {
  return new Promise(async (resolve, reject) => {
    const error = new Error('Version info not found in version.txt file');
    try {
      const version = await (await fs.readFile(versionFilePath)).toString();
      if (!version) throw error;
      logMessage('Current installed version: ' + chalk.yellow.bold(version));
      return resolve(version);
    } catch (error) {
      logError(
        'getCurrentInstalledVersionNumber Error: ' + error.message,
        error,
      );
      reject(error.message);
    }
  });
};

const getMerchantKey = async () => {
  return getEnvVar('TS_MERCHANT_KEY');
};

export const checkApiToGetVersionToInstallForThisMerchant = () => {
  return new Promise(async (resolve, reject) => {
    let versionToInstall;
    try {
      const currentMerchantKey = await getMerchantKey();
      const apiUrlToCheckTheAgentVersion = getApiUrlToCheckTheAgentVersion();
      const { data: apiResp } = await axios.get(apiUrlToCheckTheAgentVersion);
      versionToInstall = apiResp[currentMerchantKey];
    } catch (error) {
      logError(
        'checkApiToGetVersionToInstallForThisMerchant Error: Error occurred while checking the version from api or merchant key not found',
      );
      return reject(error);
    }

    if (!versionToInstall) {
      const msg =
        'checkApiToGetVersionToInstallForThisMerchant Error: Version not found in the api for this merchant';
      logError(msg);
      return reject(msg);
    }
    try {
      const currentInstalledVersion = await getCurrentInstalledVersionNumber();
      if (currentInstalledVersion == versionToInstall) {
        const msg =
          'checkApiToGetVersionToInstallForThisMerchant Error: Correct version is installed already as given in the API';
        logMessage(msg);
        return reject(msg);
      }
      return resolve(saveBinaryFile(versionToInstall));
    } catch (error) {
      return reject(error);
    }
  });
};
