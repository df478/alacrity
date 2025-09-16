/*
                              +---------------------------------+
+------------------+          |                                 |
|------------------|          |      Assign the final Image     |                +--------------------+
||                ||          |        (library/mysql           +----------------+   Retag and push   +<-----------+
||    Update      |-----------+             or                  |                |     IF NEEDED      |            |
||Alacran Service ||          |  repo.com:996/alacran/myimage)  |                +--------------------+            |
||                ||          |                                 |                                                  |
|------------------|          |     as new ver's image          +-----------+                                      +
+------------------+          |                                 |           |                                    CREATE
                              +---------------------------------+           |                             img-alacran--appname:5
                              |                                 |           |
                              |    Set the Deployed Version     |           +-------------+                         ^
                              +---------------------------------+                         |                         |
                                                                                          |                         |
                                                                                          |                         |
                                                                                          |                         |
                                                          +-----------------------+       |                         |
                                                          |                       |       |                         |
                                                          |      Docker ImageName +-------+                         |
                                                          |                       |                                 |
                                                          +-----------------------+                                 |
       +-------------------+                              |                       |                                 |
       |                   |                              |    alacran-definition +-------------+                   |
       |                   |                              |         content       |             |                   |
       |   ServiceManager  +----> CreateNewVersion +----> +-----------------------+             |                   |
       |                   |                              |                       |             ^                   |
       |                   |                              |         Uploaded Tar  +-----------------> ImageMaker.   +
       +-------------------+                              |                       |             ^       createImage(appName,Ver,Data)
                                                          +-----------------------+             |
                                                          |                       |             |
                                                          |             GIT Repo  +-------------+
                                                          |                       |
                                                          +-----------------------+

*/

import fs = require('fs-extra')
import tar = require('tar')
import path = require('path')
import ApiStatusCodes from '../api/ApiStatusCodes'
import DockerApi from '../docker/DockerApi'
import { IAppEnvVar } from '../models/AppDefinition'
import { IAlacranDefinition } from '../models/IAlacranDefinition'
import { IBuiltImage } from '../models/IBuiltImage'
import { IHashMapGeneric } from '../models/ICacheGeneric'
import { IImageSource } from '../models/IImageSource'
import { AnyError } from '../models/OtherTypes'
import AlacranConstants from '../utils/AlacranConstants'
import GitHelper from '../utils/GitHelper'
import BuildLog from './BuildLog'
import DockerRegistryHelper from './DockerRegistryHelper'
import TemplateHelper from './TemplateHelper'

const RAW_SOURCE_DIRECTORY = 'source_files'
const TAR_FILE_NAME_READY_FOR_DOCKER = 'image.tar'
const DOCKER_FILE = 'Dockerfile'

export class BuildLogsManager {
    private buildLogs: IHashMapGeneric<BuildLog>

    constructor() {
        this.buildLogs = {}
    }

    getAppBuildLogs(appName: string) {
        const self = this

        self.buildLogs[appName] =
            self.buildLogs[appName] ||
            new BuildLog(AlacranConstants.configs.buildLogSize)

        return self.buildLogs[appName]
    }
}

export default class ImageMaker {
    constructor(
        private dockerRegistryHelper: DockerRegistryHelper,
        private dockerApi: DockerApi,
        private namespace: string,
        private buildLogsManager: BuildLogsManager
    ) {
        //
    }

    private getDirectoryForRawSource(appName: string, version: number) {
        return `${AlacranConstants.alacranRawSourceDirectoryBase}/${appName}/${version}`
    }

    /**
     * Creates image if necessary, or just simply passes the image name
     */
    ensureImage(
        imageSource: IImageSource,
        appName: string,
        alacranDefinitionRelativeFilePath: string,
        appVersion: number,
        envVars: IAppEnvVar[]
    ): Promise<IBuiltImage> {
        const self = this

        const logs = self.buildLogsManager.getAppBuildLogs(appName)

        logs.clear()
        logs.log(`------------------------- ${new Date()}`)
        logs.log(`Build started for ${appName}`)

        let gitHash = ''

        const baseDir = self.getDirectoryForRawSource(appName, appVersion)
        const rawDir = `${baseDir}/${RAW_SOURCE_DIRECTORY}`
        const tarFilePath = `${baseDir}/${TAR_FILE_NAME_READY_FOR_DOCKER}`

        const baseImageNameWithoutVerAndReg = `img-${this.namespace}-${
            appName // img-alacran-myapp
        }`
        let fullImageName = '' // repo.domain.com:998/username/reponame:8

        return Promise.resolve() //
            .then(function () {
                return self.extractContentIntoDestDirectory(
                    imageSource,
                    rawDir,
                    alacranDefinitionRelativeFilePath
                )
            })
            .then(function (gitHashFromImageSource) {
                gitHash = gitHashFromImageSource

                const includesGitCommitEnvVar = envVars.find(
                    (envVar) => envVar.key === AlacranConstants.gitShaEnvVarKey
                )

                if (gitHash && !includesGitCommitEnvVar) {
                    envVars.push({
                        key: AlacranConstants.gitShaEnvVarKey,
                        value: gitHash,
                    })
                }

                // some users convert the directory into TAR instead of converting the content into TAR.
                // we go one level deep and try to find the right directory.
                // Also, they may have no alacran-definition file, in that case, fall back to Dockerfile if exists.
                return self.getAbsolutePathOfAlacranDefinition(
                    rawDir,
                    alacranDefinitionRelativeFilePath
                )
            })
            .then(function (alacranDefinitionAbsolutePath) {
                return self
                    .getAlacranDefinition(alacranDefinitionAbsolutePath)
                    .then(function (alacranDefinition) {
                        if (alacranDefinition.imageName) {
                            logs.log(
                                `An explicit image name was provided (${alacranDefinition.imageName}). Therefore, no build process is needed.`
                            )

                            logs.log(
                                `Pulling this image: ${alacranDefinition.imageName} This process might take a few minutes.`
                            )

                            const providedImageName =
                                alacranDefinition.imageName + ''

                            return Promise.resolve() //
                                .then(function () {
                                    return self.dockerRegistryHelper.getDockerAuthObjectForImageName(
                                        providedImageName
                                    )
                                })
                                .then(function (authObj) {
                                    return self.dockerApi.pullImage(
                                        providedImageName,
                                        authObj
                                    )
                                })
                                .then(function () {
                                    return providedImageName
                                })
                        }

                        return self.getBuildPushAndReturnImageName(
                            alacranDefinition,
                            path.dirname(alacranDefinitionAbsolutePath),
                            tarFilePath,
                            baseImageNameWithoutVerAndReg,
                            appName,
                            appVersion,
                            envVars
                        )
                    })
            })
            .then(function (ret) {
                fullImageName = ret
            })
            .then(function () {
                return fs.remove(baseDir)
            })
            .then(function () {
                if (imageSource.uploadedTarPathSource) {
                    return fs.remove(
                        imageSource.uploadedTarPathSource.uploadedTarPath
                    )
                }
            })
            .catch(function (err) {
                return fs
                    .remove(baseDir)
                    .then(function () {
                        throw err
                    })
                    .catch(function () {
                        return Promise.reject(err)
                    })
            })
            .catch(function (err) {
                if (imageSource.uploadedTarPathSource) {
                    return fs
                        .remove(
                            imageSource.uploadedTarPathSource.uploadedTarPath
                        )
                        .then(function () {
                            throw err
                        })
                        .catch(function () {
                            return Promise.reject(err)
                        })
                }
                return Promise.reject(err)
            })
            .then(function () {
                logs.log(`Build has finished successfully!`)
                return {
                    imageName: fullImageName,
                    gitHash: gitHash,
                }
            })
            .catch(function (error) {
                logs.log(`Build has failed!`)
                return Promise.reject(error)
            })
    }

    private getBuildPushAndReturnImageName(
        alacranDefinition: IAlacranDefinition,
        correctedDirProvided: string,
        tarFilePath: string,
        baseImageNameWithoutVersionAndReg: string,
        appName: string,
        appVersion: number,
        envVars: IAppEnvVar[]
    ) {
        const self = this
        return Promise.resolve() //
            .then(function () {
                return self
                    .convertAlacranDefinitionToDockerfile(
                        alacranDefinition,
                        correctedDirProvided
                    )
                    .then(function () {
                        return self.convertContentOfDirectoryIntoTar(
                            correctedDirProvided,
                            tarFilePath
                        )
                    })
                    .then(function () {
                        return self.dockerRegistryHelper.createDockerRegistryConfig()
                    })
                    .then(function (registryConfig) {
                        return self.dockerApi
                            .buildImageFromDockerFile(
                                baseImageNameWithoutVersionAndReg,
                                appVersion,
                                tarFilePath,
                                self.buildLogsManager.getAppBuildLogs(appName),
                                envVars,
                                registryConfig
                            )
                            .catch(function (error: AnyError) {
                                throw ApiStatusCodes.createError(
                                    ApiStatusCodes.BUILD_ERROR,
                                    `${error}`.trim()
                                )
                            })
                    })
                    .then(function () {
                        return self.dockerRegistryHelper.retagAndPushIfDefaultPushExist(
                            baseImageNameWithoutVersionAndReg,
                            appVersion,
                            self.buildLogsManager.getAppBuildLogs(appName)
                        )
                    })
            })
    }

    /**
     * Extracts the content of IImageSource into destDirectory and returns a promise that resolvea
     * to git hash that was provided in IImageSource
     *
     * @param source        the image source
     * @param destDirectory the path to directory where we want to have all our contents
     */
    private extractContentIntoDestDirectory(
        source: IImageSource,
        destDirectory: string,
        alacranDefinitionRelativeFilePath: string
    ) {
        return Promise.resolve() //
            .then(function () {
                return fs.ensureDir(destDirectory)
            })
            .then(function () {
                // If uploadedTarPath then extract into a directory
                //
                // If Repo then download.
                //
                // If alacranDefinitionContent then create a directory and output to a directory
                //
                // Else THROW ERROR

                const srcTar = source.uploadedTarPathSource
                if (srcTar) {
                    // extract file to to destDirectory
                    return tar
                        .extract({
                            file: srcTar.uploadedTarPath,
                            cwd: destDirectory,
                        })
                        .then(function () {
                            return srcTar.gitHash
                        })
                }

                const srcRepo = source.repoInfoSource
                if (srcRepo) {
                    return GitHelper.clone(
                        srcRepo.user,
                        srcRepo.password,
                        srcRepo.sshKey || '',
                        srcRepo.repo,
                        srcRepo.branch,
                        destDirectory
                    ) //
                        .then(function () {
                            return GitHelper.getLastHash(destDirectory)
                        })
                }

                const alacranDefinitionContentSource =
                    source.alacranDefinitionContentSource
                if (alacranDefinitionContentSource) {
                    return fs
                        .outputFile(
                            path.join(
                                destDirectory,
                                alacranDefinitionRelativeFilePath
                            ),
                            alacranDefinitionContentSource.alacranDefinitionContent
                        )
                        .then(function () {
                            return alacranDefinitionContentSource.gitHash
                        })
                }
                // we should never get here!
                throw new Error('Source is unknown!')
            })
    }

    private getAllChildrenOfDirectory(directory: string) {
        return Promise.resolve() //
            .then(function () {
                return new Promise<string[]>(function (resolve, reject) {
                    fs.readdir(directory, function (err, files) {
                        if (err) {
                            reject(err)
                            return
                        }
                        resolve(files)
                    })
                })
            })
    }

    private getAlacranDefinition(alacranDefinitionAbsolutePath: string) {
        return Promise.resolve() //
            .then(function () {
                return fs.readJson(alacranDefinitionAbsolutePath)
            })
            .then(function (data: IAlacranDefinition) {
                if (!data) {
                    throw ApiStatusCodes.createError(
                        ApiStatusCodes.STATUS_ERROR_GENERIC,
                        'Alacran Definition File is empty!'
                    )
                }

                if (!data.schemaVersion) {
                    throw ApiStatusCodes.createError(
                        ApiStatusCodes.STATUS_ERROR_GENERIC,
                        'Alacran Definition version is empty!'
                    )
                }

                if (data.schemaVersion !== 2) {
                    throw ApiStatusCodes.createError(
                        ApiStatusCodes.STATUS_ERROR_GENERIC,
                        'Alacran Definition version is not supported! Read migration guides to schemaVersion 2'
                    )
                }

                const hasDockerfileLines =
                    data.dockerfileLines && data.dockerfileLines.length > 0

                const numberOfProperties =
                    (data.templateId ? 1 : 0) +
                    (data.imageName ? 1 : 0) +
                    (data.dockerfilePath ? 1 : 0) +
                    (hasDockerfileLines ? 1 : 0)

                if (numberOfProperties !== 1) {
                    throw ApiStatusCodes.createError(
                        ApiStatusCodes.STATUS_ERROR_GENERIC,
                        'One, and only one, of these properties should be present in alacran-definition: templateId, imageName, dockerfilePath, or, dockerfileLines'
                    )
                }

                return data
            })
    }

    private convertAlacranDefinitionToDockerfile(
        alacranDefinition: IAlacranDefinition,
        directoryWithAlacranDefinition: string
    ) {
        return Promise.resolve() //
            .then(function () {
                const data = alacranDefinition
                if (data.templateId) {
                    return TemplateHelper.get().getDockerfileContentFromTemplateTag(
                        data.templateId
                    )
                } else if (data.dockerfileLines) {
                    return data.dockerfileLines.join('\n')
                } else if (data.dockerfilePath) {
                    if (data.dockerfilePath.startsWith('..')) {
                        throw ApiStatusCodes.createError(
                            ApiStatusCodes.STATUS_ERROR_GENERIC,
                            'dockerfilePath should not refer to parent directory!'
                        )
                    }

                    return fs
                        .readFileSync(
                            path.join(
                                directoryWithAlacranDefinition,
                                data.dockerfilePath
                            )
                        )
                        .toString()
                } else if (data.imageName) {
                    throw ApiStatusCodes.createError(
                        ApiStatusCodes.STATUS_ERROR_GENERIC,
                        'ImageName cannot be rebuilt'
                    )
                } else {
                    throw ApiStatusCodes.createError(
                        ApiStatusCodes.STATUS_ERROR_GENERIC,
                        'dockerfileLines, dockerFilePath, templateId or imageName must be present. Both should not be present at the same time'
                    )
                }
            })
            .then(function (dockerfileContent) {
                return fs.outputFile(
                    `${directoryWithAlacranDefinition}/${DOCKER_FILE}`,
                    dockerfileContent
                )
            })
    }

    private getAbsolutePathOfAlacranDefinition(
        originalDirectory: string,
        alacranDefinitionRelativeFilePath: string
    ) {
        const self = this

        function isAlacranDefinitionOrDockerfileInDir(dir: string) {
            const alacranDefinitionPossiblePath = path.join(
                dir,
                alacranDefinitionRelativeFilePath
            )
            return Promise.resolve()
                .then(function () {
                    return fs.pathExists(alacranDefinitionPossiblePath)
                })
                .then(function (exits) {
                    return (
                        !!exits &&
                        fs.statSync(alacranDefinitionPossiblePath).isFile()
                    )
                })
                .then(function (alacranDefinitionExists) {
                    if (alacranDefinitionExists) return true

                    // Falling back to plain Dockerfile, check if it exists!

                    const dockerfilePossiblePath = path.join(dir, DOCKER_FILE)
                    return fs
                        .pathExists(dockerfilePossiblePath)
                        .then(function (exits) {
                            return (
                                !!exits &&
                                fs.statSync(dockerfilePossiblePath).isFile()
                            )
                        })
                        .then(function (dockerfileExists) {
                            if (!dockerfileExists) return false

                            const alacranDefinitionDefault: IAlacranDefinition =
                                {
                                    schemaVersion: 2,
                                    dockerfilePath: `./${DOCKER_FILE}`,
                                }

                            return fs
                                .outputFile(
                                    alacranDefinitionPossiblePath,
                                    JSON.stringify(alacranDefinitionDefault)
                                )
                                .then(function () {
                                    return true
                                })
                        })
                })
        }

        return Promise.resolve()
            .then(function () {
                // make sure if you need to go to child directory
                return isAlacranDefinitionOrDockerfileInDir(originalDirectory)
            })
            .then(function (exists) {
                if (exists) return originalDirectory

                // check if there is only one child
                // check if it's a directory
                // check if alacran definition exists in it
                // if so, return the child directory
                return self
                    .getAllChildrenOfDirectory(originalDirectory)
                    .then(function (files) {
                        files = files || []
                        if (files.length === 1) {
                            return isAlacranDefinitionOrDockerfileInDir(
                                path.join(originalDirectory, files[0])
                            ) //
                                .then(function (existsInChild) {
                                    if (existsInChild)
                                        return path.join(
                                            originalDirectory,
                                            files[0]
                                        )

                                    throw ApiStatusCodes.createError(
                                        ApiStatusCodes.STATUS_ERROR_GENERIC,
                                        'Alacran Definition file does not exist!'
                                    )
                                })
                        }

                        throw ApiStatusCodes.createError(
                            ApiStatusCodes.STATUS_ERROR_GENERIC,
                            'Alacran Definition file does not exist!'
                        )
                    })
            })
            .then(function (correctedRootDirectory) {
                return path.join(
                    correctedRootDirectory,
                    alacranDefinitionRelativeFilePath
                )
            })
    }

    private convertContentOfDirectoryIntoTar(
        sourceDirectory: string,
        tarFilePath: string
    ) {
        return Promise.resolve() //
            .then(function () {
                return tar.c(
                    {
                        file: tarFilePath,
                        cwd: sourceDirectory,
                    },
                    ['./']
                )
            })
    }
}
