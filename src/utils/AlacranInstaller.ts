import DockerApi from '../docker/DockerApi'
import { IAppEnvVar, IAppPort } from '../models/AppDefinition'
import BackupManager from '../user/system/BackupManager'
import AlacranConstants from './AlacranConstants'
import EnvVar from './EnvVars'
import http = require('http')
import request = require('request')

// internal IP returns Public IP if the machine is not behind a NAT
// No need to directly use Public IP.

function checkSystemReq() {
    return Promise.resolve()
        .then(function () {
            return DockerApi.get().getDockerVersion()
        })
        .then(function (output) {
            console.log(' ')
            console.log(' ')
            console.log(' ')
            console.log(' >>> Checking System Compatibility <<<')

            const ver = output.Version.split('.')
            const maj = Number(ver[0])
            const min = Number(ver[1])

            let versionOk = false

            if (maj > 17) {
                versionOk = true
            } else if (maj === 17 && min >= 6) {
                versionOk = true
            }

            if (versionOk) {
                console.log('   Docker Version passed.')
            } else {
                console.log(
                    'Warning!! Minimum Docker version is 17.06.x AlaCrity may not run properly on your Docker version.'
                )
            }

            return DockerApi.get().getDockerInfo()
        })
        .then(function (output) {
            if (output.OperatingSystem.toLowerCase().indexOf('ubuntu') < 0) {
                console.log(
                    '******* Warning *******    AlaCrity and Docker work best on Ubuntu - specially when it comes to storage drivers.'
                )
            } else {
                console.log('   Ubuntu detected.')
            }

            const totalMemInMb = Math.round(output.MemTotal / 1000.0 / 1000.0)

            if (totalMemInMb < 1000) {
                console.log(
                    '******* Warning *******   With less than 1GB RAM, Docker builds might fail, see AlaCrity system requirements.'
                )
            } else {
                console.log(`   Total RAM ${totalMemInMb} MB`)
            }
        })
        .catch(function (error) {
            console.log(' ')
            console.log(' ')
            console.log(
                '**** WARNING!!!! System requirement check failed!  *****'
            )
            console.log(' ')
            console.log(' ')
            console.error(error)
        })
}

const FIREWALL_PASSED = 'firewall-passed'

function startServerOnPort_80_443_3000() {
    return Promise.resolve().then(function () {
        http.createServer(function (req, res) {
            res.writeHead(200, {
                'Content-Type': 'text/plain',
            })
            res.write(FIREWALL_PASSED)
            res.end()
        }).listen(80)

        http.createServer(function (req, res) {
            res.writeHead(200, {
                'Content-Type': 'text/plain',
            })
            res.write(FIREWALL_PASSED)
            res.end()
        }).listen(443)

        http.createServer(function (req, res) {
            res.writeHead(200, {
                'Content-Type': 'text/plain',
            })
            res.write(FIREWALL_PASSED)
            res.end()
        }).listen(AlacranConstants.serviceContainerPort3000)

        return new Promise<void>(function (resolve) {
            setTimeout(function () {
                resolve()
            }, 4000)
        })
    })
}

function checkPortOrThrow(ipAddr: string, portToTest: number) {
    if (AlacranConstants.isDebug || !!EnvVar.BY_PASS_PROXY_CHECK) {
        return Promise.resolve()
    }

    function printError() {
        console.log(' ')
        console.log(' ')
        console.log(
            'Are you trying to run AlaCrity on a local machine or a machine without a public IP?'
        )
        console.log(
            'In that case, you need to add this to your installation command:'
        )
        console.log("    -e MAIN_NODE_IP_ADDRESS='127.0.0.1'   ")
        console.log(' ')
        console.log(' ')
        console.log(' ')
        console.log(
            'Otherwise, if you are running AlaCrity on a VPS with public IP:'
        )
        console.log(
            `Your firewall may have been blocking an in-use port: ${portToTest}`
        )
        console.log(
            'A simple solution on Ubuntu systems is to run "ufw disable" (security risk)'
        )
        console.log('Or [recommended] just allowing necessary ports:')
        console.log(AlacranConstants.disableFirewallCommand)
        console.log('     ')
        console.log('     ')
        console.log(' ')
        console.log(
            'Finally, if you are an advanced user, and you want to bypass this check (NOT RECOMMENDED),'
        )
        console.log(
            "you can append the docker command with an addition flag: -e BY_PASS_PROXY_CHECK='TRUE'"
        )
        console.log(' ')
        console.log(' ')
    }

    return new Promise<void>(function (resolve, reject) {
        let finished = false

        setTimeout(function () {
            if (finished) {
                return
            }

            finished = true

            printError()
            reject(new Error(`Port timed out: ${portToTest}`))
        }, 5000)

        request(
            `http://${ipAddr}:${portToTest}`,
            function (error, response, body) {
                if (finished) {
                    return
                }

                finished = true

                if (body + '' === FIREWALL_PASSED) {
                    resolve()
                } else {
                    printError()
                    reject(new Error(`Port seems to be closed: ${portToTest}`))
                }
            }
        )
    })
}

function printTroubleShootingUrl() {
    console.log('     ')
    console.log(' Installation of AlaCrity is starting...     ')
    console.log('     ')
    console.log('     ')
}

let myIp4: string

async function initializeExternalIp() {
    const externalIp = await import('public-ip')
    return externalIp
}

export function install() {
    const backupManger = new BackupManager()

    Promise.resolve()
        .then(function () {
            printTroubleShootingUrl()
        })
        .then(function () {
            return checkSystemReq()
        })
        .then(function () {
            return initializeExternalIp()
        })
        .then(function (externalIp) {
            if (EnvVar.MAIN_NODE_IP_ADDRESS) {
                return EnvVar.MAIN_NODE_IP_ADDRESS
            }

            try {
                const externalIpFetched = externalIp.publicIpv4()
                if (externalIpFetched) {
                    return externalIpFetched
                }
            } catch (error) {
                console.error(
                    'Defaulting to 127.0.0.1 - Error retrieving IP address:',
                    error
                )
            }

            return '127.0.0.1'
        })
        .then(function (ip4) {
            if (!ip4) {
                throw new Error(
                    'Something went wrong. No IP address was retrieved.'
                )
            }

            if (AlacranConstants.isDebug) {
                return new Promise<string>(function (resolve, reject) {
                    DockerApi.get()
                        .swarmLeave(true)
                        .then(function (ignore) {
                            resolve(ip4)
                        })
                        .catch(function (error) {
                            if (error && error.statusCode === 503) {
                                resolve(ip4)
                            } else {
                                reject(error)
                            }
                        })
                })
            } else {
                return ip4
            }
        })
        .then(function (ip4) {
            myIp4 = `${ip4}`

            return startServerOnPort_80_443_3000()
        })
        .then(function () {
            return checkPortOrThrow(
                myIp4,
                AlacranConstants.configs.nginxPortNumber80 as any
            )
        })
        .then(function () {
            return checkPortOrThrow(
                myIp4,
                AlacranConstants.configs.nginxPortNumber443 as any
            )
        })
        .then(function () {
            return checkPortOrThrow(
                myIp4,
                AlacranConstants.configs.adminPortNumber3000 as any
            )
        })
        .then(function () {
            const imageName = AlacranConstants.configs.nginxImageName
            console.log(`Pulling: ${imageName}`)
            return DockerApi.get().pullImage(imageName, undefined)
        })
        .then(function () {
            const imageName = AlacranConstants.configs.appPlaceholderImageName
            console.log(`Pulling: ${imageName}`)
            return DockerApi.get().pullImage(imageName, undefined)
        })
        .then(function () {
            const imageName = AlacranConstants.configs.certbotImageName
            console.log(`Pulling: ${imageName}`)
            return DockerApi.get().pullImage(imageName, undefined)
        })
        .then(function () {
            return backupManger.checkAndPrepareRestoration()
        })
        .then(function () {
            if (AlacranConstants.configs.useExistingSwarm) {
                return DockerApi.get().ensureSwarmExists()
            }
            return DockerApi.get().initSwarm(myIp4)
        })
        .then(function (swarmId: string) {
            console.log(`Swarm started: ${swarmId}`)
            return backupManger.startRestorationIfNeededPhase1(myIp4)
        })
        .then(function () {
            return DockerApi.get().getLeaderNodeId()
        })
        .then(function (nodeId: string) {
            const volumeToMount = [
                {
                    hostPath: AlacranConstants.alacranBaseDirectory,
                    containerPath: AlacranConstants.alacranBaseDirectory,
                },
            ]

            const env = [] as IAppEnvVar[]
            env.push({
                key: EnvVar.keys.IS_ALACRAN_INSTANCE,
                value: '1',
            })
            env.push({
                key: EnvVar.keys.ALACRAN_HOST_ADMIN_PORT,
                value: AlacranConstants.configs.adminPortNumber3000 + '',
            })
            env.push({
                key: EnvVar.keys.ALACRAN_HOST_HTTP_PORT,
                value: AlacranConstants.configs.nginxPortNumber80 + '',
            })
            env.push({
                key: EnvVar.keys.ALACRAN_HOST_HTTPS_PORT,
                value: AlacranConstants.configs.nginxPortNumber443 + '',
            })

            if (EnvVar.DEFAULT_PASSWORD) {
                env.push({
                    key: EnvVar.keys.DEFAULT_PASSWORD,
                    value: EnvVar.DEFAULT_PASSWORD,
                })
            }

            if (EnvVar.ALACRAN_DOCKER_API) {
                env.push({
                    key: EnvVar.keys.ALACRAN_DOCKER_API,
                    value: EnvVar.ALACRAN_DOCKER_API,
                })
            } else {
                volumeToMount.push({
                    hostPath: AlacranConstants.dockerSocketPath,
                    containerPath: AlacranConstants.dockerSocketPath,
                })
            }

            if (EnvVar.ALACRAN_BASE_DIRECTORY) {
                env.push({
                    key: EnvVar.keys.ALACRAN_BASE_DIRECTORY,
                    value: EnvVar.ALACRAN_BASE_DIRECTORY,
                })
            }

            const ports: IAppPort[] = []

            let alacranNameAndVersion = `${AlacranConstants.configs.publishedNameOnDockerHub}:${AlacranConstants.configs.version}`

            if (AlacranConstants.isDebug) {
                alacranNameAndVersion =
                    AlacranConstants.configs.publishedNameOnDockerHub // debug doesn't have version.

                env.push({
                    key: EnvVar.keys.ALACRAN_IS_DEBUG,
                    value: EnvVar.ALACRAN_IS_DEBUG + '',
                })

                volumeToMount.push({
                    hostPath: AlacranConstants.debugSourceDirectory,
                    containerPath: AlacranConstants.sourcePathInContainer,
                })

                ports.push({
                    containerPort: 38000,
                    hostPort: 38000,
                })
            }

            ports.push({
                protocol: 'tcp',
                publishMode: 'host',
                containerPort: AlacranConstants.serviceContainerPort3000,
                hostPort: AlacranConstants.configs.adminPortNumber3000,
            })

            return DockerApi.get().createServiceOnNodeId(
                alacranNameAndVersion,
                AlacranConstants.alacranServiceName,
                ports,
                nodeId,
                volumeToMount,
                env,
                {
                    Reservation: {
                        MemoryBytes: 100 * 1024 * 1024,
                    },
                }
            )
        })
        .then(function () {
            console.log('*** AlaCrity is initializing ***')
            console.log(
                'Please wait at least 60 seconds before trying to access AlaCrity.'
            )
        })
        .catch(function (error) {
            console.log('Installation failed.')
            console.error(error)
        })
        .then(function () {
            process.exit()
        })
}
