import { IAlaCrityEvent } from './IAlaCrityEvent'

export abstract class IEventsEmitter {
    abstract isEventApplicable(event: IAlaCrityEvent): boolean
    abstract emitEvent(event: IAlaCrityEvent): void
}
