const path = require('path')
const axios = require('axios');
const { getEnvVar } = require('./env.config');

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

// Types : success, fail, log
exports.pingToHealthCheck = ({ type = PING_TYPES.SUCCESS, data = null } = {}) => {
  const typesMap = {
    success: '',
    fail: '/fail',
    log: '/log',
  }
  const url = this.combinePathToUrl([getEnvVar('HC_UUID_UPDATER'), typesMap[type]], getEnvVar('HC_PING_URL'))
  axios.post(url, data).catch(e => {
    logError('pingToHealthCheck Error: ' + e.message, e)
  })
}

exports.logMessage = (message = '') => {
  if (!message) return;
  logToDataDog({ message, level: DD_INFO.LOG_LEVEL.LOG })
}

exports.logError = (message = '', error = null) => {
  if (!message) return;
  logToDataDog({
    message, level: DD_INFO.LOG_LEVEL.ERROR, error
  })
}

exports.logToDataDog = ({ message, level, error = null }) => {
  let headers = {
    'Content-Type': 'application/json',
    'DD-API-KEY': getEnvVar('DD_API_KEY'),
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
  console.log(message, error)
  axios.post(DD_INFO.API_URL, payload, {
    headers: headers
  }).catch((e) => {
    console.log('logToDataDog Error: ' + e.message)
  });
}

exports.toggleHealthCheckMonitor = async (uuid, isPause = true) => {
  const action = isPause ? 'pause' : 'resume'
  const headers = {
    'X-Api-Key': getEnvVar('HC_API_KEY'),
    'Content-Type': 'application/x-www-form-urlencoded',
  }
  const url = this.combinePathToUrl(['api/v2/checks', uuid, action], getEnvVar('HC_API_BASE_URL'))
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

exports.combinePathToUrl = (pathList, baseUrl) => {
  const fullUrl = new URL(path.join(...pathList), baseUrl).toString();
  return fullUrl
}