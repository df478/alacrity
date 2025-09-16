import DataStore from '../datastore/DataStore'
import DataStoreProvider from '../datastore/DataStoreProvider'
import DockerApi from '../docker/DockerApi'
import Authenticator from './Authenticator'
import { EventLogger, EventLoggerFactory } from './events/EventLogger'
import ServiceManager from './ServiceManager'
import AlacranManager from './system/AlacranManager'

export class UserManager {
    readonly datastore: DataStore
    readonly serviceManager: ServiceManager
    eventLogger: EventLogger
    constructor(namespace: string) {
        this.datastore = DataStoreProvider.getDataStore(namespace)
        this.eventLogger = EventLoggerFactory.get().getLogger()
        this.serviceManager = ServiceManager.get(
            namespace,
            Authenticator.getAuthenticator(namespace),
            this.datastore,
            DockerApi.get(),
            AlacranManager.get().getLoadBalanceManager(),
            this.eventLogger,
            AlacranManager.get().getDomainResolveChecker()
        )
    }
}
