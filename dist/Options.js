'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var moment = require('moment');
var extend = require('extend');
var timestamp = moment().utc().format('YYYY-MM-DD-HH-mm-ss-SSS-UTC');

// Noop callback
var noopCallback = function noopCallback(deployer, callback) {
    callback();
};

var noopCallbackDeployer = function noopCallbackDeployer(deployer) {
    return [];
};

/**
 * Options
 * @type {Options}
 */
module.exports = function () {
    _createClass(Options, null, [{
        key: 'defaultOptions',
        value: function defaultOptions() {
            return {
                debug: false,

                // Deployment mode ('archive' or 'synchronize')
                mode: 'archive',
                archiveName: 'release.tar.gz',

                // Archive type : 'zip' or 'tar'
                archiveType: 'tar',
                gzip: {
                    gzip: true,
                    gzipOptions: {
                        level: 5
                    }
                },
                deleteLocalArchiveAfterDeployment: true,

                // SSH / SCP connection
                port: 22,
                host: '',
                username: '',
                password: '',
                privateKeyFile: null,
                readyTimeout: 20000,

                // Folders / link
                currentReleaseLink: 'www',
                sharedFolder: 'shared',
                releasesFolder: 'releases',
                localPath: 'www',
                deployPath: '',
                synchronizedFolder: 'synchronized',
                rsyncOptions: '',

                // Release
                releasesToKeep: '3',
                tag: timestamp,

                // Excluded files
                exclude: [],

                // Folders to share
                share: {},

                // Directories to create
                create: [],

                // File to make writable
                makeWritable: [],

                // Files to make executable
                makeExecutable: [],

                // Allow remove release on remote
                // Warning !!
                allowRemove: false,

                // Callback
                onBeforeDeploy: noopCallback,
                onBeforeLink: noopCallback,
                onAfterDeploy: noopCallback,

                // Callback commands
                onBeforeDeployExecute: noopCallbackDeployer,
                onBeforeLinkExecute: noopCallbackDeployer,
                onAfterDeployExecute: noopCallbackDeployer
            };
        }
    }]);

    /**
     * Return configuration
     * merge deafult prop
     */
    function Options(appOptions) {
        _classCallCheck(this, Options);

        this.options = extend({}, Options.defaultOptions(), appOptions);
        this.options = this.manageAlias(this.options);
    }

    _createClass(Options, [{
        key: 'get',
        value: function get() {
            return this.options;
        }

        /**
         * Manage options alias
         * @param options
         */

    }, {
        key: 'manageAlias',
        value: function manageAlias(options) {
            // Fix : "makeWriteable" is an alias of "makeWritable"
            if (options.makeWriteable) {
                options.makeWritable = options.makeWriteable;
            }

            return options;
        }
    }]);

    return Options;
}();