const axios = require('axios');
const fs = require('fs').promises;
const path = require('path')
const dotenv = require('dotenv');
const { cleanEnv, str, url, } = require('envalid');

const FILE_NAMES = {
  ENV: 'configuration.txt',
  VERSION: 'version.txt',
}

const DIR_NAMES = {
  DOWNLOAD_AGENT: 'dist',
}

const isRunningAsPackaged = process?.pkg;
const currentDir = isRunningAsPackaged ? path.dirname(process.execPath) : __dirname;
const versionPattern = '#VERSION#'
const latestVersion = 'latest'
const versionFilePath = path.join(currentDir, FILE_NAMES.VERSION);
const filePathToDownloadAgent = path.join(currentDir, DIR_NAMES.DOWNLOAD_AGENT);
const envFilePath = path.join(currentDir, FILE_NAMES.ENV);

// Configure dotenv
dotenv.config({ path: envFilePath });
const env = cleanEnv(process.env, {
  JFROG_URL_ARTIFACT_FOLDER: url(),
  URL_API_TO_CHECK_VERSION: url(),
  JFROG_TOKEN: str(),
});

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

const saveBinaryFile = async (version) => {
  try {
    const filePath = filePathPatternInJfrog.replace(versionPattern, version);
    console.log(`Downloading the ${version} version`)
    const res = await axios.get(filePath, {
      responseType: 'arraybuffer',
      headers
    });
    await fs.writeFile(getFilePathToSaveDownloadedAgent(version), res.data);
    console.log('Updating the version info in the file')
    await fs.writeFile(versionFilePath, String(version));
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorResp = error.response.data.toString()
      console.log('Unable to download the file ', errorResp)
    }
    console.error(error.message)
  }
}

const getTheLatestVersionInfoInJfrog = async () => {
  const error = new Error('Version not found in jFrog')
  const filePath = filePathPatternInJfrog.replace(versionPattern, latestVersion);
  try {
    const res = await axios.get(filePath + '?properties', { headers })
    const version = res?.data?.properties?.version?.[0]
    if (!version) throw error
    console.log('Latest version in jfrog: ', version);
    return version
  } catch (error) {
    console.error(error.message)
    throw error
  }
}

const getCurrentInstalledVersionNumber = async () => {
  const error = new Error('Version info not found in version.txt file')
  try {
    const version = await (await fs.readFile(versionFilePath)).toString()
    if (!version) throw error;
    console.log('Current installed version: ', version)
    return version;
  } catch (error) {
    console.error(error.message)
    throw error;
  }
}

const getMerchantKey = async () => {
  return 'HQ-123-456'
}

const checkApiToGetVersionToInstallForThisMerchant = async () => {
  let versionToInstall;
  try {
    const currentMerchantKey = await getMerchantKey()
    const { data: apiResp } = await axios.get(apiUrlToCheckTheAgentVersion)
    versionToInstall = apiResp[currentMerchantKey];
  } catch (error) {
    console.error('Error occurred while checking the version from api or merchant key not found')
  }

  if (!versionToInstall) {
    console.error('Version not found in the api for this merchant')
    return;
  }
  const currentInstalledVersion = await getCurrentInstalledVersionNumber()
  if (currentInstalledVersion == versionToInstall) {
    console.warn('Correct version is installed already')
    return;
  }
  saveBinaryFile(versionToInstall)
}
checkApiToGetVersionToInstallForThisMerchant();