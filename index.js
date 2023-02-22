const axios = require('axios');
const dotenv = require('dotenv');
const { cleanEnv, str, } = require('envalid');

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

process.env.NODE_SKIP_PLATFORM_CHECK = 1

console.log('I will be exe updated', new Date().toString())
console.log('Process.env ', { env: process.env })
getEnvFromDopplerAPI()
