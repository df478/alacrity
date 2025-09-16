export class AlacranError extends Error {
    public alacranErrorType: number
    public apiMessage: string

    constructor(code: number, msg: string) {
        super(msg)
        this.alacranErrorType = code
        this.apiMessage = msg
    }
}
