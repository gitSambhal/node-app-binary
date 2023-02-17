const axios = require('axios');
const fs = require('fs').promises;

const versionPattern = '#VERSION#'
const filePathPatternInJfrog = `https://sambhalreg.jfrog.io/artifactory/generic-local/files/agent-win-${versionPattern}`
const apiUrlToCheckTheAgentVersion = 'https://rbaskets.in/vydtv1c'
const versionFilePath = './version.txt'
const latestVersion = 'latest'
const filePathToDownloadAgent = './build/';

// Create path if doesn't exists
fs.mkdir(filePathToDownloadAgent, { recursive: true }, (err) => {
  if (err) throw err;
});

const headers = {
  Authorization: 'Bearer cmVmdGtuOjAxOjE3MDc4MzExNjE6UldFSkJtb2d0MzJESzVqWklMYTRtSjR3bkxU'
}


const getFilePathToSaveDownloadedAgent = (version) => {
  const filePath = filePathToDownloadAgent + 'agent-' + version + '.exe'
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

  if (versionToInstall) {
    saveBinaryFile(versionToInstall)
  } else {
    versionToInstall = await getTheLatestVersionInfoInJfrog()
    saveBinaryFile(versionToInstall);
  }
}
checkApiToGetVersionToInstallForThisMerchant();