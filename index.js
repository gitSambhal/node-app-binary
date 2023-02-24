const axios = require('axios');
const dotenv = require('dotenv');
const { cleanEnv, str, } = require('envalid');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

dotenv.config({ path: 'configuration.txt' });
const env = cleanEnv(process.env, {
    DOPPLER_TOKEN: str(),
});

const getEnvFromDopplerAPI = async () => {
    const DOPPLER_TOKEN = env.DOPPLER_TOKEN;
    const token = DOPPLER_TOKEN
    const response = await axios.get(`https://${token}@api.doppler.com/v3/configs/config/secrets/download?format=json`)
    const resp = response.data
    console.log('🚀 ~ file: index.js:10 ~ getEnv ~ respx', resp);
}

async function getEnvFromGoogleSecretManager() {
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
}

process.env.NODE_SKIP_PLATFORM_CHECK = 1

console.log('I will be exe updated', new Date().toString())
console.log('Process.env ', { env: process.env })
getEnvFromDopplerAPI()
