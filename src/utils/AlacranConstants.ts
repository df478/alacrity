import fs = require('fs-extra')
import path = require('path')
import EnvVars from './EnvVars'

const ALACRAN_BASE_DIRECTORY = EnvVars.ALACRAN_BASE_DIRECTORY || '/alacran'
const ALACRAN_DATA_DIRECTORY = ALACRAN_BASE_DIRECTORY + '/data' // data that sits here can be backed up
const ALACRAN_ROOT_DIRECTORY_TEMP = ALACRAN_BASE_DIRECTORY + '/temp'
const ALACRAN_ROOT_DIRECTORY_GENERATED = ALACRAN_BASE_DIRECTORY + '/generated'

const CONSTANT_FILE_OVERRIDE_BUILD = path.join(
    __dirname,
    '../../config-override.json'
)
const CONSTANT_FILE_OVERRIDE_USER =
    ALACRAN_DATA_DIRECTORY + '/config-override.json'

const configs = {
    publishedNameOnDockerHub: 'df478/alacrity',

    version: '0.0.1',

    defaultMaxLogSize: '512m',

    buildLogSize: 50,

    appLogSize: 500,

    maxVersionHistory: 50,

    skipVerifyingDomains: false,

    enableDockerLogsTimestamp: true,

    registrySubDomainPort: 996,

    dockerApiVersion: 'v1.43',

    netDataImageName: 'df478/netdata:v1.34.1',

    goAccessImageName: 'df478/goaccess:1.9.3',

    registryImageName: 'registry:2',

    appPlaceholderImageName: 'df478/alacrity-placeholder-app:latest',

    nginxImageName: 'nginx:1.27.2',

    defaultEmail: 'runner@alacrity.com',

    alacranSubDomain: 'alacran',

    overlayNetworkOverride: {},

    useExistingSwarm: false,

    certbotImageName: 'df478/certbot-sleeping:v2.11.0',

    certbotCertCommandRules: undefined as CertbotCertCommandRule[] | undefined,

    // this is added in 1.13 just as a safety - remove this after 1.14
    disableEncryptedCheck: false,

    // The port can be overridden via env variable ALACRAN_HOST_HTTP_PORT
    nginxPortNumber80: EnvVars.ALACRAN_HOST_HTTP_PORT,
    // The port can be overridden via env variable ALACRAN_HOST_HTTPS_PORT
    nginxPortNumber443: EnvVars.ALACRAN_HOST_HTTPS_PORT,
    // The port can be overridden via env variable ALACRAN_HOST_ADMIN_PORT
    adminPortNumber3000: EnvVars.ALACRAN_HOST_ADMIN_PORT,
}

export interface CertbotCertCommandRule {
    /**
     * Matches both *.<domain> and <domain>, use '*' to match all domains
     */
    domain: string
    /**
     * The Certbot command to execute, will be parsed using `shell-quote`, available variables are `${domainName}` and `${subdomain}`
     */
    command?: string
}

const data = {
    configs: configs, // values that can be overridden

    // ******************** Global Constants *********************

    apiVersion: 'v1',

    isDebug: EnvVars.ALACRAN_IS_DEBUG,

    serviceContainerPort3000: 3000,

    rootNameSpace: 'alacran',

    // *********************** Disk Paths ************************

    defaultAlacranDefinitionPath: './alacran-definition',

    dockerSocketPath: '/var/run/docker.sock',

    sourcePathInContainer: '/usr/src/app',

    nginxStaticRootDir: '/usr/share/nginx',

    alacranStaticFilesDir: ALACRAN_ROOT_DIRECTORY_GENERATED + '/static',

    nginxSharedPathOnNginx: '/nginx-shared',

    nginxDhParamFileName: 'dhparam.pem',

    nginxDefaultHtmlDir: '/default',

    nginxSharedLogsPath: '/var/log/nginx-shared',

    goAccessCrontabPath: '/var/spool/cron/crontabs/root',

    letsEncryptEtcPathOnNginx: '/letencrypt/etc',

    nginxDomainSpecificHtmlDir: '/domains',

    alacranConfirmationPath: '/.well-known/alacran-identifier',

    alacranBaseDirectory: ALACRAN_BASE_DIRECTORY,

    restoreTarFilePath: ALACRAN_BASE_DIRECTORY + '/backup.tar',

    restoreDirectoryPath: ALACRAN_BASE_DIRECTORY + '/restoring',

    alacranRootDirectoryTemp: ALACRAN_ROOT_DIRECTORY_TEMP,

    alacranRootDirectoryBackup: ALACRAN_ROOT_DIRECTORY_TEMP + '/backup',

    alacranDownloadsDirectory: ALACRAN_ROOT_DIRECTORY_TEMP + '/downloads',

    alacranRawSourceDirectoryBase: ALACRAN_ROOT_DIRECTORY_TEMP + '/image_raw',

    alacranRootDirectoryGenerated: ALACRAN_ROOT_DIRECTORY_GENERATED,

    registryAuthPathOnHost: ALACRAN_ROOT_DIRECTORY_GENERATED + '/registry-auth', // this is a file

    baseNginxConfigPath: ALACRAN_ROOT_DIRECTORY_GENERATED + '/nginx/nginx.conf', // this is a file

    rootNginxConfigPath:
        ALACRAN_ROOT_DIRECTORY_GENERATED + '/nginx/conf.d/alacran-root',

    perAppNginxConfigPathBase:
        ALACRAN_ROOT_DIRECTORY_GENERATED + '/nginx/conf.d',

    goaccessConfigPathBase: ALACRAN_ROOT_DIRECTORY_GENERATED + '/goaccess',

    alacranDataDirectory: ALACRAN_DATA_DIRECTORY,

    letsEncryptLibPath: ALACRAN_DATA_DIRECTORY + '/letencrypt/lib',

    letsEncryptEtcPath: ALACRAN_DATA_DIRECTORY + '/letencrypt/etc',

    registryPathOnHost: ALACRAN_DATA_DIRECTORY + '/registry',

    nginxSharedPathOnHost: ALACRAN_DATA_DIRECTORY + '/nginx-shared',

    nginxSharedLogsPathOnHost: ALACRAN_DATA_DIRECTORY + '/shared-logs',

    debugSourceDirectory: '', // Only used in debug mode

    // ********************* Local Docker Constants  ************************

    alacranSaltSecretKey: 'alacran-salt',

    nginxServiceName: 'alacran-nginx',

    alacranServiceName: 'alacran-alacran',

    certbotServiceName: 'alacran-certbot',

    goAccessContainerName: 'alacran-goaccess-container',

    netDataContainerName: 'alacran-netdata-container',

    registryServiceName: 'alacran-registry',

    alacranNetworkName: 'alacran-overlay-network',

    alacranRegistryUsername: 'alacran',

    // ********************* HTTP Related Constants  ************************

    netDataRelativePath: '/net-data-monitor',

    healthCheckEndPoint: '/checkhealth',

    registrySubDomain: 'registry',

    headerCookieAuth: 'alacranCookieAuth',

    headerAuth: 'x-alacran-auth',

    headerAppToken: 'x-alacran-app-token',

    headerNamespace: 'x-namespace',

    headerAlaCrityVersion: 'x-alacrity-version',

    // *********************     ETC       ************************

    disableFirewallCommand:
        'ufw allow ' +
        configs.nginxPortNumber80 +
        ',' +
        configs.nginxPortNumber443 +
        ',' +
        configs.adminPortNumber3000 +
        ',996,7946,4789,2377/tcp; ufw allow 7946,4789,2377/udp; ',

    gitShaEnvVarKey: 'ALACRITY_GIT_COMMIT_SHA',
}

function overrideConfigFromFile(fileName: string) {
    const overridingValuesConfigs = fs.readJsonSync(fileName, {
        throws: false,
    })

    if (overridingValuesConfigs) {
        for (const prop in overridingValuesConfigs) {
            // eslint-disable-next-line no-prototype-builtins
            if (!overridingValuesConfigs.hasOwnProperty(prop)) {
                continue
            }

            console.log(`Overriding ${prop} from ${fileName}`)
            // @ts-expect-error "this actually works"
            configs[prop] = overridingValuesConfigs[prop]
        }
    }
}

overrideConfigFromFile(CONSTANT_FILE_OVERRIDE_BUILD)

overrideConfigFromFile(CONSTANT_FILE_OVERRIDE_USER)

if (data.isDebug) {
    const devDirectoryOnLocalMachine = fs
        .readFileSync(__dirname + '/../../currentdirectory')
        .toString()
        .trim()

    if (!devDirectoryOnLocalMachine) {
        throw new Error(
            'For development purposes, you need to assign your local directory here'
        )
    }

    data.debugSourceDirectory = devDirectoryOnLocalMachine
    data.configs.publishedNameOnDockerHub = 'alacran-debug'
    // data.configs.nginxPortNumber80 = 80
}

export default data
