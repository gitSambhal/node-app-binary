import { get, isAxiosError } from 'axios';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import { cleanEnv, str, url } from 'envalid';


const CONFIGURATION_FILE_NAME = 'configuration.txt'
const isRunningAsPackaged = process?.pkg;
const currentDir = isRunningAsPackaged ? dirname(process.execPath) : __dirname;
const versionPattern = '#VERSION#'
const latestVersion = 'latest'
const envFilePath = join(currentDir, CONFIGURATION_FILE_NAME);

// Configure dotenv
config({ path: envFilePath }); ç
const env = cleanEnv(process.env, {
  AGENT_DOWNLOAD_DIRECTORY: str(),
  DD_API_KEY: str(),
  JFROG_TOKEN: str(),
  JFROG_URL_ARTIFACT_FOLDER: url(),
  TS_MERCHANT_KEY: str(),
  URL_API_TO_CHECK_VERSION: url(),
  VERSION_FILE_NAME: str(),
  HC_API_KEY: str(),
  HC_API_BASE_URL: url(),
  HC_PING_URL: url(),
  HC_UUID_CRON: str(),
  HC_UUID_UPDATER: str(),
});

const FILE_NAMES = {
  VERSION: process.env.VERSION_FILE_NAME,
}

const DIR_NAMES = {
  DOWNLOAD_AGENT: process.env.AGENT_DOWNLOAD_DIRECTORY,
}

const versionFilePath = join(__dirname, FILE_NAMES.VERSION);
const filePathToDownloadAgent = join(currentDir, DIR_NAMES.DOWNLOAD_AGENT);
const filePathPatternInJfrog = `${env.JFROG_URL_ARTIFACT_FOLDER}/agent-win-${versionPattern}`
const apiUrlToCheckTheAgentVersion = process.env.URL_API_TO_CHECK_VERSION;

const headers = {
  Authorization: `Bearer ${env.JFROG_TOKEN}`
}

// Create path if doesn't exists
fs.mkdir(filePathToDownloadAgent, { recursive: true }, (err) => {
  if (err) throw err;
});

const getDateTimeString = () => {
  const currentTime = new Date();
  const date = [
    currentTime.getDate(),
    currentTime.getMonth() + 1,
    currentTime.getFullYear(),
  ].join('-')
  const time = [currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds()].join('')
  const str = `${date}_${time}`
  return str;

}

const getFilePathToSaveDownloadedAgent = (version) => {
  const time = getDateTimeString();
  const filePath = filePathToDownloadAgent + 'agent_' + version + '_' + time + '.exe'
  return filePath
}

const saveBinaryFile = (version) => {
  return new Promise(async (resolve, reject) => {
    try {
      const filePath = filePathPatternInJfrog.replace(versionPattern, version);
      logMessage(`Downloading the version: ${version}`)
      const res = await get(filePath, {
        responseType: 'arraybuffer',
        headers
      });
      await fs.writeFile(getFilePathToSaveDownloadedAgent(version), res.data);
      logMessage(`Version ${version} downloaded successfully, Updating the version info in the file`)
      await fs.writeFile(versionFilePath, String(version));
      return resolve()
    } catch (error) {
      if (isAxiosError(error)) {
        let errorResp = error.message;
        if (error.response && error.response.data) {
          errorResp = error.response.data.toString()
        }
        logMessage('Unable to download the file ' + errorResp)
      }
      logError('saveBinaryFile error: ' + error.message, error)
      return reject(error.message)
    }
  })
}

const getTheLatestVersionInfoInJfrog = async () => {
  const error = new Error('Version not found in jFrog')
  const filePath = filePathPatternInJfrog.replace(versionPattern, latestVersion);
  try {
    const res = await get(filePath + '?properties', { headers })
    const version = res?.data?.properties?.version?.[0]
    if (!version) throw error
    logMessage('Latest version in jfrog: ' + version);
    return version
  } catch (error) {
    logError('getTheLatestVersionInfoInJfrog Error: ' + error.message, error)
    throw error
  }
}

const getCurrentInstalledVersionNumber = () => {
  return new Promise(async (resolve, reject) => {
    const error = new Error('Version info not found in version.txt file')
    try {
      const version = await (await fs.readFile(versionFilePath)).toString()
      if (!version) throw error;
      logMessage('Current installed version: ' + version)
      return resolve(version);
    } catch (error) {
      logError('getCurrentInstalledVersionNumber Error: ' + error.message, error)
      reject(error.message);
    }
  })
}

const getMerchantKey = async () => {
  return process.env.TS_MERCHANT_KEY;
}

const checkApiToGetVersionToInstallForThisMerchant = () => {
  return new Promise(async (resolve, reject) => {
    let versionToInstall;
    try {
      const currentMerchantKey = await getMerchantKey()
      const { data: apiResp } = await get(apiUrlToCheckTheAgentVersion)
      versionToInstall = apiResp[currentMerchantKey];
    } catch (error) {
      logError('checkApiToGetVersionToInstallForThisMerchant Error: Error occurred while checking the version from api or merchant key not found')
      return reject(error)
    }

    if (!versionToInstall) {
      const msg = 'checkApiToGetVersionToInstallForThisMerchant Error: Version not found in the api for this merchant'
      logError(msg)
      return reject(msg)
    }
    try {
      const currentInstalledVersion = await getCurrentInstalledVersionNumber()
      if (currentInstalledVersion == versionToInstall) {
        const msg = 'checkApiToGetVersionToInstallForThisMerchant Error: Correct version is installed already'
        logMessage(msg)
        return reject(msg)
      }
      return resolve(saveBinaryFile(versionToInstall))
    } catch (error) {
      return reject(error)
    }
  })
}

const main = () => {
  logMessage('--------------- Start ---------------')
  checkApiToGetVersionToInstallForThisMerchant()
    .then(() => {
      pingToHealthCheck({ type: PING_TYPES.SUCCESS })
    })
    .catch((error) => {
      pingToHealthCheck({ type: PING_TYPES.FAIL, data: error })
    }).finally(() => [
      logMessage('--------------- End ---------------')
    ])
}
main();



