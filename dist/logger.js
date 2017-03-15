'use strict';

var chalk = require('chalk');
var os = require('os');
var ora = require('ora');

var debug = false;
var enabled = true;

/**
 * Enable log
 * @param enable
 */
function setEnabled(enable) {
    enabled = enable;
}

/**
 * Set debug mode
 * @param enableDebug
 */
function setDebug(enableDebug) {
    debug = enableDebug;
}

/**
 * Log fatal error and exit process
 * @param message
 */
function logFatal(message) {
    console.log(os.EOL + chalk.red.bold('Fatal error : ' + message));
    process.exit();
}

/**
 * Log subhead
 * @param message
 */
function logSubhead(message) {
    if (!enabled) return;
    console.log(os.EOL + chalk.bold.underline(message));
}

/**
 * Log "ok" message
 * @param message
 */
function logOk(message) {
    if (!enabled) return;
    console.log(chalk.green(message));
}

/**
 * Log error message
 * @param message
 */
function logError(message) {
    if (!enabled) return;
    console.log(chalk.red(message));
}

/**
 * Log only if debug is enabled
 * @param message
 */
function logDebug(message) {
    if (!debug) {
        return;
    }

    if (!enabled) return;
    console.log(os.EOL + chalk.cyan(message));
}

/**
 * Simple log
 * @param message
 */
function log(message) {
    if (!enabled) return;
    console.log(message);
}

/**
 * Start spinner
 * @param message
 * @returns {{stop: (function())}}
 */
function startSpinner(message) {
    if (!enabled) {
        return {
            stop: function stop() {}
        };
    }

    return ora(message).start();
}

module.exports = {
    fatal: logFatal,
    subhead: logSubhead,
    ok: logOk,
    error: logError,
    debug: logDebug,
    log: log,
    startSpinner: startSpinner,
    setDebug: setDebug,
    setEnabled: setEnabled
};