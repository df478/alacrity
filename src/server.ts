#!/usr/bin/env node

console.log('Alacran Starting ...')

// Check if Alacran is running as an installer or not.
import * as http from 'http'
import app, { initializeAlacranWithDelay } from './app'
import { AnyError } from './models/OtherTypes'
import AlacranConstants from './utils/AlacranConstants'
import * as AlacranInstaller from './utils/AlacranInstaller'
import EnvVars from './utils/EnvVars'
import debugModule = require('debug')

const debug = debugModule('alacrity:server')

function startServer() {
    if (AlacranConstants.isDebug) {
        console.log('***DEBUG BUILD***')
    }

    if (!EnvVars.IS_ALACRAN_INSTANCE) {
        console.log('Installing Alacran Service ...')
        AlacranInstaller.install()
        return
    }

    initializeAlacranWithDelay()

    /**
     * Get port from environment and store in Express.
     */

    const port = AlacranConstants.serviceContainerPort3000
    app.set('port', port)

    /**
     * Create HTTP server.
     */

    const server = http.createServer(app)

    /**
     * Listen on provided port, on all network interfaces.
     */

    server.listen(port)
    server.on('error', onError)
    server.on('listening', onListening)

    /**
     * Event listener for HTTP server "error" event.
     */

    function onError(error: AnyError) {
        if (error.syscall !== 'listen') {
            throw error
        }

        const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port

        // handle specific listen errors with friendly messages
        switch (error.code) {
            case 'EACCES':
                console.error(bind + ' requires elevated privileges')
                process.exit(1)
                break
            case 'EADDRINUSE':
                console.error(bind + ' is already in use')
                process.exit(1)
                break
            default:
                throw error
        }
    }

    /**
     * Event listener for HTTP server "listening" event.
     */

    function onListening() {
        const addr = server.address()
        const bind =
            typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr?.port
        debug('Listening on ' + bind)
    }
}

startServer()
