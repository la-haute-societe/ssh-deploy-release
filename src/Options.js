const moment    = require('moment');
const extend    = require('extend');
const timestamp = moment().utc().format('YYYY-MM-DD-HH-mm-ss-SSS-UTC');


// Noop callback
const noopCallback = function (deployer, callback) {
    callback();
};

const noopCallbackDeployer = function (deployer) {
    return [];
};

/**
 * Options
 * @type {Options}
 */
module.exports = class Options{

    static defaultOptions() {
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
            onAfterDeployExecute: noopCallbackDeployer,
        }
    };


    /**
     * Return configuration
     * merge deafult prop
     */
    constructor(appOptions) {
        this.options = extend(
            {},
            Options.defaultOptions(),
            appOptions
        );
        this.options = this.manageAlias(this.options);
    }

    get() {
        return this.options;
    }

    /**
     * Manage options alias
     * @param options
     */
    manageAlias(options) {
        // Fix : "makeWriteable" is an alias of "makeWritable"
        if (options.makeWriteable) {
            options.makeWritable = options.makeWriteable;
        }

        return options;
    }


};
