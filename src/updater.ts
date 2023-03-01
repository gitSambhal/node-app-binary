import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { default as axios } from 'axios';
import { getEnvVar } from './env.config';
import {
  logMessage,
  logError,
  isRunningAsTypescript,
  isRunningAsPackagedBinary,
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
      logMessage(`Downloading the version: ${version}`);
      const res = await axios.get(filePath, {
        responseType: 'arraybuffer',
        headers: getJfrogApiHeaders(),
      });
      const filePathToSave = getFilePathToSaveDownloadedAgent(version);
      await fs.writeFile(filePathToSave, res.data);
      logMessage(
        `Version ${version} downloaded successfully, Updating the version info in the file`,
      );
      await fs.writeFile(versionFilePath, String(version));
      return resolve();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        let errorResp = error.message;
        if (error.response && error.response.data) {
          errorResp = error.response.data.toString();
        }
        logMessage('Unable to download the file ' + errorResp);
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
    logMessage('Latest version in jfrog: ' + version);
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
      logMessage('Current installed version: ' + version);
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
          'checkApiToGetVersionToInstallForThisMerchant Error: Correct version is installed already';
        logMessage(msg);
        return reject(msg);
      }
      return resolve(saveBinaryFile(versionToInstall));
    } catch (error) {
      return reject(error);
    }
  });
};
