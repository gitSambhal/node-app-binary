import axios from 'axios';
import fs from 'fs';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';
import { cleanEnv, str, url } from 'envalid';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

let env;
const DOPPLER_API_URL =
  'https://api.doppler.com/v3/configs/config/secrets/download';
const CONFIG_FILE_NAME = 'configuration.txt';
const envVarRules = {
  AGENT_DOWNLOAD_DIRECTORY: str(),
  DD_API_KEY: str(),
  JFROG_TOKEN: str(),
  JFROG_URL_ARTIFACT_FOLDER: url(),
  TS_MERCHANT_KEY: str(),
  URL_API_TO_CHECK_VERSION: url(),
  HC_API_KEY: str(),
  HC_API_BASE_URL: url(),
  HC_PING_URL: url(),
  HC_UUID_CRON: str(),
  HC_UUID_UPDATER: str(),
};
const isRunningAsPackaged = (process as any)?.pkg;
const currentDir = isRunningAsPackaged ? dirname(process.execPath) : __dirname;

const envFilePath = join(currentDir, CONFIG_FILE_NAME);
if (!fs.existsSync(envFilePath)) {
  // Do something
  throw new Error(`${envFilePath} doesn't exists`);
}
dotenv.config({ path: envFilePath });
console.log(process.env.DOPPLER_TOKEN);

const loadEnvFromDopplerAPI = () => {
  return new Promise(async (resolve, reject) => {
    const token = process.env.DOPPLER_TOKEN;
    const headers = {
      Authorization: `Bearer ${token}`,
    };
    try {
      const response = await axios.get(DOPPLER_API_URL, {
        params: {
          format: 'json',
        },
        headers,
      });
      const respData = response.data;
      env = cleanEnv(respData, envVarRules);
      Object.keys(env).map((key) => {
        const value = env[key];
        process.env[key] = value;
      });
      return resolve(env);
    } catch (error) {
      reject(error);
    }
  });
};

const loadEnvFromGoogleSecretManager = async () => {
  const client = new SecretManagerServiceClient({
    // Set the credentials property to your API token
    credentials: {
      private_key: 'your-private-key',
      client_email: 'your-client-email',
    },
  });

  const name = 'projects/YOUR_PROJECT_ID/secrets/myapp-env/versions/latest';
  const [version] = await client.accessSecretVersion({ name });
  const payload = version.payload.data.toString();
  const env = JSON.parse(payload);
  return env;
};

export const loadEnv = () => {
  return loadEnvFromDopplerAPI();
};

export const getEnvVar = (key) => {
  return env[key];
};
