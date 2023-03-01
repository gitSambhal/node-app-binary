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

const envVarRulesLocal = {
  DOPPLER_TOKEN: str(),
};

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

const envFilePath = join(CONFIG_FILE_NAME);
if (!fs.existsSync(envFilePath)) {
  throw new Error(
    `Configuration file ${envFilePath} doesn't exists. Make sure it is available in the same directory where the application is present.`,
  );
}
dotenv.config({ path: envFilePath });
cleanEnv(process.env, envVarRulesLocal);

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

export const getEnvVar = (key: string) => {
  const value = env?.[key];
  if (typeof value == 'undefined') {
    const msgArr = [
      `${key} is not found in the configuration or it was loaded after running the actual functionality.`,
      `Make sure configuration from cloud is loaded before running anything else.`,
    ];
    const message = msgArr.join(' ');
    console.error(message);
    throw new Error(message);
  }
  return value;
};
