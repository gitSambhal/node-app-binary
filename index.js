const axios = require('axios');

const getEnvFromDopplerAPI = async () => {
    const DOPPLER_TOKEN = 'dp.st.dev.8tdQjtTTORLAczirJEdio2TdJPrzR9iyod2DOw7h7LR'
    const token = DOPPLER_TOKEN
    const response = await axios.get(`https://${token}@api.doppler.com/v3/configs/config/secrets/download?format=json`)
    const resp = response.data
    console.log('🚀 ~ file: index.js:10 ~ getEnv ~ respx', resp);
}

process.env.NODE_SKIP_PLATFORM_CHECK = 1
const { myLibFun } = require('./mylib')

console.log('I will be exe updated', new Date().toString())
console.log('Process.env ', { env: process.env })
getEnvFromDopplerAPI()
