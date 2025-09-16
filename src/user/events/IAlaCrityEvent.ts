export enum AlaCrityEventType {
    UserLoggedIn = 'UserLoggedIn',
    AppBuildSuccessful = 'AppBuildSuccessful',
    AppBuildFailed = 'AppBuildFailed',
    InstanceStarted = 'InstanceStarted',
}

export interface IAlaCrityEvent {
    eventType: AlaCrityEventType
    eventMetadata: any
}

export class AlaCrityEventFactory {
    static create(
        eventType: AlaCrityEventType,
        eventMetadata: any
    ): IAlaCrityEvent {
        return {
            eventType,
            eventMetadata,
        }
    }
}
