const axios = require('axios');
const cron = require('node-cron');
const { getEnvVar } = require('./env.config');
const { logError, toggleHealthCheckMonitor } = require('./helpers');

cron.schedule('* * * * *', () => {
    console.log('running a task every minute');
    const url = getEnvVar('HC_PING_URL_CRON');
    axios.get(url).catch(e => {
        logError('pingToHealthCheck cron Error: ' + e.message, e)
    }).then(() => {
        console.log('Ping success')
    })
});

// Cron job to pause health check monitor at 7 PM daily
cron.schedule('0 19 * * *', () => {
    toggleHealthCheckMonitor(getEnvVar('HC_UUID_CRON'))
});

// Cron job to resume health check monitor at 7 AM daily
cron.schedule('0 7 * * *', () => {
    toggleHealthCheckMonitor(getEnvVar('HC_UUID_CRON'), false)
});
