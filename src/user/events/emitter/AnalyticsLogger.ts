import EnvVars from '../../../utils/EnvVars'
import { AlaCrityEventType, IAlaCrityEvent } from '../IAlaCrityEvent'
import { IEventsEmitter } from '../IEventsEmitter'

export class AnalyticsLogger extends IEventsEmitter {
    constructor() {
        super()
    }
    isEventApplicable(event: IAlaCrityEvent): boolean {
        if (EnvVars.ALACRITY_DISABLE_ANALYTICS) {
            return false
        }

        // some events aren't appropriate for usage stats
        switch (event.eventType) {
            case AlaCrityEventType.AppBuildFailed:
            case AlaCrityEventType.AppBuildSuccessful:
            case AlaCrityEventType.UserLoggedIn: // perhaps anonymize the IP address and send it in the future
                return false

            case AlaCrityEventType.InstanceStarted:
                return true
        }
    }

    emitEvent(event: IAlaCrityEvent): void {}
}
