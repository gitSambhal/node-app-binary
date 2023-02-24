const axios = require('axios');
const fs = require('fs').promises;
const path = require('path')
const dotenv = require('dotenv');
const { cleanEnv, str, url, } = require('envalid');
const cron = require('node-cron');

const DD_INFO = {
  API_URL: 'https://http-intake.logs.datadoghq.eu/v1/input',
  HOST: 'local',
  SERVICE_NAME: 'CUSCSPI-AGENT-UPDATER',
  SOURCE: 'nodejs',
  LOG_LEVEL: {
    ERROR: 'error',
    LOG: 'log',
    WARN: 'warn',
  },
}

const PING_TYPES = {
  SUCCESS: 'success',
  FAIL: 'fail',
  LOG: 'log',
}

const CONFIGURATION_FILE_NAME = 'configuration.txt'
const isRunningAsPackaged = process?.pkg;
const currentDir = isRunningAsPackaged ? path.dirname(process.execPath) : __dirname;
const versionPattern = '#VERSION#'
const latestVersion = 'latest'
const envFilePath = path.join(currentDir, CONFIGURATION_FILE_NAME);

// Configure dotenv
dotenv.config({ path: envFilePath });
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
  VERSION: env.VERSION_FILE_NAME,
}

const DIR_NAMES = {
  DOWNLOAD_AGENT: env.AGENT_DOWNLOAD_DIRECTORY,
}

const versionFilePath = path.join(currentDir, FILE_NAMES.VERSION);
const filePathToDownloadAgent = path.join(currentDir, DIR_NAMES.DOWNLOAD_AGENT);
const filePathPatternInJfrog = `${env.JFROG_URL_ARTIFACT_FOLDER}/agent-win-${versionPattern}`
const apiUrlToCheckTheAgentVersion = env.URL_API_TO_CHECK_VERSION;

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
      const res = await axios.get(filePath, {
        responseType: 'arraybuffer',
        headers
      });
      await fs.writeFile(getFilePathToSaveDownloadedAgent(version), res.data);
      logMessage(`Version ${version} downloaded successfully, Updating the version info in the file`)
      await fs.writeFile(versionFilePath, String(version));
      return resolve()
    } catch (error) {
      if (axios.isAxiosError(error)) {
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
    const res = await axios.get(filePath + '?properties', { headers })
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
  return env.TS_MERCHANT_KEY;
}

const checkApiToGetVersionToInstallForThisMerchant = () => {
  return new Promise(async (resolve, reject) => {
    let versionToInstall;
    try {
      const currentMerchantKey = await getMerchantKey()
      const { data: apiResp } = await axios.get(apiUrlToCheckTheAgentVersion)
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

// Types : success, fail, log
function pingToHealthCheck({ type = PING_TYPES.SUCCESS, data = null } = {}) {
  const typesMap = {
    success: '',
    fail: '/fail',
    log: '/log',
  }
  const url = combinePathToUrl([env.HC_UUID_UPDATER, typesMap[type]], env.HC_PING_URL)
  axios.post(url, data).catch(e => {
    logError('pingToHealthCheck Error: ' + e.message, e)
  })
}

function logMessage(message = '') {
  if (!message) return;
  logToDataDog({ message, level: DD_INFO.LOG_LEVEL.LOG })
}

function logError(message = '', error = null) {
  if (!message) return;
  logToDataDog({
    message, level: DD_INFO.LOG_LEVEL.ERROR, error
  })
}

function logToDataDog({ message, level, error = null }) {
  let headers = {
    'Content-Type': 'application/json',
    'DD-API-KEY': env.DD_API_KEY,
  }
  let payload = {
    date: new Date().toISOString(),
    ddsource: DD_INFO.SOURCE,
    hostname: DD_INFO.HOST,
    level,
    message,
    service: DD_INFO.SERVICE_NAME,
    ...error && { error },
  };
  console.log(message)
  axios.post(DD_INFO.API_URL, payload, {
    headers: headers
  }).catch((e) => {
    console.log('logToDataDog Error: ' + e.message)
  });
}

async function toggleHealthCheckMonitor(uuid, isPause = true) {
  const action = isPause ? 'pause' : 'resume'
  const headers = {
    'X-Api-Key': env.HC_API_KEY,
    'Content-Type': 'application/x-www-form-urlencoded',
  }
  const url = combinePathToUrl(['api/v2/checks', uuid, action], env.HC_API_BASE_URL)
  const response = await axios.post(
    url,
    '',
    {
      headers
    }
  ).catch((e) => {
    logError(e.message, error)
  });
}

function combinePathToUrl(pathList, baseUrl) {
  const fullUrl = new URL(path.join(...pathList), baseUrl).toString();
  return fullUrl
}

cron.schedule('* * * * *', () => {
  console.log('running a task every minute');
  const url = env.HC_PING_URL_CRON;
  axios.get(url).catch(e => {
    logError('pingToHealthCheck cron Error: ' + e.message, e)
  }).then(() => {
    console.log('Ping success')
  })
});

// Cron job to pause health check monitor at 7 PM daily
cron.schedule('0 19 * * *', () => {
  toggleHealthCheckMonitor(env.HC_UUID_CRON)
});

// Cron job to resume health check monitor at 7 AM daily
cron.schedule('0 7 * * *', () => {
  toggleHealthCheckMonitor(env.HC_UUID_CRON, false)
});

