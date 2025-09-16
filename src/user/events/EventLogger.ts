import { IAlaCrityEvent } from './IAlaCrityEvent'
import { IEventsEmitter } from './IEventsEmitter'

export class EventLogger {
    constructor(private eventEmitters: IEventsEmitter[]) {}

    trackEvent(event: IAlaCrityEvent) {
        this.eventEmitters.forEach((ee) => {
            if (ee.isEventApplicable(event)) {
                ee.emitEvent(event)
            }
        })
    }
}

export class EventLoggerFactory {
    private static instance: EventLoggerFactory

    private logger: EventLogger

    constructor() {
        this.logger = new EventLogger([])
    }

    static get() {
        if (!EventLoggerFactory.instance) {
            EventLoggerFactory.instance = new EventLoggerFactory()
        }
        return EventLoggerFactory.instance
    }

    getLogger() {
        return this.logger
    }
}
