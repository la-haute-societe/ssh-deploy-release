module.exports = {
    deployRelease: deployRelease,
    removeRelease: removeRelease
};

// Dependencies
const path       = require('path');
const fs         = require('fs');
const Connection = require('ssh2');
const client     = require('scp2');
const async      = require('async');
const filesize   = require('filesize');
const exec       = require('child_process').exec;
const ora        = require('ora');

const configuration = require('./configuration');
const logger        = require('./logger.js');


var options     = {};
var releaseTag  = null;
var releasePath = null;
var connection  = null;
var deployer    = {};
const noop      = function () {
};

/**
 * Initialize
 */
function init(appOptions) {

 //   options = configuration.merge(appOptions);

    // logger.setDebug(options.debug);
    // releaseTag  = getReleaseTag();
    // releasePath = getReleasePath();
    connection  = null;
    deployer    = {
        options: options,
        releaseTag: releaseTag,
        releasePath: releasePath,
        execRemote: execRemote,
    };

    client.defaults(getScpOptions(options));

    // Private key authentication
    // Read file
    if (options.privateKeyFile) {
        options.privateKey = fs.readFileSync(options.privateKeyFile);
    }
}

/**
 * Remove release on remote
 */
function removeRelease(appOptions, done) {

    if (!done) {
        done = noop
    }

    init(appOptions);

    if (!options.allowRemove) {
        logger.fatal('Remove release is not allowed. (check "allowRemove" option)');
        return;
    }

    async.series([
        connectToRemoteTask,
        removeReleaseTask,
        closeConnectionTask
    ], function () {
        done();
    });
}

/**
 * Launch release deployment
 */
function deployRelease(appOptions, done) {

    if (!done) {
        done = noop
    }

    init(appOptions);

    async.series([
        onBeforeDeployTask,
        onBeforeDeployExecuteTask,
        compressReleaseTask,
        connectToRemoteTask,
        createReleaseFolderOnRemoteTask,
        uploadArchiveTask,
        uploadReleaseTask,
        decompressArchiveOnRemoteTask,
        onBeforeLinkTask,
        onBeforeLinkExecuteTask,
        updateSharedSymbolicLinkOnRemoteTask,
        createFolderTask,
        makeDirectoriesWritableTask,
        makeFilesExecutableTask,
        updateCurrentSymbolicLinkOnRemoteTask,
        onAfterDeployTask,
        onAfterDeployExecuteTask,
        remoteCleanupTask,
        deleteLocalArchiveTask,
        closeConnectionTask
    ], function () {
        done();
    });
}


/**
 * Get SCP options
 * @param options
 * @returns {{port: number, host: (*|string|string|string|string), username: (*|string|string|string), readyTimeout: number}}
 */
function getScpOptions(options) {
    const scpOptions = {
        port: options.port,
        host: options.host,
        username: options.username,
        readyTimeout: options.readyTimeout
    };

    // Private key authentication
    if (options.privateKeyFile) {
        scpOptions.privateKey = fs.readFileSync(options.privateKeyFile);
        if (options.passphrase) {
            scpOptions.passphrase = options.passphrase;
        }
    }

    // Password authentication
    else
        if (options.password) {
            scpOptions.password = options.password;
        }

        // Agent authentication
        else
            if (options.agent) {
                scpOptions.agent = options.agent;
            }

            // No authentication
            else {
                throw new Error('Agent, password or private key required for secure copy.');
            }

    return scpOptions;
}


/**
 * Get release tag
 * @returns {*|string}
 */
function getReleaseTag() {
    let releaseTag = options.tag;

    // Execute function if needed
    if (typeof options.tag == 'function') {
        releaseTag = options.tag()
    }

    // Just a security check, avoiding empty tags that could mess up the file system
    if (releaseTag == '') {
        releaseTag = configuration.default.tag;
    }
    return releaseTag;
}


/**
 * Get releases path
 * @returns {string}
 */
function getReleasePath() {
    return path.posix.join(
        options.deployPath,
        options.releasesFolder,
        releaseTag
    );
}

/**
 * Executes a remote command via ssh
 */
function execRemote(cmd, showLog, next) {
    connection.exec(cmd, function (error, stream) {
        if (error) {
            logger.error('Error while deploying..');
            logger.error(error);
            deleteRemoteRelease(closeConnectionTask);
        }

        stream.on('data', function (data, extended) {
            if (showLog) {
                logger.log((extended === 'stderr' ? 'STDERR: ' : 'STDOUT: ') + data);
                return;
            }

            logger.debug((extended === 'stderr' ? 'STDERR: ' : 'STDOUT: ') + data);
        });

        stream.on('end', function () {
            logger.debug('Remote command : ' + cmd);
            if (!error) {
                next();
            }
        });
    });
}

/**
 * Get current folder path on remote
 * @returns {string}
 */
function getCurrentPath() {
    return path.posix.join(options.deployPath, options.currentReleaseLink);
}


/**
 * Delete release
 * @param callback
 */
function deleteRemoteRelease(callback) {
    const command = 'rm -rf ' + releasePath;
    logger.subhead('Delete release on remote');
    execRemote(command, options.debug, function () {
        logger.ok('Done');
        callback();
    });
}

/**
 * Create symbolic link
 * @param target
 * @param link
 * @param callback
 */
function createSymboliclink(target, link, callback) {
    const commands = [
        'mkdir -p ' + link, // Create the parent of the symlink target
        'rm -rf ' + link,
        'mkdir -p ' + realpath(link + '/../' + target), // Create the symlink target
        'ln -nfs ' + target + ' ' + link
    ];

    async.eachSeries(commands, function (command, itemCallback) {
        execRemote(command, options.debug, function () {
            itemCallback();
        });
    }, callback);
}

/**
 * Return upwardPath from downwardPath
 * @example return "../../.." for "path/to/something"
 * @param downwardPath
 * @returns {XML|string|void|*}
 */
function getReversePath(downwardPath) {
    return downwardPath.replace(/([^\/]+)/g, '..');
}

/**
 * Realpath
 * @param path
 * @returns {string}
 */
function realpath(path) {

    // Explode the given path into it's parts
    let arr = path.split('/') // The path is an array now

    path = [] // Foreach part make a check
    for (let k in arr) { // This is'nt really interesting
        if (arr[k] === '.') {
            continue
        }
        // This reduces the realpath
        if (arr[k] === '..') {
            /* But only if there more than 3 parts in the path-array.
             * The first three parts are for the uri */
            if (path.length > 3) {
                path.pop()
            }
        } else {
            // This adds parts to the realpath
            // But only if the part is not empty or the uri
            // (the first three parts ar needed) was not
            // saved
            if ((path.length < 2) || (arr[k] !== '')) {
                path.push(arr[k])
            }
        }
    }

    // Returns the absloute path as a string
    return path.join('/')
}

/**
 * Execute commandsFunction results
 * @param commandsFunction function | []
 * @param callback
 */
function businessCallbackExecute(commandsFunction, callback) {
    if (!commandsFunction) {
        callback();
        return;
    }

    let commands = commandsFunction;

    // If commandsFunction is a function, take its result as commands
    if (typeof commandsFunction === 'function') {
        commands = commandsFunction(deployer);
    }

    // Nothing to execute
    if (!commands || commands.length == 0) {
        callback();
        return;
    }

    // Execute each command
    async.eachSeries(commands, (command, innerCallback) => {
        logger.subhead('Execute on remote : ' + command);
        deployer.execRemote(command, true, innerCallback);
    }, () => {
        logger.ok('Done');
        callback();
    });
}

function remoteChmod(path, mode, callback) {
    const command = 'chmod ' + mode + ' ' + path;

    execRemote(command, options.debug, function () {
        callback();
    });
}


// TASKS ==========================================

/**
 * On before create symbolic link
 * @param callback
 * @returns {*}
 */
function onBeforeDeployTask(callback) {
    options.onBeforeDeploy(deployer, callback);
}

/**
 * On before create symbolic link Execute
 * @param callback
 * @returns {*}
 */
function onBeforeDeployExecuteTask(callback) {
    businessCallbackExecute(options.onBeforeDeployExecute, callback);
}

/**
 * Zip folder
 * @param callback
 * @returns {*}
 */
function compressReleaseTask(callback) {

    if (options.mode != 'archive') {
        callback();
        return;
    }

    logger.subhead('Compress release');
    let spinner = ora('Compressing').start();

    const archiver = require('archiver');
    const output   = fs.createWriteStream(options.archiveName);
    const archive  = archiver(options.archiveType, options.gzip);

    output.on('close', function () {
        spinner.stop();
        logger.ok('Archive created : ' + filesize(archive.pointer()));
        callback();
    });

    archive.on('error', function (err) {
        spinner.stop();
        logger.error('Error while compressing');
        throw err;
    });


    archive.pipe(output);
    archive.glob('**/*', {
        expand: true,
        cwd: options.localPath,
        ignore: options.exclude,
        dot: true,
    });
    archive.finalize();
}

/**
 * Connect to remote
 */
function connectToRemoteTask(callback) {
    logger.subhead('Connect to ' + options.host);
    let spinner = ora('Connecting').start();

    connection = new Connection();

    // Ready event
    connection.on('ready', function () {
        spinner.stop();
        logger.ok('Connected');
        callback();
    });

    // Error event
    connection.on('error', function (error) {
        spinner.stop();
        if (error) {
            logger.fatal(error);
        }
    });

    // Close event
    connection.on('close', function (hadError) {
        logger.subhead("Closed from " + options.host);
        return true;
    });


    connection.connect(options);

    return connection;
}

/**
 * Create release
 * @param callback
 */
function createReleaseFolderOnRemoteTask(callback) {
    const command = 'mkdir -p ' + releasePath;

    logger.subhead('Create release folder on remote');
    logger.log(' - ' + releasePath);

    execRemote(command, options.debug, function () {
        logger.ok('Done');
        callback();
    });
}

/**
 *
 * @param callback
 */
function uploadArchiveTask(callback) {

    if (options.mode != 'archive') {
        callback();
        return;
    }

    const build = options.archiveName;

    logger.subhead('Upload archive to remote');
    let spinner = ora('Uploading').start();

    client.scp(build, {
        path: releasePath
    }, function (error) {
        spinner.stop();

        if (error) {
            logger.error(error);
            return;
        }

        logger.ok('Done');
        callback();
    });
}


/**
 *
 * @param callback
 */
function uploadReleaseTask(callback) {

    if (options.mode != 'synchronize') {
        callback();
        return;
    }

    logger.subhead('Synchronize remote server');
    const spinner = ora('Synchronizing').start();

    const source = options.localPath + '/';
    const target = options.username + '@' + options.host + ':' + options.deployPath + '/' + options.synchronizedFolder;
    const copy   = 'rsync -a ' + options.deployPath + '/' + options.synchronizedFolder + '/ ' + releasePath;

    // Construct rsync command
    let sshpass = '';

    // Use password
    if (options.password != '') {
        sshpass = '--rsh=\'sshpass -p "' + options.password + '" ssh -l ' + options.username + ' -o StrictHostKeyChecking=no\'';
    }

    // Use privateKey
    else
        if (options.privateKeyFile != null) {
            logger.fatal('PrivateKey not compatible with synchronize mode.');
        }

    // Concat
    let synchronizeCommand = 'rsync ' + sshpass + ' ' + options.rsyncOptions + ' -a --stats --delete ' + source + ' ' + target;

    // Exec !
    exec(synchronizeCommand, function (error, stdout, stderr) {
        spinner.stop();

        if (error) {
            logger.fatal(error);
        }

        if (stderr) {
            logger.log(stdout);
        }

        if (stderr) {
            logger.log(stderr);
        }

        logger.ok('Done');

        logger.subhead('Copy release');
        const spinnerCopy = ora('Copying').start();

        execRemote(copy, true, function (result) {
            spinnerCopy.stop();
            logger.ok('Done');
            callback();
        });
    });
}


/**
 * Unzip on remote
 * @param callback
 * @returns {*}
 */
function decompressArchiveOnRemoteTask(callback) {

    if (options.mode != 'archive') {
        callback();
        return;
    }

    const untarMap = {
        'zip': "unzip -q " + options.archiveName,
        'tar': "tar -xvf " + options.archiveName,
    };

    // Check archiveType is supported
    if (!untarMap[options.archiveType]) {
        logger.fatal(options.archiveType + ' not supported.');
    }

    const goToCurrent = "cd " + releasePath;
    const untar       = untarMap[options.archiveType];
    const cleanup     = "rm " + path.posix.join(releasePath, options.archiveName);
    const command     = goToCurrent + " && " + untar + " && " + cleanup;

    logger.subhead('Decompress archive on remote');
    let spinner = ora('Decompressing').start();

    execRemote(command, options.debug, function () {
        spinner.stop();
        logger.ok('Done');
        callback();
    });
}

/**
 * On before create symbolic link
 * @param callback
 * @returns {*}
 */
function onBeforeLinkTask(callback) {
    options.onBeforeLink(deployer, callback);
}


/**
 * On before link Execute
 * @param callback
 * @returns {*}
 */
function onBeforeLinkExecuteTask(callback) {
    businessCallbackExecute(options.onBeforeLinkExecute, callback);
}


/**
 * Update shared symlink
 * @param callback
 */
function updateSharedSymbolicLinkOnRemoteTask(callback) {

    logger.subhead('Update shared symlink on remote');

    async.eachSeries(Object.keys(options.share), function (currentSharedFolder, itemCallback) {
        const configValue = options.share[currentSharedFolder];
        let symlinkName   = configValue;
        let mode          = null;

        if (
            typeof configValue == 'object'
            && 'symlink' in configValue
        ) {
            symlinkName = configValue.symlink;
        }

        if (
            typeof configValue == 'object'
            && 'mode' in configValue
        ) {
            mode = configValue.mode;
        }

        const linkPath   = releasePath + '/' + symlinkName;
        const upwardPath = getReversePath(symlinkName);
        const target     = upwardPath + '/../' + options.sharedFolder + '/' + currentSharedFolder;

        logger.log(' - ' + symlinkName + ' ==> ' + currentSharedFolder);
        createSymboliclink(target, linkPath, () => {
            if (!mode) {
                itemCallback();
                return;
            }

            logger.log('   chmod ' + mode);

            remoteChmod(linkPath, mode, () => {
                itemCallback();
            });
        });
    }, () => {
        logger.ok('Done');

        callback();
    });
}


/**
 * Create directories
 * @param callback
 */
function createFolderTask(callback) {

    if (!options.create || options.create.length == 0) {
        callback();
        return;
    }

    logger.subhead('Create folders on remote');

    async.eachSeries(options.create, function (currentFolderToCreate, itemCallback) {
        const path    = releasePath + '/' + currentFolderToCreate;
        const command = 'mkdir ' + path + ' && chmod ugo+w ' + path;

        logger.log(' - ' + currentFolderToCreate);
        execRemote(command, options.debug, function () {
            itemCallback();
        });
    }, () => {
        logger.ok('Done');
        callback();
    });
}


/**
 * Make directories writable
 * @param callback
 */
function makeDirectoriesWritableTask(callback) {
    if (!options.makeWritable || options.makeWritable.length == 0) {
        callback();
        return;
    }

    logger.subhead('Make folders writable on remote');

    async.eachSeries(options.makeWritable, function (currentFolderToMakeWritable, itemCallback) {
        const path = releasePath + '/' + currentFolderToMakeWritable;
        const mode = 'ugo+w';

        logger.log(' - ' + currentFolderToMakeWritable);
        remoteChmod(path, mode, () => {
            itemCallback();
        });
    }, () => {
        logger.ok('Done');
        callback();
    });
}

/**
 * Make files executable
 * @param callback
 */
function makeFilesExecutableTask(callback) {
    if (!options.makeExecutable || options.makeExecutable.length == 0) {
        callback();
        return;
    }

    logger.subhead('Make files executables on remote');

    async.eachSeries(options.makeExecutable, function (currentFileToMakeExecutable, itemCallback) {
        const path    = releasePath + '/' + currentFileToMakeExecutable;
        const command = 'chmod ugo+x ' + path;

        logger.log(' - ' + currentFileToMakeExecutable);
        execRemote(command, options.debug, function () {
            logger.ok('Done');
            itemCallback();
        });
    }, callback);
}


/**
 * Update symlink
 * @param callback
 */
function updateCurrentSymbolicLinkOnRemoteTask(callback) {

    logger.subhead('Update current release symlink on remote');

    var target = options.releasesFolder + '/' + releaseTag;

    createSymboliclink(target, getCurrentPath(), function () {
        logger.ok('Done');
        callback();
    });
}

/**
 * On after deploy
 * @param callback
 * @returns {*}
 */
function onAfterDeployTask(callback) {
    options.onAfterDeploy(deployer, callback);
}


/**
 * On after deploy Execute
 * @param callback
 * @returns {*}
 */
function onAfterDeployExecuteTask(callback) {
    businessCallbackExecute(options.onAfterDeployExecute, callback);
}


/**
 * Remote cleanup
 * @param callback
 * @returns {*}
 */
function remoteCleanupTask(callback) {
    if (typeof options.releasesToKeep === 'undefined') {
        return callback();
    }

    if (options.releasesToKeep < 1) {
        options.releasesToKeep = 1;
    }

    const command = "cd " + path.posix.join(
            options.deployPath,
            options.releasesFolder
        ) + " && rm -rf `ls -r " + path.posix.join(
            options.deployPath,
            options.releasesFolder
        ) + " | awk 'NR>" + options.releasesToKeep + "'`";

    logger.subhead('Remove old builds on remote');
    let spinner = ora('Removing').start();

    execRemote(command, options.debug, function () {
        spinner.stop();
        logger.ok('Done');
        callback();
    });
}

/**
 * Delete local archive
 * @param callback
 * @returns {*}
 */
function deleteLocalArchiveTask(callback) {

    if (options.mode != 'archive' || !options.deleteLocalArchiveAfterDeployment) {
        callback();
        return;
    }

    logger.subhead('Delete local archive');
    fs.unlink(options.archiveName);
    logger.ok('Done');
    callback();
}

/**
 * Closing connection to remote server
 */
function closeConnectionTask(callback) {
    connection.end();
    client.close();
    client.__sftp = null;
    client.__ssh  = null;
    callback();
}


/**
 * Remove release on remote
 * @param callback
 */
function removeReleaseTask(callback) {
    logger.subhead('Remove releases on remote');

    const command = "rm -rf " + options.deployPath;
    execRemote(command, options.debug, function () {
        logger.ok('Done');
        callback();
    });
}
