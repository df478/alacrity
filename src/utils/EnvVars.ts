/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val: string | undefined, defaultPort: number): number {
    if (val === undefined) {
        return defaultPort
    }
    const port = parseInt(val, 10)

    if (isNaN(port)) {
        // named pipe
        return defaultPort
    }

    if (port >= 0) {
        // port number
        return port
    }

    return defaultPort
}

export default {
    keys: {
        ALACRAN_DOCKER_API: 'ALACRAN_DOCKER_API',
        ALACRAN_IS_DEBUG: 'ALACRAN_IS_DEBUG',
        DEFAULT_PASSWORD: 'DEFAULT_PASSWORD',
        IS_ALACRAN_INSTANCE: 'IS_ALACRAN_INSTANCE',
        DEMO_MODE_ADMIN_IP: 'DEMO_MODE_ADMIN_IP',
        ALACRAN_BASE_DIRECTORY: 'ALACRAN_BASE_DIRECTORY',
        ALACRAN_HOST_HTTP_PORT: 'ALACRAN_HOST_HTTP_PORT',
        ALACRAN_HOST_HTTPS_PORT: 'ALACRAN_HOST_HTTPS_PORT',
        ALACRAN_HOST_ADMIN_PORT: 'ALACRAN_HOST_ADMIN_PORT',
    },

    BY_PASS_PROXY_CHECK: process.env.BY_PASS_PROXY_CHECK,

    ALACRAN_DOCKER_API: process.env.ALACRAN_DOCKER_API,

    ALACRAN_IS_DEBUG: !!process.env.ALACRAN_IS_DEBUG,

    // Host ports - external to container.  Refer it via AlacranConstants.configs.nginxPortNumber80
    ALACRAN_HOST_HTTP_PORT: normalizePort(
        process.env.ALACRAN_HOST_HTTP_PORT,
        80
    ), //Tested with 10080
    // Host ports - external to container.  Refer it via AlacranConstants.configs.nginxPortNumber443
    ALACRAN_HOST_HTTPS_PORT: normalizePort(
        process.env.ALACRAN_HOST_HTTPS_PORT,
        443
    ), //Tested with 10443
    // Host ports - external to container.  Refer it via AlacranConstants.configs.adminPortNumber3000
    ALACRAN_HOST_ADMIN_PORT: normalizePort(
        process.env.ALACRAN_HOST_ADMIN_PORT,
        3000
    ), //Tested with 13000

    MAIN_NODE_IP_ADDRESS: process.env.MAIN_NODE_IP_ADDRESS,

    ACCEPTED_TERMS: !!process.env.ACCEPTED_TERMS,

    IS_ALACRAN_INSTANCE: process.env.IS_ALACRAN_INSTANCE,

    DEMO_MODE_ADMIN_IP: process.env.DEMO_MODE_ADMIN_IP,

    DEFAULT_PASSWORD: process.env.DEFAULT_PASSWORD,

    FORCE_ENABLE_PRO: process.env.FORCE_ENABLE_PRO,

    ALACRITY_DISABLE_ANALYTICS:
        !!process.env.ALACRITY_DISABLE_ANALYTICS || !!process.env.DO_NOT_TRACK,

    ALACRAN_BASE_DIRECTORY: process.env.ALACRAN_BASE_DIRECTORY,
}
