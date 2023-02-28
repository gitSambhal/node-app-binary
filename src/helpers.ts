import * as path from 'path';
import axios from 'axios';
import { getEnvVar } from './env.config';

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
};

export const PING_TYPES = {
  SUCCESS: 'success',
  FAIL: 'fail',
  LOG: 'log',
};

// Types : success, fail, log
export const pingToHealthCheck = ({
  type = PING_TYPES.SUCCESS,
  data = null,
} = {}) => {
  const typesMap = {
    success: '',
    fail: '/fail',
    log: '/log',
  };
  const url = combinePathToUrl(
    [getEnvVar('HC_UUID_UPDATER'), typesMap[type]],
    getEnvVar('HC_PING_URL'),
  );
  axios.post(url, data).catch((e) => {
    logError('pingToHealthCheck Error: ' + e.message, e);
  });
};

export const logMessage = (message = '') => {
  if (!message) return;
  logToDataDog({ message, level: DD_INFO.LOG_LEVEL.LOG });
};

export const logError = (message = '', error = null) => {
  if (!message) return;
  logToDataDog({
    message,
    level: DD_INFO.LOG_LEVEL.ERROR,
    error,
  });
};

export const logToDataDog = ({ message, level, error = null }) => {
  const headers = {
    'Content-Type': 'application/json',
    'DD-API-KEY': getEnvVar('DD_API_KEY'),
  };
  const payload = {
    date: new Date().toISOString(),
    ddsource: DD_INFO.SOURCE,
    hostname: DD_INFO.HOST,
    level,
    message,
    service: DD_INFO.SERVICE_NAME,
    ...(error && { error }),
  };
  error ? console.log(message, error) : console.log(message);
  axios
    .post(DD_INFO.API_URL, payload, {
      headers: headers,
    })
    .catch((e) => {
      console.log('logToDataDog Error: ' + e.message);
    });
};

export const toggleHealthCheckMonitor = async (uuid, isPause = true) => {
  const action = isPause ? 'pause' : 'resume';
  const headers = {
    'X-Api-Key': getEnvVar('HC_API_KEY'),
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  const url = combinePathToUrl(
    ['api/v2/checks', uuid, action],
    getEnvVar('HC_API_BASE_URL'),
  );
  const response = await axios
    .post(url, '', {
      headers,
    })
    .catch((error) => {
      logError(error.message, error);
    });
};

export const combinePathToUrl = (pathList, baseUrl) => {
  const fullUrl = new URL(path.join(...pathList), baseUrl).toString();
  return fullUrl;
};
