import DataStore from '../datastore/DataStore'
import ServiceManager from '../user/ServiceManager'
import { UserManager } from '../user/UserManager'

export interface UserInjected {
    namespace: string
    userManager: UserManager
    dataStore: DataStore
    serviceManager: ServiceManager
    initialized: boolean
}

export interface IAppWebHookToken {
    appName: string
    tokenVersion: string
}
