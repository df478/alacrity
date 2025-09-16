import express = require('express')
import ApiStatusCodes from '../../api/ApiStatusCodes'
import BaseApi from '../../api/BaseApi'
import DataStoreProvider from '../../datastore/DataStoreProvider'
import InjectionExtractor from '../../injection/InjectionExtractor'
import Authenticator from '../../user/Authenticator'
import {
    AlaCrityEventFactory,
    AlaCrityEventType,
} from '../../user/events/IAlaCrityEvent'
import AlacranConstants from '../../utils/AlacranConstants'
import CircularQueue from '../../utils/CircularQueue'

const router = express.Router()

const failedLoginCircularTimestamps = new CircularQueue<number>(5)

router.post('/', function (req, res, next) {
    const password = `${req.body.password || ''}`

    if (!password) {
        const response = new BaseApi(
            ApiStatusCodes.STATUS_ERROR_GENERIC,
            'password is empty.'
        )
        res.send(response)
        return
    }

    // if password is more than 29 characters, return error
    if (password.length > 29) {
        const response = new BaseApi(
            ApiStatusCodes.STATUS_ERROR_GENERIC,
            'password is too long - maximum 29 characters. If you had previously set a password longer than 29 characters, please use the first 29 characters.'
        )
        res.send(response)
        return
    }

    let authToken: string

    const namespace =
        InjectionExtractor.extractGlobalsFromInjected(res).namespace
    const userManagerForLoginOnly =
        InjectionExtractor.extractGlobalsFromInjected(
            res
        ).userManagerForLoginOnly
    const eventLoggerForLoginOnly = userManagerForLoginOnly.eventLogger

    let loadedHashedPassword = ''

    Promise.resolve() //
        .then(function () {
            const oldestKnownFailedLogin = failedLoginCircularTimestamps.peek()
            if (
                oldestKnownFailedLogin &&
                new Date().getTime() - oldestKnownFailedLogin < 30000
            )
                throw ApiStatusCodes.createError(
                    ApiStatusCodes.STATUS_PASSWORD_BACK_OFF,
                    'Too many wrong passwords... Wait for 30 seconds and retry.'
                )

            return DataStoreProvider.getDataStore(namespace).getHashedPassword()
        })
        .then(function (savedHashedPassword) {
            loadedHashedPassword = savedHashedPassword
            return Authenticator.getAuthenticator(namespace).getAuthToken(
                password,
                loadedHashedPassword
            )
        })
        .then(function (token) {
            authToken = token
            return Authenticator.getAuthenticator(
                namespace
            ).getAuthTokenForCookies(password, loadedHashedPassword)
        })
        .then(function (cookieAuth) {
            res.cookie(AlacranConstants.headerCookieAuth, cookieAuth)
            const baseApi = new BaseApi(
                ApiStatusCodes.STATUS_OK,
                'Login succeeded'
            )
            baseApi.data = { token: authToken }
            eventLoggerForLoginOnly.trackEvent(
                AlaCrityEventFactory.create(AlaCrityEventType.UserLoggedIn, {
                    ip: req.headers['x-real-ip'] || 'unknown',
                })
            )
            res.send(baseApi)
        })
        .catch(function (err) {
            return new Promise(function (resolve, reject) {
                if (
                    err &&
                    err.alacranErrorType &&
                    err.alacranErrorType ===
                        ApiStatusCodes.STATUS_WRONG_PASSWORD
                ) {
                    failedLoginCircularTimestamps.push(new Date().getTime())
                }
                reject(err)
            })
        })
        .catch(ApiStatusCodes.createCatcher(res))
})

export default router
